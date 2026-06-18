#!/usr/bin/env bash
# Dev loop helper: copy the working app into the running engine's approot so a
# dashboard refresh shows your edits — no .fma rebuild / reinstall needed.
#
# Usage:  ./scripts/sync-dev.sh
# Then hard-refresh the Accessories app in the dashboard (Apps page).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="/opt/fabmo/approot/approot/accessories.fma"

if [ ! -d "$DEST" ]; then
    echo "Deployed app not found at $DEST" >&2
    echo "Install the app once from the dashboard Apps page first." >&2
    exit 1
fi

# Mirror runtime files into the deployed copy (root-owned → sudo).
sudo rsync -a --delete \
    --exclude '.git' --exclude 'dist' --exclude 'scripts' \
    --exclude 'node_modules' --exclude '.gitignore' --exclude 'README.md' \
    "$REPO_ROOT"/ "$DEST"/

echo "Synced $REPO_ROOT -> $DEST"
echo "Hard-refresh the Accessories app to see changes."
