#!/usr/bin/env bash
# Remove the legacy Doit development runtime from the VPS.

set -euo pipefail

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root."
  exit 1
fi

DEV_ENV_FILE="${DOIT_DEV_ENV_FILE:-/srv/doit/dev/doit-config/web.env}"
DEV_DIR="${DOIT_DEV_DIR:-/srv/doit/dev}"
DEV_NGINX_SITE="${DOIT_DEV_NGINX_SITE:-doit-dev-tailscale}"

DB_NAME=""
DB_USER=""
if [[ -f "$DEV_ENV_FILE" ]]; then
  eval "$(
    python3 - "$DEV_ENV_FILE" <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import shlex
import sys

path = Path(sys.argv[1])
line = next((x for x in path.read_text().splitlines() if x.startswith("DATABASE_URL=")), "")
raw = line.split("=", 1)[1].strip().strip("\"'") if line else ""
url = urlparse(raw)
print(f"DB_NAME={shlex.quote(url.path.lstrip('/'))}")
print(f"DB_USER={shlex.quote(url.username or '')}")
PY
  )"
fi

echo "Stopping legacy Doit dev units..."
systemctl disable --now \
  doit-dev.service \
  doit-dev-reminders.timer \
  doit-dev-calendar-sync.timer \
  2>/dev/null || true

rm -f \
  /etc/systemd/system/doit-dev.service \
  /etc/systemd/system/doit-dev-reminders.service \
  /etc/systemd/system/doit-dev-reminders.timer \
  /etc/systemd/system/doit-dev-calendar-sync.service \
  /etc/systemd/system/doit-dev-calendar-sync.timer

systemctl daemon-reload
systemctl reset-failed \
  doit-dev.service \
  doit-dev-reminders.service \
  doit-dev-calendar-sync.service \
  2>/dev/null || true

echo "Removing legacy Doit dev Nginx site..."
rm -f \
  "/etc/nginx/sites-enabled/$DEV_NGINX_SITE" \
  "/etc/nginx/sites-available/$DEV_NGINX_SITE"

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
fi

if [[ -n "$DB_NAME" ]]; then
  if [[ "$DB_NAME" != *dev* ]]; then
    echo "Refusing to drop database without dev marker in name: $DB_NAME"
    exit 1
  fi

  echo "Dropping legacy Doit dev database: $DB_NAME"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE);"
fi

if [[ -n "$DB_USER" ]]; then
  if [[ "$DB_USER" != *dev* ]]; then
    echo "Refusing to drop role without dev marker in name: $DB_USER"
    exit 1
  fi

  echo "Dropping legacy Doit dev database role: $DB_USER"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP ROLE IF EXISTS \"$DB_USER\";"
fi

echo "Removing legacy Doit dev directory: $DEV_DIR"
rm -rf --one-file-system "$DEV_DIR"

echo "Doit dev runtime removed."
