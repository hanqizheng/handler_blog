#!/usr/bin/env bash
set -euo pipefail

APP_NAME="handler_blog"
APP_ROOT="/root/handler_blog"
APP_PORT="8283"
NGINX_PORT="8282"
MYSQL_CONTAINER="handler-blog-db"
MYSQL_PORT="3308"
MYSQL_DB="handler_blog"
MYSQL_USER="handler_blog"
NGINX_CONF="/etc/nginx/conf.d/handler_blog.conf"

read -s -p "MySQL root password: " MYSQL_ROOT_PASSWORD
echo
read -s -p "MySQL app user password: " MYSQL_PASSWORD
echo

mkdir -p "$APP_ROOT"/{app,logs,backups,scripts,mysql_data}

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

ufw allow "$NGINX_PORT"/tcp

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
