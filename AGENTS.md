# Repository Guidelines

## Project Structure & Module Organization

- `app/` is the Next.js App Router entry. Locale routes live under `app/[locale]/`, and API routes are under `app/api/`.
- `components/` stores reusable UI (with base primitives in `components/ui/`).
- `lib/`, `utils/`, `hooks/`, `constants/`, and `types/` contain shared logic, helpers, and typed contracts.
- `db/` contains Drizzle ORM setup (`db/client.ts`), schema (`db/schema/`), current migrations (`db/migrations/`), legacy migrations (`db/migrations-legacy/`), and Docker init SQL (`db/init.sql`).
- `i18n/` and `messages/` store internationalization setup and translation dictionaries.
- `scripts/` holds maintenance utilities (for example `scripts/cleanup-demo.mjs`), and `public/` contains static assets.

## Build, Test, and Development Commands

- `pnpm dev`: run the Next.js dev server with Turbopack.
- `pnpm build`: build the production bundle.
- `pnpm start`: run the production server after build.
- `pnpm lint`: run ESLint across the repository.
- `pnpm type-check`: run TypeScript without emitting output.
- `pnpm format` / `pnpm format:check`: write or verify formatting with Prettier.
- `pnpm db:generate` / `pnpm db:migrate`: generate and apply Drizzle migrations.
- `pnpm db:studio`: open Drizzle Studio for local DB inspection.
- `pnpm lint-staged` / `pnpm commitlint`: run the same checks used by Git hooks.

## Coding Style & Naming Conventions

- Use TypeScript for app code; prefer named exports and descriptive component names (for example, `DbDemo`).
- Formatting is enforced by Prettier with `prettier-plugin-tailwindcss`; run `pnpm format` before committing.
- Linting uses ESLint with the `@typescript-eslint` parser.
- Keep route and utility file/folder names lowercase with hyphens where appropriate (for example, `db-demo`).

## Testing & Verification

- No dedicated test runner is configured yet; use `pnpm lint` and `pnpm type-check` as the default quality gate.
- If you add tests, place them near the feature and use `*.test.ts` / `*.test.tsx`.

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits (for example, `feat: ...`, `feat(db): ...`, `docs: ...`, `chore: ...`).
- Git hooks run `lint-staged` and `type-check` before commit; resolve lint and format issues before pushing.
- PRs should include a concise summary, verification steps (`pnpm lint`, `pnpm type-check`, and relevant manual checks), and screenshots for UI changes.
- For DB changes, include migration notes and commit generated files in `db/migrations/`.

## Configuration & Local Services

- Use Node.js `>=22` and `pnpm` for local development.
- Copy `.env.example` to `.env.local` and set `DATABASE_URL` plus any required third-party keys.
- Use `docker compose up -d` to start the local MySQL service defined in `docker-compose.yml`.
