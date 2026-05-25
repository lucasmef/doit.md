#!/usr/bin/env bash
# Unified deployment script for doit.md on the shared KingHost VPS.

set -euo pipefail

TARGET_ENV="${1:?Usage: $0 <prod>}"
PORT="${2:-}"

case "$TARGET_ENV" in
  prod)
    APP_DIR="${DOIT_PROD_APP_DIR:-/srv/doit/prod/app}"
    ENV_FILE="${DOIT_PROD_ENV_FILE:-/srv/doit/prod/doit-config/web.env}"
    SERVICE_NAME="${DOIT_PROD_SERVICE:-doit.service}"
    PORT="${PORT:-8110}"
    ;;
  *)
    echo "Environment must be 'prod'."
    exit 1
    ;;
esac

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name"
    exit 1
  fi
}

require_file() {
  local path="$1"
  local label="$2"
  if [[ ! -f "$path" ]]; then
    echo "Required file missing: $label ($path)"
    exit 1
  fi
}

read_env_value() {
  local key="$1"
  awk -F= -v wanted="$key" '$1 == wanted {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE"
}

require_env_key() {
  local key="$1"
  local value
  value="$(read_env_value "$key")"
  if [[ -z "$value" || "$value" =~ ^\<.*\>$ ]]; then
    echo "Required env key missing, placeholder, or empty in $ENV_FILE: $key"
    exit 1
  fi
}

current_systemd_main_pid() {
  systemctl show "$SERVICE_NAME" -p MainPID --value 2>/dev/null \
    || sudo systemctl show "$SERVICE_NAME" -p MainPID --value 2>/dev/null \
    || true
}

list_listener_pids() {
  local port="$1"
  local listener_output
  listener_output="$(ss -ltnp "( sport = :$port )" 2>/dev/null || true)"
  if [[ -z "$listener_output" ]]; then
    listener_output="$(sudo ss -ltnp "( sport = :$port )" 2>/dev/null || true)"
  fi

  printf '%s\n' "$listener_output" \
    | grep -o 'pid=[0-9]\+' \
    | cut -d= -f2 \
    | sort -u
}

terminate_pid() {
  local signal_name="$1"
  local pid="$2"
  kill "-$signal_name" "$pid" 2>/dev/null \
    || sudo kill "-$signal_name" "$pid" 2>/dev/null \
    || true
}

