#!/usr/bin/env bash
# Install Doit systemd units on the VPS.

set -euo pipefail

BASE_DIR="${1:-/srv/doit/dev/app}"

install -m 644 "$BASE_DIR/infra/systemd/doit.service" /etc/systemd/system/doit.service
install -m 644 "$BASE_DIR/infra/systemd/doit-dev.service" /etc/systemd/system/doit-dev.service

systemctl daemon-reload
systemctl enable doit.service doit-dev.service
systemctl reset-failed doit.service doit-dev.service || true

echo "Doit systemd units installed."
