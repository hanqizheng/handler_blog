# Blog

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
