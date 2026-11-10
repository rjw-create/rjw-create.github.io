/* The site's game: pure rules and levels, no DOM. Loaded as a classic script in the page (window.Rival)
   and with require() in tests, so there is no build step.

   Rules (Read the Rival's, on a 5 by 5 board):
   - Each turn you step one square up, down, left or right (never onto the rival). Land on a star to take it.
   - Then the rival steps by its rule. Rules A and B head for the star nearest to the rival, C for the star
     nearest to you. Each tries its four steps in a fixed order, takes the first that gets closer to one of
     those stars and never steps onto you. With no such step it waits.
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
  const RULES = {
    A: { toward: "rival", order: [0, 1, 2, 3], text: "It steps toward the star nearest to it, trying up, then left, right, down." },
    B: { toward: "rival", order: [3, 2, 1, 0], text: "It steps toward the star nearest to it, trying down, then right, left, up." },
    C: { toward: "you", order: [0, 1, 2, 3], text: "It steps toward the star nearest to you, trying up, then left, right, down." },
  };

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

  function dirBetween(from, to) {
    const d = DIRS.find((x) => stepTo(from, x) === to);
    return d ? d.name : null;
  }

  // Squares you may step to: on the board and not the rival's square.
  function legalMoves(you, rival) {
    return DIRS.map((d) => ({ dir: d.name, to: stepTo(you, d) })).filter((m) => m.to >= 0 && m.to !== rival);
  }

  // Where the rival steps under a rule (or its own square if it waits).
  function rivalStep(ruleId, rival, you, stars) {
    if (stars.length === 0) return rival;
    const rule = RULES[ruleId];
    const from = rule.toward === "you" ? you : rival;
    const nearest = Math.min(...stars.map((s) => dist(from, s)));
    const goals = stars.filter((s) => dist(from, s) === nearest);
    const now = Math.min(...goals.map((s) => dist(rival, s)));
    for (const i of rule.order) {
      const q = stepTo(rival, DIRS[i]);
      if (q < 0 || q === you) continue;
      if (goals.some((s) => dist(q, s) < now)) return q;
    }
    return rival;
  }

  function startState(level) {
    return { rule: level.rule, you: level.you, rival: level.rival, stars: level.stars.slice(), mine: 0, theirs: 0, turn: 0, turns: level.turns };
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
    const r = rivalStep(s.rule, s.rival, s.you, s.stars);
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

  // Moves from a state that still allow a win.
  function winningMoves(s) {
    return legalMoves(s.you, s.rival).filter((m) => bestMargin(play(s, m.to).state) > 0);
  }

  // First moves that step toward your nearest star: the move a level is built to make tempting.
  function greedyFirstMoves(level) {
    const near = Math.min(...level.stars.map((x) => dist(level.you, x)));
    return legalMoves(level.you, level.rival).filter((m) =>
      level.stars.some((x) => dist(level.you, x) === near && dist(m.to, x) < near));
  }

  // Rules that could have made the rival's last two steps (trail[0] -> trail[1] -> its square).
  function rulesFitting(level) {
    const [a, b] = level.trail;
    return Object.keys(RULES).filter((id) =>
      rivalStep(id, a, level.you, level.stars) === b && rivalStep(id, b, level.you, level.stars) === level.rival);
  }

  // One level per notebook entry. Squares count 0 to 24, left to right, top row first.
  // tests/rival.test.js proves each one is winnable (levels 2-4: exactly one winning first move, not the
  // step toward your nearest star) and that level 4's trail fits only its hidden rule.
  const LEVELS = [
    { id: "story", name: "Story", rule: "A", hidden: false, you: 12, rival: 4, stars: [1, 5, 16, 20], turns: 3 },
    { id: "pathways", name: "Pathways", rule: "B", hidden: false, you: 23, rival: 11, stars: [3, 6, 8, 20, 21], turns: 4 },
    { id: "mission-board", name: "Mission Board", rule: "C", hidden: false, you: 2, rival: 19, stars: [10, 16, 17, 23, 24], turns: 4 },
    { id: "strait", name: "STRAIT", rule: "B", hidden: true, you: 10, rival: 22, stars: [0, 2, 8, 13, 18], turns: 4, trail: [20, 21] },
  ];

  const api = { N, DIRS, RULES, LEVELS, rowOf, colOf, dist, squareName, stepTo, dirBetween, legalMoves, rivalStep, startState, play, isOver, bestMargin, winningMoves, greedyFirstMoves, rulesFitting };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Rival = api;
})(this);
