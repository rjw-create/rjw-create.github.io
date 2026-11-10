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
| _YYYY-MM-DD_ | _Home_ | _link_ | _draft / approved / built_ |

## Personality
Three words, and what each means in practice.
- e.g. **Calm**: lots of whitespace, one accent colour, no gradients.
- e.g. **Precise**: numbers in the data font, aligned decimals, units on every value.
- e.g. **Trustworthy**: high-contrast text, no tiny grey type.

## Colour roles *(checked)*
Tokens are named by role, not by value: `--color-text-muted`, never `--grey-600`. Components use
`var(--token)` only; a raw hex, rgb() or hsl() outside the token file fails the check, unless it is
the value of a token definition (`--name: #hex;`).
This table must match the token file; the check fails if they drift apart.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-bg` | #fafaf7 | #121212 | Page background |
| `--color-surface` | #ffffff | #1c1c1c | Cards, inputs, menus |
| `--color-text` | #1a1a1a | #f2f2ee | Body text |
| `--color-text-muted` | #5c5c58 | #a8a8a3 | Secondary text, captions |
| `--color-border` | #e4e4df | #2e2e2c | Decorative dividers (no contrast target) |
| `--color-border-strong` | #8a8a84 | #7a7a74 | Input and control outlines |
| `--color-accent` | #2759c7 | #7aa2ff | Primary buttons, links (use sparingly) |
| `--color-on-accent` | #ffffff | #0b0b0b | Text on an accent fill |
| `--color-danger` | #b4380a | #ff8a5c | Errors, destructive actions |
| `--color-success` | #13733a | #4cc77a | Confirmations |
| `--color-focus` | #2759c7 | #7aa2ff | Focus ring |

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
| `--color-border-strong` | `--color-surface` | 3 | Input outline |
| `--color-focus` | `--color-bg` | 3 | Focus ring |

To measure a colour before it becomes a token:
`node scripts/design-check.mjs ratio "#hex" "#hex"` or `python scripts/design_check.py ratio "#hex" "#hex"`.

## Type
| Token | Font / size | Use |
| --- | --- | --- |
| `--font-display` | _choose_ (template: Georgia, serif) | Headings |
| `--font-body` | _choose_ (template: system sans) | Everything else |
| `--font-data` | _choose_ (template: system mono) | Numbers, code, tables (tabular figures) |
| `--text-display` | 40px | One per page at most |
| `--text-title` | 32px | Page title |
| `--text-heading` | 24px | Section heading |
| `--text-subheading` | 20px | Sub-section |
| `--text-body` | 16px, line-height 1.5 | Body |
| `--text-small` | 14px | Captions. The floor: nothing smaller |

- Pick the families on purpose for this project's personality; the template's system stacks
  are placeholders. At most three families, each with one job. Weights: 400 body, 600 headings.
- Numbers that line up in columns use `--font-data` (or `font-variant-numeric: tabular-nums`).

## Space, shape, elevation, motion
- **Space: 8px scale.** `--space-1` 8, `--space-2` 16, `--space-3` 24, `--space-4` 32,
  `--space-6` 48, `--space-8` 64. `--space-half` (4px) only for tight icon gaps.
  A raw px/rem/em in `margin`, `padding`, `gap` or `font-size` fails the check.
- **Radius:** `--radius-sm` 4px (chips), `--radius` 8px (buttons, inputs, cards), `--radius-lg` 16px (dialogs).
- **Elevation:** flat surfaces with a border by default. `--shadow-1` for raised (hover),
  `--shadow-2` for overlays (menus, dialogs). Nothing else gets a shadow.
- **Motion:** `--duration-fast` 120ms (hover, toggle), `--duration` 200ms (panels), `--ease`.
  With `prefers-reduced-motion: reduce` both durations become 0ms, so animate with the tokens.

## Layout
- Max content width 720px for reading, 1200px for dashboards.
- Mobile first. Every screen is checked at **375px** and **1280px**, in **light and dark**.
- One primary action per screen.

## Component inventory
Build from this list before inventing something new. Add a row when a component is built.

| Component | Variants | States | Snippet | File |
| --- | --- | --- | --- | --- |
| Button | primary, secondary, ghost | default, hover, focus, disabled, loading | `<button class="btn btn-primary">Save</button>` | _path_ |
| Text input | default, error | default, focus, disabled, error | `<input class="input" aria-invalid="true">` | _path_ |
| Card | default, raised | default, hover | `<article class="card">...</article>` | _path_ |
| _..._ | | | | |

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
| _YYYY-MM-DD_ | _Nav layout_ | _A tabs, B sidebar, C bottom bar (link)_ | _B, with A's labels_ | _docs/decisions/0001-nav.md_ |

## Avoid
Models drift to the same generic look when left to default. Name what this project avoids.
- Default fonts chosen by habit (Inter, Roboto, Arial) instead of on purpose.
- Purple-to-blue gradients, glassmorphism, glow effects, emoji as icons.
- Shadows on everything; more than one accent colour; grey text below its contrast target.
- A token picked because its colour looks right: pick by role, or the other theme breaks.
- Lorem ipsum. Use real copy, with units on every physical quantity.
- _Add this project's own:_

## References
- Sites whose feel we like: _url_, and what specifically (spacing? type?)
