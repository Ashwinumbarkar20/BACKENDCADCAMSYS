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

# On start: restore from /app/uploads-legacy (old host folder) and backup volume.
if [ -n "$UPLOADS_BACKUP_DIR" ]; then
  mkdir -p "$UPLOADS_BACKUP_DIR"
fi

if [ -d /app/uploads-legacy ]; then
  for f in /app/uploads-legacy/*; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    if [ ! -f "$UPLOAD_DIR/$base" ]; then
      cp "$f" "$UPLOAD_DIR/$base"
      echo "[uploads] restored from legacy: $base"
    fi
  done
fi

if [ -n "$UPLOADS_BACKUP_DIR" ]; then
  for f in "$UPLOADS_BACKUP_DIR"/*; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    if [ ! -f "$UPLOAD_DIR/$base" ]; then
      cp "$f" "$UPLOAD_DIR/$base"
      echo "[uploads] restored from backup: $base"
    fi
  done
  for f in "$UPLOAD_DIR"/*; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    if [ ! -f "$UPLOADS_BACKUP_DIR/$base" ]; then
      cp "$f" "$UPLOADS_BACKUP_DIR/$base"
      echo "[uploads] backed up: $base"
    fi
  done
fi

exec node src/server.js
