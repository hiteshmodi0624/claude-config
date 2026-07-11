#!/usr/bin/env bash
#
# sync-from-home.sh — re-snapshot this machine's live ~/.claude into payload/
# (config-only). Run on your laptop after changing skills/hooks/rules, then commit.
# settings.json is intentionally NOT pulled — payload/settings.template.json is the
# tokenised, hand-maintained version (a raw settings.json would leak machine paths).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="${CLAUDE_HOME:-$HOME/.claude}"
DST="$SCRIPT_DIR/payload"

[ -d "$SRC" ] || { echo "error: $SRC not found" >&2; exit 1; }

for item in skills hooks agents commands CLAUDE.md WORKFLOW.md RTK.md; do
  if [ -e "$SRC/$item" ]; then
    # -L dereferences symlinks (e.g. skills/remotion-best-practices -> ~/.agents),
    # so payload holds real content, not a link that dangles on other machines.
    rsync -aL --delete --exclude='node_modules' "$SRC/$item" "$DST/" \
      && echo "synced: $item"
  fi
done

echo
echo "note: settings.template.json is NOT auto-synced — edit it by hand if settings changed."
echo "done. review 'git diff', then commit."
