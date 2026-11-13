#!/usr/bin/env node
// Design check: enforces the rules in DESIGN.md that a script can check. Plain Node, no packages.
// scripts/design_check.py is the Python twin; keep the two in step.
//
//   node scripts/design-check.mjs                    token lint + contrast check (run by check.sh)
//   node scripts/design-check.mjs ratio "#hex" "#hex" contrast ratio of any two colours
//
// 1. Contrast: every pair in DESIGN.md's "Contrast pairs" table, in the light and dark themes,
//    must meet its minimum WCAG 2.2 ratio. Colours come from the token file (CSS) when it exists,
//    otherwise from DESIGN.md's colour table. If both exist they must agree (no drift).
// 2. Token lint: no hex, rgb() or hsl() colour outside the token file, and no raw px/rem/em
//    font-size, margin, padding or gap in stylesheets. Add "token-lint: allow" on a line to skip it.
//    A custom property definition (--name: value) is never flagged, in any file or block: defining
//    a token is the one place a raw value belongs. Using a raw value (color: #fff) still is.
// Exit 0 = pass (or nothing to check), 1 = fail.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = new Set(["design-check.mjs", "design_check.py"]);
// Documents published byte for byte with their own styles (Jackson, 2026-11-10): not the site's styling,
// so the token lint leaves them alone. Paths are relative to the repo root.
const VERBATIM = new Set(["msit-nationals-documentation.html"]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".venv", "venv", "dist", "build", "out", "coverage", ".next", ".nuxt",
  ".svelte-kit", ".claude", "docs", "specs", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
]);
const COLOUR_EXTS = new Set([
  ".css", ".scss", ".sass", ".less", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx",
  ".vue", ".svelte", ".html", ".htm", ".py",
]);
const STYLE_EXTS = new Set([".css", ".scss", ".sass", ".less"]);
const HEX_RE = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const FUNC_RE = /\b(?:rgba?|hsla?)\(\s*[\d.]/g;
const SIZE_DECL_RE = /(?:^|[;{\s])(font-size|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g;
const RAW_SIZE_RE = /(?<![\w-])(\d*\.?\d+)(px|rem|em)\b/g;
const TOKEN_DEF_RE = /(?<![\w-])--[\w-]+\s*:/;

// ---------------------------------------------------------------- colour maths (WCAG 2.2)
function parseColour(value, theme, depth = 0) {
  const v = value.trim().toLowerCase();
  const ref = v.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (ref) {
    if (depth > 10 || !theme) throw new Error(`cannot resolve ${v}`);
    const next = theme[ref[1]];
    if (next === undefined) throw new Error(`${ref[1]} is not defined`);
    return parseColour(next, theme, depth + 1);
  }
  let rgba;
  const hex = v.match(/^#([0-9a-f]{3,8})$/);
  const fn = v.match(/^(rgba?|hsla?)\((.*)\)$/);
  if (hex && [3, 4, 6, 8].includes(hex[1].length)) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    rgba = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    rgba.push(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  } else if (fn) {
    const parts = fn[2].replace(/[,/]/g, " ").trim().split(/\s+/);
    if (parts.length < 3) throw new Error(`cannot read colour "${value}"`);
    const alpha = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    if (fn[1].startsWith("rgb")) {
      rgba = parts.slice(0, 3).map((p) => (p.endsWith("%") ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
    } else {
      const hDeg = parseFloat(parts[0]);
      const s = parseFloat(parts[1]) / 100;
      const l = parseFloat(parts[2]) / 100;
      const k = (n) => (n + hDeg / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      rgba = [0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    }
    rgba.push(alpha);
  } else {
    throw new Error(`cannot read colour "${value}" (use hex, rgb() or hsl())`);
  }
  if (rgba.some((n) => Number.isNaN(n))) throw new Error(`cannot read colour "${value}"`);
  // A see-through colour's contrast depends on what is behind it, so it can't be measured alone.
  if (rgba[3] < 1) throw new Error(`"${value}" is translucent; contrast pairs need solid colours`);
  return rgba.slice(0, 3);
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Truncate rather than round, so 4.49 never prints as a passing 4.5.
const fmt = (r) => (Math.floor(r * 100) / 100).toFixed(2);

// ---------------------------------------------------------------- reading DESIGN.md and tokens
function tableRows(md, mustHave) {
  // Returns the body rows of the first markdown table whose header contains every word in mustHave.
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    const header = lines[i].toLowerCase();
    if (!header.trim().startsWith("|") || !mustHave.every((w) => header.includes(w))) continue;
    const rows = [];
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j++) {
      rows.push(lines[j].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, "")));
    }
    return rows;
  }
  return [];
}

function readCssThemes(css) {
  // Collects custom properties into light and dark maps. A declaration is "dark" when any
  // enclosing block's selector or media query mentions dark; dark falls back to light.
  const light = {};
  const dark = {};
  const stack = [];
  let buf = "";
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const flush = () => {
    for (const m of buf.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) {
      const isDark = stack.some((s) => /dark/i.test(s));
      (isDark ? dark : light)[m[1]] = m[2].trim();
    }
  };
  for (const ch of text) {
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      flush();
      stack.pop();
      buf = "";
    } else if (ch === ";") {
      flush();
      buf = "";
    } else {
      buf += ch;
    }
  }
  return { light, dark: { ...light, ...dark } };
}

function readDesign() {
  const mdPath = path.join(ROOT, "DESIGN.md");
  if (!fs.existsSync(mdPath)) return null;
  const md = fs.readFileSync(mdPath, "utf8");
  const tokenLine = md.match(/^[-*]?\s*Token file:\s*`?([^`\s]+)`?/m);
  const colourRows = tableRows(md, ["token", "light", "dark"]);
  const pairRows = tableRows(md, ["foreground", "background", "min"]);
  const table = { light: {}, dark: {} };
  for (const row of colourRows) {
    if (!row[0]?.startsWith("--")) continue;
    table.light[row[0]] = row[1];
    table.dark[row[0]] = row[2] || row[1];
  }
  const pairs = pairRows
    .filter((r) => r[0]?.startsWith("--") && r[1]?.startsWith("--"))
    .map((r) => ({ fg: r[0], bg: r[1], min: parseFloat(r[2]) }));
  return { tokenFile: tokenLine ? tokenLine[1] : null, table, pairs };
}

// ---------------------------------------------------------------- checks
function checkContrast(design, themes, source) {
  let fail = 0;
  console.log(`\nContrast (WCAG 2.2, colours from ${source})`);
  if (design.pairs.length === 0) {
    console.log('  No "Contrast pairs" table in DESIGN.md - nothing to check');
    return 0;
  }
  for (const name of ["light", "dark"]) {
    const theme = themes[name];
    for (const { fg, bg, min } of design.pairs) {
      const label = `${name.padEnd(5)}  ${fg} on ${bg}`;
      if (Number.isNaN(min)) {
        console.log(`  FAIL  ${label}: minimum ratio is not a number`);
        fail = 1;
        continue;
      }
      try {
        if (theme[fg] === undefined) throw new Error(`${fg} is not defined`);
        if (theme[bg] === undefined) throw new Error(`${bg} is not defined`);
        const r = ratio(parseColour(theme[fg], theme), parseColour(theme[bg], theme));
        const ok = r >= min;
        if (!ok) fail = 1;
        console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}  ${fmt(r)}:1 (min ${min}:1)`);
      } catch (e) {
        console.log(`  FAIL  ${label}: ${e.message}`);
        fail = 1;
      }
    }
  }
  return fail;
}

