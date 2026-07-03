#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR"

# Bundled seed/demo files from git (uploads/ in repo) — copy only when missing
# so admin uploads on the bind-mounted disk are never overwritten.
if [ -d /app/uploads-bundled ]; then
  for f in /app/uploads-bundled/*; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    if [ ! -f "$UPLOAD_DIR/$base" ]; then
      cp "$f" "$UPLOAD_DIR/$base"
    fi
  done
fi

exec node src/server.js
