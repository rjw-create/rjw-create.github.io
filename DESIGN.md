# DESIGN.md: the design system for this project

> Claude reads this before building any UI. It works like CLAUDE.md, but for how things look.
> Fill in the blanks and delete sections you don't need. Specific values beat adjectives.
> `scripts/check.sh` reads the "Token file" line and the two tables marked *(checked)*, so keep
> their column headings as they are.

## Links
- Design System artifact: _(none yet: run the `design-system` skill)_
- Token file: `src/styles/tokens.css`

Python projects without a stylesheet: point "Token file" at your CSS or theme file once the
project has a UI. Until then the token lint is skipped and contrast is checked from the table below.

### Wireframes
Approved wireframes are what `verify-app` compares the built page against. Add a row when one is approved.

| Date | Screen | Artifact | Status |
| --- | --- | --- | --- |
| 2026-11-09 | Home | "2026-11-09 Personal site directions" canvas (private; this repo is public, so no link) | built |

## Personality
Three words, and what each means in practice.
- **Playable**: the game is the site. Four levels of Read the Rival, one per entry, then a Contact finale;
  beating a level lays its entry over the board. Nothing is ever locked: Skip level, the level path and
  "Read without playing" reach every entry without winning.
- **Handmade**: a field notebook on a desk. Grid paper, a red margin line, dated entries, taped-in media
  with a hard offset shadow, red-pen notes. No rounded cards, no gradients of colour.
- **Exact**: counts are real and come from the brief (500 commits, 89 and 75+ merged pull requests), set
  in the mono face. No invented numbers, quotes or results.

