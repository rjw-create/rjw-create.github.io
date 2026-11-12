// Tests for the game's rules and its four levels. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../src/js/rival.js");

test("rule A steps toward its nearest star, trying up, left, right, down", () => {
  // Rival in the centre (12), star straight below (22): down is the only closer step.
  assert.equal(R.rivalStep("A", 12, 0, [22]), 17);
  // Star up-left (6): up comes before left.
  assert.equal(R.rivalStep("A", 12, 24, [6]), 7);
});

test("rule B tries down, right, left, up", () => {
  // Star down-right (18): down comes before right.
  assert.equal(R.rivalStep("B", 12, 0, [18]), 17);
  // Star up-left (6): left comes before up.
  assert.equal(R.rivalStep("B", 12, 24, [6]), 11);
});

test("rule C heads for the star nearest to you, not to the rival", () => {
  // You at 0 next to star 1; the rival at 14 is nearer star 19 but heads for star 1.
  assert.equal(R.rivalStep("C", 14, 0, [1, 19]), 9);
  assert.equal(R.rivalStep("A", 14, 0, [1, 19]), 19);
});

test("the rival never steps onto you, and waits when no step gets closer", () => {
  // Star two squares above (2); you stand in between (7), so the only closer step is blocked.
  assert.equal(R.rivalStep("A", 12, 7, [2]), 12);
  assert.equal(R.rivalStep("A", 12, 0, []), 12);
});

test("you cannot step off the board or onto the rival", () => {
  assert.deepEqual(R.legalMoves(0, 1).map((m) => m.to), [5]);
});

test("a turn counts the stars each side takes", () => {
  const s0 = { rule: "A", you: 6, rival: 18, stars: [7, 23], mine: 0, theirs: 0, turn: 0 };
  const { state, events } = R.play(s0, 7);
  assert.equal(state.mine, 1);
  assert.equal(events.took, true);
  assert.equal(state.rival, 23);
  assert.equal(state.theirs, 1);
  assert.equal(R.isOver(state), true);
});

test("a level is over only when no stars are left, however many turns pass", () => {
  const s = { rule: "A", you: 0, rival: 24, stars: [12], mine: 0, theirs: 0, turn: 500 };
  assert.equal(R.isOver(s), false);
  assert.equal(R.isOver({ ...s, stars: [] }), true);
  assert.ok(R.LEVELS.every((l) => !("turns" in l)), "no level carries a move limit");
});

test("the solver finishes and agrees with a hand-checked position", () => {
  // You at 6 next to star 7; rule A's rival at 18 then takes star 23: one each, margin 0.
  const s = { rule: "A", you: 6, rival: 18, stars: [7, 23], mine: 0, theirs: 0, turn: 0 };
  assert.equal(R.bestMargin(R.play(s, 7).state), 0);
  // A lone star two steps from you and far from the rival: you take it.
  assert.equal(R.bestMargin({ rule: "A", you: 0, rival: 24, stars: [2], mine: 0, theirs: 0, turn: 0 }), 1);
});

test("level 1 (Story) is not a forced draw: you can take more of its 4 stars", () => {
  const level = R.LEVELS[0];
  assert.equal(level.stars.length, 4);
  assert.ok(R.bestMargin(R.startState(level)) > 0);
});

for (const [i, level] of R.LEVELS.entries()) {
  test(`level ${i + 1} (${level.name}) can always be finished: no position strands the remaining stars`, () => {
    const states = R.reachableStates(level);
    assert.ok(states.length > 1);
    for (const s of states) {
      if (R.isOver(s)) continue;
      assert.ok(R.legalMoves(s.you, s.rival).length > 0, "you always have a step");
      assert.notEqual(R.futureMargin(s), -Infinity, `stuck at you ${s.you}, rival ${s.rival}, stars ${s.stars}`);
    }
  });
}

test("levels follow the entries in order and vary the rule", () => {
  assert.deepEqual(R.LEVELS.map((l) => l.id), ["story", "pathways", "mission-board", "msit"]);
  assert.deepEqual(R.LEVELS.map((l) => l.rule), ["A", "B", "C", "B"]);
  assert.deepEqual(R.LEVELS.map((l) => l.hidden), [false, false, false, true]);
});

