# Play each level until every star is gone

Date: 2026-11-09
Status: Accepted

## Context
Jackson asked to "let the user in my website finish the game by collecting all the stars". Each level used to
stop after a fixed number of moves (3 or 4), often with stars still on the board. Removing that limit raises two
questions: does the game always end, and do the four levels keep their design (a win is possible, and in levels
2-4 exactly one first move wins and it is not the step toward your nearest star)?

## Options considered
A rules change on an existing screen, chosen by Jackson in the orchestrator tab on 2026-11-09 (recorded in
that day's brief); no artifact. The alternative it replaces:
1. **Keep a move limit**: least change, but the board can still end with stars left.
2. **Play until all stars are gone**: the level always clears the board, but the solver and two levels need work.

## Decision
Jackson chose **play until all stars are gone**. No move limit; the level ends when the last star is taken
(by you or the rival), and you win with more stars than the rival. A tie is still not a win.

- The solver can no longer try every line to a last move, because you can walk in circles. It now lists every
  reachable position and settles the best margin by repeated passes (values only rise, and a loop that takes no
  star gains nothing). Each level solves in a few milliseconds.
- A test walks every position a visitor can reach in each level and proves you always have a step and can still
  empty the board, so a level can never stall, even when the rival waits.
- Level 3 (Mission Board) could no longer be won: one star moved from square 16 to 18 (row 4, column 2 to
  column 4).
- Level 4 (STRAIT) gained a second winning first move, the obvious one: your start moved from square 10 to 5
  (one row up). Its stars and the rival's trail are unchanged, and the trail still fits only rule B.
- Both fixes were the smallest found by trying every one-square change to a star or a start square.
- The HUD shows "stars left N" instead of "move X of N", and each goal line names the star count.

PR with screenshots: https://github.com/rjw-create/rjw-create.github.io/pull/3

## Consequences
- Every finished level shows a cleared board, and a visitor can never be stopped short by a counter.
- A level can now last longer if a visitor wanders, since nothing counts down; the rival keeps heading for
  stars meanwhile.
- Changing a level now means re-running `tests/rival.test.js`, which also checks that no position stalls.
