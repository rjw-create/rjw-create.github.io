# Mission Board stills

Date: 2026-11-22
Status: Accepted

## Context
The 2026-11-21 design critique of the site (linked in the PR) found that the
Mission Board entry showed a blurred screenshot of tabs the board no longer has (Now, Jobs, Night, System; taken
13 Nov). Jackson approved (2026-11-22 11:18) replacing it with two drawn stills of the current layout made with
the stageshow kit outside the repo, committing only the images and showing no real figures.

The stills: A, the Review page (sidebar To-do, Running, Review, Night, System; "Waiting on you: 3"; two jobs with
an Approve button each); B, the To-do ticket list with status pills and a Crew card. Job names are placeholder
bars.

The impeccable critique of index.html after the change (dual-agent, 28/36) raised two major issues, both about
these stills: they read as a generic dashboard mock beside the page's real video and photos, and at 375px their
text shrinks to about 7px.

## Options
A small pick on an existing screen, asked in the STATUS file (sitepolish, 14:20):
- A: keep the stills as built and note the critique in the PR.
- B: a follow-up job: a phone crop of each still through `<picture>`, and the two side by side at half width on
  desktop.

## Decision
A ("Keep, note review": Jackson's answer, relayed by the Captain's DECIDED, 2026-11-22 14:56).

PR with screenshots: see the pull request for branch fix/site-media-polish.

## Consequences
- `tests/site-links.test.js` checks the entry has two stills whose width/height match their files and that no
  caption mentions blurring.
- The stills are rebuilt from scratch outside the repo if the board's layout changes again; nothing in the site
  depends on the stageshow kit.
- The phone legibility and desktop height notes stay open for a later job if Jackson wants one.
