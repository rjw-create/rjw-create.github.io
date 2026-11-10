#!/usr/bin/env node
// ui-check: UI evidence without driving a real browser. Opens each page in headless Chromium
// (Playwright), saves screenshots at 375px and 1280px (each under 300 KB, so they can be committed:
// a bigger one is saved with a 256-colour palette), collects console errors and failed requests,
// runs the project's design/contrast check, and writes everything to one dated folder for the PR body.
// Kit guide: guides/2026-11-07-TEST-PANE.md
//
//   node scripts/ui-check.mjs                     serve this folder, check every page in the current theme
//   node scripts/ui-check.mjs --both-themes       light and dark
//   node scripts/ui-check.mjs --theme dark        one named theme
//   node scripts/ui-check.mjs --url http://localhost:5173   use a running dev server instead
//   node scripts/ui-check.mjs --pages home,about  only these pages (names from ui-check.config.json)
//   node scripts/ui-check.mjs --out <folder>      evidence folder (default docs/evidence/<date>-<branch>)
//   node scripts/ui-check.mjs --quiet             print only the last summary lines (test-watch uses this)
//   node scripts/ui-check.mjs --headed            run in a visible window over the right part of this terminal window
//   node scripts/ui-check.mjs --slow 500          pause this many ms between steps in a visible run (default 300)
//   node scripts/ui-check.mjs --help              show this help
//
// While a ui-pane is open for this project (node scripts/ui-pane.mjs), the checks run in its window,
// in a new tab that closes afterwards, so you watch them; otherwise headless unless --headed.
// Pages come from ui-check.config.json when it exists, otherwise every top-level .html file.
// Exit 0 = every page clean and contrast passed, 1 = a page or the contrast check failed, 2 = setup problem.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeWindow, launchWindow, startPlacer } from "./ui-place.mjs";
import { MAX_SHOT_BYTES, WIDTHS_PX, loadChromium, loadConfig, placeOnRight, readPane, shrinkPng, startServer } from "./ui-serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEIGHT_PX = 900;
const SLOW_MS = 300;
const NAV_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------- arguments and config
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const quiet = argv.includes("--quiet");

