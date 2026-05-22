#!/usr/bin/env bash
# Install Doit systemd units on the VPS.

set -euo pipefail

BASE_DIR="${1:-/srv/doit/prod/app}"

install -m 644 "$BASE_DIR/infra/systemd/doit.service" /etc/systemd/system/doit.service
install -m 644 "$BASE_DIR/infra/systemd/doit-reminders.service" /etc/systemd/system/doit-reminders.service
install -m 644 "$BASE_DIR/infra/systemd/doit-reminders.timer" /etc/systemd/system/doit-reminders.timer
install -m 644 "$BASE_DIR/infra/systemd/doit-calendar-sync.service" /etc/systemd/system/doit-calendar-sync.service
install -m 644 "$BASE_DIR/infra/systemd/doit-calendar-sync.timer" /etc/systemd/system/doit-calendar-sync.timer

systemctl daemon-reload
systemctl enable doit.service
systemctl enable --now doit-reminders.timer doit-calendar-sync.timer
systemctl reset-failed doit.service || true
systemctl reset-failed doit-reminders.service doit-calendar-sync.service || true

echo "Doit systemd units installed."
