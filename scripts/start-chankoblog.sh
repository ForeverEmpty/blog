#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/chankoblog}"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"
PORT="${PORT:-3000}"
NODE_ENV="${NODE_ENV:-production}"
CONTENT_DB="${CONTENT_DB:-$APP_DIR/.data/content/contents.sqlite}"
SERVER_ENTRY="$APP_DIR/.output/server/index.mjs"

log() {
  printf '[chankoblog] %s\n' "$*"
}

fail() {
  printf '[chankoblog] ERROR: %s\n' "$*" >&2
  exit 1
}

link_content_db() {
  local target="$1"
  local target_dir
  target_dir="$(dirname "$target")"

  if [[ -d "$target_dir" ]]; then
    ln -sfn "$CONTENT_DB" "$target"
    log "linked $target -> $CONTENT_DB"
  else
    log "skip missing directory: $target_dir"
  fi
}

cd "$APP_DIR" || fail "cannot enter APP_DIR: $APP_DIR"

[[ -x "$NODE_BIN" ]] || fail "node binary is not executable: $NODE_BIN"
[[ -f "$SERVER_ENTRY" ]] || fail "missing Nuxt server entry: $SERVER_ENTRY. Run pnpm build first."
[[ -f "$CONTENT_DB" ]] || fail "missing Nuxt Content database: $CONTENT_DB. Run pnpm build first."

link_content_db "$APP_DIR/contents.sqlite"
link_content_db "$APP_DIR/.output/server/contents.sqlite"
link_content_db "$APP_DIR/.output/server/chunks/contents.sqlite"

export PORT
export NODE_ENV

log "starting Nuxt server on port $PORT"
exec "$NODE_BIN" "$SERVER_ENTRY"
