// Shared by ui-check and ui-pane: the project's page list, a static server (with optional live
// reload), the Playwright loader, placing a visible browser window on the right of the screen, and
// keeping evidence screenshots small. Standard library only. Kit guide: guides/2026-11-07-TEST-PANE.md
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";

export const WIDTHS_PX = [375, 1280];
// Share of the screen width the visible window takes, on the right-hand side.
export const PANE_SHARE = 0.4;

// ---------------------------------------------------------------- config and pages
export function loadConfig(root) {
  const configPath = path.join(root, "ui-check.config.json");
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
  const serveDir = path.resolve(root, config.serve || ".");
  return { config, serveDir, pages: config.pages || defaultPages(serveDir) };
}

function defaultPages(serveDir) {
  return fs.readdirSync(serveDir).filter((f) => f.endsWith(".html")).sort().map((f) =>
    f === "index.html" ? { name: "home", path: "/" } : { name: f.replace(/\.html$/, ""), path: "/" + f });
}

// ---------------------------------------------------------------- Playwright (whichever the project has)
export async function loadChromium() {
  for (const name of ["playwright", "@playwright/test"]) {
    try { return (await import(name)).chromium; } catch { /* try the next one */ }
  }
  return null;
}

// ---------------------------------------------------------------- live reload
// A same-origin script file rather than inline code, so a page whose Content-Security-Policy allows
// only 'self' scripts still reloads.
export const RELOAD_PATH = "/__ui-pane/reload.js";
export const EVENTS_PATH = "/__ui-pane/events";
const RELOAD_TAG = `<script src="${RELOAD_PATH}"></script>`;
const RELOAD_JS = `// ui-pane live reload: reload this page when a served file changes.\nnew EventSource("${EVENTS_PATH}").onmessage = () => location.reload();\n`;

// Adds the reload script before the last </body>, or at the end when the page has none.
export function injectReload(html) {
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at < 0 ? html + RELOAD_TAG : html.slice(0, at) + RELOAD_TAG + html.slice(at);
}

export const isHtml = (file) => /\.html?$/i.test(file);

// ---------------------------------------------------------------- static server
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
};

// liveReload: inject the reload script into HTML responses and serve the events stream.
// onRequest(req, res) may answer extra routes first (ui-pane's stop route); return true when it did.
export function startServer(dir, { liveReload = false, onRequest } = {}) {
  const listeners = new Set();
  const server = http.createServer((req, res) => {
    if (onRequest && onRequest(req, res)) return;
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (liveReload && pathname === RELOAD_PATH) {
      res.writeHead(200, { "content-type": TYPES[".js"], "cache-control": "no-store" }).end(RELOAD_JS);
      return;
    }
    if (liveReload && pathname === EVENTS_PATH) {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(": connected\n\n");
      listeners.add(res);
      req.on("close", () => listeners.delete(res));
      return;
    }
    let file = path.resolve(dir, "." + pathname);
    // Never serve anything outside the served folder (for example /../../secret).
    if (file !== dir && !file.startsWith(dir + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("not found"); return; }
      const headers = { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" };
      if (liveReload) {
        // The preview must show the file as it is now, never a cached copy from before the edit.
        headers["cache-control"] = "no-store";
        if (isHtml(file)) body = injectReload(body.toString("utf8"));
      }
      res.writeHead(200, headers).end(body);
    });
  });
  // Port 0: the OS picks a free port, so parallel runs in other worktrees never collide.
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({
    url: `http://127.0.0.1:${server.address().port}`,
    // Tells every open page to reload; returns how many were told.
    reload: () => { for (const res of listeners) res.write("data: reload\n\n"); return listeners.size; },
    close: () => new Promise((r) => {
      for (const res of listeners) res.end();
      server.closeAllConnections();
      server.close(r);
    }),
  })));
}

// ---------------------------------------------------------------- ui-pane state files
export function paneFiles(root) {
  const dir = path.join(root, "test-results");
  return { dir, pid: path.join(dir, "ui-pane.pid"), state: path.join(dir, "ui-pane.json") };
}

export function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM: the process exists but belongs to someone else.
    return e.code === "EPERM";
  }
}