for (const [i, level] of R.LEVELS.entries()) {
  test(`level ${i + 1} (${level.name}) can be won`, () => {
    const wins = R.winningMoves(R.startState(level));
    assert.ok(wins.length >= 1);
    if (i > 0) {
      assert.equal(wins.length, 1, "exactly one winning first move");
      const greedy = R.greedyFirstMoves(level).map((m) => m.to);
      assert.ok(greedy.length > 0 && !greedy.includes(wins[0].to), "the winning move is not the obvious step");
    }
    // The hint names the first winning move; following it must keep a win in reach.
    assert.ok(R.bestMargin(R.play(R.startState(level), wins[0].to).state) > 0);
  });
}

test("level 4's trail fits only its hidden rule", () => {
  const last = R.LEVELS[3];
  assert.deepEqual(R.rulesFitting(last), [last.rule]);
});

test("level 3's hint shows after the second loss, not before", () => {
  const level3 = R.LEVELS[2];
  assert.equal(R.hintFor(level3, 0), null);
  assert.equal(R.hintFor(level3, 1), null);
  assert.equal(R.hintFor(level3, 2), "Hint: It chases the star nearest you. Lead it somewhere else first.");
  assert.equal(R.hintFor(level3, 3), "Hint: It chases the star nearest you. Lead it somewhere else first.");
});

test("a Retry counts as a loss once a move is made, so retries bring the hint", () => {
  const level3 = R.LEVELS[2];
  let losses = 0;
  for (let n = 0; n < 3; n++) {
    let s = R.startState(level3);
    s = R.play(s, R.legalMoves(s.you, s.rival)[0].to).state;
    if (R.retryCountsAsLoss(s)) losses += 1;
  }
  assert.equal(losses, 3);
  assert.ok(R.hintFor(level3, losses), "three retries show the hint");
  assert.equal(R.canRevealMove(level3, losses, 0), true, "and offer the next move");
});

test("a Retry before any move, or after the level ended, does not count", () => {
  const level1 = R.LEVELS[0];
  assert.equal(R.retryCountsAsLoss(R.startState(level1)), false, "before any move");
  let s = R.startState(level1);
  for (const dir of level1.solution) s = R.play(s, R.legalMoves(s.you, s.rival).find((m) => m.dir === dir).to).state;
  assert.equal(R.isOver(s), true);
  assert.equal(R.retryCountsAsLoss(s), false, "the ending already counted");
});

test("only level 3 has a text hint", () => {
  for (const [i, level] of R.LEVELS.entries()) {
    if (i === 2) continue;
    assert.equal(R.hintFor(level, 5), null, `level ${i + 1}`);
  }
});

for (const [i, level] of R.LEVELS.entries()) {
  test(`level ${i + 1} (${level.name}): its solution wins and takes every star on its last move`, () => {
    let s = R.startState(level);
    for (const [n, dir] of level.solution.entries()) {
      assert.equal(R.isOver(s), false, `the level ended before move ${n + 1}`);
      const move = R.legalMoves(s.you, s.rival).find((m) => m.dir === dir);
      assert.ok(move, `move ${n + 1} (${dir}) is not legal`);
      s = R.play(s, move.to).state;
    }
    assert.equal(R.isOver(s), true, "stars are left after the last move");
    assert.ok(s.mine > s.theirs, `ends ${s.mine} to ${s.theirs}`);
    assert.equal(level.solution[0], R.winningMoves(R.startState(level))[0].dir, "starts with a winning first move");
    assert.deepEqual(R.solutionPath(level, level.solution.length).map((p) => p.sq).at(-1), s.you);
  });
}

test("level 3's solution is the line visitors are shown", () => {
  assert.deepEqual(R.LEVELS[2].solution,
    ["left", "left", "right", "right", "left", "right", "down", "right", "down", "down", "down", "right"]);
  assert.deepEqual(R.solutionPath(R.LEVELS[2], 3), [
    { no: 1, dir: "left", sq: 1 }, { no: 2, dir: "left", sq: 0 }, { no: 3, dir: "right", sq: 1 }]);
});

test("moves are offered one loss after the text hint, or from the second loss without one", () => {
  const [level1, , level3] = R.LEVELS;
  assert.equal(R.canRevealMove(level3, 2, 0), false);
  assert.equal(R.canRevealMove(level3, 3, 0), true);
  assert.equal(R.canRevealMove(level1, 1, 0), false);
  assert.equal(R.canRevealMove(level1, 2, 0), true);
  assert.equal(R.canRevealMove(level1, 9, level1.solution.length - 1), true);
  assert.equal(R.canRevealMove(level1, 9, level1.solution.length), false, "nothing left to reveal");
});
