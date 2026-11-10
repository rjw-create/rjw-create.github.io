# Homepage direction: a playable front door in a field notebook

Date: 2026-11-09
Status: Accepted

## Context
The site's first use is the Sandbox Founder Residency application (priority deadline 2026-11-15). It has to
show how Jackson thinks and what he has made, read as his own rather than AI-made, and never make a reviewer
play a game before reading.

## Options considered
Four homepage directions on one private Design canvas, "2026-11-09 Personal site directions" (this repo is
public, so its link is not recorded here):
1. **A. Field notebook**: the warmest and most personal (dated entries, margin notes, taped-in screenshots),
   but handwriting costs some scan speed.
2. **B. Playable front door**: shows how he thinks and is the most memorable, but a reviewer must make one
   move before reading, so the story must also sit in plain HTML.
3. **C. Instrument readout**: precise and engineered, real counts up front, but cold, and the story gets
   less room.
4. **D. Liner notes**: the clearest story-then-work order and a strong frame, but the music metaphor is
   borrowed from trumpet, not his main work.

Parts worth merging: A's notebook texture, C's counts strip, D's track list as the contents.

## Decision
Jackson picked **"B plus merged parts, I want this to be an immersive design"**, with A's notebook as the
texture of every entry, C's counts strip on Pathways and Mission Board, and D's track list as the level path.

The first build (PR 1, first version) used the board only as a front door above a scrolling notebook.
Jackson sent it back on 2026-11-09: "No, I wanted it to be centered around the game aspect". So **the game is
the site**:
- The home is a full-viewport board world, centred and large, with no page under it.
- Each level is one entry: L1 Story (rule A), L2 Pathways (rule B), L3 Mission Board (rule C), L4 STRAIT
  (rule hidden among the three, with the rival's last two steps shown), then a Contact finale. Beating a
  level lays its entry over the board as a notebook page with a Next level button.
- The level path shows progress (won, skipped, playing) and replays any level.
- Losing gives a fast retry, a hint after two losses and a Skip level button (skipping still shows the entry).
- The HUD always shows the level, the stars, a Sound toggle (off by default) and "Read without playing",
  which opens the reading view: every entry as plain HTML. No-JS visitors get the reading view, and screen
  readers and search always have it in the page.

Evidence: https://github.com/rjw-create/rjw-create.github.io/pull/1 (375px and 1280px screenshots in light
and dark, including mid-game, a won level, the hidden-rule level, the finale and the reading view).

## Consequences
- Easier: one memorable idea that is also proof of making. The tests prove every level can be won, levels
  2-4 have exactly one winning first move that is not the obvious step, and level 4's trail fits only its
  hidden rule.
- Harder: the entries live once, in the reading view; the entry sheet borrows an entry and puts it back.
  Keep it that way so no text is duplicated or hidden from readers.
- Watch: the story is still a draft in the brief's words until Jackson rewrites it, and the media slots stay
  labelled placeholders until the files are added (README).
