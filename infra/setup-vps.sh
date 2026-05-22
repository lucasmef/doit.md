#!/usr/bin/env bash
# Initial VPS setup for doit.md on the shared Salomao/Doit host.
# Run on the VPS after the public domain DNS points to the server.

set -euo pipefail

DOIT_PUBLIC_DOMAIN="${1:?Usage: bash infra/setup-vps.sh <doit-public-domain>}"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name"
    exit 1
  fi
}

require_command sudo
require_command rsync
require_command sed
require_command systemctl
require_command nginx

echo "Preparing Doit directories..."
sudo install -d -o salomao -g salomao /srv/doit/prod/app
sudo install -d -m 700 -o salomao -g salomao /srv/doit/prod/doit-config

env_path="/srv/doit/prod/doit-config/web.env"
if [[ ! -f "$env_path" ]]; then
  sudo install -m 600 -o salomao -g salomao infra/env/web.env.example "$env_path"
  echo "Created $env_path from example. Fill it with real secrets before deploy."
fi

echo "Installing systemd units..."
sudo install -m 644 infra/systemd/doit.service /etc/systemd/system/doit.service
sudo install -m 644 infra/systemd/doit-calendar-sync.service /etc/systemd/system/doit-calendar-sync.service
sudo install -m 644 infra/systemd/doit-calendar-sync.timer /etc/systemd/system/doit-calendar-sync.timer
sudo systemctl daemon-reload
sudo systemctl enable doit.service
sudo systemctl enable --now doit-calendar-sync.timer

echo "Installing limited sudoers rule for GitHub Actions deploy..."
sudo install -m 440 infra/sudoers/doit-actions /etc/sudoers.d/doit-actions
sudo visudo -cf /etc/sudoers.d/doit-actions

echo "Preparing Nginx site files..."
tmp_prod="$(mktemp)"
sed "s/DOIT_PUBLIC_DOMAIN/$DOIT_PUBLIC_DOMAIN/g" infra/nginx/sites-available/doit.conf > "$tmp_prod"
sudo install -m 644 "$tmp_prod" /etc/nginx/sites-available/doit
rm -f "$tmp_prod"

echo "Doit Nginx files installed but not enabled."
echo "Before enabling production, issue TLS for $DOIT_PUBLIC_DOMAIN."
echo
echo "Suggested follow-up commands after env files and TLS are ready:"
echo "  sudo ln -s /etc/nginx/sites-available/doit /etc/nginx/sites-enabled/doit"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
