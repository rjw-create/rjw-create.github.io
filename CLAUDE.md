# startup-personal-site

Jackson's personal website (static HTML/CSS/JS, served by GitHub Pages from `main` at rjw-create.github.io), first
used for the Sandbox Founder Residency application (submitted 2026-11-13). Direction picked 2026-11-09:
"B plus merged parts, immersive" (a playable front door; notebook, counts strip and track-list index merged in) from
the 2026-11-09 Personal site directions canvas. It must not read as AI-made; no health or brain claims; the story
is in Jackson's own words. This repo is public: never commit private links, secrets or other people's details.
- The founder story is the 2026-11-13 version ("Something worth making"). Never write, restore or paraphrase the
  older story it replaced (Jackson, 2026-11-13). Its key words are listed in `tests/banned-phrases.test.js`, which
  fails when any tracked file uses them.

## Commands
- Verify everything: ./scripts/check.sh

<!-- ===== Append these sections to your existing CLAUDE.md (install.sh does it for you) ===== -->

## Verify before done
- Before saying any task is finished, run `./scripts/check.sh --fast` (or `./scripts/check.sh` if it has no fast mode) and show its output.
- Run the full `./scripts/check.sh` before opening a PR or merging. It includes the slow parts (models, browsers, audio).
- UI work: also check it in a browser (`verify-app` subagent).

## Map (read on demand)
- @docs/architecture.md — read before structural changes
- `specs/` — requirements and one spec per feature; build to the spec
- `docs/decisions/` — why things are the way they are; don't undo these without asking
- `docs/notes/` — handoff notes from earlier sessions
- DESIGN.md — the design system: tokens, contrast pairs, components, wireframes, decisions

## Visual workflow
- Any UI follows the loop in DESIGN.md: wireframe (`/wireframe`, wait for OK), options for each
  UI decision (`/ui-options`), build with tokens only, verify (`./scripts/check.sh`, then `verify-app`).
- Artifacts are private claude.ai pages titled `YYYY-MM-DD <name>`; links go in DESIGN.md and PRs.
- Design System artifact: `/design-system`. Rules: `.claude/rules/design.md`.

## Working agreements
- Detailed rules live in `.claude/rules/` (loaded automatically).
- Subagents available: code-reviewer, test-runner, code-simplifier, plan-reviewer, verify-app.
- Keep this file under 200 lines: detail goes in DESIGN.md, `.claude/rules/` or `docs/`.
- When I correct you on something that could recur, add a one-line rule right away to the narrowest file that fits, and tell me the line and the file.

## When compacting
Always keep the list of modified files, the verify command, and open decisions.