// Usage is the comment block at the top of this file, so the two never drift apart.
function usage() {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split(/\r?\n/).slice(1);
  return lines.slice(0, lines.findIndex((l) => !l.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n");
}
if (argv.includes("--help") || argv.includes("-h")) { console.log(usage()); process.exit(0); }
{
  const FLAGS = ["--both-themes", "--quiet", "--headed"];
  const WITH_VALUE = ["--theme", "--url", "--pages", "--out", "--slow"];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (FLAGS.includes(a)) continue;
    if (WITH_VALUE.includes(a) && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) { i++; continue; }
    console.log(`${WITH_VALUE.includes(a) ? `option ${a} needs a value` : `unknown option ${a}`}\n\n${usage()}`);
    process.exit(2);
  }
}

const slowMs = opt("--slow") === undefined ? SLOW_MS : Number(opt("--slow"));
if (!Number.isInteger(slowMs) || slowMs < 0) {
  console.log(`--slow needs a whole number of milliseconds, got "${opt("--slow")}"`);
  process.exit(2);
}

const loaded = loadConfig(ROOT);
const { config, serveDir } = loaded;
const widths = config.widths_px || WIDTHS_PX;
// Requests matching these never fail the check. Chromium asks for /favicon.ico on every page by itself.
const ignore = (config.ignore || ["/favicon\\.ico$"]).map((s) => new RegExp(s));

let pages = loaded.pages;
if (opt("--pages")) {
  const want = new Set(opt("--pages").split(","));
  pages = pages.filter((p) => want.has(p.name));
}

// "Current theme" is the computer's app theme (Windows setting); light elsewhere unless asked.
function currentTheme() {
  if (process.platform !== "win32") return "light";
  try {
    const out = execFileSync("reg", ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "/v", "AppsUseLightTheme"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return /0x0\b/.test(out) ? "dark" : "light";
  } catch {
    return "light";
  }
}
const themes = argv.includes("--both-themes") ? ["light", "dark"] : [opt("--theme") || currentTheme()];

function branchSlug() {
  try {
    // Branch in the name, so two branches made the same day never write the same PNG paths.
    const b = execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return b ? "-" + b.replace(/[^\w.-]+/g, "-") : "";
  } catch {
    return "";
  }
}
const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const outDir = path.resolve(ROOT, opt("--out") || path.join("docs", "evidence", `${today}${branchSlug()}`));
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

// ---------------------------------------------------------------- one page
// Screenshots over MAX_SHOT_BYTES, saved as palette PNGs so they can be committed (see shrinkPng).
const shrunk = [];

// Load, wait and screenshot, the same in every mode.
async function capture(page, base, pg, file) {
  await page.goto(base + pg.path, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
  // Pages that draw after load (hash routes, fetched data) name what to wait for in the config.
  if (pg.waitFor) await page.waitForSelector(pg.waitFor, { timeout: NAV_TIMEOUT_MS });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  const shot = shrinkPng(await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" }));
  fs.writeFileSync(file, shot.buf);
  if (shot.colours) shrunk.push({ name: path.basename(file), kb: Math.ceil(shot.buf.length / 1024), ...shot });
}

function listen(page, problems, whereNow) {
  const skip = (url) => ignore.some((re) => re.test(url || ""));
  page.on("console", (m) => {
    if (m.type() === "error" && !skip(m.location()?.url)) problems.push(`console (${whereNow()}): ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`script error (${whereNow()}): ${e.message}`));
  page.on("requestfailed", (r) => {
    if (!skip(r.url())) problems.push(`request failed (${whereNow()}): ${r.url()} ${r.failure()?.errorText || ""}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !skip(r.url())) problems.push(`HTTP ${r.status()} (${whereNow()}): ${r.url()}`);
  });
}

// Visible run: one tab per page in the visible window, resized to each width in turn, so a person
// sees every step in one place instead of a new window popping up for each width.
// A new tab in the visible window that doesn't take the keyboard. Playwright's newPage() asks Chromium
// for a tab that activates its window (seen 2026-11-07: the browser took the foreground from the
// terminal for the whole run), so the tab is created over CDP with focus:false instead.
async function newTabWithoutFocus(browser, context) {
  const opened = context.waitForEvent("page");
  const cdp = await browser.newBrowserCDPSession();
  await cdp.send("Target.createTarget", { url: "about:blank", focus: false });
  await cdp.detach().catch(() => {});
  return opened;
}

async function checkPageVisible(browser, context, base, pg) {
  const problems = [];
  const shots = [];
  let where = "";
  const page = await newTabWithoutFocus(browser, context);
  listen(page, problems, () => where);
  // Headed Chromium on Windows draws its scrollbar inside the page, so a 375px viewport would lay out
  // and screenshot 360px wide. Hidden, as in headless, the evidence is the same width in every mode.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setScrollbarsHidden", { hidden: true });
  // A service worker could serve a cached copy instead of the files on disk (headless runs block them
  // through the context; a visible window is attached over CDP, so per tab here).
  await cdp.send("Network.enable");
  await cdp.send("Network.setBypassServiceWorker", { bypass: true });
  try {
    for (const theme of themes) {
      for (const width_px of widths) {
        where = `${theme} ${width_px}px`;
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.setViewportSize({ width: width_px, height: HEIGHT_PX });
        const file = path.join(outDir, `${pg.name}-${width_px}px-${theme}.png`);
        try {
          await capture(page, base, pg, file);
          shots.push(file);
        } catch (e) {
          problems.push(`could not load (${where}): ${e.message.split("\n")[0]}`);
        }
      }
    }
  } finally {
    await page.close();
  }
  return { name: pg.name, path: pg.path, problems: [...new Set(problems)], shots };
}

async function checkPage(browser, base, pg) {
  const problems = [];
  const shots = [];
  for (const theme of themes) {
    for (const width_px of widths) {
      const context = await browser.newContext({
        viewport: { width: width_px, height: HEIGHT_PX }, colorScheme: theme, reducedMotion: "reduce",
        // A service worker could serve a cached copy instead of the files on disk.
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const where = `${theme} ${width_px}px`;
      listen(page, problems, () => where);
      try {
        const file = path.join(outDir, `${pg.name}-${width_px}px-${theme}.png`);
        await capture(page, base, pg, file);
        shots.push(file);
      } catch (e) {
        problems.push(`could not load (${where}): ${e.message.split("\n")[0]}`);
      } finally {
        await context.close();
      }
    }
  }
  // The same error at every width is one problem, not four.
  return { name: pg.name, path: pg.path, problems: [...new Set(problems)], shots };
}

// ---------------------------------------------------------------- contrast check
function runContrast() {
  let cmd;
  if (config.contrastCommand) cmd = config.contrastCommand;
  else if (fs.existsSync(path.join(ROOT, "scripts", "design-check.mjs"))) cmd = "node scripts/design-check.mjs";
  else if (fs.existsSync(path.join(ROOT, "scripts", "design_check.py"))) cmd = `${process.platform === "win32" ? "py" : "python3"} scripts/design_check.py`;
  if (!cmd) return { status: "none", cmd: "", tail: "no design or contrast check in this project (scripts/design-check.mjs, design_check.py or contrastCommand)" };
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: "utf8" });
  const lines = `${r.stdout || ""}${r.stderr || ""}`.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Show the lines that report a result (FAIL lines, pass/fail counts) rather than a test runner's timing footer.
  const said = lines.filter((l) => /\b(pass|fail|ratio|contrast)/i.test(l));
  return { status: r.status === 0 ? "pass" : "fail", cmd, tail: (said.length ? said : lines).slice(-3).join(" | ") };
}

// ---------------------------------------------------------------- main
const chromium = await loadChromium();
if (!chromium) {
  console.log("ui-check needs Playwright. Run once in this folder: npm install, then npx playwright install chromium");
  process.exit(2);
}
if (!pages.length) {
  console.log("No pages to check: add ui-check.config.json with a \"pages\" list, or an .html file.");
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
// Old screenshots from pages that were renamed or dropped would look like current evidence.
for (const f of fs.readdirSync(outDir)) if (/^[\w.-]+-\d+px-(light|dark)\.png$/.test(f)) fs.rmSync(path.join(outDir, f));

const server = opt("--url") ? null : await startServer(serveDir);
const base = (opt("--url") || server.url).replace(/\/$/, "");
// Three ways to run: in an open ui-pane's window, in a visible window of its own (--headed), or headless.
let browser;
let context;
let visible; // ui-check's own visible window (--headed)
let mode = "headless";
const pane = readPane(ROOT);
if (pane && !pane.stale && pane.cdp) {
  try {
    // Attaching to the pane's browser: close() later only disconnects, so the preview stays open.
    browser = await chromium.connectOverCDP(pane.cdp, { slowMo: slowMs });
    context = browser.contexts()[0];
    mode = "pane";
  } catch (e) {
    console.log(`ui-pane ${pane.pid} is open but did not answer (${e.message.split("\n")[0]}); running headless.`);
  }
}
try {
  if (mode === "headless" && argv.includes("--headed")) {
    // Opened the same way as ui-pane's window: without taking the keyboard, over the right part of this
    // terminal window on its screen (without one, right of Chromium's screen).
    const placer = await startPlacer();
    visible = await launchWindow({ chromium, title: "ui-check", placer, follow: false, slowMo: slowMs });
    placer?.close();
    if (!visible.follow) await placeOnRight(visible.context, visible.tab);
    context = visible.context;
    mode = "headed";
  } else if (mode === "headless") {
    browser = await chromium.launch();
  }
} catch (e) {
  console.log(`Could not start Chromium: ${e.message.split("\n")[0]}\nRun once: npx playwright install chromium`);
  await server?.close();
  process.exit(2);
}
if (!quiet && mode !== "headless") console.log(`ui-check: running in ${mode === "pane" ? "the ui-pane window" : "a visible window"}, ${slowMs} ms between steps`);
const started = Date.now();
const results = [];
for (const pg of pages) results.push(mode === "headless" ? await checkPage(browser, base, pg) : await checkPageVisible(mode === "pane" ? browser : visible.browser, context, base, pg));
if (mode === "headed") {
  const left = await closeWindow(visible);
  if (left) console.log(left);
} else {
  await browser.close();
}
await server?.close();
const contrast = runContrast();

const failed = results.filter((r) => r.problems.length).length;
const ok = failed === 0 && contrast.status !== "fail";
const secs = ((Date.now() - started) / 1000).toFixed(1);

function shrunkLines() {
  const limitKb = MAX_SHOT_BYTES / 1024;
  const fit = shrunk.filter((s) => !s.over);
  const over = shrunk.filter((s) => s.over);
  return [
    ...(fit.length ? [`Screenshots over ${limitKb} KB saved with a smaller colour palette: ${fit.map((s) => `${s.name} (${s.colours} colours, ${s.kb} KB)`).join(", ")}.`] : []),
    ...(over.length ? [`Still over ${limitKb} KB, too big to commit: ${over.map((s) => `${s.name} (${s.kb} KB)`).join(", ")}. Leave them out or check fewer pages.`] : []),
  ];
}

// summary.md is written to paste into a PR body; image links are relative to the evidence folder.
const md = [
  `# ui-check ${today}`,
  "",
  `Theme: ${themes.join(" + ")}. Widths: ${widths.map((w) => w + "px").join(", ")}. Source: ${opt("--url") || "static server on " + (rel(serveDir) || "the project folder")}.`,
  "",
  "| Page | Result | Problems | Screenshots |",
  "| --- | --- | --- | --- |",
  ...results.map((r) => `| ${r.name} (\`${r.path}\`) | ${r.problems.length ? "FAIL" : "PASS"} | ${r.problems.length} | ${r.shots.map((s) => `[${path.basename(s, ".png").slice(r.name.length + 1)}](${path.basename(s)})`).join(", ")} |`),
  "",
  `Console and network: ${results.length - failed} of ${results.length} pages clean.`,
  `Design/contrast: ${contrast.status.toUpperCase()}${contrast.cmd ? ` (\`${contrast.cmd}\`)` : ""}: ${contrast.tail}`,
  ...shrunkLines(),
  "",
  ...(failed ? ["## Problems", "", ...results.flatMap((r) => r.problems.map((p) => `- ${r.name}: ${p}`)), ""] : []),
].join("\n");
fs.writeFileSync(path.join(outDir, "summary.md"), md);
fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify({ date: today, themes, widths_px: widths, base, contrast, pages: results.map((r) => ({ ...r, shots: r.shots.map(rel) })) }, null, 2));

if (!quiet) {
  console.log(`ui-check: ${results.length} pages, ${themes.join(" + ")}, ${widths.join("px + ")}px  (${secs}s)`);
  for (const r of results) {
    console.log(`  ${r.problems.length ? "FAIL" : "PASS"}  ${r.name.padEnd(18)} ${r.shots.length} screenshots`);
    for (const p of r.problems.slice(0, 5)) console.log(`        ${p}`);
    if (r.problems.length > 5) console.log(`        ... ${r.problems.length - 5} more in summary.md`);
  }
}
console.log(`Design/contrast: ${contrast.status.toUpperCase()}  ${contrast.tail}`);
console.log(`Evidence: ${rel(outDir)}/ (summary.md, ${results.reduce((n, r) => n + r.shots.length, 0)} PNGs)`);
for (const line of shrunkLines()) if (!quiet || line.startsWith("Still")) console.log(line);
console.log(ok ? "UI CHECK PASSED" : `UI CHECK FAILED (${failed} page${failed === 1 ? "" : "s"} with problems${contrast.status === "fail" ? ", design/contrast check failed" : ""})`);
process.exit(ok ? 0 : 1);
