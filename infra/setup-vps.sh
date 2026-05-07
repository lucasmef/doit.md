#!/usr/bin/env bash
# Initial VPS setup for doit.md on the shared Salomao/Doit host.
# Run on the VPS after the public domain DNS points to the server.

set -euo pipefail

DOIT_PUBLIC_DOMAIN="${1:?Usage: bash infra/setup-vps.sh <doit-public-domain>}"
TAILSCALE_HOST="${TAILSCALE_HOST:?Set TAILSCALE_HOST before running setup}"
TAILSCALE_IPV4="${TAILSCALE_IPV4:?Set TAILSCALE_IPV4 before running setup}"
TAILSCALE_IPV6="${TAILSCALE_IPV6:?Set TAILSCALE_IPV6 before running setup}"
TAILSCALE_ALLOWED_CIDR="${TAILSCALE_ALLOWED_CIDR:?Set TAILSCALE_ALLOWED_CIDR before running setup}"

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
sudo install -d -o salomao -g salomao /srv/doit/dev/app
sudo install -d -m 700 -o salomao -g salomao /srv/doit/prod/doit-config
sudo install -d -m 700 -o salomao -g salomao /srv/doit/dev/doit-config

for env_name in prod dev; do
  env_path="/srv/doit/$env_name/doit-config/web.env"
  if [[ ! -f "$env_path" ]]; then
    sudo install -m 600 -o salomao -g salomao infra/env/web.env.example "$env_path"
    echo "Created $env_path from example. Fill it with real secrets before deploy."
  fi
done

echo "Installing systemd units..."
sudo install -m 644 infra/systemd/doit.service /etc/systemd/system/doit.service
sudo install -m 644 infra/systemd/doit-dev.service /etc/systemd/system/doit-dev.service
sudo systemctl daemon-reload
sudo systemctl enable doit.service
sudo systemctl enable doit-dev.service

echo "Installing limited sudoers rule for GitHub Actions deploy..."
sudo install -m 440 infra/sudoers/doit-actions /etc/sudoers.d/doit-actions
sudo visudo -cf /etc/sudoers.d/doit-actions

echo "Preparing Nginx site files..."
tmp_prod="$(mktemp)"
tmp_dev="$(mktemp)"
sed "s/DOIT_PUBLIC_DOMAIN/$DOIT_PUBLIC_DOMAIN/g" infra/nginx/sites-available/doit.conf > "$tmp_prod"
sed \
  -e "s/TAILSCALE_HOST/$TAILSCALE_HOST/g" \
  -e "s/TAILSCALE_IPV4/$TAILSCALE_IPV4/g" \
  -e "s/TAILSCALE_IPV6/$TAILSCALE_IPV6/g" \
  -e "s|TAILSCALE_ALLOWED_CIDR|$TAILSCALE_ALLOWED_CIDR|g" \
  infra/nginx/sites-available/doit-dev-tailscale.conf > "$tmp_dev"
sudo install -m 644 "$tmp_prod" /etc/nginx/sites-available/doit
sudo install -m 644 "$tmp_dev" /etc/nginx/sites-available/doit-dev-tailscale
rm -f "$tmp_prod" "$tmp_dev"

echo "Doit Nginx files installed but not enabled."
echo "Before enabling production, issue TLS for $DOIT_PUBLIC_DOMAIN."
echo "Before enabling dev, allow TCP 8444 only on tailscale0 if UFW is active."
echo
echo "Suggested follow-up commands after env files and TLS are ready:"
echo "  sudo ln -s /etc/nginx/sites-available/doit /etc/nginx/sites-enabled/doit"
echo "  sudo ln -s /etc/nginx/sites-available/doit-dev-tailscale /etc/nginx/sites-enabled/doit-dev-tailscale"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
