/* The site's game: pure rules and levels, no DOM. Loaded as a classic script in the page (window.Rival)
   and with require() in tests, so there is no build step.

   Rules (Read the Rival's, on a 5 by 5 board):
   - Each turn you step one square up, down, left or right (never onto the rival). Land on a star to take it.
   - Then the rival steps by its rule. Rules A and B head for the star nearest to the rival, C for the star
     nearest to you. Each tries its four steps in a fixed order, takes the first that gets closer to one of
     those stars and never steps onto you. With no such step it waits.
   - The level ends when every star has been taken; you win with more stars than the rival. */
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
    return { rule: level.rule, you: level.you, rival: level.rival, stars: level.stars.slice(), mine: 0, theirs: 0, turn: 0 };
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

  const isOver = (s) => s.stars.length === 0;

  // With no move limit you can walk in circles forever, so trying every line would never finish. Instead the
  // solver lists every position reachable from a start (squares and stars left; at most 25 * 25 * 32), then
  // repeats "best future margin = best over moves of (stars gained - stars lost) + that move's value" until
  // nothing changes. Values only rise and a loop that takes no star gains nothing, so this settles. A position
  // that can never empty the board keeps -Infinity, which the tests check never happens.
  const keyOf = (s) => `${s.rule}|${s.you}|${s.rival}|${s.stars.slice().sort((a, b) => a - b).join(",")}`;
  const futureCache = new Map();

  function solveFrom(s0) {
    const pending = [{ ...s0, mine: 0, theirs: 0, turn: 0 }];
    const edges = new Map();
    while (pending.length) {
      const s = pending.pop();
      const k = keyOf(s);
      if (futureCache.has(k) || edges.has(k)) continue;
      const out = [];
      if (!isOver(s)) {
        for (const m of legalMoves(s.you, s.rival)) {
          const next = play(s, m.to).state;
          const n = { ...next, mine: 0, theirs: 0, turn: 0 };
          out.push({ gain: next.mine - next.theirs, key: keyOf(n) });
          pending.push(n);
        }
      }
      edges.set(k, out);
    }
    const value = new Map();
    for (const [k, out] of edges) value.set(k, out.length ? -Infinity : 0);
    const valueOf = (k) => (futureCache.has(k) ? futureCache.get(k) : value.get(k));
    for (let changed = true; changed;) {
      changed = false;
      for (const [k, out] of edges) {
        if (!out.length) continue;
        const best = Math.max(...out.map((e) => e.gain + valueOf(e.key)));
        if (best > value.get(k)) { value.set(k, best); changed = true; }
      }
    }
    for (const [k, v] of value) futureCache.set(k, v);
  }

  // Best margin (mine - theirs) still to come from a state's position, playing your best.
  function futureMargin(s) {
    const k = keyOf(s);
    if (!futureCache.has(k)) solveFrom(s);
    return futureCache.get(k);
  }

  // Best final margin (mine - theirs) you can force from a state.
  const bestMargin = (s) => s.mine - s.theirs + futureMargin(s);

  // Moves from a state that still allow a win.
  function winningMoves(s) {
    return legalMoves(s.you, s.rival).filter((m) => bestMargin(play(s, m.to).state) > 0);
  }

  // Every position reachable from a level's start, whatever you do (for tests).
  function reachableStates(level) {
    const seen = new Map();
    const pending = [startState(level)];
    while (pending.length) {
      const s = pending.pop();
      const k = keyOf(s);
      if (seen.has(k)) continue;
      seen.set(k, s);
      if (!isOver(s)) for (const m of legalMoves(s.you, s.rival)) pending.push(play(s, m.to).state);
    }
    return [...seen.values()];
  }

  // First moves that step toward your nearest star: the move a level is built to make tempting.
  function greedyFirstMoves(level) {
    const near = Math.min(...level.stars.map((x) => dist(level.you, x)));
    return legalMoves(level.you, level.rival).filter((m) =>
      level.stars.some((x) => dist(level.you, x) === near && dist(m.to, x) < near));
  }

  // A Retry pressed mid-game gives up on that try, so it counts toward hints like a loss (the user,
  // 2026-11-10). Not before the first move (nothing was tried) and not after the end (the loss already counted).
  function retryCountsAsLoss(state) {
    return state.turn > 0 && !isOver(state);
  }

  // The hint under the board after a visitor loses (or retries) a level twice in a row. Only levels with their
  // own line have one; the others go straight to revealing moves. Null before the second loss.
  const HINT_AFTER_LOSSES = 2;
  function hintFor(level, losses) {
    if (losses < HINT_AFTER_LOSSES || !level.hint) return null;
    return `Hint: ${level.hint}`;
  }

  // Whether a loss offers one more move of the level's winning line. The offer starts one loss after the
  // text hint (or at the second loss on a level without one) and stops once the whole line is shown.
  function canRevealMove(level, losses, revealed) {
    const from = level.hint ? HINT_AFTER_LOSSES + 1 : HINT_AFTER_LOSSES;
    return losses >= from && revealed < level.solution.length;
  }

  // The squares you stand on after each of a level's first `count` solution moves, with each move's step.
  function solutionPath(level, count) {
    let s = startState(level);
    return level.solution.slice(0, count).map((dir, i) => {
      const to = stepTo(s.you, DIRS.find((d) => d.name === dir));
      s = play(s, to).state;
      return { no: i + 1, dir, sq: to };
    });
  }

  // Rules that could have made the rival's last two steps (trail[0] -> trail[1] -> its square).
  function rulesFitting(level) {
    const [a, b] = level.trail;
    return Object.keys(RULES).filter((id) =>
      rivalStep(id, a, level.you, level.stars) === b && rivalStep(id, b, level.you, level.stars) === level.rival);
  }

  // One level per notebook entry. Squares count 0 to 24, left to right, top row first.
  // tests/rival.test.js proves each one is winnable (levels 2-4: exactly one winning first move, not the
  // step toward your nearest star) and that level 4's trail fits only its hidden rule. Without the old move
  // limit, level 3's star 16 moved to 18 and level 4's start moved from 10 to 5 (docs/decisions, 2026-11-09).
  // `solution` is one winning line, revealed a move at a time after losses. It was generated once with the
  // solver (best margin, ties toward fewer stars left, then unseen positions, since the solver values a
  // no-star loop the same as progress); the tests replay it. Regenerate it if a level changes.
  const LEVELS = [
    { id: "story", name: "Story", rule: "A", hidden: false, you: 12, rival: 4, stars: [1, 5, 16, 20],
      solution: ["up", "up", "left", "left", "down", "down", "down", "down"] },
    { id: "pathways", name: "Pathways", rule: "B", hidden: false, you: 23, rival: 11, stars: [3, 6, 8, 20, 21],
      solution: ["up", "up", "up", "left", "up", "left", "down", "down", "down", "down", "left"] },
    // Only the first step left wins here, which visitors took for "impossible", so its hint names the trick.
    { id: "mission-board", name: "Mission Board", rule: "C", hidden: false, you: 2, rival: 19, stars: [10, 17, 18, 23, 24],
      hint: "It chases the star nearest you. Lead it somewhere else first.",
      solution: ["left", "left", "right", "right", "left", "right", "down", "right", "down", "down", "down", "right"] },
    { id: "strait", name: "STRAIT", rule: "B", hidden: true, you: 5, rival: 22, stars: [0, 2, 8, 13, 18], trail: [20, 21],
      solution: ["right", "right", "right", "up", "left", "left", "left"] },
  ];

  const api = { N, DIRS, RULES, LEVELS, rowOf, colOf, dist, squareName, stepTo, dirBetween, legalMoves, rivalStep, startState, play, isOver, bestMargin, futureMargin, winningMoves, reachableStates, greedyFirstMoves, rulesFitting, retryCountsAsLoss, hintFor, canRevealMove, solutionPath };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Rival = api;
})(this);
