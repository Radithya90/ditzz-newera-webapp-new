create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    username text not null,
    display_name text not null,
    role text not null check (role in ('admin', 'security')),
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists admin_profiles_username_lower_key
    on public.admin_profiles (lower(username));

create table if not exists public.site_state (
    id text primary key check (id = 'main'),
    config jsonb,
    products jsonb check (products is null or jsonb_typeof(products) = 'array'),
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users (id) on delete set null
);

insert into public.site_state (id) values ('main')
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

drop trigger if exists admin_profiles_set_updated_at on public.admin_profiles;
create trigger admin_profiles_set_updated_at
    before update on public.admin_profiles
    for each row execute function public.set_updated_at();

drop trigger if exists site_state_set_updated_at on public.site_state;
create trigger site_state_set_updated_at
    before update on public.site_state
    for each row execute function public.set_updated_at();

create table if not exists public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(name) between 1 and 150),
    visitor_username text not null check (length(visitor_username) between 1 and 100),
    email text not null check (length(email) between 3 and 254),
    subject text not null check (length(subject) between 1 and 200),
    message text not null check (length(message) between 1 and 20000),
    display_date text not null check (length(display_date) <= 80),
    legacy_ref text unique,
    created_at timestamptz not null default now()
);

create table if not exists public.visitor_blocks (
    id uuid primary key default gen_random_uuid(),
    username text not null check (length(username) between 1 and 40),
    normalized_username text not null unique,
    reason text not null default '',
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.visitor_activity (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null,
    visitor_name text check (visitor_name is null or length(visitor_name) between 2 and 40),
    ip_masked text,
    event_type text not null check (event_type in ('page_view', 'name_submitted', 'name_violation', 'feature_open', 'announcement_response', 'fullscreen_status')),
    page text not null check (page in ('index', 'home', 'about', 'store', 'contact', 'updates', 'events', 'gallery', 'faq', 'community', 'guide')),
    fullscreen_supported boolean not null default false,
    fullscreen_active boolean not null default false,
    rule_violation boolean not null default false,
    violation_reason text check (violation_reason is null or violation_reason in ('blocked_name', 'invalid_format', 'inappropriate_name')),
    created_at timestamptz not null default now()
);

alter table public.visitor_activity
    add column if not exists fullscreen_supported boolean not null default false;
alter table public.visitor_activity
    add column if not exists fullscreen_active boolean not null default false;
alter table public.visitor_activity
    drop constraint if exists visitor_activity_event_type_check;
alter table public.visitor_activity
    add constraint visitor_activity_event_type_check
    check (event_type in ('page_view', 'name_submitted', 'name_violation', 'feature_open', 'announcement_response', 'fullscreen_status'));

create index if not exists visitor_activity_created_at_idx on public.visitor_activity (created_at desc);
create index if not exists visitor_activity_session_id_idx on public.visitor_activity (session_id, created_at desc);

create table if not exists public.site_announcements (
    id uuid primary key default gen_random_uuid(),
    message text not null check (length(message) between 1 and 2000),
    created_by uuid references auth.users (id) on delete set null,
    created_by_name text not null check (length(created_by_name) between 1 and 50),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null check (expires_at > created_at)
);

create index if not exists site_announcements_expires_at_idx on public.site_announcements (expires_at desc);

create table if not exists public.announcement_responses (
    id uuid primary key default gen_random_uuid(),
    announcement_id uuid not null references public.site_announcements (id) on delete cascade,
    visitor_name text not null check (length(visitor_name) between 2 and 40),
    response text not null check (length(response) between 1 and 500),
    created_at timestamptz not null default now()
);

create index if not exists announcement_responses_created_at_idx on public.announcement_responses (created_at desc);

create or replace function public.is_cpanel_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1
        from public.admin_profiles
        where user_id = auth.uid()
          and role in ('admin', 'security')
    );
$$;

revoke all on function public.is_cpanel_admin() from public;
grant execute on function public.is_cpanel_admin() to authenticated;

create or replace function public.is_visitor_blocked(p_normalized_username text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1
        from public.visitor_blocks
        where normalized_username = p_normalized_username
    );
$$;

revoke all on function public.is_visitor_blocked(text) from public;
grant execute on function public.is_visitor_blocked(text) to anon, authenticated;

alter table public.admin_profiles enable row level security;
alter table public.site_state enable row level security;
alter table public.contact_messages enable row level security;
alter table public.visitor_blocks enable row level security;
alter table public.visitor_activity enable row level security;
alter table public.site_announcements enable row level security;
alter table public.announcement_responses enable row level security;

