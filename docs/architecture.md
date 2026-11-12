# Architecture

> Claude reads this before structural changes (linked from CLAUDE.md). Keep it to one or two pages.
> Update it when the shape of the system changes, not for every feature.

## What this is
Jackson Raines's personal site: one static page served by GitHub Pages from `main`. The site is a game: four
Read the Rival levels, one per notebook entry, then a Contact finale. All content is plain HTML.

## Main pieces
| Part | Where | Responsibility |
| --- | --- | --- |
| Page | `index.html` | HUD, game world, entry sheet (`<dialog>`), reading view with every entry |
| Game rules | `src/js/rival.js` | Pure rules (A, B, C) and the four levels; works in the browser (`window.Rival`) and in Node tests |
| Game | `src/js/site.js` | Levels, board drawing, input (tap, click, arrow keys), path, sheet, reading view, opt-in sound |
| Styles | `src/styles/tokens.css`, `src/styles/site.css` | Tokens, then layout and components (tokens only) |

## How a visit flows
1. Without JavaScript, the game stays hidden and the reading view is the page.
2. With JavaScript, `html.mode-game` shows the game; the reading view stays in the page off screen (screen
   readers and search read it), with its links out of the Tab order.
3. Winning (or skipping) a level moves that entry's element into the sheet; closing the sheet puts it back.
   Each entry exists once in the page.
4. "Read without playing" switches to `html.mode-reading`: the game hides and the reading view shows.
5. `#level-N` opens a level; an entry id (`#pathways`) opens the reading view there.
6. Old names keep working: `#strait` is an empty element inside the MSIT entry, and `strait.html` and
   `strait-nationals-documentation.html` are redirect pages (`tests/site-links.test.js` holds this).

## External services
- Google Fonts: Bricolage Grotesque, Newsreader, IBM Plex Mono (stylesheet link in `index.html`).

## Rules of the road
- `rival.js` never touches the DOM. `tests/rival.test.js` proves every level can be won, levels 2-4 have
  exactly one winning first move that is not the step toward your nearest star, and level 4's trail fits
  only its hidden rule. Change a level only with the test passing.
- Never hide entry text from readers: no `display: none` or `aria-hidden` on the reading view in game mode.
- No build step and no dependencies beyond the UI check's Playwright.

## Known weak spots
- The `<dialog>` close event arrives after Next has opened the next sheet; the close handler checks
  `sheet.open` first. Keep that check if the sheet flow changes.
