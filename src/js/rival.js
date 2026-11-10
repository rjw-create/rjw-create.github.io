/* The front-door board: pure game logic, no DOM. Loaded as a classic script in the page (window.Rival)
   and with require() in tests, so there is no build step.

   Rules (Read the Rival's printed rule A, on a 5 by 5 board):
   - Each turn you step one square up, down, left or right (never onto the rival). Land on a star to take it.
   - Then the rival steps toward the star nearest to it. It tries up, left, right, down, takes the first step
     that gets closer to one of those nearest stars and never steps onto you. With no such step it waits.
   - After the last turn, you win with more stars than the rival. */
(function (root) {
  "use strict";

  const N = 5;
  const DIRS = [
    { name: "up", dr: -1, dc: 0 },
    { name: "left", dr: 0, dc: -1 },
    { name: "right", dr: 0, dc: 1 },
    { name: "down", dr: 1, dc: 0 },
  ];

  const rowOf = (sq) => Math.floor(sq / N);
  const colOf = (sq) => sq % N;
  const dist = (a, b) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));
  const squareName = (sq) => `row ${rowOf(sq) + 1}, column ${colOf(sq) + 1}`;

  function stepTo(sq, dir) {
    const r = rowOf(sq) + dir.dr;
    const c = colOf(sq) + dir.dc;
    if (r < 0 || r >= N || c < 0 || c >= N) return -1;
    return r * N + c;
  }

  // Squares you may step to: on the board and not the rival's square.
  function legalMoves(you, rival) {
    return DIRS.map((d) => ({ dir: d.name, to: stepTo(you, d) })).filter((m) => m.to >= 0 && m.to !== rival);
  }

  // Where the rival steps (or its own square if it waits).
  function rivalStep(rival, you, stars) {
    if (stars.length === 0) return rival;
    const nearest = Math.min(...stars.map((s) => dist(rival, s)));
    const goals = stars.filter((s) => dist(rival, s) === nearest);
    for (const d of DIRS) {
      const q = stepTo(rival, d);
      if (q < 0 || q === you) continue;
      if (goals.some((s) => dist(q, s) < nearest)) return q;
    }
    return rival;
  }

  function startState(puzzle) {
    return { you: puzzle.you, rival: puzzle.rival, stars: puzzle.stars.slice(), mine: 0, theirs: 0, turn: 0, turns: puzzle.turns };
  }

  // One full turn: your step to `to`, then the rival's. Returns a new state and what happened.
  function play(state, to) {
    const s = { ...state, stars: state.stars.slice() };
    const events = { you: to, took: false, rivalFrom: s.rival, rivalTo: s.rival, rivalTook: false };
    s.you = to;
    if (s.stars.includes(to)) {
      s.stars = s.stars.filter((x) => x !== to);
      s.mine += 1;
      events.took = true;
    }
    const r = rivalStep(s.rival, s.you, s.stars);
    events.rivalTo = r;
    s.rival = r;
    if (s.stars.includes(r)) {
      s.stars = s.stars.filter((x) => x !== r);
      s.theirs += 1;
      events.rivalTook = true;
    }
    s.turn += 1;
    return { state: s, events };
  }

  const isOver = (s) => s.turn >= s.turns || s.stars.length === 0;

  // Best final margin (mine - theirs) you can force from a state, by trying every line.
  function bestMargin(s) {
    if (isOver(s)) return s.mine - s.theirs;
    const moves = legalMoves(s.you, s.rival);
    if (moves.length === 0) return s.mine - s.theirs;
    return Math.max(...moves.map((m) => bestMargin(play(s, m.to).state)));
  }

  // First moves from the start that still allow a win.
  function winningFirstMoves(puzzle) {
    const s = startState(puzzle);
    return legalMoves(s.you, s.rival).filter((m) => bestMargin(play(s, m.to).state) > 0);
  }

  // First moves that step toward your nearest star: the move a puzzle is built to make tempting.
  function greedyFirstMoves(puzzle) {
    const near = Math.min(...puzzle.stars.map((x) => dist(puzzle.you, x)));
    return legalMoves(puzzle.you, puzzle.rival).filter((m) =>
      puzzle.stars.some((x) => dist(puzzle.you, x) === near && dist(m.to, x) < near));
  }

  // Hand-checked boards (tests/rival.test.js proves each one: exactly one winning first move, and it is not
  // the step toward your nearest star). Squares count 0 to 24, left to right, top row first.
  const PUZZLES = [
    { you: 23, rival: 0, stars: [4, 8, 9, 12, 21], turns: 4 },
    { you: 7, rival: 15, stars: [3, 9, 10, 21, 22], turns: 4 },
    { you: 15, rival: 24, stars: [0, 1, 2, 4, 17], turns: 4 },
  ];

  const api = { N, DIRS, PUZZLES, rowOf, colOf, dist, squareName, stepTo, legalMoves, rivalStep, startState, play, isOver, bestMargin, winningFirstMoves, greedyFirstMoves };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Rival = api;
})(this);
