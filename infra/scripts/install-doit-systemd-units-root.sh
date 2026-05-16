#!/usr/bin/env bash
# Install Doit systemd units on the VPS.

set -euo pipefail

BASE_DIR="${1:-/srv/doit/dev/app}"

install -m 644 "$BASE_DIR/infra/systemd/doit.service" /etc/systemd/system/doit.service
install -m 644 "$BASE_DIR/infra/systemd/doit-dev.service" /etc/systemd/system/doit-dev.service
install -m 644 "$BASE_DIR/infra/systemd/doit-reminders.service" /etc/systemd/system/doit-reminders.service
install -m 644 "$BASE_DIR/infra/systemd/doit-reminders.timer" /etc/systemd/system/doit-reminders.timer
install -m 644 "$BASE_DIR/infra/systemd/doit-dev-reminders.service" /etc/systemd/system/doit-dev-reminders.service
install -m 644 "$BASE_DIR/infra/systemd/doit-dev-reminders.timer" /etc/systemd/system/doit-dev-reminders.timer
install -m 644 "$BASE_DIR/infra/systemd/doit-calendar-sync.service" /etc/systemd/system/doit-calendar-sync.service
install -m 644 "$BASE_DIR/infra/systemd/doit-calendar-sync.timer" /etc/systemd/system/doit-calendar-sync.timer
install -m 644 "$BASE_DIR/infra/systemd/doit-dev-calendar-sync.service" /etc/systemd/system/doit-dev-calendar-sync.service
install -m 644 "$BASE_DIR/infra/systemd/doit-dev-calendar-sync.timer" /etc/systemd/system/doit-dev-calendar-sync.timer

systemctl daemon-reload
systemctl enable doit.service doit-dev.service
systemctl enable --now doit-reminders.timer doit-dev-reminders.timer doit-calendar-sync.timer doit-dev-calendar-sync.timer
systemctl reset-failed doit.service doit-dev.service || true
systemctl reset-failed doit-reminders.service doit-dev-reminders.service doit-calendar-sync.service doit-dev-calendar-sync.service || true

echo "Doit systemd units installed."
