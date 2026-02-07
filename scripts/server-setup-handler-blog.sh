#!/usr/bin/env bash
set -euo pipefail

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
CONFIG_FILE="${DEPLOY_CONFIG_FILE:-$ROOT_DIR/.deploy.env}"

if [ -f "$CONFIG_FILE" ]; then
  set -a
  . "$CONFIG_FILE"
  set +a
fi

: "${DEPLOY_APP_NAME:=handler_blog}"
: "${DEPLOY_APP_ROOT:=/root/${DEPLOY_APP_NAME}}"
: "${DEPLOY_APP_PORT:=8283}"
: "${DEPLOY_NGINX_PORT:=8282}"
: "${DEPLOY_MYSQL_CONTAINER:=handler-blog-db}"
: "${DEPLOY_MYSQL_PORT:=3308}"
: "${DEPLOY_MYSQL_DB:=handler_blog}"
: "${DEPLOY_MYSQL_USER:=handler_blog}"
: "${DEPLOY_NGINX_CONF:=/etc/nginx/conf.d/${DEPLOY_APP_NAME}.conf}"
: "${DEPLOY_APP_OWNER:=}"

if [ -z "$DEPLOY_APP_OWNER" ]; then
  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    DEPLOY_APP_OWNER="$SUDO_USER"
  else
    DEPLOY_APP_OWNER="$(id -un)"
  fi
fi

initial_app_name="$DEPLOY_APP_NAME"
initial_app_root="$DEPLOY_APP_ROOT"

echo
echo "Server setup config (press Enter to use default):"
DEPLOY_APP_NAME=$(prompt_required "App Name" "$DEPLOY_APP_NAME")
default_app_root="$initial_app_root"
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ] && [ "$initial_app_root" = "/root/$initial_app_name" ]; then
  default_app_root="/home/$SUDO_USER/$DEPLOY_APP_NAME"
fi
DEPLOY_APP_ROOT=$(prompt_required "App Root" "$default_app_root")
DEPLOY_APP_PORT=$(prompt_required "App Port" "$DEPLOY_APP_PORT")
DEPLOY_NGINX_PORT=$(prompt_required "Nginx Public Port" "$DEPLOY_NGINX_PORT")
DEPLOY_MYSQL_PORT=$(prompt_required "MySQL Host Port" "$DEPLOY_MYSQL_PORT")
DEPLOY_MYSQL_DB=$(prompt_required "MySQL Database Name" "$DEPLOY_MYSQL_DB")
DEPLOY_MYSQL_USER=$(prompt_required "MySQL App User" "$DEPLOY_MYSQL_USER")
DEPLOY_MYSQL_CONTAINER=$(prompt_required "MySQL Container Name" "$DEPLOY_MYSQL_CONTAINER")
DEPLOY_APP_OWNER=$(prompt_required "App File Owner" "$DEPLOY_APP_OWNER")
default_nginx_conf="$DEPLOY_NGINX_CONF"
if [ "$DEPLOY_NGINX_CONF" = "/etc/nginx/conf.d/${initial_app_name}.conf" ]; then
  default_nginx_conf="/etc/nginx/conf.d/${DEPLOY_APP_NAME}.conf"
fi
DEPLOY_NGINX_CONF=$(prompt_required "Nginx Config Path" "$default_nginx_conf")

APP_NAME="$DEPLOY_APP_NAME"
APP_ROOT="$DEPLOY_APP_ROOT"
APP_PORT="$DEPLOY_APP_PORT"
NGINX_PORT="$DEPLOY_NGINX_PORT"
MYSQL_CONTAINER="$DEPLOY_MYSQL_CONTAINER"
MYSQL_PORT="$DEPLOY_MYSQL_PORT"
MYSQL_DB="$DEPLOY_MYSQL_DB"
MYSQL_USER="$DEPLOY_MYSQL_USER"
NGINX_CONF="$DEPLOY_NGINX_CONF"
APP_OWNER="$DEPLOY_APP_OWNER"

if [ -z "${DEPLOY_MYSQL_ROOT_PASSWORD:-}" ]; then
  read -s -p "MySQL root password: " MYSQL_ROOT_PASSWORD
  echo
else
  MYSQL_ROOT_PASSWORD="$DEPLOY_MYSQL_ROOT_PASSWORD"
fi

if [ -z "${DEPLOY_MYSQL_PASSWORD:-}" ]; then
  read -s -p "MySQL app user password: " MYSQL_PASSWORD
  echo
else
  MYSQL_PASSWORD="$DEPLOY_MYSQL_PASSWORD"
fi

mkdir -p "$APP_ROOT"/{app,logs,backups,scripts,mysql_data}
chown "$APP_OWNER:$APP_OWNER" "$APP_ROOT"
chown -R "$APP_OWNER:$APP_OWNER" "$APP_ROOT/app" "$APP_ROOT/logs" "$APP_ROOT/backups" "$APP_ROOT/scripts"

if docker ps -a --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
  if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
    docker start "$MYSQL_CONTAINER"
  fi
else
  docker run -d \
    --name "$MYSQL_CONTAINER" \
    --restart unless-stopped \
    -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
    -e MYSQL_DATABASE="$MYSQL_DB" \
    -e MYSQL_USER="$MYSQL_USER" \
    -e MYSQL_PASSWORD="$MYSQL_PASSWORD" \
    -p "$MYSQL_PORT":3306 \
    -v "$APP_ROOT/mysql_data":/var/lib/mysql \
    mysql:8.0
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow "$NGINX_PORT"/tcp
else
  echo "ufw not found, skipping firewall rule setup."
fi

if [ ! -f "$NGINX_CONF" ]; then
  cat > "$NGINX_CONF" <<NGINX
server {
    listen $NGINX_PORT;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

  nginx -t
  systemctl reload nginx
fi

echo

echo "Server setup complete."
echo "MySQL: mysql://${MYSQL_USER}:[password]@127.0.0.1:${MYSQL_PORT}/${MYSQL_DB}"
echo "Nginx: http://<server-ip>:${NGINX_PORT} -> 127.0.0.1:${APP_PORT}"
