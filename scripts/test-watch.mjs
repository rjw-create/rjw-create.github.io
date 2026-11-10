#!/usr/bin/env node
// Test watcher for a terminal pane next to Claude: re-runs the project's fast check on every save.
// Plain Node, no packages. Kit guide: guides/2026-11-07-TEST-PANE.md
//
//   node scripts/test-watch.mjs          watch; run the fast check after each save
//   node scripts/test-watch.mjs --ui     also run ui-check after each passing check (slower)
//   node scripts/test-watch.mjs --once   run the check once and exit with its code (for testing)
//   node scripts/test-watch.mjs --help   show this help
//
// Keys while it runs: r = run again, u = run ui-check now, q = quit.
// What it runs, first match wins: scripts/check.sh --fast, the package.json "test" script, pytest.
// The full output of the last run is kept in test-results/test-watch-last.log.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOG = path.join(ROOT, "test-results", "test-watch-last.log");
const DEBOUNCE_MS = 400;
const args = new Set(process.argv.slice(2));

// Usage is the comment block at the top of this file, so the two never drift apart.
function usage() {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split(/\r?\n/).slice(1);
  return lines.slice(0, lines.findIndex((l) => !l.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n");
}
if (args.has("--help") || args.has("-h")) { console.log(usage()); process.exit(0); }
// An unknown option must not fall through to watch mode: in a pane that looks like it worked.
const unknown = [...args].find((a) => !["--ui", "--once"].includes(a));
if (unknown) { console.log(`unknown option ${unknown}\n\n${usage()}`); process.exit(2); }
const withUi = args.has("--ui");
const once = args.has("--once");

// Saves in these folders never trigger a run: tools write there, and watching them would loop.
const IGNORE_DIRS = new Set([
  ".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
  "test-results", "playwright-report", "coverage", "dist", "build", "out", ".next", ".claude", "evidence",
]);
const IGNORE_FILES = /(~|\.swp|\.tmp|\.bak|\.log)$/i;

// On Windows a bare `bash` can be WSL's, which can't see this folder the same way; use Git Bash.
function findBash() {
  if (process.platform !== "win32") return "bash";
  const dirs = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs")];
  for (const d of dirs) {
    const p = d && path.join(d, "Git", "bin", "bash.exe");
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function hasPytestTests() {
  const walk = (dir, depth) => {
    if (depth > 4) return false;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name) && walk(path.join(dir, e.name), depth + 1)) return true; }
      else if (/^test_.*\.py$|_test\.py$/.test(e.name)) return true;
    }
    return false;
  };
  return walk(ROOT, 0);
}

// Returns { label, cmd, argv, shell } or null when the project has nothing to run yet.
function pickCommand() {
  if (fs.existsSync(path.join(ROOT, "scripts", "check.sh"))) {
    const bash = findBash();
    if (!bash) return { error: "scripts/check.sh needs Git Bash (winget install --id Git.Git -e)" };
    return { label: "check.sh --fast", cmd: bash, argv: ["scripts/check.sh", "--fast"] };
  }
  const pkg = path.join(ROOT, "package.json");
  if (fs.existsSync(pkg)) {
    const test = JSON.parse(fs.readFileSync(pkg, "utf8")).scripts?.test;
    // npm is a .cmd file on Windows, which Node only starts through a shell.
    if (test && !test.includes("no test specified")) return { label: "npm test", cmd: "npm test", argv: [], shell: true };
  }
  if (hasPytestTests()) {
    // The project's .venv holds its pytest; the system Python usually doesn't.
    const venv = path.join(ROOT, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const py = fs.existsSync(venv) ? venv : process.platform === "win32" ? "py" : "python3";
    return { label: "pytest -q", cmd: py, argv: ["-m", "pytest", "-q"] };
  }
  return null;
}

// ---------------------------------------------------------------- output
const width = () => Math.max(30, Math.min(process.stdout.columns || 80, 100));
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const clip = (s) => (s.length > width() - 2 ? s.slice(0, width() - 3) + "~" : s);
const clock = () => new Date().toTimeString().slice(0, 8);

// The lines worth showing from a failed run: anything that names a failure, else the last few lines.
function failLines(output) {
  const lines = output.split(/\r?\n/).map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trimEnd()).filter(Boolean);
  const summary = /CHECK FAILED|SOME CHECKS FAILED|\bfail(ed)?:? 0\b|\u2714/i;
  // Clear failure markers first (check.sh FAIL lines, node:test, TAP, pytest, tracebacks), then softer words.
  const strong = lines.filter((l) => /\bFAIL\b|\u2716|^not ok|Traceback|^E\s|Error:/.test(l) && !summary.test(l));
  const soft = lines.filter((l) => /\berror\b|failed|assert/i.test(l) && !summary.test(l));
  return (strong.length ? strong : soft.length ? soft : lines).slice(0, 12);
}

