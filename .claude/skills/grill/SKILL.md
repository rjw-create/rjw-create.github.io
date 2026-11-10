---
name: grill
description: Adversarial review gate before shipping. Quizzes the user on the change and has a fresh-context reviewer try to break it; no PR until both pass. Use when the user says grill me or before opening a PR.
disable-model-invocation: true
---

# /grill — don't ship until it passes

## Part 1: grill the author
Read the current diff (`git diff main...HEAD`, or `git diff` if uncommitted).
Ask the user 3-5 pointed questions, one at a time, that someone must be able to answer to own this code:
- What happens on the failure path of <specific function>?
- Why this approach over <obvious alternative>?
- Which test would fail if <specific line> were wrong?
- What breaks if <input> is empty, huge, or malformed?

Wait for each answer. If an answer reveals a gap, note it. Be direct, not cruel.

## Part 2: try to break it
Use the `code-reviewer` subagent on the diff. Then, yourself, try to write one test that the
current code fails. Run it.

## Verdict
- **Pass:** all questions answered well, reviewer has no must-fix items, no breaking test found.
  Offer to commit and open the PR.
- **Not yet:** list exactly what must change. Do not open a PR.