## Colour roles *(checked)*
Tokens are named by role, not by value: `--color-text-muted`, never `--grey-600`. Components use
`var(--token)` only; a raw hex, rgb() or hsl() outside the token file fails the check, unless it is
the value of a token definition (`--name: #hex;`).
This table must match the token file; the check fails if they drift apart.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-bg` | #f1ecdf | #17150f | The desk: page background |
| `--color-surface` | #fbf8f0 | #211e17 | Notebook pages, the board |
| `--color-sunken` | #e6dfcd | #2c281f | Taped-in media slots, contents rows, sealed bands |
| `--color-text` | #1b1f27 | #efe9db | Ink: body text, your piece |
| `--color-text-muted` | #575247 | #ada593 | Pencil: secondary text, captions |
| `--color-border` | #ddd4bf | #3a342a | Decorative dividers (no contrast target) |
| `--color-border-strong` | #7a7364 | #8a8170 | Board lines, control outlines |
| `--color-accent` | #1e6b52 | #7fc8a6 | Green ink: links, the one primary action |
| `--color-on-accent` | #ffffff | #10140f | Text on an accent fill |
| `--color-danger` | #b5301a | #ff7a5c | Errors |
| `--color-success` | #13733a | #4cc77a | Confirmations |
| `--color-focus` | #1e6b52 | #7fc8a6 | Focus ring |
| `--color-pen` | #a62b17 | #ff9479 | Red pen: margin notes, dated entry lines |
| `--color-rival` | #b5301a | #ff7a5c | The rival's piece and trail |
| `--color-star` | #e2b23c | #e8c04e | Star fill (decorative; the edge carries the contrast) |
| `--color-star-edge` | #1b1f27 | #e8c04e | A star's outline on the board |
| `--color-tape` | #e3cd85 | #6e5e2e | Masking tape on taped-in media (decorative) |
| `--color-grid` | #e7e0cf | #26231b | Notebook grid lines (decorative) |
| `--color-margin-rule` | #e4b5a8 | #5a2f26 | The notebook's red margin line (decorative) |
| `--color-highlight` | #f0d86e | #6b5a1c | Highlighter behind "draft" labels |

## Contrast pairs *(checked)*
WCAG 2.2 minimums: **4.5:1** for body text, **3:1** for large text (24px, or 14pt bold, about 18.7px) and
for the boundaries of UI components such as input outlines and focus rings. Every pair below is
checked in both themes. Add a row whenever text or a control sits on a new background.

| Foreground | Background | Min ratio | Where |
| --- | --- | --- | --- |
| `--color-text` | `--color-bg` | 4.5 | Body text |
| `--color-text` | `--color-surface` | 4.5 | Text on cards |
| `--color-text-muted` | `--color-bg` | 4.5 | Captions |
| `--color-text-muted` | `--color-surface` | 4.5 | Captions on cards |
| `--color-accent` | `--color-bg` | 4.5 | Links |
| `--color-on-accent` | `--color-accent` | 4.5 | Primary button label |
| `--color-danger` | `--color-bg` | 4.5 | Error text |
| `--color-success` | `--color-bg` | 4.5 | Success text |
| `--color-border-strong` | `--color-surface` | 3 | Board lines, control outlines |
| `--color-focus` | `--color-bg` | 3 | Focus ring |
| `--color-focus` | `--color-surface` | 3 | Focus ring on the board and pages |
| `--color-text` | `--color-sunken` | 4.5 | Level path steps, media slot labels |
| `--color-text-muted` | `--color-sunken` | 4.5 | Captions in media slots |
| `--color-accent` | `--color-surface` | 4.5 | Links on notebook pages |
| `--color-accent` | `--color-sunken` | 4.5 | Links in contents rows |
| `--color-pen` | `--color-surface` | 4.5 | Margin notes and entry dates |
| `--color-pen` | `--color-bg` | 4.5 | Red-pen labels on the desk |
| `--color-rival` | `--color-surface` | 3 | The rival's piece on the board |
| `--color-text` | `--color-highlight` | 4.5 | "Draft" label on highlighter |
| `--color-star-edge` | `--color-surface` | 3 | A star's outline on the board |

To measure a colour before it becomes a token:
`node scripts/design-check.mjs ratio "#hex" "#hex"` or `python scripts/design_check.py ratio "#hex" "#hex"`.

## Type
| Token | Font / size | Use |
| --- | --- | --- |
| `--font-display` | Bricolage Grotesque 800 (Google Fonts) | Headings |
| `--font-body` | Newsreader 400/500, italic for margin notes (Google Fonts) | Everything else |
| `--font-data` | IBM Plex Mono 400/500 (Google Fonts) | Labels, dates, counts, the board's score |
| `--text-hero` | 44-88px, fluid | "Make a move." only |
| `--text-display` | 40px | One per page at most |
| `--text-title` | 32px | Entry titles |
| `--text-heading` | 24px | Section heading |
| `--text-subheading` | 20px | Sub-section |
| `--text-read` | 19px, line-height 1.55 | Long-form reading in the notebook |
| `--text-body` | 16px | Body |
| `--text-small` | 14px | Captions, labels. The floor: nothing smaller |

- At most three families, each with one job. Weights: 400 body, 800 display headings.
- Reading text stays within `--measure` (62ch).
- Numbers that line up in columns use `--font-data` (or `font-variant-numeric: tabular-nums`).

## Space, shape, elevation, motion
- **Space: 8px scale.** `--space-1` 8, `--space-2` 16, `--space-3` 24, `--space-4` 32,
  `--space-6` 48, `--space-8` 64. `--space-half` (4px) only for tight icon gaps.
  A raw px/rem/em in `margin`, `padding`, `gap` or `font-size` fails the check.
  `--space-12` 96px between notebook entries on wide screens.
- **Size:** `--size-tap` 44px (smallest target), `--size-board` min(86vw, 58svh, 560px) (the board, as
  large as the screen allows), `--size-grid` 24px (notebook grid pitch).
- **Radius:** paper has hard edges. `--radius-sm` 2px, `--radius` 4px, `--radius-lg` 8px.
- **Elevation:** flat paper. `--shadow-1` is a hard 3px offset for taped-in media and the board;
  `--shadow-2` for overlays. Nothing else gets a shadow.
- **Motion:** `--duration-fast` 120ms (hover, toggle), `--duration` 220ms (a piece's step, an entry
  sliding over the board), `--duration-slow` 480ms (a star pickup burst), `--ease`. With
  `prefers-reduced-motion: reduce` all three become 0ms and the burst is not drawn.
- **Scrim:** `--scrim` darkens the board behind an entry page (translucent, so no contrast pair).
- **Sound:** off until the visitor turns it on (the Sound button). Short tones for your step, the
  rival's step, a star, and the end of a board; nothing plays on its own.

## Layout
- Max content width 720px for reading, 1200px for dashboards.
- Mobile first. Every screen is checked at **375px** and **1280px**, in **light and dark**.
- One primary action per screen.

## Component inventory
Build from this list before inventing something new. Add a row when a component is built.

| Component | Variants | States | Snippet | File |
| --- | --- | --- | --- | --- |
| Tool button | default, primary (Next level), pressed (Sound) | default, hover, focus | `<button class="tool" type="button">Retry level</button>` | src/styles/site.css |
| HUD | phone (3 rows), wide (1 row) | sticky, always visible | `<header class="hud">` | src/styles/site.css |
| Board | 5 by 5, taped-in sheet | legal square (dashed ring), star, trail (last two steps), star burst | `<div class="board" role="group">` (cells built by src/js/site.js) | src/styles/site.css |
| Level path | 5 steps across (phone), list (wide) | playing, won, skipped, finale | `<button class="path-step" aria-current="step">` | src/styles/site.css |
| Entry sheet | level won, level skipped, finale | open over a scrim | `<dialog class="sheet">` | src/styles/site.css |
| Notebook entry | in the reading view, or borrowed by the sheet | static | `<article class="entry" id="story">` | src/styles/site.css |
| Counts strip | 2-3 counts | static | `<dl class="counts">` | src/styles/site.css |
| Media slot | wide, normal | placeholder, filled (video or img) | `<figure class="slot">` | src/styles/site.css |

Every async view has empty, loading and error states. Every interactive element has a visible focus state.

## Visual workflow
The loop for any new screen or visible change (details: the kit's `guides/2026-11-05-VISUAL-WORKFLOW.md`).
1. **Wireframe.** Run the `wireframe` skill: 3-4 layouts in a private Design artifact titled
   `YYYY-MM-DD <screen> wireframes`, using the tokens above. Stop until it is approved, then add
   it to the Wireframes table.
2. **Options.** For each open UI decision, run the `ui-options` skill: 3-4 options with a one-line
   tradeoff each, measured contrast where colour is involved, and which parts could be merged.
   Record the approved choice in the Decisions table below and in `docs/decisions/`.
3. **Build** with tokens only. A new colour, size or component goes into the token file, this
   file and the Design System artifact (`design-system` skill) first.
4. **Verify.** `./scripts/check.sh` (token lint and contrast), then `verify-app`: screenshots at
   375px and 1280px in both themes next to the approved wireframe, plus the console.

## Decisions
One row per approved UI choice; the full record (context, options, decision, consequences) goes in
`docs/decisions/`. Keeping the options shows why the others lost, so they aren't re-proposed.

| Date | Decision | Options (artifact) | Chosen, and what was merged in | Record |
| --- | --- | --- | --- | --- |
| 2026-11-09 | Homepage direction | A Field notebook, B Playable front door, C Instrument readout, D Liner notes | B as the whole site (levels = entries, after Jackson's "centered around the game" feedback), with A's notebook texture, C's counts strip and D's track list as the level path | docs/decisions/2026-11-09-homepage-direction.md |

## Avoid
Models drift to the same generic look when left to default. Name what this project avoids.
- Default fonts chosen by habit (Inter, Roboto, Arial) instead of on purpose.
- Purple-to-blue gradients, glassmorphism, glow effects, emoji as icons.
- Shadows on everything; more than one accent colour; grey text below its contrast target.
- A token picked because its colour looks right: pick by role, or the other theme breaks.
- Lorem ipsum. Use real copy, with units on every physical quantity.
- This project's own: a centred hero with two buttons, a three-card grid, "Hi, I'm" openers, stock
  icons, glassmorphism, blue or purple gradients, and any health or brain-improvement claim.
- Hiding content behind the game: every word stays real HTML in the page, readable without playing.

## References
- Sites whose feel we like: _url_, and what specifically (spacing? type?)
