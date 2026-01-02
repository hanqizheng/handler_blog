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
