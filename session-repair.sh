#!/usr/bin/env bash
# --- Session Repair Tool Launcher (Linux/macOS) ---
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js not found."
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Install deps if needed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    cd "$SCRIPT_DIR"
    npm install --omit=dev
fi

# Launch
cd "$SCRIPT_DIR"
exec npx tsx src/index.tsx "$@"
