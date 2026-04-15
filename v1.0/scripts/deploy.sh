#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

BRANCH="${DEPLOY_BRANCH:-main}"
APP_NAME="${PM2_APP_NAME:-felswerke-terminal}"
NPM_CMD="${NPM_CMD:-npm}"
FORCE_DEPLOY="${FORCE_DEPLOY:-0}"

log() {
  printf '[deploy] %s\n' "$1"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_command git
require_command "$NPM_CMD"
require_command pm2

cd "$APP_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  fail 'Working tree has local changes. Aborting auto-deploy to avoid overwriting them.'
fi

log "Fetching origin/$BRANCH"
git fetch origin "$BRANCH"

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" && "$FORCE_DEPLOY" != "1" ]]; then
  log 'Already up to date. Nothing to deploy.'
  exit 0
fi

log "Updating working tree to origin/$BRANCH"
git pull --ff-only origin "$BRANCH"

log 'Installing dependencies'
"$NPM_CMD" ci

log 'Building application'
"$NPM_CMD" run build

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  log "Restarting existing PM2 app: $APP_NAME"
  pm2 restart "$APP_NAME" --update-env
else
  log "Starting new PM2 app: $APP_NAME"
  pm2 start "$NPM_CMD" --name "$APP_NAME" -- start
fi

pm2 save >/dev/null

log "Deploy complete: $REMOTE_SHA"