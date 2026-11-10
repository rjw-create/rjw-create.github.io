---
name: design-system
description: Builds or refreshes the project's Design System artifact, a private claude.ai page showing colour roles in both themes with measured contrast, type, spacing, shape, motion, components and decisions, from DESIGN.md and the token file, and records its link in DESIGN.md. Use when the user says design system or style guide, at project start, or after tokens change.
---

# /design-system: the design system as a page people can look at

## 1. Check first
Run `./scripts/check.sh` (or the design checker on its own: `node scripts/design-check.mjs` /
`python scripts/design_check.py`). Keep its contrast output: those measured ratios go on the page.
If it fails (drift, low contrast, raw values), report the failures and ask before changing tokens.

## 2. Read the sources
DESIGN.md is the documentation; the token file it names is what ships. Read both. If DESIGN.md's
Links section already has a Design System artifact, read it with the Artifact tool
(`action: "read"`) and update that same URL instead of creating a new one.

## 3. Build or update the artifact
- New: Artifact tool `action: "quickstart"`, `intent: "other"`. When the result names a Design
  System type, start from it and follow its instructions; otherwise follow the returned page
  guidance. Title: `YYYY-MM-DD <Project> design system`. On a refresh, keep the existing title.
- It stays private. No local HTML file stands in for it; if the Artifact tool isn't available,
  say so and stop.
- Contents, all from the sources, nothing invented:
  - colour roles: swatches for light and dark side by side, with token name, value and role;
  - contrast pairs with the measured ratios from step 1 and their targets (4.5:1 / 3:1);
  - type scale specimens, the 8px space scale, radius, elevation and motion (note reduced motion);
  - the component inventory with each state;
  - the Avoid list and the Decisions table.

## 4. Record it
Put the link in DESIGN.md under Links ("Design System artifact"). Reply with the link and anything
in DESIGN.md that is still a placeholder (fonts, personality, inventory paths).
