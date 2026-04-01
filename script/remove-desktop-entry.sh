#!/usr/bin/env bash
# ──────────────────────────────────────────────
# FOSS Radar — Linux desktop launcher uninstaller
# ──────────────────────────────────────────────

APP_ID="foss-radar"

# ──────────────────────────────────────────────

DESKTOP_FILE="$HOME/.local/share/applications/$APP_ID.desktop"

if [ -f "$DESKTOP_FILE" ]; then
  rm "$DESKTOP_FILE"
  echo "✓ Desktop entry removed: $DESKTOP_FILE"
else
  echo "Nothing to remove — $DESKTOP_FILE not found."
fi
