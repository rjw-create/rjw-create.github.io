---
name: techdebt
description: End-of-session sweep for duplicated code, dead code, TODOs, and leftover debug output in what changed this session. Use when wrapping up work or before a commit.
disable-model-invocation: true
---

# /techdebt — end-of-session cleanup

Scope: only files changed in this session or on this branch.

1. List changed files:
   !`git diff --name-only HEAD; git diff --name-only --staged; git ls-files --others --exclude-standard`
2. In those files, find:
   - Debug leftovers: `print(`/`console.log(` added for debugging, commented-out code, stray `breakpoint()`/`debugger`.
   - Duplicated blocks (same logic in 2+ places) that should be one helper.
   - Unused imports, functions, variables.
   - New TODO/FIXME comments. Keep them only if they name a real follow-up.
3. Show the list grouped by file, then ask whether to fix all, some, or none.
4. After fixing, run `./scripts/check.sh` and report the result.
5. If you noticed a mistake pattern this session that could recur, add one line to the narrowest CLAUDE.md that fits now, and say which.