// The running ui-pane for this project, or null. A pid file whose process has gone is stale.
export function readPane(root) {
  const f = paneFiles(root);
  if (!fs.existsSync(f.pid)) return null;
  const pid = Number(fs.readFileSync(f.pid, "utf8").trim());
  if (!pid || !isAlive(pid)) return { pid, stale: true };
  let state = {};
  try { state = JSON.parse(fs.readFileSync(f.state, "utf8")); } catch { /* still starting */ }
  return { ...state, pid, stale: false };
}

// ---------------------------------------------------------------- visible window
// Chromium writes the port it picked for --remote-debugging-port=0 into the profile folder.
export async function readDevToolsPort(profileDir, timeoutMs = 10000) {
  const file = path.join(profileDir, "DevToolsActivePort");
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const port = Number(fs.readFileSync(file, "utf8").split(/\r?\n/)[0]);
      if (port) return port;
    } catch { /* not written yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Chromium did not write ${file}`);
}

// The process id of the Chromium listening on this debugging port (the browser's main process), or 0.
// Read it while the browser runs: once a window is closed by hand the port, and this answer, are gone.
export function browserPid(port) {
  if (process.platform !== "win32") return 0;
  try {
    const out = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const line of out.split(/\r?\n/)) {
      const f = line.trim().split(/\s+/);
      if (f[1] === `127.0.0.1:${port}` && f[3] === "LISTENING") return Number(f[4]) || 0;
    }
  } catch { /* netstat missing: cleanup falls back to retrying the folder removal */ }
  return 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitGone(pid, ms) {
  const end = Date.now() + ms;
  while (isAlive(pid) && Date.now() < end) await sleep(100);
  return !isAlive(pid);
}

// Closes a browser Playwright launched with a temporary profile and deletes the profile, without ever
// throwing: Chromium's child processes can hold the folder for a moment after the window closes, so it
// waits for the browser process to end (and ends it, with its children, if it won't), then retries.
// Returns a note when the folder had to be left behind, else "".
export async function closeBrowser({ context, pid, profileDir }) {
  if (context) await Promise.race([context.close().catch(() => {}), sleep(5000)]);
  if (pid && !(await waitGone(pid, 5000))) {
    try { execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* already gone */ }
    await waitGone(pid, 5000);
  }
  if (!profileDir) return "";
  for (let i = 0; i < 20; i++) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
      return "";
    } catch {
      await sleep(250);
    }
  }
  return `could not delete the temporary profile ${profileDir} (still in use); it is safe to delete later`;
}

// With a fixed --remote-debugging-port Chromium writes no DevToolsActivePort file, so wait until the
// port answers instead.
export async function waitForDebugPort(port, timeoutMs = 10000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return port;
    } catch { /* not listening yet */ }
    await sleep(200);
  }
  throw new Error(`Chromium's debugging port ${port} did not answer within ${timeoutMs / 1000} s`);
}

// Moves the page's window to the right PANE_SHARE of the screen it is on, full height. The size comes
// from the screen itself (CSS pixels, the same units the window bounds use), never a fixed number.
export async function placeOnRight(context, page) {
  const s = await page.evaluate(() => ({ left: screen.availLeft || 0, top: screen.availTop || 0, width: screen.availWidth, height: screen.availHeight }));
  const width = Math.round(s.width * PANE_SHARE);
  const cdp = await context.newCDPSession(page);
  try {
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    // A maximized window ignores new bounds until it is made normal.
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { left: s.left + s.width - width, top: s.top, width, height: s.height } });
  } finally {
    await cdp.detach().catch(() => {});
  }
  return { width, height: s.height };
}

// ---------------------------------------------------------------- smaller screenshots
// Evidence PNGs are committed, so each must stay under MAX_SHOT_BYTES. A screenshot over it is
// re-encoded as a palette PNG (at most 256 colours): UI pages are mostly flat colours, so this keeps
// text sharp, where JPEG blurs letter edges and is still over the limit on long pages. Plain Node
// (zlib), no image package.

export const MAX_SHOT_BYTES = 300 * 1024;
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

