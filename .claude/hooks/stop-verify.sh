#!/usr/bin/env bash
# Stop hook: when Claude tries to finish, run ./scripts/check.sh if files changed.
# On failure, exit 2 sends Claude back to fix it (stderr explains why).
#
# Change detection:
#   - git repo at the project root, or at the path in .claude/stop-verify-repo
#     (for projects whose repo is a subfolder): uses git status/diff
#   - no git: uses file names, sizes and modified times
# Runs only when something changed since the last passing check, and never blocks
# twice on the same unchanged state, so it can't loop. (Claude Code also caps
# consecutive Stop blocks.)
# Opt out: touch .claude/.skip-stop-verify
set -u

input="$(cat)"
# In a worktree session CLAUDE_PROJECT_DIR still points at the main checkout, while the hook's
# cwd is the worktree. Check the copy Claude is actually working in.
root="${CLAUDE_PROJECT_DIR:-.}"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)"
if [ -n "$cwd" ]; then
  top="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)"
  [ -n "$top" ] && [ -f "$top/scripts/check.sh" ] && root="$top"
fi
cd "$root" || exit 0

[ -f .claude/.skip-stop-verify ] && exit 0
[ -f scripts/check.sh ] || exit 0

if command -v sha1sum >/dev/null 2>&1; then hash=sha1sum; else hash="shasum"; fi
repo="."
[ -f .claude/stop-verify-repo ] && repo="$(head -1 .claude/stop-verify-repo | tr -d '\r')"

skip=(':!*.pyc' ':!**/__pycache__/**' ':!**/*.tsbuildinfo' ':!coverage/**' ':!.claude/.last-stop-*' ':!CREATION-LOG.md')
if git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  changes="$(git -C "$repo" status --porcelain -- . ':!docs' ':!specs' ':!*.md' 2>/dev/null)"
  [ -z "$changes" ] && exit 0
  state="$( { git -C "$repo" diff HEAD -- . "${skip[@]}"; git -C "$repo" status --porcelain -- . "${skip[@]}"; } 2>/dev/null | $hash | cut -c1-16)"
else
  state="$(find . -type f \
      -not -path './.claude/*' -not -path './.git/*' -not -path '*/node_modules/*' -not -path '*/.venv/*' \
      -not -path '*/__pycache__/*' -not -name '*.md' -not -name 'CREATION-LOG.md' \
      -printf '%p %s %T@\n' 2>/dev/null | sort | $hash | cut -c1-16)"
fi

pass=".claude/.last-stop-pass"
block=".claude/.last-stop-block"
# Already verified this exact state: nothing to do.
[ -f "$pass" ] && [ "$(cat "$pass")" = "$state" ] && exit 0
# Already blocked on this exact state: Claude tried and changed nothing, so let it stop and report.
if [ -f "$block" ] && [ "$(cat "$block")" = "$state" ]; then
  rm -f "$block"
  exit 0
fi

# Prefer the quick subset when check.sh offers one; the full run (models, browsers) is for before a PR.
args=""
grep -q -- '--fast' scripts/check.sh && args="--fast"
if command -v timeout >/dev/null 2>&1; then
  out="$(timeout 300 bash scripts/check.sh $args 2>&1)"
else
  out="$(bash scripts/check.sh $args 2>&1)"
fi
status=$?
if [ $status -ne 0 ]; then
  echo "$state" > "$block"
  {
    echo "scripts/check.sh failed (exit $status). Fix these before finishing:"
    printf '%s\n' "$out" | tail -n 40
  } >&2
  exit 2
fi
rm -f "$block"
echo "$state" > "$pass"
exit 0
