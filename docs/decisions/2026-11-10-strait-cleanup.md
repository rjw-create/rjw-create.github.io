# STRAIT cleanup: original nationals documentation, fewer documents, Retry counts toward hints

Date: 2026-11-10
Status: Accepted

## Context
Jackson asked (2026-11-10): "Get rid of the trifold poster bit at the bottom of the Strait notebook (we never
touched the image you are using). Also, link the actual nationals documentation, it was beautifully formatted.
get rid of the sketch at the bottom as well. Also count retries as failures, so someone who retried 3 times would
start to get hints as well. and add an image of the Strait to the first part of the website, theres an empty spot
for the strait screenshot"

## Options
No options round: the request fixed the content and every change reuses existing parts.
- Nationals documentation: keep the restyled site page, or publish the original unchanged. Jackson asked for the
  original. Its own stylesheet uses raw colours, which the token lint would fail, so `scripts/design-check.mjs`
  skips it by name (a `VERBATIM` list). The page is self-contained (inline styles and one inline script, no
  images, fonts or external files), so nothing in it needed fixing for the live site.
- Retry: count every Retry, or only one pressed mid-game. A Retry before the first move tried nothing, and one
  after the level ended follows a loss that already counted, so only a mid-game Retry counts.

## Decision
- Documents (07) keeps one card: the nationals project documentation (web page, 19 sections, 81 KB).
  `strait-trifold.pdf`, `strait-trifold-preview.png` and `strait-state-documentation.pdf` are deleted. The
  nationals poster photo in the Photos strip stays.
- `strait-nationals-documentation.html` is the original 2026-06-20 page, byte for byte. The restyled page and
  its `.doc-*` styles in `src/styles/site.css` are gone.
- `Rival.retryCountsAsLoss(state)`: true once a move is made and the level is not over. The hint threshold is
  unchanged (2), so two mid-game retries show the hint, and by the third the next-move offer is there too.
- The home page's STRAIT slot shows `assets/strait/photo-state-in-ground.jpg`.

PR with screenshots: see the pull request for branch content/strait-cleanup.

## Consequences
- The documentation page does not follow the site's theme or tokens and has no link back to the site; that is
  the cost of publishing it unchanged.
- If the original changes in hw-strait, copy it again (no edits to keep in step).
