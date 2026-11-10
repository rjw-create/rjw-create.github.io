#!/usr/bin/env node
// ui-pane: a live preview of this project's site in a browser window over the right part of the
// terminal window it was started from, on that terminal's screen. The page reloads by itself whenever
// a served file changes, and while it is open ui-check runs its checks in that same window (in a new
// tab, slowed down) so you can watch them, then closes the tab. Nothing opens unless you or a job runs
// this. Kit guide: guides/2026-11-07-TEST-PANE.md
//
//   node scripts/ui-pane.mjs                 open the first page (from ui-check.config.json)
//   node scripts/ui-pane.mjs --page about    open this page instead (a name from ui-check.config.json)
//   node scripts/ui-pane.mjs --title "fix nav"   name the window after the job (default: the folder name)
//   node scripts/ui-pane.mjs --cdp-port 9333 the window's debugging port (127.0.0.1 only; default: the system picks)
//   node scripts/ui-pane.mjs --no-window     serve with live reload only; open the printed address yourself
//   node scripts/ui-pane.mjs --stop          stop the ui-pane running for this project, window and server
//   node scripts/ui-pane.mjs --help          show this help
//
// It runs until stopped: Ctrl+C, closing its terminal, closing the browser window, or --stop.
// Its process id is in test-results/ui-pane.pid while it runs.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeWindow, launchWindow, startPlacer } from "./ui-place.mjs";
import { browserPid, isAlive, loadChromium, loadConfig, paneFiles, placeOnRight, readPane, startServer } from "./ui-serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STOP_PATH = "/__ui-pane/stop";
const DEBOUNCE_MS = 150;
const STOP_WAIT_MS = 10000;
const files = paneFiles(ROOT);

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };

