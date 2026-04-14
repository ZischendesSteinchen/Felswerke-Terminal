#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

BRANCH="${DEPLOY_BRANCH:-main}"
POLL_INTERVAL="${POLL_INTERVAL:-60}"

log() {
  printf '[watcher] %s\n' "$1"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf '[watcher] ERROR: Required command not found: %s\n' "$1" >&2
    exit 1
  }
}

require_command git
require_command bash

cd "$APP_DIR"

log "Watching origin/$BRANCH every ${POLL_INTERVAL}s"

while true; do
  if git fetch origin "$BRANCH" --quiet; then
    LOCAL_SHA="$(git rev-parse HEAD)"
    REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"

    if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
      log "Change detected: $LOCAL_SHA -> $REMOTE_SHA"
      if "$SCRIPT_DIR/deploy.sh"; then
        log 'Deploy finished successfully'
      else
        log 'Deploy failed; will retry on next poll'
      fi
    fi
  else
    log 'Fetch failed; will retry on next poll'
  fi

  sleep "$POLL_INTERVAL"
done