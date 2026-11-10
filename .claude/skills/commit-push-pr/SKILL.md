---
name: commit-push-pr
description: Verifies, commits with a clear message, pushes the branch, and opens a pull request with gh. Use when the user says ship it, commit and PR, or open a PR.
disable-model-invocation: true
allowed-tools: Bash(git *) Bash(gh *) Bash(./scripts/check.sh)
---

# /commit-push-pr

Current state:
!`git status --short; git branch --show-current`

1. If on `main`, create a branch named `<type>/<short-description>` (feat, fix, chore, docs) first.
2. Run `./scripts/check.sh`. If it fails, stop and report; do not commit broken code.
3. Stage only files related to this task. Never stage `.env*`, secrets, or large generated files.
4. Commit with a conventional message: `type: what changed` on line one, then a short body
   explaining why.
5. `git push -u origin <branch>`.
6. `gh pr create` with a title matching the commit and a body containing:
   - What changed and why (2-4 bullets)
   - How it was verified (the command and result)
   - Anything the reviewer should look at closely
7. Print the PR URL.

If `gh` is not installed or not authenticated, stop after pushing and tell the user to run `gh auth login`.
