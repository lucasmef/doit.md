#!/usr/bin/env bash
# scripts/deploy.sh
# Unified deployment script for doit.md on VPS (Systemd version)

set -euo pipefail

ENV="${1:?Usage: $0 <dev|prod>}"
PORT="${2:-}"
APP_DIR=""
SERVICE_NAME=""

if [ "$ENV" == "prod" ]; then
  APP_DIR="/var/www/doit"
  SERVICE_NAME="doit-web"
  PORT="${PORT:-3000}"
elif [ "$ENV" == "dev" ]; then
  APP_DIR="/var/www/doit-dev"
  SERVICE_NAME="doit-web-dev"
  PORT="${PORT:-3001}"
else
  echo "❌ Environment must be 'dev' or 'prod'"
  exit 1
fi

echo "======================================================"
echo " 🚀 Deploying to $ENV (Port: $PORT)"
echo " Service: $SERVICE_NAME"
echo " Directory: $APP_DIR"
echo "======================================================"

cd "$APP_DIR"

# ── 1. Install Dependencies ────────────────────────────────
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# ── 2. Build ───────────────────────────────────────────────
echo "→ Building application..."
pnpm --filter @doit/web build

# ── 3. Clean Orphans ───────────────────────────────────────
# Finding processes on the target port and killing them
echo "→ Cleaning orphaned processes on port $PORT..."
ORPHANS=$(lsof -t -i:"$PORT" || true)
if [ -n "$ORPHANS" ]; then
  echo "  Killing: $ORPHANS"
  echo "$ORPHANS" | xargs kill -9 || true
fi

# ── 4. Restart Systemd Service ─────────────────────────────
echo "→ Restarting service $SERVICE_NAME..."
sudo systemctl restart "$SERVICE_NAME"

# ── 5. Healthcheck ────────────────────────────────────────
echo "→ Validating healthcheck..."
MAX_ATTEMPTS=10
ATTEMPT=1
HEALTH_URL="http://localhost:$PORT/api/health"

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "  [$ATTEMPT/$MAX_ATTEMPTS] Checking $HEALTH_URL..."
  if curl -fsS "$HEALTH_URL" > /dev/null; then
    echo "✅ Deploy successful! $ENV is online."
    exit 0
  fi
  ATTEMPT=$((ATTEMPT + 1))
  sleep 5
done

echo "❌ Healthcheck failed after $MAX_ATTEMPTS attempts."
echo "→ Checking logs..."
sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager
exit 1
