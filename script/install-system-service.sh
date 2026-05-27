#!/usr/bin/env bash
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Run as root: sudo bash script/install-system-service.sh <linux-user>"
  exit 1
fi

APP_USER="${1:-}"
if [ -z "$APP_USER" ]; then
  echo "Usage: sudo bash script/install-system-service.sh <linux-user>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_FILE="/etc/systemd/system/foss-radar.service"
APP_URL="${APP_URL:-http://127.0.0.1:5000}"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=FOSS Radar
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$ROOT_DIR
ExecStart=/usr/bin/env npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=APP_URL=$APP_URL
EnvironmentFile=$ROOT_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now foss-radar.service

echo "Installed system service: $SERVICE_FILE"
echo "Status command: systemctl status foss-radar.service"
