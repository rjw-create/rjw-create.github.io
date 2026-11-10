#!/usr/bin/env bash
# PostCompact / SessionStart(compact) hook: re-inject the rules that matter most
# after Claude compresses its context, so they don't get summarized away.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
cat <<'EOF'
## Reminders after compaction
- Done means verified: run ./scripts/check.sh and show the result before saying a task is finished.
- Change only what the task needs; follow existing patterns.
- Never read or commit .env files or secrets.
EOF
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  files="$(git status --short 2>/dev/null | head -20)"
  [ -n "$files" ] && { echo "- Files modified so far:"; printf '%s\n' "$files" | sed 's/^/    /'; }
fi
exit 0
