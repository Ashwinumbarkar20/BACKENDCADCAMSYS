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

# Persistent backup folder — restore missing uploads, then back up new files.
# Set UPLOADS_BACKUP_DIR in .env (mount a host path in docker-compose).
if [ -n "$UPLOADS_BACKUP_DIR" ]; then
  mkdir -p "$UPLOADS_BACKUP_DIR"
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
