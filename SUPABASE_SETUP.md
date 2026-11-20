# Supabase and Cloudflare Pages setup

The site remains static and is published with Cloudflare Pages. Cloudflare Pages Functions provide the API endpoints, while shared settings and CPanel data stay in Supabase. Visitor pages load the shared configuration and product catalog, then reload when Supabase Realtime reports a change.

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

## 2. Deploy to Cloudflare Pages

1. In Cloudflare, create a **Pages** project and connect the GitHub repository `Radithya90/UPDATE-NEW-WEBSITE-DELABELS-NEW-WEB` on the `main` branch.
2. Set the build command to `npm run build` and the build output directory to `dist`. The project has no framework preset.
3. In **Settings > Variables and Secrets**, add the following for Production and Preview as needed:

| Variable | Value | Used by |
| --- | --- | --- |
| `SUPABASE_URL` | Project URL from Supabase API settings | Browser bootstrap and Pages Functions |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key from Supabase API Keys | Public, RLS-protected browser client |
| `SUPABASE_SECRET_KEY` | Secret key from Supabase API Keys; store as a Secret | Server-side Admin Auth management only |

Never put `SUPABASE_SECRET_KEY` in HTML, JavaScript served to visitors, or a public repository. It bypasses Row Level Security and belongs only in Cloudflare's encrypted Function secrets. The server still validates the visitor's Supabase session and Admin/Keamanan role before privileged operations.

The API also accepts the legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` variable names for migration compatibility. Prefer the new publishable/secret keys; when using `SUPABASE_SECRET_KEY`, the Function sends it only in the `apikey` header, not as a Bearer JWT.

4. Deploy the project. The `/api/config` endpoint returns only the URL and public publishable key; `/api/admin/users` manages accounts after validating the signed-in Admin/Keamanan role.
5. Test the `pages.dev` URL in a private browser window, including `/api/config` and `/admin/login.html`. Keep the existing Vercel deployment until the Cloudflare deployment and CPanel have both been verified.

The build copies only the website HTML, CSS, JavaScript, and Admin HTML into `dist`. API source, SQL schema, setup documentation, and local browser snapshots are not published as static assets. Cloudflare Pages Functions in `functions/` handle the API routes.

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
- Supabase Realtime is enabled for shared site state, contact messages, visitor blocks, and Admin profiles by the SQL setup.

Contact messages accept public inserts so the website can receive visitor messages. Add CAPTCHA or another anti-spam control before a high-traffic public launch.
