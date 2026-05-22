#!/usr/bin/env bash
# Load build-time environment for commands that need it.

set -euo pipefail

TARGET_ENV="${1:?Usage: $0 <ci|prod> <command...>}"
shift

case "$TARGET_ENV" in
  ci)
    export DATABASE_URL="${DATABASE_URL:-postgresql://doit_ci:doit_ci@127.0.0.1:5432/doit_ci}"
    export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-ci-build-secret}"
    export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
    export GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-ci-google-client-id}"
    export GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-ci-google-client-secret}"
    export GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI:-http://localhost:3000/api/google/callback}"
    export NEXT_PUBLIC_VAPID_PUBLIC_KEY="${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-ci-vapid-public-key}"
    export VAPID_PRIVATE_KEY="${VAPID_PRIVATE_KEY:-ci-vapid-private-key}"
    export VAPID_EMAIL="${VAPID_EMAIL:-mailto:ci@example.invalid}"
    ;;
  prod)
    ENV_FILE="${DOIT_PROD_ENV_FILE:-/srv/doit/prod/doit-config/web.env}"
    if [[ ! -f "$ENV_FILE" ]]; then
      echo "Required build env file missing: $ENV_FILE"
      exit 1
    fi

    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
    ;;
  *)
    echo "Environment must be 'ci' or 'prod'."
    exit 1
    ;;
esac

export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"
DOIT_NODE_MAX_OLD_SPACE_SIZE="${DOIT_NODE_MAX_OLD_SPACE_SIZE:-2048}"
if [[ "${NODE_OPTIONS:-}" != *"--max-old-space-size="* ]]; then
  if [[ -n "${NODE_OPTIONS:-}" ]]; then
    export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=$DOIT_NODE_MAX_OLD_SPACE_SIZE"
  else
    export NODE_OPTIONS="--max-old-space-size=$DOIT_NODE_MAX_OLD_SPACE_SIZE"
  fi
else
  export NODE_OPTIONS
fi

exec "$@"
