#!/usr/bin/env bash
#
# install.test.sh — behavioural specs for install.sh. No network, isolated temp dirs.
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL="$SCRIPT_DIR/install.sh"
PASS=0; FAIL=0
TMPROOT="$(mktemp -d)"
trap 'rm -rf "$TMPROOT"' EXIT

ok()   { PASS=$((PASS+1)); echo "  ok   - $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL - $1"; }
check(){ if eval "$2"; then ok "$1"; else bad "$1  [$2]"; fi; }

echo "TEST: full + copy renders settings and lands skills"
T1="$TMPROOT/full"
bash "$INSTALL" --global --copy --full --dir "$T1" >/dev/null
check "skill file present"        "[ -f '$T1/skills/feature-start/SKILL.md' ]"
check "hooks present"             "[ -f '$T1/hooks/caveman-activate.js' ]"
check "settings.json written"     "[ -f '$T1/settings.json' ]"
check "no __CLAUDE_HOME__ left"   "! grep -q '__CLAUDE_HOME__' '$T1/settings.json'"
check "no __NODE__ left"          "! grep -q '__NODE__' '$T1/settings.json'"
check "committed template has no laptop path" "! grep -q '/Users/hiteshmodi' '$SCRIPT_DIR/payload/settings.template.json'"
check "hook path points at dest"  "grep -q '$T1/hooks/caveman-activate.js' '$T1/settings.json'"
check "shell hook executable"     "[ -x '$T1/hooks/rtk-rewrite.sh' ]"

echo "TEST: lean omits behaviour config"
T2="$TMPROOT/lean"
bash "$INSTALL" --global --copy --lean --dir "$T2" >/dev/null
check "lean has skills"           "[ -d '$T2/skills' ]"
check "lean has NO hooks"         "[ ! -e '$T2/hooks' ]"
check "lean has NO settings"      "[ ! -e '$T2/settings.json' ]"
check "lean has NO CLAUDE.md"     "[ ! -e '$T2/CLAUDE.md' ]"

echo "TEST: idempotent (second run = same file set)"
T3="$TMPROOT/idem"
bash "$INSTALL" --global --copy --full --dir "$T3" >/dev/null
SIG_A="$(cd "$T3" && find . -not -name '*.bak' | sort | md5)"
bash "$INSTALL" --global --copy --full --dir "$T3" >/dev/null
SIG_B="$(cd "$T3" && find . -not -name '*.bak' | sort | md5)"
check "file set unchanged on rerun" "[ '$SIG_A' = '$SIG_B' ]"

echo "TEST: link mode symlinks dirs back to repo"
T4="$TMPROOT/link"
bash "$INSTALL" --global --link --full --dir "$T4" >/dev/null
check "skills is a symlink"       "[ -L '$T4/skills' ]"
check "symlink resolves to payload" "[ \"\$(readlink '$T4/skills')\" = '$SCRIPT_DIR/payload/skills' ]"

echo "TEST: repo mode targets <path>/.claude"
T5="$TMPROOT/repo"; mkdir -p "$T5"
bash "$INSTALL" --repo "$T5" --copy --lean >/dev/null
check "repo/.claude/skills exists" "[ -d '$T5/.claude/skills' ]"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