grant select on public.admin_profiles to authenticated;
grant select on public.site_state to anon, authenticated;
grant insert, update on public.site_state to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, delete on public.contact_messages to authenticated;
grant select, insert, delete on public.visitor_blocks to authenticated;
grant select on public.site_announcements to anon, authenticated;
grant insert, update, delete on public.site_announcements to authenticated;
grant insert on public.announcement_responses to anon, authenticated;
grant select, delete on public.announcement_responses to authenticated;

drop policy if exists "Admin profiles are visible to their owner and admins" on public.admin_profiles;
create policy "Admin profiles are visible to their owner and admins"
    on public.admin_profiles for select to authenticated
    using (user_id = auth.uid() or public.is_cpanel_admin());

drop policy if exists "Site state is public to read" on public.site_state;
create policy "Site state is public to read"
    on public.site_state for select to anon, authenticated
    using (true);

drop policy if exists "Admins can insert site state" on public.site_state;
create policy "Admins can insert site state"
    on public.site_state for insert to authenticated
    with check (public.is_cpanel_admin());

drop policy if exists "Admins can update site state" on public.site_state;
create policy "Admins can update site state"
    on public.site_state for update to authenticated
    using (public.is_cpanel_admin())
    with check (public.is_cpanel_admin());

drop policy if exists "Visitors can submit contact messages" on public.contact_messages;
create policy "Visitors can submit contact messages"
    on public.contact_messages for insert to anon, authenticated
    with check (true);

drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages"
    on public.contact_messages for select to authenticated
    using (public.is_cpanel_admin());

drop policy if exists "Admins can delete contact messages" on public.contact_messages;
create policy "Admins can delete contact messages"
    on public.contact_messages for delete to authenticated
    using (public.is_cpanel_admin());

drop policy if exists "Admins can manage visitor blocks" on public.visitor_blocks;
create policy "Admins can manage visitor blocks"
    on public.visitor_blocks for all to authenticated
    using (public.is_cpanel_admin())
    with check (public.is_cpanel_admin());

drop policy if exists "Visitors can view active announcements" on public.site_announcements;
create policy "Visitors can view active announcements"
    on public.site_announcements for select to anon, authenticated
    using (expires_at > now() or public.is_cpanel_admin());

drop policy if exists "Admins can manage announcements" on public.site_announcements;
create policy "Admins can manage announcements"
    on public.site_announcements for all to authenticated
    using (public.is_cpanel_admin())
    with check (public.is_cpanel_admin());

drop policy if exists "Visitors can respond to active announcements" on public.announcement_responses;
create policy "Visitors can respond to active announcements"
    on public.announcement_responses for insert to anon, authenticated
    with check (
        exists (
            select 1
            from public.site_announcements
            where id = announcement_id
              and expires_at > now()
        )
    );

drop policy if exists "Admins can read announcement responses" on public.announcement_responses;
create policy "Admins can read announcement responses"
    on public.announcement_responses for select to authenticated
    using (public.is_cpanel_admin());

drop policy if exists "Admins can delete announcement responses" on public.announcement_responses;
create policy "Admins can delete announcement responses"
    on public.announcement_responses for delete to authenticated
    using (public.is_cpanel_admin());

revoke all on public.visitor_activity from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admin-avatars', 'admin-avatars', true, null, array['image/png', 'image/gif', 'image/webp', 'image/jpeg'])
on conflict (id) do update
set public = true, file_size_limit = null, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin avatars are publicly readable" on storage.objects;
create policy "Admin avatars are publicly readable"
    on storage.objects for select to public
    using (bucket_id = 'admin-avatars');

drop policy if exists "Admins can upload their own avatar files" on storage.objects;
create policy "Admins can upload their own avatar files"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'admin-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.is_cpanel_admin()
    );

drop policy if exists "Admins can update their own avatar files" on storage.objects;
create policy "Admins can update their own avatar files"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'admin-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.is_cpanel_admin()
    )
    with check (
        bucket_id = 'admin-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.is_cpanel_admin()
    );

drop policy if exists "Admins can delete their own avatar files" on storage.objects;
create policy "Admins can delete their own avatar files"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'admin-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.is_cpanel_admin()
    );

do $$
begin
    alter publication supabase_realtime add table public.site_state;
exception when duplicate_object then
    null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.contact_messages;
exception when duplicate_object then
    null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.visitor_blocks;
exception when duplicate_object then
    null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.admin_profiles;
exception when duplicate_object then
    null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.site_announcements;
exception when duplicate_object then
    null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.announcement_responses;
exception when duplicate_object then
    null;
end $$;
