# ui-check 2026-11-13

Theme: dark. Widths: 375px, 1280px. Source: static server on the project folder.

| Page | Result | Problems | Screenshots |
| --- | --- | --- | --- |
| home (`/`) | PASS | 0 | [375px-dark](home-375px-dark.png), [1280px-dark](home-1280px-dark.png) |
| level-4-hidden-rule (`/#level-4`) | PASS | 0 | [375px-dark](level-4-hidden-rule-375px-dark.png), [1280px-dark](level-4-hidden-rule-1280px-dark.png) |
| reading-view (`/#story`) | PASS | 0 | [375px-dark](reading-view-375px-dark.png), [1280px-dark](reading-view-1280px-dark.png) |
| home-old-strait-link (`/#strait`) | PASS | 0 | [375px-dark](home-old-strait-link-375px-dark.png), [1280px-dark](home-old-strait-link-1280px-dark.png) |
| msit (`/msit.html`) | PASS | 0 | [375px-dark](msit-375px-dark.png), [1280px-dark](msit-1280px-dark.png) |
| msit-documents (`/msit.html#documents`) | PASS | 0 | [375px-dark](msit-documents-375px-dark.png), [1280px-dark](msit-documents-1280px-dark.png) |
| old-strait-page-redirect (`/strait.html#documents`) | PASS | 0 | [375px-dark](old-strait-page-redirect-375px-dark.png), [1280px-dark](old-strait-page-redirect-1280px-dark.png) |
| msit-nationals-documentation (`/msit-nationals-documentation.html`) | PASS | 0 | [375px-dark](msit-nationals-documentation-375px-dark.png), [1280px-dark](msit-nationals-documentation-1280px-dark.png) |

Console and network: 8 of 8 pages clean.
Design/contrast: PASS (`node scripts/design-check.mjs`): Contrast (WCAG 2.2, colours from src/styles/tokens.css) | DESIGN CHECK PASSED
Screenshots over 300 KB saved with a smaller colour palette: reading-view-375px-dark.png (256 colours, 138 KB), reading-view-1280px-dark.png (256 colours, 216 KB), home-old-strait-link-375px-dark.png (256 colours, 140 KB), home-old-strait-link-1280px-dark.png (256 colours, 215 KB), msit-375px-dark.png (64 colours, 260 KB), msit-documents-375px-dark.png (64 colours, 260 KB), old-strait-page-redirect-375px-dark.png (64 colours, 260 KB).
Still over 300 KB, too big to commit: msit-1280px-dark.png (519 KB), msit-documents-1280px-dark.png (519 KB), old-strait-page-redirect-1280px-dark.png (519 KB), msit-nationals-documentation-375px-dark.png (782 KB), msit-nationals-documentation-1280px-dark.png (928 KB). Leave them out or check fewer pages.