cleanup_orphan_listener() {
  local port="$1"
  local main_pid
  main_pid="$(current_systemd_main_pid)"

  mapfile -t listener_pids < <(list_listener_pids "$port")
  if [[ ${#listener_pids[@]} -eq 0 ]]; then
    return
  fi

  for listener_pid in "${listener_pids[@]}"; do
    if [[ -n "$main_pid" && "$main_pid" != "0" && "$listener_pid" == "$main_pid" ]]; then
      continue
    fi

    local command_line
    command_line="$(ps -p "$listener_pid" -o args= 2>/dev/null || true)"
    if [[ "$command_line" != *"next"* && "$command_line" != *"server.js"* ]]; then
      echo "Port $port is occupied by an unexpected process: PID $listener_pid ($command_line)"
      exit 1
    fi

    echo "Stopping orphan listener on port $port: PID $listener_pid"
    terminate_pid TERM "$listener_pid"
  done

  sleep 2
  mapfile -t lingering_pids < <(list_listener_pids "$port")
  for lingering_pid in "${lingering_pids[@]}"; do
    if [[ -n "$main_pid" && "$main_pid" != "0" && "$lingering_pid" == "$main_pid" ]]; then
      continue
    fi
    echo "Killing lingering listener on port $port: PID $lingering_pid"
    terminate_pid KILL "$lingering_pid"
  done
}

verify_systemd_listener() {
  local port="$1"
  local main_pid
  main_pid="$(current_systemd_main_pid)"
  if [[ -z "$main_pid" || "$main_pid" == "0" ]]; then
    echo "Service $SERVICE_NAME has no active MainPID after restart."
    exit 1
  fi

  if ! systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null \
    && ! sudo systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "Service $SERVICE_NAME is not active after restart."
    exit 1
  fi

  mapfile -t listener_pids < <(list_listener_pids "$port")
  if [[ ${#listener_pids[@]} -eq 0 ]]; then
    echo "No listener found on port $port after healthcheck."
    exit 1
  fi

  for listener_pid in "${listener_pids[@]}"; do
    if [[ "$listener_pid" == "$main_pid" ]]; then
      echo "Listener validated on port $port with MainPID $main_pid."
      return
    fi

    local command_line
    command_line="$(ps -p "$listener_pid" -o args= 2>/dev/null || true)"
    if [[ "$command_line" == *"next"* || "$command_line" == *"server.js"* ]]; then
      echo "Listener validated on port $port with child PID $listener_pid."
      return
    fi
  done

  echo "Healthcheck answered, but no expected Next.js listener was found on port $port."
  echo "Detected listeners: ${listener_pids[*]:-none}"
  exit 1
}

PNPM_CMD=(pnpm)
if ! command -v pnpm >/dev/null 2>&1; then
  require_command corepack
  PNPM_CMD=(corepack pnpm)
fi
require_command curl
require_command ps
require_command ss
require_command awk
require_command grep
require_command cut
require_command sort
require_command sudo

require_file "$APP_DIR/package.json" "repository package.json"
require_file "$APP_DIR/apps/web/package.json" "web package.json"
require_file "$ENV_FILE" "runtime env file"

require_env_key DATABASE_URL
require_env_key NEXTAUTH_SECRET
require_env_key NEXTAUTH_URL
require_env_key NEXT_PUBLIC_VAPID_PUBLIC_KEY
require_env_key VAPID_PRIVATE_KEY
require_env_key VAPID_EMAIL

echo "======================================================"
echo "Deploying doit.md to $TARGET_ENV"
echo "Service: $SERVICE_NAME"
echo "Directory: $APP_DIR"
echo "Env file: $ENV_FILE"
echo "Port: $PORT"
echo "======================================================"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a
export NODE_ENV=production
export PORT="$PORT"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"
export DOIT_SKIP_NEXT_BUILD_VALIDATION="${DOIT_SKIP_NEXT_BUILD_VALIDATION:-1}"
DOIT_NODE_MAX_OLD_SPACE_SIZE="${DOIT_NODE_MAX_OLD_SPACE_SIZE:-1792}"
if [[ "${NODE_OPTIONS:-}" != *"--max-old-space-size="* ]]; then
  if [[ -n "${NODE_OPTIONS:-}" ]]; then
    export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=$DOIT_NODE_MAX_OLD_SPACE_SIZE"
  else
    export NODE_OPTIONS="--max-old-space-size=$DOIT_NODE_MAX_OLD_SPACE_SIZE"
  fi
else
  export NODE_OPTIONS
fi

cd "$APP_DIR"

echo "Installing dependencies..."
"${PNPM_CMD[@]}" install --frozen-lockfile --prod=false

echo "Building application..."
"${PNPM_CMD[@]}" --filter @doit/web build

echo "Preparing standalone static assets..."
rm -rf apps/web/.next/standalone/apps/web/.next/static
cp -R apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
if [[ -d apps/web/public ]]; then
  rm -rf apps/web/.next/standalone/apps/web/public
  cp -R apps/web/public apps/web/.next/standalone/apps/web/public
fi

echo "Cleaning orphan listeners on port $PORT..."
cleanup_orphan_listener "$PORT"

echo "Restarting service $SERVICE_NAME..."
sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"

echo "Validating healthcheck..."
HEALTH_URL="http://127.0.0.1:$PORT/api/health"
HEALTHCHECK_OK=false
for attempt in $(seq 1 12); do
  sleep 5
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null 2>&1; then
    HEALTHCHECK_OK=true
    break
  fi
  echo "Attempt $attempt/12 failed; waiting..."
done

if [[ "$HEALTHCHECK_OK" != "true" ]]; then
  echo "Healthcheck failed after 12 attempts: $HEALTH_URL"
  sudo journalctl -u "$SERVICE_NAME" -n 80 --no-pager || true
  exit 1
fi

verify_systemd_listener "$PORT"
echo "Deploy successful: $TARGET_ENV is online at $HEALTH_URL"