// Usage is the comment block at the top of this file, so the two never drift apart.
function usage() {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split(/\r?\n/).slice(1);
  return lines.slice(0, lines.findIndex((l) => !l.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n");
}
if (argv.includes("--help") || argv.includes("-h")) { console.log(usage()); process.exit(0); }
{
  const FLAGS = ["--stop", "--no-window"];
  const WITH_VALUE = ["--page", "--title", "--cdp-port"];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (FLAGS.includes(a)) continue;
    if (WITH_VALUE.includes(a) && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) { i++; continue; }
    console.log(`${WITH_VALUE.includes(a) ? `option ${a} needs a value` : `unknown option ${a}`}\n\n${usage()}`);
    process.exit(2);
  }
}

const removeStateFiles = () => { for (const f of [files.pid, files.state]) fs.rmSync(f, { force: true }); };

function portFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

// ---------------------------------------------------------------- --stop
async function stopRunning() {
  const pane = readPane(ROOT);
  if (!pane) { console.log("ui-pane is not running for this project."); return 0; }
  if (pane.stale) {
    removeStateFiles();
    console.log(`ui-pane was not running (removed a leftover pid file for ${pane.pid}).`);
    return 0;
  }
  // Ask it to close its own window and server first; that is what leaves nothing behind.
  try {
    await fetch(pane.preview + STOP_PATH, { method: "POST", headers: { "x-ui-pane-token": pane.token }, signal: AbortSignal.timeout(3000) });
  } catch { /* not answering: forced below */ }
  const end = Date.now() + STOP_WAIT_MS;
  while (isAlive(pane.pid) && Date.now() < end) await new Promise((r) => setTimeout(r, 200));
  if (isAlive(pane.pid)) {
    // /T also ends its Chromium; kill() alone would leave the browser running and its profile locked.
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(pane.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(pane.pid, "SIGKILL");
    removeStateFiles();
    console.log(`ui-pane ${pane.pid} did not stop in ${STOP_WAIT_MS / 1000}s; ended it and its browser.`);
    return 0;
  }
  console.log(`ui-pane ${pane.pid} stopped.`);
  return 0;
}
if (argv.includes("--stop")) process.exit(await stopRunning());

// ---------------------------------------------------------------- start
const running = readPane(ROOT);
if (running && !running.stale) {
  console.log(`ui-pane is already running for this project (pid ${running.pid}${running.preview ? `, ${running.preview}` : ""}).\nStop it with: node scripts/ui-pane.mjs --stop`);
  process.exit(0);
}

const { serveDir, pages } = loadConfig(ROOT);
if (!pages.length) {
  console.log("No pages to show: add ui-check.config.json with a \"pages\" list, or an .html file.");
  process.exit(2);
}
const page = opt("--page") ? pages.find((p) => p.name === opt("--page")) : pages[0];
if (!page) {
  console.log(`No page named "${opt("--page")}". Pages: ${pages.map((p) => p.name).join(", ")}`);
  process.exit(2);
}
// The window's name, so several open at once are easy to tell apart (taskbar, Alt+Tab, title bar).
const title = opt("--title") || path.basename(ROOT);
const noWindow = argv.includes("--no-window");
// A fixed debugging port lets something started before the window (Claude's Playwright MCP, set up when
// the tab starts) know where to connect. Default 0: the system picks a free one.
const cdpPort = opt("--cdp-port") === undefined ? 0 : Number(opt("--cdp-port"));
if (!Number.isInteger(cdpPort) || cdpPort < 0 || cdpPort > 65535) {
  console.log(`--cdp-port needs a port number from 1 to 65535, got "${opt("--cdp-port")}"`);
  process.exit(2);
}
if (cdpPort && noWindow) {
  console.log("--cdp-port is the window's debugging port, so it doesn't go with --no-window.");
  process.exit(2);
}
// A port already in use is refused, never swapped for another: whatever expects this port would
// otherwise connect to the wrong browser, or to nothing, without saying why.
if (cdpPort && !(await portFree(cdpPort))) {
  const holder = browserPid(cdpPort);
  console.log(`Port ${cdpPort} on 127.0.0.1 is already in use${holder ? ` (process ${holder})` : ""}. Stop what holds it, or pick another --cdp-port.`);
  process.exit(2);
}
const chromium = noWindow ? null : await loadChromium();
if (!noWindow && !chromium) {
  console.log("ui-pane needs Playwright. Run once in this folder: npm install, then npx playwright install chromium");
  process.exit(2);
}

const token = randomBytes(16).toString("hex");
let stopping = false;
const server = await startServer(serveDir, {
  liveReload: true,
  onRequest(req, res) {
    if (new URL(req.url, "http://x").pathname !== STOP_PATH) return false;
    // The custom header also means no web page can send this from a browser without a CORS check, which this server never passes.
    if (req.method !== "POST" || req.headers["x-ui-pane-token"] !== token) { res.writeHead(403).end(); return true; }
    res.writeHead(200).end("stopping");
    stop("--stop");
    return true;
  },
});
const pageUrl = server.url + page.path;

fs.mkdirSync(files.dir, { recursive: true });
fs.writeFileSync(files.pid, String(process.pid));
// Each call adds to what is already recorded.
const stateExtra = {};
const writeState = (extra) => {
  Object.assign(stateExtra, extra);
  fs.writeFileSync(files.state, JSON.stringify({ pid: process.pid, preview: server.url, page: pageUrl, token, title, ...stateExtra }, null, 2));
};
writeState({});

// ---------------------------------------------------------------- the window
// Its own temporary profile, and a debugging port on 127.0.0.1 (system-picked, or --cdp-port): ui-check
// and Claude's Playwright MCP attach through it. Opened without taking the keyboard, over the right part
// of the terminal window this was started from, on its screen, named after the job (ui-place.mjs).
let win = null; // { browser, context, tab, pid, port, profileDir, follow }
let placer = null;

async function openWindow() {
  placer = await startPlacer();
  const w = await launchWindow({ chromium, cdpPort, title, placer });
  win = w;
  if (!w.follow) await placeOnRight(w.context, w.tab);
  // A service worker could serve a cached copy instead of the files on disk.
  const tabCdp = await w.context.newCDPSession(w.tab);
  await tabCdp.send("Network.enable");
  await tabCdp.send("Network.setBypassServiceWorker", { bypass: true });
  // Chromium started this way stays alive with no window, so closing the window by hand is seen as its
  // last tab closing (or the browser going away).
  w.tab.on("close", () => { if (!w.context.pages().length) windowClosed(w); });
  w.browser.on("disconnected", () => windowClosed(w));
  // A tab another program opened here (ui-check, Claude's Playwright MCP) may have resized the window
  // to fit its viewport; when that tab closes, put the window back over the terminal.
  w.context.on("page", (p) => p.on("close", () => {
    if (stopping) return;
    if (!w.context.pages().length) windowClosed(w);
    else w.follow?.again().catch(() => {});
  }));
  writeState({ cdp: `http://127.0.0.1:${w.port}`, terminal: w.follow?.terminal ?? null, window: { pid: w.pid, rect: w.follow?.rect ?? null } });
  await w.tab.goto(pageUrl).catch(() => {});
  return w;
}

// Closing the window by hand stops ui-pane: the window is the point of it.
async function windowClosed(w) {
  // While stopping, stop() itself is closing it.
  if (win !== w || stopping) return;
  win = null;
  const left = await closeWindow(w);
  if (left) console.log(left);
  stop("browser window closed");
}

// ---------------------------------------------------------------- shutdown (one path for every trigger)
let watcher;
async function stop(why) {
  if (stopping) return;
  stopping = true;
  console.log(`\nui-pane stopping (${why})...`);
  watcher?.close();
  win?.follow?.stop();
  placer?.close();
  // Never crash here: whatever cannot be cleaned up is reported and left, the process still exits.
  if (win) {
    const left = await closeWindow(win).catch((e) => e.message);
    if (left) console.log(left);
  }
  await server.close().catch(() => {});
  removeStateFiles();
  console.log("ui-pane stopped: window and server closed.");
  process.exit(0);
}
process.on("SIGINT", () => stop("Ctrl+C"));
process.on("SIGTERM", () => stop("SIGTERM"));
// On Windows, closing the terminal window sends SIGHUP and gives the process a few seconds to finish.
process.on("SIGHUP", () => stop("terminal closed"));
// A shell killed without closing its window sends nothing, so check that it is still there.
const parentPid = process.ppid;
setInterval(() => { if (!isAlive(parentPid)) stop("parent shell closed"); }, 2000).unref();

// ---------------------------------------------------------------- live reload on save
// Saves in these folders never reload the page: tools write there (ui-check's evidence, test logs, and
// .playwright-mcp, where Claude's Playwright MCP saves every snapshot and screenshot it takes).
const IGNORE_DIRS = new Set([
  ".git", "node_modules", ".venv", "venv", "__pycache__", "test-results", "playwright-report", "coverage", ".claude", "evidence",
  ".playwright-mcp",
]);
let timer;
let changed = "";
watcher = fs.watch(serveDir, { recursive: true }, (event, name) => {
  if (!name || stopping) return;
  const parts = name.split(/[\\/]/);
  if (parts.some((p) => IGNORE_DIRS.has(p)) || /(~|\.swp|\.tmp|\.bak|\.log)$/i.test(name)) return;
  // Windows also reports a folder as changed when something only reads it; a real edit names the file too.
  try { if (fs.statSync(path.join(serveDir, name)).isDirectory()) return; } catch { /* deleted: still a change */ }
  changed = name.replace(/\\/g, "/");
  // An editor often writes a file in several steps; reload once when they stop.
  clearTimeout(timer);
  timer = setTimeout(() => {
    const n = server.reload();
    console.log(`${new Date().toLocaleTimeString()}  ${changed} changed, reloaded ${n} page${n === 1 ? "" : "s"}`);
  }, DEBOUNCE_MS);
});

// ---------------------------------------------------------------- go
if (!noWindow) {
  try {
    await openWindow();
  } catch (e) {
    // The install hint only when the browser itself is missing: other failures have other causes.
    const missing = /Executable doesn't exist|playwright install/i.test(e.message);
    console.log(`Could not start Chromium: ${e.message.split("\n")[0]}${missing ? "\nRun once: npx playwright install chromium" : ""}`);
    await stop("Chromium failed to start");
  }
}

console.log(`ui-pane "${title}": ${pageUrl}  (page "${page.name}", live reload on, pid ${process.pid})`);
console.log(noWindow ? "Open that address in a browser." : `Window: ${win?.follow ? "over the right part of this terminal window" : "right of the screen (no terminal window found)"}. ui-check runs its checks in it while it is open.`);
console.log("Stop: Ctrl+C here, or node scripts/ui-pane.mjs --stop");
