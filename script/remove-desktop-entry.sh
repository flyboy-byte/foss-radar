#!/usr/bin/env bash
# ──────────────────────────────────────────────
# FOSS Radar — Linux desktop launcher uninstaller
# ──────────────────────────────────────────────

APP_ID="foss-radar"

# ──────────────────────────────────────────────

DESKTOP_FILE="$HOME/.local/share/applications/$APP_ID.desktop"
ICON_FILE="$HOME/.local/share/icons/hicolor/256x256/apps/$APP_ID.png"

removed=0

if [ -f "$DESKTOP_FILE" ]; then
  rm "$DESKTOP_FILE"
  echo "✓ Removed: $DESKTOP_FILE"
  removed=1
fi

if [ -f "$ICON_FILE" ]; then
  rm "$ICON_FILE"
  echo "✓ Removed: $ICON_FILE"
  removed=1
fi

[ "$removed" -eq 0 ] && echo "Nothing to remove — no desktop entry or icon found."