function checkDrift(design, themes, tokenFile) {
  // DESIGN.md's colour table is what people read; the token file is what ships. They must match.
  let fail = 0;
  for (const name of ["light", "dark"]) {
    for (const [token, docValue] of Object.entries(design.table[name])) {
      const cssValue = themes[name][token];
      if (cssValue === undefined) {
        console.log(`  FAIL  ${name.padEnd(5)}  ${token} is in DESIGN.md but not in ${tokenFile}`);
        fail = 1;
        continue;
      }
      try {
        const a = parseColour(docValue, design.table[name]).map(Math.round).join();
        const b = parseColour(cssValue, themes[name]).map(Math.round).join();
        if (a !== b) {
          console.log(`  FAIL  ${name.padEnd(5)}  ${token}: DESIGN.md says ${docValue}, ${tokenFile} says ${cssValue}`);
          fail = 1;
        }
      } catch {
        // Not a solid colour (a shadow, say): contrast doesn't use it, so drift isn't checked.
      }
    }
  }
  return fail;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      yield path.join(dir, entry.name);
    }
  }
}

// The line with every custom property definition cut out, so their values aren't linted. A value
// can run onto the next lines (a long shadow), so state.inDef carries over until its ; or }.
function withoutTokenDefs(line, state) {
  let rest = line;
  let out = "";
  for (;;) {
    if (state.inDef) {
      const end = rest.search(/[;}]/);
      if (end < 0) return out;
      rest = rest.slice(end);
      state.inDef = false;
    }
    const m = rest.match(TOKEN_DEF_RE);
    if (!m) return out + rest;
    out += rest.slice(0, m.index);
    rest = rest.slice(m.index + m[0].length);
    state.inDef = true;
  }
}

