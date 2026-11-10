// The visible browser window for ui-pane and ui-check --headed: opened without taking the keyboard,
// over the right part of the Windows Terminal window that holds the tab, on that terminal's screen,
// named after the job, and following the terminal when it moves. Placement works in physical screen
// pixels, the same units on every monitor whatever its scaling. Kit guide: guides/2026-11-07-TEST-PANE.md
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PANE_SHARE, closeBrowser, readDevToolsPort, waitForDebugPort } from "./ui-serve.mjs";

// ---------------------------------------------------------------- placement maths (pure, tested)
// Rectangles are { left, top, right, bottom }. Monitors are { rect, work, primary, scale }.
const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
const overlap = (a, b) => area({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });

// The monitor showing most of the rectangle; when it is on none, the one nearest its centre.
export function pickMonitor(rect, monitors) {
  let best = null, bestArea = 0;
  for (const m of monitors) {
    const a = overlap(rect, m.rect);
    if (a > bestArea) { best = m; bestArea = a; }
  }
  if (best) return best;
  const cx = (rect.left + rect.right) / 2, cy = (rect.top + rect.bottom) / 2;
  const dist = (m) => Math.hypot(Math.max(m.rect.left - cx, 0, cx - m.rect.right), Math.max(m.rect.top - cy, 0, cy - m.rect.bottom));
  return monitors.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

// The right `share` of the terminal window, full height, kept inside the work area (screen minus
// taskbar) of the terminal's monitor. Returns { left, top, width, height }.
export function rightPart(terminal, monitors, share = PANE_SHARE) {
  const work = pickMonitor(terminal, monitors).work;
  const left = Math.max(terminal.left, work.left), right = Math.min(terminal.right, work.right);
  const top = Math.max(terminal.top, work.top), bottom = Math.min(terminal.bottom, work.bottom);
  // A terminal mostly off its screen still gets a usable window: at least the share of the work area.
  const visibleWidth = right > left ? right - left : work.right - work.left;
  const width = Math.round(visibleWidth * share);
  const r = right > left ? right : work.right;
  return { left: r - width, top: bottom > top ? top : work.top, width, height: bottom > top ? bottom - top : work.bottom - work.top };
}

export const sameRect = (a, b) => !!a && !!b && a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;

// Chromium places windows in its own units (DIPs): each screen's pixels divided by its scaling, with the
// primary screen at 0,0 and a screen beside it starting at the primary's edge in those units; the offset
// along the shared edge is divided by the primary's scaling. (Measured 2026-11-07: Jackson's desktop
// monitor, physical 2880,329 next to a 200% laptop, starts at 1440,164.5.) Screens that don't touch the
// primary get a best guess; the window is corrected to exact physical pixels after it opens anyway.
// Returns { left, top, width, height } in DIPs for a physical { left, top, width, height }.
export function toChromiumBounds(rect, monitors) {
  const primary = monitors.find((m) => m.primary) || monitors[0];
  const ps = primary.scale || 1;
  const pdip = { left: 0, top: 0, right: (primary.rect.right - primary.rect.left) / ps, bottom: (primary.rect.bottom - primary.rect.top) / ps };
  const m = pickMonitor({ left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height }, monitors);
  const s = m.scale || 1;
  let originX, originY;
  if (m === primary) [originX, originY] = [0, 0];
  else if (m.rect.left === primary.rect.right) [originX, originY] = [pdip.right, (m.rect.top - primary.rect.top) / ps];
  else if (m.rect.right === primary.rect.left) [originX, originY] = [pdip.left - (m.rect.right - m.rect.left) / s, (m.rect.top - primary.rect.top) / ps];
  else if (m.rect.top === primary.rect.bottom) [originX, originY] = [(m.rect.left - primary.rect.left) / ps, pdip.bottom];
  else if (m.rect.bottom === primary.rect.top) [originX, originY] = [(m.rect.left - primary.rect.left) / ps, pdip.top - (m.rect.bottom - m.rect.top) / s];
  else [originX, originY] = [m.rect.left / ps, m.rect.top / ps];
  return {
    left: Math.round(originX + (rect.left - m.rect.left) / s),
    top: Math.round(originY + (rect.top - m.rect.top) / s),
    width: Math.round(rect.width / s),
    height: Math.round(rect.height / s),
  };
}

// ---------------------------------------------------------------- Win32 helper (Windows only)
// C# compiled once by PowerShell's Add-Type. Info() reports the terminal window that owns this
// console (Windows Terminal owns its panes' pseudo console windows) and the monitors. Move() puts the
// visible frame of a process's main window on a rectangle; Title() names it. Nothing here activates a
// window or changes which one has the keyboard.
const CSHARP = `
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class UiPlace {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct WINDOWPLACEMENT { public int length, flags, showCmd; public int minX, minY, maxX, maxY; public RECT rcNormalPosition; }
  [DllImport("user32.dll")] static extern bool GetWindowPlacement(IntPtr h, ref WINDOWPLACEMENT p);
  public delegate bool MonitorProc(IntPtr m, IntPtr hdc, ref RECT rc, IntPtr data);
  public delegate bool WindowProc(IntPtr h, IntPtr data);
  [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr ctx);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO i);
  [DllImport("user32.dll")] static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorProc cb, IntPtr data);
  [DllImport("shcore.dll")] static extern int GetDpiForMonitor(IntPtr m, int type, out uint dpiX, out uint dpiY);
  [DllImport("user32.dll")] static extern bool EnumWindows(WindowProc cb, IntPtr data);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool SetWindowText(IntPtr h, string s);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hgt, uint flags);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int attr, out RECT r, int size);

  // Per-monitor DPI aware: real screen pixels on every monitor, whatever its scaling.
  static void Aware() { SetThreadDpiAwarenessContext(new IntPtr(-4)); }
  static string Json(RECT r) { return "[" + r.Left + "," + r.Top + "," + r.Right + "," + r.Bottom + "]"; }
  // The visible frame, without the invisible resize borders Windows 10 and 11 add around windows.
  static RECT Frame(IntPtr h) {
    RECT f;
    if (DwmGetWindowAttribute(h, 9, out f, 16) != 0) GetWindowRect(h, out f);
    return f;
  }
  static IntPtr Terminal() {
    IntPtr c = GetConsoleWindow();
    if (c == IntPtr.Zero) return IntPtr.Zero;
    IntPtr owner = GetWindow(c, 4);
    if (owner != IntPtr.Zero) return owner;
    return IsWindowVisible(c) ? c : IntPtr.Zero;
  }
  public static string Info() {
    Aware();
    IntPtr t = Terminal();
    StringBuilder mons = new StringBuilder();
    EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, delegate(IntPtr m, IntPtr hdc, ref RECT rc, IntPtr d) {
      MONITORINFO i = new MONITORINFO(); i.cbSize = 40; GetMonitorInfo(m, ref i);
      uint dx, dy; double scale = GetDpiForMonitor(m, 0, out dx, out dy) == 0 ? dx / 96.0 : 1.0;
      if (mons.Length > 0) mons.Append(",");
      mons.Append("{\\"rect\\":" + Json(i.rcMonitor) + ",\\"work\\":" + Json(i.rcWork) + ",\\"primary\\":" + ((i.dwFlags & 1) == 1 ? "true" : "false")
        + ",\\"scale\\":" + scale.ToString(System.Globalization.CultureInfo.InvariantCulture) + "}");
      return true;
    }, IntPtr.Zero);
    string term = "null";
    bool minimized = t != IntPtr.Zero && IsIconic(t);
    if (minimized) {
      // A minimized window sits at -32000; its restored position is the one that means something.
      // (Workspace coordinates: the same as screen coordinates unless the taskbar is at the top or left.)
      WINDOWPLACEMENT p = new WINDOWPLACEMENT(); p.length = Marshal.SizeOf(p); GetWindowPlacement(t, ref p);
      term = Json(p.rcNormalPosition);
    } else if (t != IntPtr.Zero) term = Json(Frame(t));
    return "{\\"terminal\\":" + term + ",\\"minimized\\":" + (minimized ? "true" : "false") + ",\\"monitors\\":[" + mons + "]}";
  }
  static IntPtr MainWindow(uint pid) {
    IntPtr found = IntPtr.Zero; long bestArea = 0;
    EnumWindows(delegate(IntPtr h, IntPtr d) {
      uint p; GetWindowThreadProcessId(h, out p);
      if (p != pid || !IsWindowVisible(h)) return true;
      StringBuilder s = new StringBuilder(64); GetClassName(h, s, 64);
      if (s.ToString() != "Chrome_WidgetWin_1") return true;
      RECT r; GetWindowRect(h, out r);
      long a = (long)(r.Right - r.Left) * (r.Bottom - r.Top);
      if (a > bestArea) { bestArea = a; found = h; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
  // Moves only (SWP_NOACTIVATE | SWP_NOZORDER): it never brings the window to the front or takes the
  // keyboard, so someone typing in another window keeps typing there.
  public static bool Move(uint pid, int left, int top, int width, int height) {
    Aware();
    IntPtr h = MainWindow(pid);
    if (h == IntPtr.Zero || IsIconic(h)) return false;
    // Twice: moving to a monitor with other scaling makes the window resize itself once on arrival.
    for (int i = 0; i < 2; i++) {
      RECT r; GetWindowRect(h, out r); RECT f = Frame(h);
      SetWindowPos(h, IntPtr.Zero, left - (f.Left - r.Left), top - (f.Top - r.Top),
        width + (f.Left - r.Left) + (r.Right - f.Right), height + (f.Top - r.Top) + (r.Bottom - f.Bottom), 0x0004 | 0x0010);
      System.Threading.Thread.Sleep(150);
    }
    // Chromium keeps a minimum width (about 500 px). When it widened the window, line its right edge up
    // with the terminal's again so it doesn't hang past it.
    RECT got = Frame(h);
    int over = got.Right - (left + width);
    if (over != 0) {
      RECT r2; GetWindowRect(h, out r2);
      SetWindowPos(h, IntPtr.Zero, r2.Left - over, r2.Top, 0, 0, 0x0001 | 0x0004 | 0x0010);
    }
    return true;
  }
  // Chromium titles its window after the page and rewrites the title when the page's title changes, so
  // this is called again on every follow tick; it only writes when the title differs.
  public static string Title(uint pid, string text) {
    IntPtr h = MainWindow(pid);
    if (h == IntPtr.Zero) return "no-window";
    StringBuilder s = new StringBuilder(512); GetWindowText(h, s, 512);
    if (s.ToString() == text) return "same";
    SetWindowText(h, text);
    return "set";
  }
}
`;

// The PowerShell side: a loop that answers one command per line on stdin with one JSON line.
//   info                              -> {"terminal":[l,t,r,b] or null,"minimized":bool,"monitors":[...]}
//   move <pid> <l> <t> <w> <h>        -> {"moved":true|false}
//   title <pid> <base64 UTF-8 text>   -> {"title":"set"|"same"|"no-window"}
const LOOP = `
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @'
${CSHARP}
'@
[Console]::Out.WriteLine('{"ready":true}')
while ($null -ne ($line = [Console]::In.ReadLine())) {
  $p = $line.Trim().Split(' ')
  try {
    if ($p[0] -eq 'info') { $out = [UiPlace]::Info() }
    elseif ($p[0] -eq 'move') { $out = '{"moved":' + ([UiPlace]::Move([uint32]$p[1], [int]$p[2], [int]$p[3], [int]$p[4], [int]$p[5])).ToString().ToLower() + '}' }
    elseif ($p[0] -eq 'title') { $out = '{"title":"' + [UiPlace]::Title([uint32]$p[1], [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p[2]))) + '"}' }
    else { $out = '{"error":"unknown command"}' }
  } catch { $out = '{"error":' + (ConvertTo-Json ([string]$_.Exception.Message) -Compress) + '}' }
  [Console]::Out.WriteLine($out)
}
`;

// Puts a headed Chromium (main process `pid`) over the right part of this tab's terminal window, names
// it, and with follow keeps both: every interval it moves the window again if the terminal moved, and
// renames it if Chromium retitled it. Resolves to { stop(), again(), terminal, rect } when it found a
// terminal, or null (no console window, not Windows): the caller then uses placeOnRight.
export async function placeOverTerminal(placer, pid, { follow = true, intervalMs = 1000, title, info: known } = {}) {
  const info = known || (placer && pid ? await placer.info() : null);
  if (!info?.terminal) return null;
  let last = info.terminal;
  const rect = rightPart(last, info.monitors);
  if (!(await placer.move(pid, rect))) return null;
  if (title) await placer.setTitle(pid, title);
  let busy = false;
  const timer = follow ? setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const now = await placer.info();
      // While the terminal is minimized the window stays where it is.
      if (now?.terminal && !now.minimized && !sameRect(now.terminal, last)) {
        last = now.terminal;
        await placer.move(pid, rightPart(last, now.monitors));
      }
      if (title) await placer.setTitle(pid, title);
    } finally {
      busy = false;
    }
  }, intervalMs) : null;
  timer?.unref();
  // again(): put the window back over the terminal once, for when something else changed its size
  // (Playwright resizes a visible window to fit the viewport ui-check asks for).
  const again = async () => {
    const now = await placer.info();
    if (!now?.terminal || now.minimized) return;
    last = now.terminal;
    await placer.move(pid, rightPart(last, now.monitors));
  };
  return { stop: () => clearInterval(timer), again, terminal: info.terminal, rect };
}

