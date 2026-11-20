# Supabase and Vercel setup

The site remains static, but its shared settings and CPanel data are stored in Supabase. Visitor pages load the shared configuration and product catalog, then reload when Supabase Realtime reports a change.

## 1. Create the Supabase project

1. Create a Supabase project and keep its database password private.
2. In **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In **Authentication > Providers**, enable Email/Password. Disable public sign-ups; this site creates Admin/Keamanan users only from the authenticated CPanel.
4. In **Authentication > Users**, create the first user with:
   - Email: `admin@auth.ditzznewera.invalid`
   - A unique password with at least 12 characters (16+ random characters is recommended); store it in a password manager
   - Email confirmed
5. Add that user's CPanel role in SQL Editor:

   ```sql
   insert into public.admin_profiles (user_id, username, display_name, role)
   select id, 'admin', 'Admin', 'admin'
   from auth.users
   where email = 'admin@auth.ditzznewera.invalid'
   on conflict (user_id) do update
   set username = excluded.username,
       display_name = excluded.display_name,
       role = excluded.role;
   ```

The username is used to derive the internal Auth email. Passwords and Admin roles are not stored in browser localStorage.

## 2. Configure Vercel

In **Vercel > Project > Settings > Environment Variables**, set these for each environment you deploy:

| Variable | Value | Used by |
| --- | --- | --- |
| `SUPABASE_URL` | Project URL from Supabase API settings | Browser bootstrap and Vercel Functions |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key from Supabase API Keys | Public, RLS-protected browser client |
| `SUPABASE_SECRET_KEY` | Secret key from Supabase API Keys | Server-side Admin and visitor-log operations |
| `CRON_SECRET` | Long random secret used by the scheduled cleanup endpoint | Daily visitor-log retention |

Never put `SUPABASE_SECRET_KEY` in HTML, JavaScript served to visitors, or a public repository. It bypasses Row Level Security and belongs only in Vercel server environment variables. The server validates the visitor's Supabase session and Admin/Keamanan role before privileged CPanel operations; public visitor activity is restricted to the event allowlist and stored with only a masked IP prefix.

The API also accepts the legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` variable names for migration compatibility. Prefer the new publishable/secret keys; when using `SUPABASE_SECRET_KEY`, the server sends it only in the `apikey` header, not as a Bearer JWT.

Redeploy the Vercel project after adding the variables. The `/api/config` endpoint returns only the URL and public anon key.

Vercel runs `/api/cron/prune-visitor-data` daily at 03:00 UTC. Set a unique `CRON_SECRET` before deployment so the endpoint can delete visitor activity and announcement responses older than 30 days; Vercel sends it as a bearer token. Do not reuse the Supabase secret key for this value.

## 3. First login and import

1. Open `/admin/login.html` and sign in with username `admin` and the password created in Supabase.
2. In CPanel, open **Database & Sync** and select **Impor Data dari Browser Ini** on the device that has the old local CPanel data. Configuration/products are imported only if their remote fields are still empty; old contact messages use stable import IDs to avoid duplicates.
3. Existing local Admin/Keamanan accounts and password hashes are intentionally not migrated. Create new accounts in the CPanel account manager; Supabase Auth will manage their passwords.
4. Configure the `admin-avatars` Storage bucket with a suitable project-level upload limit if profile photos are needed. The site does not set an additional client-side size limit.

## Data and access model

- Browser pages load Supabase JS from an exact CDN version with Subresource Integrity (SRI). When upgrading it, update the version and verified SRI hash on every page together; do not use the floating `@2` URL.
- `site_state`: public visitor configuration and product catalog; authenticated Admin/Keamanan writes only.
- `contact_messages`: public insert only; Admin/Keamanan read and delete.
- `visitor_blocks`: private to Admin/Keamanan; visitors can only check whether a submitted username is blocked.
- `admin_profiles`: account roles and display profiles; writes are performed through `/api/admin/users`.
- `admin-avatars`: public image reads; authenticated Admin/Keamanan uploads.
- `visitor_activity`: server-only insert/read through API; the API stores only masked IP prefixes, browser-reported fullscreen support/use, and removes records older than 30 days.
- Permanent name violations that match the shared blocked-name list are also added to `visitor_blocks`; CPanel unblocking adds that exact visitor name to the approved list.
- `site_announcements` and `announcement_responses`: active Admin announcements and visitor replies; the daily Vercel cleanup removes replies older than 30 days.
- Supabase Realtime is enabled for shared site state, contact messages, visitor blocks, and Admin profiles by the SQL setup.

Contact messages accept public inserts so the website can receive visitor messages. Add CAPTCHA or another anti-spam control before a high-traffic public launch.
