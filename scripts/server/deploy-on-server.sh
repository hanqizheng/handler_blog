#!/usr/bin/env bash
set -euo pipefail
umask 077

IMAGE=${1:?usage: deploy-on-server.sh ghcr.io/hanqizheng/handler_blog:<full-commit-sha>}
ROOT=${HANDLER_BLOG_ROOT:-/opt/handler-blog}
ENV_FILE=${HANDLER_BLOG_ENV_FILE:-$ROOT/envs/app.env}
APP_PORT=${HANDLER_BLOG_PORT:-8284}
PROBE_PORT=${HANDLER_BLOG_PROBE_PORT:-8285}
ATTEMPTS=${HEALTH_ATTEMPTS:-30}
INTERVAL=${HEALTH_INTERVAL:-2}
RUN_MIGRATIONS=${RUN_MIGRATIONS:-0}
COMPOSE_FILE="$ROOT/deploy/docker-compose.yml"
PROBE_NAME="handler-blog-probe-${IMAGE##*:}"
PREVIOUS_IMAGE=""
PROMOTING=0
COMMITTED=0
PROBE_STARTED=0

die() { echo "[deploy] $*" >&2; exit 1; }
[[ "$IMAGE" =~ ^ghcr\.io/hanqizheng/handler_blog:[a-f0-9]{40}$ ]] || die "Expected a full commit SHA image tag"
[[ "$ROOT" = /* && "$ENV_FILE" = /* ]] || die "Use absolute deployment paths"
for task_port in "$APP_PORT" "$PROBE_PORT"; do
  [[ "$task_port" =~ ^[0-9]{1,5}$ ]] || die "Invalid port"
  (( 10#$task_port >= 1 && 10#$task_port <= 65535 )) || die "Invalid port"
done
[[ "$APP_PORT" != "$PROBE_PORT" ]] || die "App and probe ports must differ"
[[ "$ATTEMPTS" =~ ^[1-9][0-9]?$ && "$INTERVAL" =~ ^[0-5]$ ]] || die "Invalid health check limits"
[[ "$RUN_MIGRATIONS" = 0 || "$RUN_MIGRATIONS" = 1 ]] || die "RUN_MIGRATIONS must be 0 or 1"
[[ -f "$ENV_FILE" && -f "$COMPOSE_FILE" ]] || die "Missing server app.env or Compose file; complete bootstrap first"
for task_command in docker curl flock ss; do
  command -v "$task_command" >/dev/null || die "Missing required command: $task_command"
done
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || die "Another deployment is running"

export HANDLER_BLOG_IMAGE="$IMAGE" HANDLER_BLOG_ENV_FILE="$ENV_FILE" HANDLER_BLOG_PORT="$APP_PORT"
compose() {
  docker compose --project-name handler-blog -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}
healthy() {
  local port=$1
  local container=$2
  local attempt
  for (( attempt=1; attempt<=ATTEMPTS; attempt++ )); do
    if [[ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null || true)" = true ]] &&
      curl -fsS --max-time 5 -o /dev/null "http://127.0.0.1:$port/api/health" 2>/dev/null &&
      curl -fsSL --max-redirs 3 --max-time 5 -o /dev/null "http://127.0.0.1:$port/zh-CN" 2>/dev/null; then
      return 0
    fi
    sleep "$INTERVAL"
  done
  return 1
}
diagnose() {
  local port=$1
  local container=$2
  # Emit only status codes/state; never print logs, env or resolved config.
  docker inspect --format 'container status={{.State.Status}} exit={{.State.ExitCode}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container" 2>/dev/null || true
  printf '[deploy] Database health HTTP status: '
  curl -sS --max-time 5 -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$port/api/health" 2>/dev/null || true
  printf '[deploy] Homepage HTTP status: '
  curl -sSL --max-redirs 3 --max-time 5 -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$port/zh-CN" 2>/dev/null || true
}
cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$PROBE_STARTED" = 1 ]]; then
    docker rm -f "$PROBE_NAME" >/dev/null 2>&1 || true
  fi
  if [[ "$PROMOTING" = 1 && "$COMMITTED" = 0 ]]; then
    if [[ -n "$PREVIOUS_IMAGE" ]]; then
      export HANDLER_BLOG_IMAGE="$PREVIOUS_IMAGE"
      if compose up -d --no-deps --force-recreate --pull never app >/dev/null 2>&1 &&
        healthy "$APP_PORT" handler-blog-app; then
        echo "[deploy] Restored previous image; current app.env retained" >&2
      else
        echo "[deploy] Previous image could not be restored; inspect the server" >&2
      fi
    else
      docker rm -f handler-blog-app >/dev/null 2>&1 || true
      echo "[deploy] Removed failed first Docker deployment; PM2 was not changed" >&2
    fi
  fi
  exit "$status"
}

docker image inspect "$IMAGE" >/dev/null 2>&1 || die "Image is not loaded; deploy the image from CI first"
# Never print resolved Compose config, which contains production credentials.
compose config --quiet >/dev/null 2>&1 || die "Invalid server Compose/environment configuration"
probe_listeners=$(ss -H -ltn "sport = :$PROBE_PORT") || die "Could not check probe port"
[[ -z "$probe_listeners" ]] || die "Probe port is already occupied"
if docker inspect handler-blog-app >/dev/null 2>&1; then
  [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' handler-blog-app)" = handler-blog ]] || die "Container name belongs to another deployment"
  previous_id=$(docker inspect --format '{{.Image}}' handler-blog-app)
  PREVIOUS_IMAGE="handler-blog-rollback:${previous_id#sha256:}"
  docker image tag "$previous_id" "$PREVIOUS_IMAGE"
else
  app_listeners=$(ss -H -ltn "sport = :$APP_PORT") || die "Could not check app port"
  [[ -z "$app_listeners" ]] || die "First deployment port is occupied"
fi
docker inspect "$PROBE_NAME" >/dev/null 2>&1 && die "A probe container already exists; inspect it before retrying"
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$RUN_MIGRATIONS" = 1 ]]; then
  [[ -n "${MIGRATION_BACKUP_FILE:-}" && "$MIGRATION_BACKUP_FILE" = /* && -s "$MIGRATION_BACKUP_FILE" ]] || die "Migrations require an existing nonempty absolute MIGRATION_BACKUP_FILE"
fi

echo "[deploy] Validating runtime variable names/configuration"
compose run --rm --no-deps --pull never app node scripts/check-runtime-env.mjs

if [[ "$RUN_MIGRATIONS" = 1 ]]; then
  echo "[deploy] Applying migrations; database changes are not automatically rolled back"
  compose run --rm --no-deps --pull never app node scripts/migrate.mjs
fi

echo "[deploy] Checking candidate image on loopback port $PROBE_PORT"
PROBE_STARTED=1
compose run -d --no-deps --pull never --name "$PROBE_NAME" -e PORT="$PROBE_PORT" app >/dev/null
healthy "$PROBE_PORT" "$PROBE_NAME" || { diagnose "$PROBE_PORT" "$PROBE_NAME"; die "Candidate failed database/page checks; current service retained"; }
docker rm -f "$PROBE_NAME" >/dev/null
PROBE_STARTED=0

echo "[deploy] Promoting candidate to loopback port $APP_PORT"
PROMOTING=1
compose up -d --no-deps --force-recreate --pull never app
healthy "$APP_PORT" handler-blog-app || { diagnose "$APP_PORT" handler-blog-app; die "Production health check failed"; }
if [[ -n "$PREVIOUS_IMAGE" ]]; then
  printf '%s\n' "$PREVIOUS_IMAGE" > "$ROOT/.previous_image.tmp"
  mv "$ROOT/.previous_image.tmp" "$ROOT/.previous_image"
fi
printf '%s\n' "$IMAGE" > "$ROOT/.current_image.tmp"
mv "$ROOT/.current_image.tmp" "$ROOT/.current_image"
COMMITTED=1
echo "[deploy] Deployment completed; server app.env retained"
