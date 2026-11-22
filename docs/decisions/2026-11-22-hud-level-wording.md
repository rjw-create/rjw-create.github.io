# Level counter and the Contact step

Date: 2026-11-22
Status: Accepted

## Context
The 2026-11-21 design critique of the site (https://claude.ai/artifact/LzostgFJsnfMkXBaf66zkr) found that the
top bar says "Level 1 of 4" while the level path beside the board lists five numbered steps, 01 to 05, with the
Contact finale as 05. A visitor reads that as five levels and a counter that is off by one.

## Options
A small pick on an existing screen, asked in the STATUS file (sitepolish, 12:54):
- A: keep "Level 1 of 4" in the top bar and show "End" in place of "05" beside Contact, so only the four levels
  carry numbers. The level title already says "Level 1: <name>", and the path's screen-reader label already
  calls Contact "Finale", so only one visible label changes.
- B: count steps instead: "Step 1 of 5: <name>", with the finale showing "Step 5 of 5". Changes the top bar's
  wording and leaves "Level" in the title, so two words would name the same thing.

## Decision
A (the Captain's DECIDED, 2026-11-22 13:26, the default after 30 minutes with no answer from Jackson).

PR with screenshots: see the pull request for branch fix/site-media-polish.

## Consequences
- `tests/site-links.test.js` checks that the top bar counts levels and the Contact step is marked "End".
- Adding a fifth level means the top bar reads "of 5" on its own; Contact stays unnumbered.
