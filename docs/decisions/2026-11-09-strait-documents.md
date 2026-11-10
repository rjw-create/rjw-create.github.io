# STRAIT page: documents section and device photos

Date: 2026-11-09
Status: Accepted

## Context
Jackson asked (2026-11-09 22:04): "I want our nationals and state documentation on here, as well as our trifold
board. I am referring to the STRAIT section." He picked the documents himself: the 2026-02-23 scanned PDF (state),
the 2026-06-20 project documentation page (nationals) and the trifold poster, published as is with the team
number and city on it. The April technical write-up stays out (his earlier call). At 22:13 the Captain passed on
his device photos (four from state, March 2026; three from nationals, June 2026), with the rule that the best photo
of the device in the ground replaces the signal chain on the first screen.

## Options
No options round: the brief and the Captain's DECIDED line (STATUS 22:13) fixed the content, and the layout reuses
the page's existing parts (media slots, the contents strip, the parts-table box).
- Nationals documentation: a site page or a PDF printed from it. A page keeps its 19 tables readable at 375px
  (each scrolls sideways in its box); a PDF would need pinch-zoom on a phone. Chosen: a page. Its own dark
  stylesheet (raw colours) could not pass the token lint, so it was restyled with the site's tokens.

## Decision
- A "07 Documents" section on `strait.html` with one card per document: what it is, which competition, its
  format and size, and a link (PDFs open in a new tab). The trifold card shows a preview of the poster's top part
  (the page's lower part is empty).
- The state scan turned out to be one page, a hand sketch of the electrode rail; it is labelled as that.
  Republished as `assets/strait/strait-state-documentation.pdf`, rebuilt from the page image as JPEG (541 KB
  instead of 5.1 MB), which also drops the scan's metadata.
- `strait-nationals-documentation.html`: the original text and tables, classes prefixed `doc-`, restyled with
  the site's tokens; two anchors renamed (`#adc` and `#cad` read as hex colours to the lint).
- The in-ground photo (state) is the first-screen image; the signal chain moved into How it works. Five more
  photos form a strip in The build. One desk photo was left out (part of a person at its edge, a phone and
  other personal items); the state board photo was cropped to remove an ID badge with a face and a laptop
  screen. Every photo was re-encoded with all metadata removed (GPS included).

PR with screenshots: see the pull request for branch content/strait-documents.

## Consequences
- New components: photo strip, document card, documentation page (DESIGN.md component inventory).
- If the nationals write-up changes, rebuild the page from the source rather than editing both.
- The photo captions say "first version" for the state photos, based on the four probes and the dates; Jackson
  should confirm.
