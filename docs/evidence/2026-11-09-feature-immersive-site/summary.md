# ui-check 2026-11-09

Theme: light + dark. Widths: 375px, 1280px. Source: static server on the project folder.

| Page | Result | Problems | Screenshots |
| --- | --- | --- | --- |
| home (`/`) | PASS | 0 | [375px-light](home-375px-light.png), [1280px-light](home-1280px-light.png), [375px-dark](home-375px-dark.png), [1280px-dark](home-1280px-dark.png) |
| level-4-hidden-rule (`/#level-4`) | PASS | 0 | [375px-light](level-4-hidden-rule-375px-light.png), [1280px-light](level-4-hidden-rule-1280px-light.png), [375px-dark](level-4-hidden-rule-375px-dark.png), [1280px-dark](level-4-hidden-rule-1280px-dark.png) |
| reading-view (`/#story`) | PASS | 0 | [375px-light](reading-view-375px-light.png), [1280px-light](reading-view-1280px-light.png), [375px-dark](reading-view-375px-dark.png), [1280px-dark](reading-view-1280px-dark.png) |

Console and network: 3 of 3 pages clean.
Design/contrast: PASS (`node scripts/design-check.mjs`): Contrast (WCAG 2.2, colours from src/styles/tokens.css) | DESIGN CHECK PASSED
Screenshots over 300 KB saved with a smaller colour palette: reading-view-1280px-light.png (256 colours, 130 KB), reading-view-1280px-dark.png (256 colours, 131 KB).
