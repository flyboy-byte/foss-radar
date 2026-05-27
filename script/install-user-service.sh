#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SERVICE_FILE="$SERVICE_DIR/foss-radar.service"
APP_URL="${APP_URL:-http://127.0.0.1:5000}"

mkdir -p "$SERVICE_DIR"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=FOSS Radar (user service)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
ExecStart=/usr/bin/env npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=APP_URL=$APP_URL
EnvironmentFile=$ROOT_DIR/.env

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now foss-radar.service

echo "Installed user service: $SERVICE_FILE"
echo "Status command: systemctl --user status foss-radar.service"
