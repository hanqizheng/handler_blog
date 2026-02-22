# Blog

## Branding & SEO

Configure these in `.env.local` / production env to control site display and SEO
branding text:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_SITE_DESCRIPTION_ZH`
- `NEXT_PUBLIC_SITE_DESCRIPTION_EN`

## Database workflow (Drizzle + MySQL)

1. Configure `DATABASE_URL` in `.env.local` (see `.env.example`).
2. Start MySQL with `docker compose up -d`.
3. Apply migrations with `pnpm db:migrate`.

When you change `db/schema/*`:

1. Run `pnpm db:generate` to create a migration.
2. Review the SQL in `db/migrations`.
3. Run `pnpm db:migrate` to apply.

If the local database was created before migrations were standardized, the
existing schema may block migrations (tables already exist). The simplest fix
is to rebuild the local volume (data loss): `docker compose down -v` and then
re-run the steps above.

## Qiniu upload sanity check

- You can call `GET /api/qiniu/verify` in dev to verify access/secret keys.

## Admin auth: production vs local development

- Registration is strictly one-time: once an admin account exists, `POST /api/admin/auth/signup` is forbidden for all users.
- In local development, you can enable an independent dev admin account that does not write into `admin_users`.

### Enable local dev admin login

1. Set these variables in `.env.local`:
   - `DEV_ADMIN_LOGIN_ENABLED=true`
   - `DEV_ADMIN_EMAIL=your-dev-email@example.com`
   - `DEV_ADMIN_PASSWORD_HASH=<scrypt hash>`
2. Keep `NODE_ENV=development` (default for `pnpm dev`).
3. Login from `/admin/login` with the dev credentials.

Generate a scrypt password hash compatible with this project:

```bash
node -e 'const { randomBytes, scryptSync } = require("node:crypto"); const p = process.argv[1]; const salt = randomBytes(16); const d = scryptSync(p, salt, 64, { N: 16384, r: 8, p: 1 }); console.log(["scrypt", 16384, 8, 1, salt.toString("hex"), d.toString("hex")].join(":"));' 'your-password'
```

Production note:

- Dev admin login is ignored unless `NODE_ENV=development`.
- `ADMIN_INVITATION_EXPIRES_MINUTES` controls owner invitation expiry window (default 15 minutes).

## Admin collaboration in production

### Owner-managed invitation flow (recommended)

1. Login with an owner account and open `/admin/users`.
2. Generate an invitation link for the target email.
3. Send the one-time link via a secure channel.
4. Invitee opens `/admin/accept-invitation?token=...`, sets password, then is auto-logged-in.
5. Invitee should immediately bind TOTP in `/admin/security`.

### Emergency manual provisioning SOP (no code path)

If owner invitation is temporarily unavailable, you can provision directly in DB:

1. Generate a password hash using the same scrypt format used by this project.
2. Insert the admin user with role `admin`:

```sql
INSERT INTO admin_users (email, password_hash, totp_secret, role, created_by)
VALUES ('new-admin@example.com', '<scrypt hash>', '', 'admin', <owner_id>);
```

3. Share credentials over a secure channel and require immediate TOTP binding.
4. Revoke access when needed:

```sql
DELETE FROM admin_users WHERE email = 'new-admin@example.com';
```