function lintTokens(tokenFile) {
  const tokenAbs = path.resolve(ROOT, tokenFile);
  const problems = [];
  for (const file of walk(ROOT)) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file);
    if (!COLOUR_EXTS.has(ext) || file === tokenAbs || SELF.has(base) || /\.min\./.test(base)) continue;
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (VERBATIM.has(rel)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const state = { inDef: false };
    lines.forEach((fullLine, i) => {
      const line = withoutTokenDefs(fullLine, state);
      if (fullLine.includes("token-lint: allow")) return;
      const where = `${rel}:${i + 1}`;
      for (const m of line.matchAll(HEX_RE)) problems.push(`${where}  raw colour ${m[0]}`);
      for (const m of line.matchAll(FUNC_RE)) problems.push(`${where}  raw colour ${m[0].replace(/\s*[\d.]$/, "")}...)`);
      if (!STYLE_EXTS.has(ext)) return;
      for (const decl of line.matchAll(SIZE_DECL_RE)) {
        const value = decl[2].replace(/var\([^()]*\)/g, "");
        for (const s of value.matchAll(RAW_SIZE_RE)) {
          if (parseFloat(s[1]) !== 0) problems.push(`${where}  raw size ${decl[1]}: ${s[0]}`);
        }
      }
    });
  }
  console.log(`\nToken lint (raw values outside ${tokenFile})`);
  if (problems.length === 0) {
    console.log("  ok    no raw colours or sizes found");
    return 0;
  }
  for (const p of problems) console.log(`  FAIL  ${p}`);
  console.log(`  Use a var(--token) from ${tokenFile}; if none fits, add a role-named token there and to DESIGN.md.`);
  return 1;
}

// ---------------------------------------------------------------- main
function main(argv) {
  if (argv[0] === "ratio") {
    if (argv.length !== 3) {
      console.log('Usage: node scripts/design-check.mjs ratio "#hex" "#hex"');
      return 2;
    }
    try {
      const r = ratio(parseColour(argv[1]), parseColour(argv[2]));
      const verdict = (min) => (r >= min ? "pass" : "FAIL");
      console.log(`${argv[1]} vs ${argv[2]}: ${fmt(r)}:1  body text (4.5) ${verdict(4.5)}, large text / UI parts (3) ${verdict(3)}`);
      return 0;
    } catch (e) {
      console.log(e.message);
      return 2;
    }
  }

  const design = readDesign();
  if (!design) {
    console.log("No DESIGN.md - design check skipped");
    return 0;
  }
  let fail = 0;
  const tokenFile = design.tokenFile;
  const tokenAbs = tokenFile ? path.resolve(ROOT, tokenFile) : null;
  const hasCss = tokenAbs && fs.existsSync(tokenAbs) && tokenAbs.endsWith(".css");

  let themes = design.table;
  let source = "DESIGN.md colour table";
  if (hasCss) {
    themes = readCssThemes(fs.readFileSync(tokenAbs, "utf8"));
    source = tokenFile;
  }
  fail |= checkContrast(design, themes, source);
  if (hasCss) {
    console.log(`\nDrift (DESIGN.md colour table vs ${tokenFile})`);
    const drift = checkDrift(design, themes, tokenFile);
    if (!drift) console.log("  ok    they agree");
    fail |= drift;
  }

  if (tokenAbs && fs.existsSync(tokenAbs)) {
    fail |= lintTokens(tokenFile);
  } else {
    console.log(`\nToken lint skipped: no token file${tokenFile ? ` at ${tokenFile}` : ""} (set "Token file:" in DESIGN.md once the project has a UI)`);
  }

  console.log(fail ? "\nDESIGN CHECK FAILED" : "\nDESIGN CHECK PASSED");
  return fail;
}

process.exit(main(process.argv.slice(2)));
