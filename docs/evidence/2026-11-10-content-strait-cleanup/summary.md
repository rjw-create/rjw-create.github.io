# ui-check 2026-11-10

Theme: light + dark. Widths: 375px, 1280px. Source: static server on the project folder.

| Page | Result | Problems | Screenshots |
| --- | --- | --- | --- |
| home (`/`) | PASS | 0 | [375px-light](home-375px-light.png), [1280px-light](home-1280px-light.png), [375px-dark](home-375px-dark.png), [1280px-dark](home-1280px-dark.png) |
| level-4-hidden-rule (`/#level-4`) | PASS | 0 | [375px-light](level-4-hidden-rule-375px-light.png), [1280px-light](level-4-hidden-rule-1280px-light.png), [375px-dark](level-4-hidden-rule-375px-dark.png), [1280px-dark](level-4-hidden-rule-1280px-dark.png) |
| reading-view (`/#story`) | PASS | 0 | [375px-light](reading-view-375px-light.png), [1280px-light](reading-view-1280px-light.png), [375px-dark](reading-view-375px-dark.png), [1280px-dark](reading-view-1280px-dark.png) |
| strait (`/strait.html`) | PASS | 0 | [375px-light](strait-375px-light.png), [1280px-light](strait-1280px-light.png), [375px-dark](strait-375px-dark.png), [1280px-dark](strait-1280px-dark.png) |
| strait-nationals-documentation (`/strait-nationals-documentation.html`) | PASS | 0 | [375px-light](strait-nationals-documentation-375px-light.png), [1280px-light](strait-nationals-documentation-1280px-light.png), [375px-dark](strait-nationals-documentation-375px-dark.png), [1280px-dark](strait-nationals-documentation-1280px-dark.png) |

Console and network: 5 of 5 pages clean.
Design/contrast: PASS (`node scripts/design-check.mjs`): Contrast (WCAG 2.2, colours from src/styles/tokens.css) | DESIGN CHECK PASSED
Screenshots over 300 KB saved with a smaller colour palette: reading-view-375px-light.png (256 colours, 134 KB), reading-view-1280px-light.png (256 colours, 209 KB), reading-view-375px-dark.png (256 colours, 135 KB), reading-view-1280px-dark.png (256 colours, 210 KB), strait-375px-light.png (128 colours, 293 KB), strait-375px-dark.png (128 colours, 293 KB).
Still over 300 KB, too big to commit: strait-1280px-light.png (503 KB), strait-1280px-dark.png (508 KB), strait-nationals-documentation-375px-light.png (782 KB), strait-nationals-documentation-1280px-light.png (928 KB), strait-nationals-documentation-375px-dark.png (782 KB), strait-nationals-documentation-1280px-dark.png (928 KB). Leave them out or check fewer pages.
