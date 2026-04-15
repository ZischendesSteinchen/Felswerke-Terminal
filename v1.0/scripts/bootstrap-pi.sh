#!/usr/bin/env bash

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ZischendesSteinchen/Felswerke-Terminal.git}"
TARGET_DIR="${TARGET_DIR:-/home/pi/felswerke-terminal}"
BRANCH="${DEPLOY_BRANCH:-main}"

log() {
  printf '[bootstrap] %s\n' "$1"
}

fail() {
  printf '[bootstrap] ERROR: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_command git
require_command bash

if [[ -e "$TARGET_DIR" && ! -d "$TARGET_DIR/.git" ]]; then
  fail "Target directory exists but is not a git repository: $TARGET_DIR"
fi

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  log "Cloning $REPO_URL into $TARGET_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
else
  log "Repository already exists in $TARGET_DIR"
fi

cd "$TARGET_DIR"

chmod +x scripts/deploy.sh scripts/watch-github.sh

log 'Bootstrap complete'
log "Next step: cd $TARGET_DIR && ./scripts/deploy.sh"