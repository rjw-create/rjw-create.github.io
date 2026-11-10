---
name: ui-options
description: Publishes a private comparison artifact for one UI decision (layout, colour, component or interaction) with 3-4 options, a one-line tradeoff each, the parts worth merging, and measured WCAG 2.2 contrast whenever colour is involved, then stops for a choice. Use when choosing between UI approaches, when the user asks which looks better, or when a design decision comes up mid-build.
argument-hint: "[the decision, e.g. 'error message style']"
---

# /ui-options: one decision, 3-4 options, measured

Decision: $ARGUMENTS

## 1. Frame it
State the decision in one sentence and list its constraints from DESIGN.md (tokens, Avoid list,
existing components and Decisions) and the spec. If DESIGN.md already records this decision, show it
and ask whether to reopen it.

## 2. Make 3-4 real options
Each option must differ in a way that matters. Give each a name and a one-line tradeoff.

If colour is involved, measure, never estimate. For every text/background and control/background
pair, in light and in dark:
- `node scripts/design-check.mjs ratio "#fg" "#bg"` (js projects) or
  `python scripts/design_check.py ratio "#fg" "#bg"` (python projects).
- Targets (WCAG 2.2): 4.5:1 body text; 3:1 large text (24px, or 14pt bold) and UI component
  boundaries such as input outlines and focus rings. Mark anything below as failing.

## 3. Build the artifact
- Artifact tool: `action: "quickstart"`, `intent: "design"` when the options are layouts, otherwise
  `intent: "other"`; follow what it returns. No local mock files; if the Artifact tool isn't
  available, say so and stop.
- Title: `YYYY-MM-DD <Decision> options`. It stays private.
- Render every option with the project's tokens, side by side, in light and dark.
- Per option: the preview, the one-line tradeoff, and (for colour) a table of pairs with their
  measured ratios and pass/fail.
- End with **Parts worth merging** and your recommendation.

## 4. Stop
Reply with the link, an option / tradeoff / contrast summary, and ask which to choose.

## 5. After the choice
- New or changed tokens go into the token file and DESIGN.md together, with any new pair added to
  DESIGN.md's Contrast pairs table; run `./scripts/check.sh`.
- Add a row to DESIGN.md's Decisions table, and a record in `docs/decisions/` from the template,
  linking the artifact and naming what was merged in.
