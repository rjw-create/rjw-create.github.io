#!/usr/bin/env bash
# SessionStart hook: give Claude a quick snapshot of where things stand.
# Whatever this prints to stdout is added to Claude's context at session start.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

echo "## Session snapshot"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Branch: $(git branch --show-current 2>/dev/null)"
  echo "Recent commits:"
  git log --oneline -5 2>/dev/null | sed 's/^/  /'
  dirty="$(git status --short 2>/dev/null | head -15)"
  [ -n "$dirty" ] && { echo "Uncommitted changes:"; printf '%s\n' "$dirty" | sed 's/^/  /'; }
fi

# Point at the latest handoff note, if any.
if [ -d docs/notes ]; then
  latest="$(ls -t docs/notes/*.md 2>/dev/null | grep -v README.md | head -1)"
  [ -n "$latest" ] && echo "Latest task note: $latest (read it if continuing that work)"
fi
exit 0
