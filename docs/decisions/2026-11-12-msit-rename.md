# MSIT rename and the documentation PDF

Date: 2026-11-12
Status: Accepted

## Context
The device's real name is MSIT (Modular Subsurface Imaging Tool); the site had called it STRAIT since
2026-11-09. Jackson asked (2026-11-12) for the name to be MSIT everywhere, for old links to keep working, and
for the new MSIT documentation to be added to Documents (07) as a web copy under 10 MB without the team number,
the teammates' initials, the author metadata or leftover editing notes. The site goes into the Sandbox Founder
Residency application (priority deadline 2026-11-15).

## Options
No options round: the request fixed the content, and every change reuses existing parts (the Document card).
- Old links: delete the old pages, or leave redirects. Redirects, so links already shared still open.
- Older records (`docs/decisions/2026-11-09-strait-*.md`, `2026-11-10-strait-cleanup.md`, and the
  `docs/evidence/` folders from before today): rewrite them, or leave them. Left as written: they quote Jackson,
  name the branches and files of their day, and the screenshots show the old name whatever the text says.
- The PDF's work log: remove only the initials column, or every name in it. Every name: the log's Task and
  Comments sentences also carry initials, three teachers' names and the advisor's signature, and this repo is
  public.

## Decision
- The page is `msit.html`; `strait.html` redirects to it and keeps a `#section` link pointing at the same
  section. `strait-nationals-documentation.html` redirects to `msit-nationals-documentation.html` the same way.
- The home entry's id is `msit`. An empty element inside it keeps the old id, so `#strait` still opens the entry
  with or without JavaScript. The level id in `src/js/rival.js` is `msit`.
- Images moved from `assets/strait/` to `assets/msit/`; the page's style classes are `msit-*`.
- Documents (07) has two cards: the MSIT documentation PDF (`assets/msit/msit-documentation.pdf`, 67 pages,
  8.6 MB) first, then the nationals write-up page as before.
- The PDF is a cleaned copy of the 490 MB original. Removed: the team number on the cover; every set of
  initials and every teacher's name in the work log (pages 39 to 63); the advisor's signature; outline notes
  hidden under the tables on six pages and one hidden template word on the cover; the author, keywords and XMP
  metadata. Pictures were resampled (120 dpi at full-page size, JPEG quality 60). Nothing else in it changed.
- The notebook page gained only the name's long form. The documentation's test figures and its IEEE claim are
  not on the page, and where the documentation and the page disagree the page keeps its statement (see the
  pull request for the list Jackson has to settle).

PR with screenshots: see the pull request for branch content/msit-rename.

## Consequences
- A search for the old name finds it in the two redirect files' names, the `#strait` anchor in `index.html`,
  the redirect test, and the older dated records.
- The PDF is a binary in the repo; replacing it means cleaning the new original again (the scripts are not in
  this repo: no PDF tooling is a dependency of the site).
- The PDF still says what its authors wrote, including figures that differ from the notebook page.
