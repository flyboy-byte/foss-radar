#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MIN_NODE_MAJOR=20
MAX_NODE_MAJOR=24

detect_pkg_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    echo "apt"
    return
  fi
  if command -v dnf >/dev/null 2>&1; then
    echo "dnf"
    return
  fi
  if command -v pacman >/dev/null 2>&1; then
    echo "pacman"
    return
  fi
  if command -v zypper >/dev/null 2>&1; then
    echo "zypper"
    return
  fi
  echo "unknown"
}

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed. Install Node ${MIN_NODE_MAJOR}-${MAX_NODE_MAJOR} first."
    echo "Detected package manager: $(detect_pkg_manager)"
    exit 1
  fi
  local major
  major="$(node -p 'Number(process.versions.node.split(".")[0])')"
  if [ "$major" -lt "$MIN_NODE_MAJOR" ] || [ "$major" -gt "$MAX_NODE_MAJOR" ]; then
    echo "Unsupported Node.js version: $(node -v)"
    echo "Required: >=${MIN_NODE_MAJOR} and <25"
    exit 1
  fi
}

check_node

echo "==> Installing dependencies"
npm install

if [ ! -f ".env" ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi

echo "==> Initializing database schema"
npm run db:push

if [ "${1:-}" = "--build" ]; then
  echo "==> Building production artifacts"
  npm run build
fi

cat <<EOF

Bootstrap complete.

Next steps:
  Dev mode:        npm run dev
  Production run:  npm run build && npm start
  User service:    bash script/install-user-service.sh
  System service:  sudo bash script/install-system-service.sh <linux-user>

EOF
