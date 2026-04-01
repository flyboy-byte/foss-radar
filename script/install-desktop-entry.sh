#!/usr/bin/env bash
# ──────────────────────────────────────────────
# FOSS Radar — Linux desktop launcher installer
# Creates a .desktop entry in ~/.local/share/applications
# ──────────────────────────────────────────────

APP_NAME="FOSS Radar"
APP_ID="foss-radar"
APP_URL="http://127.0.0.1:5000"

# ──────────────────────────────────────────────

DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/$APP_ID.desktop"

mkdir -p "$DESKTOP_DIR"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Comment=Open $APP_NAME
Exec=xdg-open $APP_URL
Icon=applications-internet
Terminal=false
Categories=Network;Utility;
StartupNotify=true
EOF

echo "✓ Desktop entry installed: $DESKTOP_FILE"
echo "  Launch from your app menu or run: xdg-open $APP_URL"