// Reads the 8-bit RGB or RGBA, non-interlaced PNGs Chromium writes. Returns RGB pixels.
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG");
  let width, height, channels;
  const idat = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const [depth, colourType, , , interlace] = data.subarray(8, 13);
      channels = { 2: 3, 6: 4 }[colourType];
      if (depth !== 8 || !channels || interlace) throw new Error("only 8-bit RGB(A), non-interlaced PNGs");
    } else if (type === "IDAT") idat.push(data);
    at += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgb = new Uint8Array(width * height * 3);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let p = 0;
      if (filter === 1) p = a;
      else if (filter === 2) p = b;
      else if (filter === 3) p = (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = (line[i] + p) & 0xff;
    }
    for (let x = 0; x < width; x++) rgb.set(cur.subarray(x * channels, x * channels + 3), (y * width + x) * 3);
    prev = cur;
  }
  return { width, height, rgb };
}

// Median cut over the image's colours, weighted by how many pixels use each. Each palette entry is
// the most used colour in its box, not the box's average, so flat backgrounds and text keep their
// exact colours and only anti-aliased edges move.
function palette(counts, maxColours) {
  const colours = [...counts.keys()];
  if (colours.length <= maxColours) return colours;
  const ch = (c, k) => (c >> (16 - 8 * k)) & 0xff;
  const boxOf = (list) => {
    let pixels = 0;
    const lo = [255, 255, 255], hi = [0, 0, 0];
    for (const c of list) {
      pixels += counts.get(c);
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], ch(c, k)); hi[k] = Math.max(hi[k], ch(c, k)); }
    }
    return { list, pixels, range: hi.map((h, k) => h - lo[k]) };
  };
  const boxes = [boxOf(colours)];
  while (boxes.length < maxColours) {
    let best = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].list.length > 1 && (best < 0 || boxes[i].pixels > boxes[best].pixels)) best = i;
    }
    if (best < 0) break;
    const box = boxes[best];
    const k = box.range.indexOf(Math.max(...box.range));
    box.list.sort((a, b) => ch(a, k) - ch(b, k));
    let seen = 0, cut = 1;
    for (; cut < box.list.length - 1; cut++) {
      seen += counts.get(box.list[cut - 1]);
      if (seen >= box.pixels / 2) break;
    }
    boxes.splice(best, 1, boxOf(box.list.slice(0, cut)), boxOf(box.list.slice(cut)));
  }
  return boxes.map((b) => b.list.reduce((m, c) => (counts.get(c) > counts.get(m) ? c : m)));
}

export function encodePalettePng({ width, height, rgb }, maxColours = 256) {
  const n = width * height;
  const counts = new Map();
  for (let i = 0; i < n; i++) {
    const c = (rgb[i * 3] << 16) | (rgb[i * 3 + 1] << 8) | rgb[i * 3 + 2];
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  const pal = palette(counts, maxColours);
  const index = new Map();
  for (const c of counts.keys()) {
    let best = 0, bestD = Infinity;
    for (let j = 0; j < pal.length && bestD > 0; j++) {
      const p = pal[j];
      const d = ((c >> 16) - (p >> 16)) ** 2 + (((c >> 8) & 255) - ((p >> 8) & 255)) ** 2 + ((c & 255) - (p & 255)) ** 2;
      if (d < bestD) { bestD = d; best = j; }
    }
    index.set(c, best);
  }
  // Filter type 0 on every row: the PNG spec's advice for palette images.
  const raw = Buffer.alloc(n + height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      raw[y * (width + 1) + 1 + x] = index.get((rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2]);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 3, 0, 0, 0], 8);
  const plte = Buffer.alloc(pal.length * 3);
  pal.forEach((c, j) => plte.set([c >> 16, (c >> 8) & 255, c & 255], j * 3));
  return Buffer.concat([
    SIGNATURE, chunk("IHDR", ihdr), chunk("PLTE", plte),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// The screenshot as is when it fits, else the largest palette that fits. `colours` is null when
// the original was kept; `over` is true when even 32 colours didn't fit.
export function shrinkPng(buf, maxBytes = MAX_SHOT_BYTES) {
  if (buf.length <= maxBytes) return { buf, colours: null, over: false };
  const image = decodePng(buf);
  let out;
  for (const colours of [256, 128, 64, 32]) {
    out = { buf: encodePalettePng(image, colours), colours, over: false };
    if (out.buf.length <= maxBytes) return out;
  }
  return { ...out, over: true };
}
