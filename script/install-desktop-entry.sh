#!/usr/bin/env bash
# ──────────────────────────────────────────────
# FOSS Radar — Linux desktop launcher installer
# Creates a .desktop entry in ~/.local/share/applications
# ──────────────────────────────────────────────

APP_NAME="FOSS Radar"
APP_ID="foss-radar"
APP_URL="http://127.0.0.1:5000"

# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
DESKTOP_FILE="$DESKTOP_DIR/$APP_ID.desktop"
ICON_FILE="$ICON_DIR/$APP_ID.png"

mkdir -p "$DESKTOP_DIR" "$ICON_DIR"

cp "$SCRIPT_DIR/$APP_ID.png" "$ICON_FILE"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Comment=Open $APP_NAME
Exec=xdg-open $APP_URL
Icon=$APP_ID
Terminal=false
Categories=Network;Utility;
StartupNotify=true
EOF

echo "✓ Icon installed:        $ICON_FILE"
echo "✓ Desktop entry created: $DESKTOP_FILE"
echo "  Launch from your app menu or run: xdg-open $APP_URL"
