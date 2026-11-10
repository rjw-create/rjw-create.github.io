#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): auto-format the file Claude just changed.
# Python -> ruff format (falls back to black). JS/TS/CSS/JSON/MD -> prettier.
# Never blocks: formatting problems are reported but don't stop Claude.
set -u

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

case "$file" in
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      ruff format --quiet "$file" >/dev/null 2>&1
      ruff check --fix --quiet "$file" >/dev/null 2>&1
    elif command -v black >/dev/null 2>&1; then
      black --quiet "$file" >/dev/null 2>&1
    fi
    ;;
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs|*.css|*.scss|*.json|*.html|*.vue|*.svelte)
    if [ -x node_modules/.bin/prettier ]; then
      node_modules/.bin/prettier --write --log-level silent "$file" >/dev/null 2>&1
    fi
    ;;
esac
exit 0