let lastChanged = "";
function draw(state, extra = []) {
  if (!once && process.stdout.isTTY) process.stdout.write("\x1b[2J\x1b[H");
  const rule = "-".repeat(width() - 2);
  console.log(paint("2", clip(`test-watch  ${path.basename(ROOT)}`)));
  console.log(paint("2", rule));
  for (const l of state) console.log(clip(l));
  for (const l of extra) console.log(paint("2", clip("  " + l)));
  console.log(paint("2", rule));
  if (lastChanged) console.log(paint("2", clip(`last save: ${lastChanged}`)));
  if (!once) console.log(paint("2", clip(`r run  u ui-check  q quit${withUi ? "  (--ui on)" : ""}`)));
}

// ---------------------------------------------------------------- running
function runProcess(cmd, argv, shell) {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = "";
    let child;
    try {
      child = spawn(cmd, argv, { cwd: ROOT, shell: !!shell, env: { ...process.env, FORCE_COLOR: "0" } });
    } catch (e) {
      resolve({ code: 127, out: String(e), ms: 0 });
      return;
    }
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (e) => { out += `\n${e.message}`; });
    child.on("close", (code) => resolve({ code: code ?? 1, out, ms: Date.now() - started }));
  });
}

let running = false;
let again = false;

async function runCheck(reason) {
  if (running) { again = true; return; }
  running = true;
  const c = pickCommand();
  if (!c) {
    draw([paint("33", "NOTHING TO RUN"), "No scripts/check.sh, npm test or pytest tests yet.", "Add one; saves keep being watched."]);
    running = false;
    return 0;
  }
  if (c.error) {
    draw([paint("31", "CANNOT RUN"), c.error]);
    running = false;
    return 1;
  }
  draw([paint("36", `RUNNING  ${c.label}  (${reason})`)]);
  const r = await runProcess(c.cmd, c.argv, c.shell);
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, `$ ${c.label}  (${new Date().toISOString()})\n\n${r.out}`);
  const secs = (r.ms / 1000).toFixed(1);
  const head = r.code === 0
    ? paint("1;32", `PASS  ${c.label}  ${clock()}  ${secs}s`)
    : paint("1;31", `FAIL  ${c.label}  ${clock()}  ${secs}s  exit ${r.code}`);
  const state = [head];
  const extra = r.code === 0 ? [] : [...failLines(r.out), "full log: test-results/test-watch-last.log"];
  if (r.code === 0 && withUi) state.push(...(await runUi()));
  draw(state, extra);
  running = false;
  if (again && !once) { again = false; runCheck("saved during run"); }
  return r.code;
}

async function runUi() {
  const script = path.join(ROOT, "scripts", "ui-check.mjs");
  if (!fs.existsSync(script)) return [paint("33", "ui-check not installed (install.sh --ui-check)")];
  const r = await runProcess(process.execPath, [script, "--quiet"]);
  const summary = r.out.trim().split(/\r?\n/).slice(-3);
  const head = r.code === 0 ? paint("1;32", `PASS  ui-check  ${clock()}`) : paint("1;31", `FAIL  ui-check  ${clock()}  exit ${r.code}`);
  return [head, ...summary.map((l) => "  " + l)];
}

// ---------------------------------------------------------------- watching
if (once) process.exit(await runCheck("--once"));

let timer = null;
function ignored(rel) {
  const parts = rel.split(/[\\/]/);
  return parts.some((p) => IGNORE_DIRS.has(p)) || IGNORE_FILES.test(rel);
}
// Recursive fs.watch: tested on Windows (Node 24); see the Node docs for other systems.
fs.watch(ROOT, { recursive: true }, (_event, name) => {
  if (!name || ignored(String(name))) return;
  lastChanged = `${String(name).replace(/\\/g, "/")} at ${clock()}`;
  clearTimeout(timer);
  timer = setTimeout(() => runCheck("save"), DEBOUNCE_MS);
});

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", async (key) => {
    if (key === "q" || key === "\u0003") process.exit(0);
    if (key === "r") runCheck("r pressed");
    if (key === "u" && !running) {
      running = true;
      draw([paint("36", `RUNNING  ui-check  (u pressed)`)]);
      const lines = await runUi();
      draw(lines);
      running = false;
    }
  });
}

runCheck("start");
