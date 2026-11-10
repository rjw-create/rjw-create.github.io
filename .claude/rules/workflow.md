# Workflow rules

## Done means verified
- Before saying a task is done, run `./scripts/check.sh --fast` (or `./scripts/check.sh` if it has no fast mode) and show the command and its result.
- Run the full `./scripts/check.sh` before opening a PR or merging.
- For UI changes, also check the page in a browser (use the `verify-app` subagent if available).
- If you cannot verify something, say so explicitly instead of implying it works.

## Planning
- For changes touching more than 2 files, or when the approach is unclear: write a plan first
  (files to change, steps, risks, how we'll verify) and wait for approval.
- If an approach fails twice, stop and re-plan rather than patching further.

## Scope
- Change only what the task needs. No drive-by refactors or renames.
- Follow existing patterns in neighbouring files before inventing new ones.
- Ask before adding a new dependency.

## Context hygiene
- Use subagents for broad codebase searches and long test or log output.
- When compacting, always keep: the list of modified files, the verify command, and any open decisions.

## Learning from mistakes
- When the user corrects you on something that could recur, add a one-line rule right away to the narrowest CLAUDE.md that fits, and say which.

## Safety
- Never read, print, or commit `.env` files, keys, or tokens.
- Never force-push, rewrite published history, or delete branches without asking.
