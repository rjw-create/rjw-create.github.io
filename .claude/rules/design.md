# Design rules (any work that changes what a user sees)

DESIGN.md is the design system: read it before UI work. These are the rules that always apply.

## Tokens only
- Style with `var(--token)` from the token file named in DESIGN.md. No raw colour, font size or
  spacing value in a component. `scripts/check.sh` fails on raw colours, raw sizes, low contrast
  and DESIGN.md / token-file drift.
- Tokens are named by role (`--color-text-muted`), never by value (`--grey-600`). Pick a token for
  its role, not because its colour looks right.
- If no token fits, propose a new role-named one; add it to the token file and DESIGN.md together.

## Wireframe first, then options
- A new screen or game starts as a wireframe: run the `wireframe` skill (3-4 layouts in a private
  Design artifact) and wait for the user's OK before writing UI code.
- A UI decision (layout, colour, component choice) gets a comparison: run the `ui-options` skill
  (3-4 options, a one-line tradeoff each, which parts could be merged, measured contrast for colour).
- After an approved choice, add a row to DESIGN.md's Decisions table and a record in `docs/decisions/`.

## Artifacts
- Artifacts are private claude.ai pages made with the Artifact tool, never local mock files.
  Ask before sharing one.
- Title every artifact with today's date first: `YYYY-MM-DD <name>`.
- Put artifact links in DESIGN.md (Links, Wireframes, Decisions) and in PR descriptions.

## Done means seen
- Run `./scripts/check.sh`, then check the page at 375px and 1280px in light and dark, next to the
  approved wireframe, with the browser console open (`verify-app` does this). Show the screenshots,
  console result and contrast result; if any of these could not be checked, say so.
