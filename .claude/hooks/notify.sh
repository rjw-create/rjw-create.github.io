#!/usr/bin/env bash
# Notification / Stop hook: tell you when a Claude session needs you or finished.
# Works on macOS (notification center), Linux (notify-send), else terminal bell.
set -u

input="$(cat)"
msg="$(printf '%s' "$input" | jq -r '.message // empty' 2>/dev/null)"
event="$(printf '%s' "$input" | jq -r '.hook_event_name // empty' 2>/dev/null)"
[ -z "$msg" ] && { [ "$event" = "Stop" ] && msg="Finished" || msg="Needs your attention"; }
project="$(basename "${CLAUDE_PROJECT_DIR:-$PWD}")"
title="Claude: $project"

if command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"${msg//\"/\'}\" with title \"${title//\"/\'}\" sound name \"Glass\"" >/dev/null 2>&1
elif command -v notify-send >/dev/null 2>&1; then
  notify-send "$title" "$msg" >/dev/null 2>&1
else
  { printf '\a' > /dev/tty; } 2>/dev/null
fi
exit 0
