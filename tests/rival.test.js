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
  assert.deepEqual(R.LEVELS.map((l) => l.id), ["story", "pathways", "mission-board", "strait"]);
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
