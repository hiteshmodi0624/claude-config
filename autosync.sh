#!/usr/bin/env bash
#
# autosync.sh — background auto-sync of ~/.claude to GitHub via a macOS launchd agent.
# Once ON, you never run anything: every 15 min (and at login) it snapshots ~/.claude,
# commits, and pushes if anything changed. No-ops when nothing changed.
#
#   ./autosync.sh on       enable + start (also runs once now)
#   ./autosync.sh off       stop + remove
#   ./autosync.sh status    is it running?
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEL="com.hiteshmodi.claude-config-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
INTERVAL=900   # 15 minutes

case "${1:-status}" in
  on)
    mkdir -p "$HOME/Library/LaunchAgents"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SCRIPT_DIR/sync.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key><string>$HOME</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$SCRIPT_DIR/.autosync.log</string>
  <key>StandardErrorPath</key><string>$SCRIPT_DIR/.autosync.log</string>
</dict>
</plist>
EOF
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    echo "autosync ON — pushes ~/.claude every $((INTERVAL/60)) min. Log: $SCRIPT_DIR/.autosync.log"
    ;;
  off)
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "autosync OFF"
    ;;
  status)
    if launchctl list 2>/dev/null | grep -q "$LABEL"; then
      echo "autosync RUNNING (every $((INTERVAL/60)) min)"
    else
      echo "autosync not running — enable with: ./autosync.sh on"
    fi
    ;;
  *) echo "usage: ./autosync.sh on|off|status" >&2; exit 2 ;;
esac
