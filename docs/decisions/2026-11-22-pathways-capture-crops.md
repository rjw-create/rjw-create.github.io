# Cropping the Pathways screen recordings

Date: 2026-11-22
Status: Accepted

## Context
The 2026-11-21 design critique of the site found that the two Pathways recordings in the Pathways entry were
whole-window captures, so they read as pasted in. The brief asked for both to be cropped, with the posters and
videos cropped the same way: Read the Rival to the rival's rule box, board and result line; the classroom
recording to the team tally panel and the revealed answer, without the word problem.

## Options
Read the Rival had no options round: the brief fixed the crop. For the classroom recording, the crop it asked for
can't be one rectangle: the tally panel sits beside the word problem, so a box holding the tally and the answer bar
also holds the problem, and the 50-second video moves through six different screens. A small pick on an existing
screen, asked in the STATUS file (sitepolish, 11:27):
- A: leave the classroom poster and video as they are. They already show only the app, with no sidebar or
  browser bars.
- B: crop to the bottom band (answer choices, revealed answer, buttons). The tally panel loses its top half and
  the video's other screens are cut.

## Decision
- Classroom: A (the Captain's DECIDED, 2026-11-22 12:05). Its poster and video are unchanged.
- Read the Rival: poster and video are 652x560 and show the rule box, board and result line. The page scrolls
  during the recording, so the video's crop follows the board's measured position frame by frame; the clip stops
  before the last scroll hides the rule box under the sticky header and holds its final frame for 1.5 s.

PR with screenshots: see the pull request for branch fix/site-media-polish.

## Consequences
- `tests/site-links.test.js` checks that each home-page video, its poster and its width and height attributes
  have the same size, so a recropped poster can't drift from its video.
- The Read the Rival recording now ends on the result line; the "Won, 2 to 1" explanation is no longer shown in it.
- A new recording of either clip has to be cropped again. The Read the Rival crop, from the 1280-wide capture:
  x 456, width 652; top 120 px above the board's top border, height 560 (100 px below the board's bottom).
