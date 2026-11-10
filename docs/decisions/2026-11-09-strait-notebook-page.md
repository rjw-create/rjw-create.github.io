# STRAIT notebook page: one notebook entry with a contents strip and counts

Date: 2026-11-09
Status: Accepted

## Context
Jackson asked: "is there a way I can include the cool information about my STRAIT project? There is a ton of
awesome documentation and other cool stuff I'd like to include". He chose its own page (level 4 stays the game;
the short entry gains a "Read the full STRAIT notebook" link), with only his name on it and the team credited
without names. The material comes from the hw-strait folder: diagrams, enclosure layouts, a priced parts list,
example plots and the public code repo.

## Options considered
Three layouts, each at 1280px and 375px, on one private Design canvas, "2026-11-09 STRAIT notebook page" (this
repo is public, so its link is not recorded here):
1. **A. Notebook spread**: one long dated entry with red-pen margin notes; closest to the rest of the site, but
   the longest scroll, with documents at the very end.
2. **B. Signal-chain index**: sections follow the signal from power to computer, with a side index in the
   level-path style; a reader can jump straight to the circuit, but it is one more piece of navigation to keep
   in sync.
3. **C. Spec sheet and plates**: a spec table and big numbered figures first; strongest at a glance, but less
   of the story in Jackson's words, and figure grids get small on a phone.

Parts worth merging: A's story order and margin notes, B's index as a short contents strip, C's counts.

## Decision
Jackson picked **A with B and C's parts**: A's notebook entry and story order, B's contents strip (a row of
links, not a sticky sidebar) and C's counts strip on the first screen.

Content decisions made with it:
- The pseudosection and inversion come from an example data file, not a field scan, so they are captioned
  "example data". Jackson said "We had real scans but may not have taken any pictures"; the only other data in
  hw-strait is the radar version's capture, which he chose to show, captioned "field test, earlier radar version".
- The parts list image is retyped as an HTML table. Its rows add up to $204.92, so the table shows that sum
  rather than the image's printed total.
- Left out: the technical write-up PDF (Jackson's call), the poster PDF (team number and city), the TSA
  order list (team ID and school notes) and a scanned PDF with no readable text.
- The design-stage diagrams show parts the final build changed (INA128, MCP23017); their captions say so.

## Consequences
- `strait.html` is a second page; it shares `tokens.css` and `site.css` and needs no JavaScript.
- New components: the contents strip and the parts table (DESIGN.md's component inventory).
- If Jackson finds pictures of a real ERT scan, they replace or join the example plots in section 04.
