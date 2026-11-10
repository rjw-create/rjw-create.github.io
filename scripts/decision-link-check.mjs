#!/usr/bin/env node
// CI check: every decision record a pull request adds (docs/decisions/*.md) must link that PR
// (a URL ending in /pull/<number>). Plain Node and git, no packages. Kit guide: guides/2026-11-05-VISUAL-WORKFLOW.md
//
//   node scripts/decision-link-check.mjs
//
// It only checks in GitHub Actions on a pull_request event, where the event file gives the PR number
// and base commit. Anywhere else (local runs, push events, no records added) it prints one
// "skipped: <why>" line and exits 0. The workflow's checkout needs the history back to the base
// commit (actions/checkout with fetch-depth: 0), or the diff can't be computed and the check fails.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const PR_EVENTS = new Set(["pull_request", "pull_request_target"]);
const RECORD = /^docs\/decisions\/[^/]+\.md$/;

function skip(why) {
  console.log(`skipped: ${why}`);
  process.exit(0);
}

function fail(lines) {
  for (const line of lines) console.log(line);
  process.exit(1);
}

const eventName = process.env.GITHUB_EVENT_NAME || "";
const eventPath = process.env.GITHUB_EVENT_PATH || "";
if (!eventName) skip("not a GitHub Actions run (no PR number to check against)");
if (!PR_EVENTS.has(eventName)) skip(`${eventName} event, not a pull request`);

let event;
try {
  event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
} catch (err) {
  fail([`FAIL  cannot read the GitHub event file (GITHUB_EVENT_PATH=${eventPath}): ${err.message}`]);
}
const prNumber = event?.pull_request?.number;
const baseSha = event?.pull_request?.base?.sha;
if (!Number.isInteger(prNumber) || !baseSha) {
  fail(["FAIL  the event file has no pull_request.number or pull_request.base.sha"]);
}

// Three dots: compare with the commit where the PR branched off, so it works whether the checkout is
// GitHub's merge commit or the branch tip, and records added on main meanwhile don't count.
const diff = spawnSync("git", ["diff", "--name-only", "--diff-filter=A", `${baseSha}...HEAD`, "--", "docs/decisions"], {
  encoding: "utf8",
});
if (diff.status !== 0) {
  fail([
    `FAIL  git diff against the base commit ${baseSha} failed: ${(diff.stderr || "").trim()}`,
    "      The checkout needs the PR's history: use actions/checkout with fetch-depth: 0.",
  ]);
}
const added = diff.stdout
  .split("\n")
  .map((f) => f.trim())
  .filter((f) => RECORD.test(f));
if (added.length === 0) skip("this pull request adds no docs/decisions/*.md");

// \b after the number, so a link to PR 910 doesn't count for PR 91.
const ownLink = new RegExp(`https?://\\S*/pull/${prNumber}\\b`);
const missing = added.filter((f) => !ownLink.test(fs.readFileSync(f, "utf8")));
if (missing.length === 0) {
  console.log(`ok: ${added.length} new decision record(s) link PR #${prNumber}`);
  process.exit(0);
}
fail([
  ...missing.map((f) => `FAIL  ${f} has no link to its own pull request (.../pull/${prNumber})`),
  `      Add the PR's own link to each record, e.g. "Pull request: https://github.com/<owner>/<repo>/pull/${prNumber}".`,
]);
