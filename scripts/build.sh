#!/usr/bin/env bash
# Build the .fma bundle for distribution.
#
# An .fma is just a zip of the app folder with package.json at the root.
# The dashboard's app uploader unpacks it under
# /opt/fabmo/approot/approot/<id>/ on the FabMo machine.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO_ROOT/dist"
OUT="$DIST/accessories.fma"

mkdir -p "$DIST"
rm -f "$OUT"

cd "$REPO_ROOT"

# Include only the files the dashboard needs at runtime; exclude repo
# metadata, build outputs, and the build script itself.
zip -r "$OUT" \
    package.json \
    index.html \
    css \
    js \
    $( [ -f icon.png ] && echo icon.png ) \
    -x "*.DS_Store" \
    -x "node_modules/*" \
    -x "dist/*" \
    -x "scripts/*" \
    -x ".git/*" \
    -x ".gitignore" \
    -x "README.md"

echo
echo "Built $OUT"
ls -lh "$OUT"
