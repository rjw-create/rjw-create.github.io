# ui-check 2026-11-12

Theme: light + dark. Widths: 375px, 1280px. Source: static server on the project folder.

| Page | Result | Problems | Screenshots |
| --- | --- | --- | --- |
| home (`/`) | PASS | 0 | [375px-light](home-375px-light.png), [1280px-light](home-1280px-light.png), [375px-dark](home-375px-dark.png), [1280px-dark](home-1280px-dark.png) |
| level-4-hidden-rule (`/#level-4`) | PASS | 0 | [375px-light](level-4-hidden-rule-375px-light.png), [1280px-light](level-4-hidden-rule-1280px-light.png), [375px-dark](level-4-hidden-rule-375px-dark.png), [1280px-dark](level-4-hidden-rule-1280px-dark.png) |
| reading-view (`/#story`) | PASS | 0 | [375px-light](reading-view-375px-light.png), [1280px-light](reading-view-1280px-light.png), [375px-dark](reading-view-375px-dark.png), [1280px-dark](reading-view-1280px-dark.png) |
| home-old-strait-link (`/#strait`) | PASS | 0 | [375px-light](home-old-strait-link-375px-light.png), [1280px-light](home-old-strait-link-1280px-light.png), [375px-dark](home-old-strait-link-375px-dark.png), [1280px-dark](home-old-strait-link-1280px-dark.png) |
| msit (`/msit.html`) | PASS | 0 | [375px-light](msit-375px-light.png), [1280px-light](msit-1280px-light.png), [375px-dark](msit-375px-dark.png), [1280px-dark](msit-1280px-dark.png) |
| msit-documents (`/msit.html#documents`) | PASS | 0 | [375px-light](msit-documents-375px-light.png), [1280px-light](msit-documents-1280px-light.png), [375px-dark](msit-documents-375px-dark.png), [1280px-dark](msit-documents-1280px-dark.png) |
| old-strait-page-redirect (`/strait.html#documents`) | PASS | 0 | [375px-light](old-strait-page-redirect-375px-light.png), [1280px-light](old-strait-page-redirect-1280px-light.png), [375px-dark](old-strait-page-redirect-375px-dark.png), [1280px-dark](old-strait-page-redirect-1280px-dark.png) |
| msit-nationals-documentation (`/msit-nationals-documentation.html`) | PASS | 0 | [375px-light](msit-nationals-documentation-375px-light.png), [1280px-light](msit-nationals-documentation-1280px-light.png), [375px-dark](msit-nationals-documentation-375px-dark.png), [1280px-dark](msit-nationals-documentation-1280px-dark.png) |

Console and network: 8 of 8 pages clean.
Design/contrast: PASS (`node scripts/design-check.mjs`): Contrast (WCAG 2.2, colours from src/styles/tokens.css) | DESIGN CHECK PASSED
Screenshots over 300 KB saved with a smaller colour palette: reading-view-375px-light.png (256 colours, 133 KB), reading-view-1280px-light.png (256 colours, 209 KB), reading-view-375px-dark.png (256 colours, 134 KB), reading-view-1280px-dark.png (256 colours, 209 KB), home-old-strait-link-375px-light.png (256 colours, 134 KB), home-old-strait-link-1280px-light.png (256 colours, 210 KB), home-old-strait-link-375px-dark.png (256 colours, 134 KB), home-old-strait-link-1280px-dark.png (256 colours, 211 KB), msit-375px-light.png (64 colours, 259 KB), msit-375px-dark.png (64 colours, 260 KB), msit-documents-375px-light.png (64 colours, 259 KB), msit-documents-375px-dark.png (64 colours, 260 KB), old-strait-page-redirect-375px-light.png (64 colours, 259 KB), old-strait-page-redirect-375px-dark.png (64 colours, 260 KB).
Cropped after the run so they fit under 300 KB (the pages are 10,000 px tall or more): `msit-1280px-*` and
`old-strait-page-redirect-1280px-*` show the top 640 px; `msit-documents-1280px-*` and `msit-documents-375px-*`
show the bottom of the page, where Documents (07) is; `msit-nationals-documentation-*` show the top.
Before cropping these were over 300 KB: msit-1280px-light.png (520 KB), msit-1280px-dark.png (519 KB), msit-documents-1280px-light.png (520 KB), msit-documents-1280px-dark.png (519 KB), old-strait-page-redirect-1280px-light.png (520 KB), old-strait-page-redirect-1280px-dark.png (519 KB), msit-nationals-documentation-375px-light.png (782 KB), msit-nationals-documentation-1280px-light.png (928 KB), msit-nationals-documentation-375px-dark.png (782 KB), msit-nationals-documentation-1280px-dark.png (928 KB). Leave them out or check fewer pages.
