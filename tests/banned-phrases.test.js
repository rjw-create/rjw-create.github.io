// Jackson retired the old founder story on 2026-11-13. Its framing must never come back, in the page text or
// anywhere else in the repo, so every tracked text file is scanned for its key words.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const BANNED = [/obsess/i, /unstoppable/i];
const TEXT = /\.(html|js|mjs|css|md|json|txt|svg)$/i;
const SELF = path.relative(root, __filename).split(path.sep).join("/");

function findBanned(text) {
  return BANNED.filter((re) => re.test(text)).map((re) => re.source);
}

test("a text holding a banned phrase is caught", () => {
  assert.deepEqual(findBanned("I have always been obsessed with this."), ["obsess"]);
  assert.deepEqual(findBanned("Aimed right, I am Unstoppable."), ["unstoppable"]);
  assert.deepEqual(findBanned("Something worth making."), []);
});

test("no tracked file uses the retired founder story's phrases", () => {
  const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((f) => f && TEXT.test(f) && f !== SELF && fs.existsSync(path.join(root, f)));
  const hits = files
    .map((f) => [f, findBanned(fs.readFileSync(path.join(root, f), "utf8"))])
    .filter(([, found]) => found.length > 0)
    .map(([f, found]) => `${f}: ${found.join(", ")}`);
  assert.deepEqual(hits, []);
});
