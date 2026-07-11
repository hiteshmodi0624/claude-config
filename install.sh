#!/usr/bin/env bash
#
# claude-config installer — lay your portable ~/.claude "brain" into any target.
#
# Single source of truth for skills, hooks, agents, commands, global rules
# (CLAUDE.md / WORKFLOW.md / RTK.md) and settings. Works on your laptop, a fresh
# machine, or a cloud co-work box (run it from the environment's Setup script).
#
# Usage:
#   ./install.sh [--global | --repo <path>] [--copy | --link] [--full | --lean]
#
#   --global      Install into ~/.claude  (default). Use on laptops and cloud boxes.
#   --repo <path> Install into <path>/.claude  (repo-local fallback that cloud
#                 sessions read automatically even without a Setup script).
#   --copy        Copy files (default). Use for ephemeral cloud boxes / fresh machines.
#   --link        Symlink dirs back to this repo. Use on your dev laptop so editing
#                 a skill in place edits the repo — commit, and every env pulls it.
#   --full        Everything: skills + agents + commands + hooks + rules + settings
#                 (plugins, marketplaces, model, hooks wiring, statusline). Default.
#   --lean        Skills + agents + commands only. No behavior-changing global config.
#   --dir <path>  Override the target config dir (mainly for tests).
#   -h, --help    Show this help.
#
# Env:
#   CLAUDE_HOME   Override the global config dir (default: $HOME/.claude).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD="$SCRIPT_DIR/payload"

MODE="global"     # global | repo
METHOD="copy"     # copy | link
PROFILE="full"    # full | lean
TARGET_REPO=""
DEST_OVERRIDE=""
CLAUDE_DIR="${CLAUDE_HOME:-$HOME/.claude}"

usage() { sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --global) MODE="global" ;;
    --repo)   MODE="repo"; TARGET_REPO="${2:-}"; shift ;;
    --copy)   METHOD="copy" ;;
    --link)   METHOD="link" ;;
    --full)   PROFILE="full" ;;
    --lean)   PROFILE="lean" ;;
    --dir)    DEST_OVERRIDE="${2:-}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

[ -d "$PAYLOAD" ] || { echo "error: payload dir not found at $PAYLOAD" >&2; exit 1; }

# Resolve destination.
if [ -n "$DEST_OVERRIDE" ]; then
  DEST="$DEST_OVERRIDE"
elif [ "$MODE" = "repo" ]; then
  [ -n "$TARGET_REPO" ] || { echo "error: --repo needs a path" >&2; exit 2; }
  DEST="$TARGET_REPO/.claude"
else
  DEST="$CLAUDE_DIR"
fi

mkdir -p "$DEST"
DEST="$(cd "$DEST" && pwd)"   # absolutise

NODE="$(command -v node || echo node)"
[ "$NODE" = "node" ] && echo "warn: 'node' not on PATH; hooks assume it is at runtime" >&2

# install_dir <name> — put payload/<name> into DEST/<name> via copy or symlink.
install_dir() {
  local name="$1" src="$PAYLOAD/$1" dst="$DEST/$1"
  [ -e "$src" ] || return 0
  if [ "$METHOD" = "link" ]; then
    rm -rf "$dst"
    ln -sfn "$src" "$dst"
  else
    rm -rf "$dst"
    cp -R "$src" "$dst"
  fi
  echo "  $METHOD  $name"
}

# install_file <name> — put payload/<name> into DEST/<name>.
install_file() {
  local name="$1" src="$PAYLOAD/$1" dst="$DEST/$1"
  [ -e "$src" ] || return 0
  if [ "$METHOD" = "link" ]; then
    ln -sfn "$src" "$dst"
  else
    cp "$src" "$dst"
  fi
  echo "  $METHOD  $name"
}

# render_settings — expand placeholders and write DEST/settings.json (backup once).
render_settings() {
  local tpl="$PAYLOAD/settings.template.json" out="$DEST/settings.json"
  [ -f "$tpl" ] || return 0
  if [ -f "$out" ] && [ ! -L "$out" ] && [ ! -f "$DEST/settings.json.pre-claude-config.bak" ]; then
    cp "$out" "$DEST/settings.json.pre-claude-config.bak"
    echo "  backup  settings.json.pre-claude-config.bak"
  fi
  sed -e "s#__CLAUDE_HOME__#$DEST#g" -e "s#__NODE__#$NODE#g" "$tpl" > "$out"
  echo "  render  settings.json"
}

echo "claude-config → $DEST  (mode=$MODE method=$METHOD profile=$PROFILE)"

# Both profiles: your authored skills, agents, commands.
for d in skills agents commands; do install_dir "$d"; done

if [ "$PROFILE" = "full" ]; then
  install_dir hooks
  for f in CLAUDE.md WORKFLOW.md RTK.md; do install_file "$f"; done
  render_settings
  # Make shell hooks executable (copy mode drops the bit on some systems).
  if [ "$METHOD" = "copy" ] && [ -d "$DEST/hooks" ]; then
    find "$DEST/hooks" -type f -name '*.sh' -exec chmod +x {} + 2>/dev/null || true
  fi
fi

echo "done."
