---
name: frontend-design
description: Short style guardrails for writing or restyling UI code (HTML, CSS, components) in this project - use its tokens, type and spacing, and steer clear of the generic look models default to. Use whenever writing markup or styles, building a component, or restyling a page.
---

# Frontend design: this project's look, not the default look

Left to defaults, models converge on the same generic UI: Inter, purple gradients, cards with
shadows everywhere. This project has its own look; build in it.

**Before writing UI code** read DESIGN.md's Personality, Avoid list and Component inventory, and the
token file it names. Reuse an inventory component before making a new one.

**Palette.** Only `var(--color-*)` role tokens. Pick by role (`--color-text-muted` for captions),
never because a colour looks right. One accent, used for the primary action and links.

**Type.** `--font-display` for headings, `--font-body` for everything else, `--font-data` for
numbers and tables (aligned figures, units on every physical quantity). Sizes from `--text-*`; nothing
below `--text-small`.

**Space and shape.** `--space-*` on the 8px scale for every margin, padding and gap; `--radius*`
for corners; flat surfaces with a border, `--shadow-*` only for raised or overlay elements.

**Motion.** `--duration*` and `--ease` only, so reduced-motion users get none.

**States.** Every interactive element has hover, visible focus and disabled styles; every async
view has empty, loading and error states.

**Avoid** (plus the project's own list in DESIGN.md): habitual fonts, gradients, glassmorphism,
glow, emoji as icons, a second accent colour, lorem ipsum.

**No token fits?** Propose a role-named one; add it to the token file and DESIGN.md together and
run `./scripts/check.sh`. For new screens use the `wireframe` skill first.
