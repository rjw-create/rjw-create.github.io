---
name: wireframe
description: Drafts 3-4 layout options for a new screen, page, view or game as a private claude.ai Design artifact built from DESIGN.md's tokens, with a one-line tradeoff each and the parts worth merging, then stops for approval. Use before building any new screen or game, or when the user says wireframe, mock up, sketch or lay out a page.
argument-hint: "[screen or feature to wireframe]"
---

# /wireframe: options on a page before any UI code

Screen: $ARGUMENTS

## 1. Gather
- Read DESIGN.md (tokens, Avoid list, component inventory, Wireframes table), the token file it
  names, the matching spec in `specs/features/` if there is one, and the current screen if this is
  a redesign.
- Write down what the screen must hold: its content, its one primary action, and its empty,
  loading and error states.

## 2. Plan 3-4 different layouts
Different structure, not colour swaps: at least 3 parallel options, merged afterwards, beat iterating
on one idea (NN/g; Dow et al. 2010). Give each a short name and a one-line tradeoff
("Fastest to scan, but hides the history on phones").

## 3. Build the artifact
- Call the Artifact tool with `action: "quickstart"`, `intent: "design"`, and follow what it returns
  (the Design type, or the `artifact-design` skill for a plain page). Never write a local mock file
  instead; if the Artifact tool isn't available, say so and stop.
- Title: `YYYY-MM-DD <Screen> wireframes` (today's date). It stays private.
- Use the project's real tokens: copy the colour, type and space values from the token file into
  the artifact's CSS variables under the same role names, for light and dark. Real copy, no lorem
  ipsum. Low-to-mid fidelity is right: grey blocks are fine, labels and hierarchy are not optional.
- Show each option at 375px and at desktop width, plus its empty or error state.
- Under each option: its name and the one-line tradeoff. At the end: **Parts worth merging**
  (which strengths of each could combine) and your recommendation.

## 4. Stop
Reply with the link, a table of option / tradeoff, the merge suggestion, and ask which to approve.
Do not write UI code until the user approves.

## 5. After approval
- Update the artifact so it shows the approved (or merged) version; `verify-app` compares the build
  against it.
- DESIGN.md: add a Wireframes row (date, screen, link, `approved`) and a Decisions row.
- Copy `docs/decisions/0000-template.md` to the next number, fill in context, the options with the
  artifact link, the decision and what was merged.
