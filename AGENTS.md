# Repository Guidelines

## Project Structure & Module Organization

- `app/` is the Next.js App Router entry; locale routing lives under `app/[locale]/`.
- `components/`, `constants/`, `types/`, and `utils/` hold shared UI, globals, and helpers.
- `db/` contains Drizzle ORM setup (`db/client.ts`), schema (`db/schema/`), migrations (`db/migrations/`), and Docker init (`db/init.sql`).
- `i18n/` and `messages/` store internationalization setup and translation files.
- `scripts/` includes maintenance scripts like `scripts/cleanup-demo.mjs`.

## Build, Test, and Development Commands

- `pnpm dev`: run the Next.js dev server with Turbopack.
- `pnpm build`: build the production bundle.
- `pnpm start`: run the production server after build.
- `pnpm lint`: run ESLint on JS/TS/TSX files.
- `pnpm type-check`: run TypeScript without emitting.
- `pnpm format` / `pnpm format:check`: format or verify formatting via Prettier.
- `pnpm db:generate` / `pnpm db:migrate`: create and apply Drizzle migrations.
- `pnpm db:studio`: open Drizzle Studio for local DB inspection.

## Coding Style & Naming Conventions

- Use TypeScript for app code; prefer named exports and descriptive component names (e.g., `DbDemo`).
- Formatting is enforced by Prettier with `prettier-plugin-tailwindcss`; run `pnpm format` before commits.
- Linting uses ESLint with `@typescript-eslint` parser.
- Keep file and folder names lowercase with hyphens where appropriate (e.g., `db-demo` route).

## Testing Guidelines

- No dedicated test runner is configured yet; rely on `pnpm lint` and `pnpm type-check`.
- If you add tests, keep them near the feature and use `*.test.ts`/`*.test.tsx`.

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits (examples from history: `feat: ...`, `feat(db): ...`, `docs: ...`, `chore: ...`).
- Hooks run `lint-staged` and `type-check` on commit; fix lint/format issues before pushing.
- PRs should include a concise summary, test steps (`pnpm lint`, `pnpm type-check`, etc.), and screenshots for UI changes.
- For DB changes, include migration notes and ensure `db/migrations/` is committed.

## Configuration & Local Services

- Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
- Use `docker compose up -d` to start the local MySQL service defined in `docker-compose.yml`.
