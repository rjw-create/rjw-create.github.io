#!/usr/bin/env bash
# PreToolUse hook (Read|Edit|Write|Bash): block access to secrets and lock files.
# Exit 2 blocks the tool call; the stderr message is shown to Claude.
set -u

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null)"

block() { echo "Blocked by protect-files hook: $1" >&2; exit 2; }

is_secret_path() {
  case "$(basename "$1")" in
    .env|.env.*) [ "$(basename "$1")" = ".env.example" ] && return 1; return 0 ;;
    *.pem|*.key|id_rsa*|id_ed25519*|credentials.json|secrets.*) return 0 ;;
  esac
  return 1
}

case "$tool" in
  Read|Edit|Write|MultiEdit|NotebookEdit)
    path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')"
    [ -z "$path" ] && exit 0
    if is_secret_path "$path"; then
      block "$path looks like a secrets file. Ask the user to edit it themselves, or use .env.example."
    fi
    if [ "$tool" != "Read" ]; then
      case "$(basename "$path")" in
        package-lock.json|pnpm-lock.yaml|yarn.lock|poetry.lock|uv.lock)
          block "$path is a lock file. Change dependencies with the package manager instead of editing it." ;;
      esac
    fi
    ;;
  Bash)
    cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty')"
    if printf '%s' "$cmd" | grep -Eq '(cat|less|more|head|tail|source|\.)[[:space:]]+[^|;&]*\.env([[:space:]]|$|\.[a-z]+)'; then
      printf '%s' "$cmd" | grep -q '\.env\.example' || block "command reads a .env file."
    fi
    if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push[^;&|]*(--force|-f([[:space:]]|$))'; then
      block "force-push needs the user's explicit OK. Ask first."
    fi
    if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f?[[:space:]]+(/|~|\$HOME|\.\.?)([[:space:]]|/?$)'; then
      block "recursive delete of a top-level path. Ask the user first."
    fi
    ;;
esac
exit 0