// ---------------------------------------------------------------- opening the window without taking focus
// Chromium activates the window it opens at startup, taking the keyboard from whoever was typing, and
// Windows then refuses to give the keyboard back to the terminal. So Chromium is started with no window
// at all (--no-startup-window) and the window is created over CDP with focus:false, already roughly in
// place, then corrected to exact pixels without activating it. Proven 2026-11-07 with a 50 ms foreground
// poller: the terminal kept the keyboard throughout (docs/evidence/2026-11-07-ui-pane-focus-proof/).
// Returns { browser, context, tab, pid, port, profileDir, follow }; close it with closeWindow().
export async function launchWindow({ chromium, cdpPort = 0, title, placer, follow = true, slowMo }) {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-pane-"));
  const proc = spawn(chromium.executablePath(), [
    `--user-data-dir=${profileDir}`,
    // 127.0.0.1 only. Port 0: the system picks a free one and Chromium writes it into the profile.
    `--remote-debugging-port=${cdpPort}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--no-startup-window",
  ], { stdio: "ignore" });
  const w = { profileDir, pid: proc.pid };
  let exited = null;
  proc.on("exit", (code) => { exited = code; });
  try {
    w.port = cdpPort ? await waitForDebugPort(cdpPort) : await readDevToolsPort(profileDir);
    if (exited !== null) throw new Error(`Chromium exited at start (code ${exited})`);
    w.browser = await chromium.connectOverCDP(`http://127.0.0.1:${w.port}`, slowMo ? { slowMo } : {});
    w.context = w.browser.contexts()[0];
    const info = placer ? await placer.info() : null;
    const target = info?.terminal ? rightPart(info.terminal, info.monitors) : null;
    const browserCdp = await w.browser.newBrowserCDPSession();
    const opened = w.context.waitForEvent("page");
    await browserCdp.send("Target.createTarget", {
      url: "about:blank",
      newWindow: true,
      // Opened but not activated: whatever has the keyboard keeps it.
      focus: false,
      ...(target ? { ...toChromiumBounds(target, info.monitors), windowState: "normal" } : {}),
    });
    w.tab = await opened;
    w.follow = target ? await placeOverTerminal(placer, w.pid, { follow, title, info }) : null;
    return w;
  } catch (e) {
    await closeWindow(w);
    throw e;
  }
}

// Closes the browser and deletes its profile; never throws. Returns a note when something was left.
export async function closeWindow(w) {
  w.follow?.stop();
  try {
    const cdp = await w.browser.newBrowserCDPSession();
    await Promise.race([cdp.send("Browser.close"), new Promise((r) => setTimeout(r, 3000))]);
  } catch { /* already gone */ }
  await w.browser?.close().catch(() => {});
  return closeBrowser({ pid: w.pid, profileDir: w.profileDir });
}

// ---------------------------------------------------------------- the helper process
// Starts the helper. It shares this process's console, which is how it finds the terminal window.
// Resolves to null when it can't run (not Windows, or PowerShell missing or blocked).
export async function startPlacer() {
  if (process.platform !== "win32") return null;
  const encoded = Buffer.from(LOOP, "utf16le").toString("base64");
  const ps = spawn("powershell", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], { stdio: ["pipe", "pipe", "ignore"] });
  let buffered = "";
  const waiting = [];
  ps.stdout.on("data", (d) => {
    buffered += d.toString();
    let nl;
    while ((nl = buffered.indexOf("\n")) >= 0) {
      const line = buffered.slice(0, nl).trim();
      buffered = buffered.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      waiting.shift()?.(msg);
    }
  });
  const exited = new Promise((r) => ps.on("exit", r));
  ps.on("error", () => {});
  ps.stdin.on("error", () => {});
  const ask = (cmd) => new Promise((resolve) => {
    if (ps.exitCode !== null) { resolve(null); return; }
    waiting.push(resolve);
    if (cmd) ps.stdin.write(cmd + "\n");
  });
  // Add-Type compiles the C# on start: about a second.
  const ready = await Promise.race([ask(null), exited.then(() => null), new Promise((r) => setTimeout(() => r(null), 20000))]);
  if (!ready?.ready) { ps.kill(); return null; }
  const toRect = (a) => (a ? { left: a[0], top: a[1], right: a[2], bottom: a[3] } : null);
  return {
    async info() {
      const r = await ask("info");
      if (!r || r.error) return null;
      return { terminal: toRect(r.terminal), minimized: !!r.minimized, monitors: r.monitors.map((m) => ({ rect: toRect(m.rect), work: toRect(m.work), primary: m.primary, scale: m.scale })) };
    },
    async move(pid, rect) {
      const r = await ask(`move ${pid} ${rect.left} ${rect.top} ${rect.width} ${rect.height}`);
      return !!r?.moved;
    },
    async setTitle(pid, text) {
      const r = await ask(`title ${pid} ${Buffer.from(text, "utf8").toString("base64")}`);
      return r?.title ?? "unknown";
    },
    close() { ps.stdin.end(); setTimeout(() => ps.kill(), 2000).unref(); },
  };
}
