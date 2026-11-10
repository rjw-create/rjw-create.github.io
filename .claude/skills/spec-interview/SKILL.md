---
name: spec-interview
description: Interviews the user in depth about a feature, then writes a complete spec to specs/features/. Use before building anything bigger than a day of work, or when the user says spec this or interview me.
argument-hint: "[one-line feature description]"
---

# /spec-interview — let Claude extract the spec from you

Feature: $ARGUMENTS

1. Read CLAUDE.md, `specs/requirements.md` and any related code so your questions are informed.
2. Interview the user with the AskUserQuestion tool, a few questions at a time. Cover:
   - The user and the job: who uses this, what they're trying to get done.
   - Behavior: happy path, then each edge case and failure mode.
   - Data: what's stored, where, and its shape.
   - UI/UX if any: states (empty, loading, error), what's on each screen.
   - Tradeoffs and constraints: performance, cost, libraries allowed or banned.
   - What is explicitly out of scope.
   Skip obvious questions. Dig into the hard parts the user probably hasn't considered.
   When an answer is "I don't know yet", record it as an open question rather than guessing.
3. Keep going until the hard parts are covered. Then write the spec to
   `specs/features/<kebab-name>.md` using `specs/features/_TEMPLATE.md`.
4. End by telling the user: start a fresh session (`/clear`) and say
   "Implement @specs/features/<name>.md in plan mode", so the build has clean context.
