#!/usr/bin/env bash
# Load the VPS-hosted environment file before commands that need build-time env.

set -euo pipefail

TARGET_ENV="${1:?Usage: $0 <dev|prod> <command...>}"
shift

case "$TARGET_ENV" in
  prod)
    ENV_FILE="${DOIT_PROD_ENV_FILE:-/srv/doit/prod/doit-config/web.env}"
    ;;
  dev)
    ENV_FILE="${DOIT_DEV_ENV_FILE:-/srv/doit/dev/doit-config/web.env}"
    ;;
  *)
    echo "Environment must be 'dev' or 'prod'."
    exit 1
    ;;
esac

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Required build env file missing: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2304}"

exec "$@"
