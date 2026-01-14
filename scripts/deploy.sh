#!/usr/bin/env bash
set -euo pipefail

log_step() {
  echo
  echo "==> $1"
}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
CONFIG_FILE="$ROOT_DIR/.deploy.env"
ENV_FILE="$ROOT_DIR/.env.production"

if [ -f "$CONFIG_FILE" ]; then
  set -a
  . "$CONFIG_FILE"
  set +a
fi

: "${DEPLOY_HOST:=113.44.250.124}"
: "${DEPLOY_USER:=root}"
: "${DEPLOY_SSH_PORT:=22}"
: "${DEPLOY_APP_NAME:=handler_blog}"
: "${DEPLOY_APP_ROOT:=/root/handler_blog}"
: "${DEPLOY_APP_PORT:=8283}"
: "${DEPLOY_KEEP_RELEASES:=5}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE."
  echo "Create it before deploy (this is your production env file)."
  exit 1
fi

cd "$ROOT_DIR"

log_step "Preparing local build"
echo "Project: $DEPLOY_APP_NAME"
echo "Server: $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_SSH_PORT"
echo "App root: $DEPLOY_APP_ROOT"
echo "App port: $DEPLOY_APP_PORT"

log_step "Installing dependencies"
pnpm install

log_step "Generating Drizzle migrations (local)"
pnpm db:generate

log_step "Building Next.js app"
pnpm build

RELEASE_NAME="release_$(date +%Y%m%d_%H%M%S)"
STAGING_DIR="$ROOT_DIR/.deploy/$RELEASE_NAME"
ARCHIVE="$ROOT_DIR/.deploy/$RELEASE_NAME.tar.gz"

log_step "Packaging build artifacts"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR/db"

cp -R .next "$STAGING_DIR/"
cp -R public "$STAGING_DIR/"
cp -R messages "$STAGING_DIR/"
cp -R i18n "$STAGING_DIR/"
cp -R db/migrations "$STAGING_DIR/db/"
cp package.json pnpm-lock.yaml next.config.ts drizzle.config.ts "$STAGING_DIR/"
cp "$ENV_FILE" "$STAGING_DIR/.env.production"

tar -czf "$ARCHIVE" -C "$STAGING_DIR" .

log_step "Uploading package to server"
scp -P "$DEPLOY_SSH_PORT" "$ARCHIVE" "$DEPLOY_USER@$DEPLOY_HOST:/tmp/$RELEASE_NAME.tar.gz"

log_step "Deploying on server"
ssh -p "$DEPLOY_SSH_PORT" "$DEPLOY_USER@$DEPLOY_HOST" \
  "APP_NAME=$DEPLOY_APP_NAME APP_ROOT=$DEPLOY_APP_ROOT APP_PORT=$DEPLOY_APP_PORT RELEASE_NAME=$RELEASE_NAME KEEP_RELEASES=$DEPLOY_KEEP_RELEASES bash -s" <<'REMOTE'
set -euo pipefail

RELEASES_DIR="$APP_ROOT/app/releases"
CURRENT_DIR="$APP_ROOT/app/current"
ARCHIVE="/tmp/$RELEASE_NAME.tar.gz"

mkdir -p "$RELEASES_DIR"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"
mkdir -p "$RELEASE_DIR"

tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
rm -f "$ARCHIVE"

cd "$RELEASE_DIR"
pnpm install --frozen-lockfile

set -a
. "$RELEASE_DIR/.env.production"
set +a
DRIZZLE_ENV=production pnpm db:migrate

ln -sfn "$RELEASE_DIR" "$CURRENT_DIR"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME"
fi
cd "$RELEASE_DIR"
PORT="$APP_PORT" NODE_ENV=production pm2 start pnpm --name "$APP_NAME" -- start

if [ "$KEEP_RELEASES" -gt 0 ]; then
  ls -1dt "$RELEASES_DIR"/release_* | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
fi
REMOTE

log_step "Done"
echo "Deploy complete: $DEPLOY_HOST (pm2: $DEPLOY_APP_NAME)"
