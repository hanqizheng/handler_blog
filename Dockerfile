# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS dependencies
ENV CI=true SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 npm_config_ignore_scripts=true
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=handler-blog-pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS builder
ARG NEXT_PUBLIC_SITE_URL=https://www.huteng.com
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_NAME_ZH
ARG NEXT_PUBLIC_SITE_DESCRIPTION_ZH
ARG NEXT_PUBLIC_SITE_DESCRIPTION_EN
ARG NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX
ARG NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID
ARG NEXT_PUBLIC_QINIU_DISPLAY_DOMAIN=/qiniu
ARG NEXT_PUBLIC_QINIU_SOURCE_DOMAIN
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME} \
    NEXT_PUBLIC_SITE_NAME_ZH=${NEXT_PUBLIC_SITE_NAME_ZH} \
    NEXT_PUBLIC_SITE_DESCRIPTION_ZH=${NEXT_PUBLIC_SITE_DESCRIPTION_ZH} \
    NEXT_PUBLIC_SITE_DESCRIPTION_EN=${NEXT_PUBLIC_SITE_DESCRIPTION_EN} \
    NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX=${NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX} \
    NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID=${NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID} \
    NEXT_PUBLIC_QINIU_DISPLAY_DOMAIN=${NEXT_PUBLIC_QINIU_DISPLAY_DOMAIN} \
    NEXT_PUBLIC_QINIU_SOURCE_DOMAIN=${NEXT_PUBLIC_QINIU_SOURCE_DOMAIN}
# These placeholders exist only in the build stage; no production DB or keys are needed.
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/handler_blog \
    ADMIN_AUTH_SECRET=build-only-placeholder-never-used-by-runtime
COPY . .
RUN pnpm lint && pnpm build && pnpm type-check

FROM dependencies AS production-dependencies
# Keep the runtime migrator's dependencies, including files not traced by Next.js.
RUN pnpm prune --prod

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8284 HOSTNAME=localhost \
    NODE_OPTIONS=--dns-result-order=ipv4first
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs --no-create-home nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=production-dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/db/migrations ./db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/check-runtime-env.mjs ./scripts/check-runtime-env.mjs
USER nextjs
CMD ["sh", "-c", "node scripts/check-runtime-env.mjs && exec node server.js"]
