// Tests for the front-door board's rules and its shipped puzzles. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../src/js/rival.js");

test("rival steps toward its nearest star, trying up, left, right, down", () => {
  // Rival in the centre (12), star straight below (22) and one far corner: down is the only closer step.
  assert.equal(R.rivalStep(12, 0, [22]), 17);
  // Star up-left (6): up comes before left in the order.
  assert.equal(R.rivalStep(12, 24, [6]), 7);
});

test("rival never steps onto you, and waits when no step gets closer", () => {
  // Star two squares above (2); you stand in between (7), so the rival's only closer step is blocked.
  assert.equal(R.rivalStep(12, 7, [2]), 12);
  assert.equal(R.rivalStep(12, 0, []), 12);
});

test("you cannot step off the board or onto the rival", () => {
  const moves = R.legalMoves(0, 1).map((m) => m.to);
  assert.deepEqual(moves, [5]);
});

test("a turn counts the stars each side takes", () => {
  const s0 = { you: 6, rival: 18, stars: [7, 23], mine: 0, theirs: 0, turn: 0, turns: 4 };
  const { state, events } = R.play(s0, 7);
  assert.equal(state.mine, 1);
  assert.equal(events.took, true);
  assert.equal(state.rival, 23);
  assert.equal(state.theirs, 1);
  assert.deepEqual(state.stars, []);
  assert.equal(R.isOver(state), true);
});

for (const [i, p] of R.PUZZLES.entries()) {
  test(`puzzle ${i + 1} has exactly one winning first move, and it is not the obvious step`, () => {
    const wins = R.winningFirstMoves(p);
    assert.equal(wins.length, 1);
    const greedy = R.greedyFirstMoves(p).map((m) => m.to);
    assert.ok(greedy.length > 0);
    assert.ok(!greedy.includes(wins[0].to));
  });
}
