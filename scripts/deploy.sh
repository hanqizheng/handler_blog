#!/usr/bin/env bash
set -euo pipefail

log_step() {
  echo
  echo "==> $1"
}

prompt_with_default() {
  local prompt="$1"
  local default_value="$2"
  local input

  if [ -n "$default_value" ]; then
    read -r -p "$prompt [$default_value]: " input
    if [ -z "$input" ]; then
      input="$default_value"
    fi
  else
    read -r -p "$prompt: " input
  fi

  printf '%s' "$input"
}

prompt_required() {
  local prompt="$1"
  local default_value="$2"
  local value

  while true; do
    value=$(prompt_with_default "$prompt" "$default_value")
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return
    fi
    echo "This field is required."
  done
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

: "${DEPLOY_HOST:=150.109.146.21}"
: "${DEPLOY_USER:=root}"
: "${DEPLOY_SSH_PORT:=22}"
: "${DEPLOY_APP_NAME:=handler_blog}"
: "${DEPLOY_APP_ROOT:=/root/handler_blog}"
: "${DEPLOY_APP_PORT:=8283}"
: "${DEPLOY_KEEP_RELEASES:=5}"
: "${DEPLOY_DATABASE_URL:=}"

cd "$ROOT_DIR"

initial_app_name="$DEPLOY_APP_NAME"
initial_app_root="$DEPLOY_APP_ROOT"

echo
echo "Deployment config (press Enter to use default):"
DEPLOY_HOST=$(prompt_required "Server IP / Host" "$DEPLOY_HOST")
DEPLOY_USER=$(prompt_required "Server User" "$DEPLOY_USER")
DEPLOY_SSH_PORT=$(prompt_required "SSH Port" "$DEPLOY_SSH_PORT")
DEPLOY_APP_NAME=$(prompt_required "App Name" "$DEPLOY_APP_NAME")
default_app_root="$initial_app_root"
if [ "$DEPLOY_USER" != "root" ]; then
  if [ "$initial_app_root" = "/root/$initial_app_name" ] || [ "$initial_app_root" = "/root/handler_blog" ]; then
    default_app_root="/home/$DEPLOY_USER/$DEPLOY_APP_NAME"
  fi
fi
DEPLOY_APP_ROOT=$(prompt_required "App Root" "$default_app_root")
DEPLOY_APP_PORT=$(prompt_required "App Port" "$DEPLOY_APP_PORT")
DEPLOY_KEEP_RELEASES=$(prompt_required "Keep latest releases" "$DEPLOY_KEEP_RELEASES")
read -r -p "Override DATABASE_URL for this deploy? [y/N]: " should_override_db_url
if [[ "$should_override_db_url" =~ ^[Yy]$ ]]; then
  DEPLOY_DATABASE_URL=$(prompt_required "DATABASE_URL" "$DEPLOY_DATABASE_URL")
else
  DEPLOY_DATABASE_URL=""
fi

if [ ! -f "$ENV_FILE" ]; then
  log_step "Creating $ENV_FILE from .env.local"
  if [ ! -f "$ROOT_DIR/.env.local" ]; then
    echo "Missing $ENV_FILE and $ROOT_DIR/.env.local."
    echo "Create one of them before deploy."
    exit 1
  fi

  cp "$ROOT_DIR/.env.local" "$ENV_FILE"
fi

if [ -n "$DEPLOY_DATABASE_URL" ]; then
  tmp_file="$ENV_FILE.tmp"
  grep -v "^DATABASE_URL=" "$ENV_FILE" > "$tmp_file" || true
  printf "DATABASE_URL=%s\n" "$DEPLOY_DATABASE_URL" >> "$tmp_file"
  mv "$tmp_file" "$ENV_FILE"
else
  if ! grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    tmp_file="$ENV_FILE.tmp"
    grep -v "^DATABASE_URL=" "$ENV_FILE" > "$tmp_file" || true
    printf "DATABASE_URL=mysql://handler_blog:CHANGE_ME@127.0.0.1:3308/handler_blog\n" >> "$tmp_file"
    mv "$tmp_file" "$ENV_FILE"
    echo "Created $ENV_FILE with a placeholder DATABASE_URL."
    echo "Please update it and re-run deploy."
    exit 1
  fi
fi

log_step "Preparing local build"
echo "Project: $DEPLOY_APP_NAME"
echo "Server: $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_SSH_PORT"
echo "App root: $DEPLOY_APP_ROOT"
echo "App port: $DEPLOY_APP_PORT"

log_step "Installing dependencies"
pnpm install

if [ "${DEPLOY_RUN_DB_GENERATE:-}" = "1" ]; then
  log_step "Generating Drizzle migrations (local)"
  pnpm db:generate
else
  log_step "Skipping Drizzle migrations (local)"
fi

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
SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 pnpm install --frozen-lockfile

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
