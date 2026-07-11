#!/usr/bin/env bash
#
# sync.sh — one command: pull this machine's ~/.claude into payload/, commit, push.
# Use after changing skills/hooks/rules on your laptop.
#
#   ./sync.sh ["commit message"]
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./sync-from-home.sh

git add -A
if git diff --cached --quiet; then
  echo "sync: nothing changed — ~/.claude already matches the repo."
  exit 0
fi

echo "=== changes to be pushed ==="
git status --short

MSG="${1:-chore: sync ~/.claude ($(date +%Y-%m-%d))}"
git commit -q -m "$MSG"
git push -q origin main
echo "sync: pushed — $(git rev-parse --short HEAD)"
echo "reminder: settings.template.json is edited by hand; check if settings changed."
