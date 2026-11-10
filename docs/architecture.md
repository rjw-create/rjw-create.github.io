# Architecture

> Claude reads this before structural changes (linked from CLAUDE.md). Keep it to one or two pages.
> Update it when the shape of the system changes, not for every feature.

## What this is
Jackson Raines's personal site: one static page served by GitHub Pages from `main`. A small board (Read the
Rival's rule A) is the front door; each move opens the next notebook entry. All content is plain HTML.

## Main pieces
| Part | Where | Responsibility |
| --- | --- | --- |
| Page | `index.html` | All content, contents list, board container |
| Game rules | `src/js/rival.js` | Pure rules and puzzles; works in the browser (`window.Rival`) and in Node tests |
| Front door | `src/js/site.js` | Board drawing, input (tap, click, arrow keys), opening entries, opt-in sound |
| Styles | `src/styles/tokens.css`, `src/styles/site.css` | Tokens, then layout and components (tokens only) |

## How a visit flows
1. Without JavaScript, every entry is open and the board says it needs JavaScript.
2. With JavaScript, `html.js` seals entries 01-04 (their top shows; the text stays in the page).
3. Each move opens the next entry; Skip, a contents row, an entry's Open button or a `#hash` opens entries directly.

## External services
- Google Fonts: Bricolage Grotesque, Newsreader, IBM Plex Mono (stylesheet link in `index.html`).

## Rules of the road
- `rival.js` never touches the DOM; `tests/rival.test.js` proves every shipped puzzle has exactly one
  winning first move that is not the step toward your nearest star.
- Never hide text from readers: sealing is visual only (no `display: none`, no `aria-hidden` on content).
- No build step and no dependencies beyond the UI check's Playwright.

## Known weak spots
- Sealed entries clip with `max-height`; very long entries still open fully, but the sealed preview height
  is one token (`--size-sealed`).
