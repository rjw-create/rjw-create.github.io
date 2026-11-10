# rjw-create.github.io

Jackson Raines's personal site, built as a game: four short Read the Rival boards, one per notebook entry
(story, Pathways, Mission Board, STRAIT and the rest), then a Contact finale. Beating a level lays its entry
over the board. "Read without playing", Skip level and the level path reach every entry without winning, and
all the text is plain HTML in `index.html` (the reading view, which is also what no-JS visitors see).

Plain HTML, CSS and JavaScript, no build step. GitHub Pages serves `main` from the repository root.

## Files
| Path | What it is |
| --- | --- |
| `index.html` | The HUD, the game world, the entry sheet and the reading view with every entry |
| `src/styles/tokens.css` | Design tokens (colour, type, space, motion); see `DESIGN.md` |
| `src/styles/site.css` | Layout and components, tokens only |
| `src/js/rival.js` | The rules (A, B, C) and the four levels, no DOM (tested in `tests/rival.test.js`) |
| `src/js/site.js` | Levels, board, level path, entry sheet, reading view, optional sound |

Links: `#level-1` to `#level-4` open a level; `#story`, `#pathways`, `#mission-board`, `#strait` and
`#contact` open the reading view at that entry.
| `assets/media/` | Screen recordings and screenshots (see below) |

## Adding the screen recordings and screenshots
The page has labelled slots, such as "[screen recording: Pathways classroom mode]". To fill one:

1. Put the file in `assets/media/`: mp4 (H.264), **under 10 MB each**, plus a poster image (a still from the
   video, png or jpg) with the same name, e.g. `pathways-classroom.mp4` and `pathways-classroom.jpg`.
2. In `index.html`, replace that slot's `<div class="slot-frame">[...]</div>` with:

   ```html
   <video src="assets/media/pathways-classroom.mp4" poster="assets/media/pathways-classroom.jpg"
     controls muted playsinline preload="none"></video>
   ```

   For a screenshot use `<img src="assets/media/strait.jpg" alt="What the picture shows">`.
3. Keep the `<figcaption>` under it, and write what the recording shows.

Slots waiting for media: Pathways classroom mode, Read the Rival, Mission Board, STRAIT.

## Checking changes
- `npm install` once (and `npx playwright install chromium` for the UI check).
- `./scripts/check.sh` runs the design check (tokens and contrast) and the board tests.
- `npm run ui-check -- --both-themes` takes 375px and 1280px screenshots in light and dark and records
  console errors and failed requests.
