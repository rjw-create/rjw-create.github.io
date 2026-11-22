// The project page was renamed (strait.html -> msit.html, #strait -> #msit). Links shared before the rename
// must keep opening the same thing, and the pages must point at files that exist.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const REDIRECTS = [
  ["strait.html", "msit.html"],
  ["strait-nationals-documentation.html", "msit-nationals-documentation.html"],
];

for (const [from, to] of REDIRECTS) {
  test(`${from} redirects to ${to}, with and without JavaScript`, () => {
    const html = read(from);
    assert.ok(fs.existsSync(path.join(root, to)), `${to} exists`);
    assert.ok(html.includes(`<meta http-equiv="refresh" content="0; url=${to}">`), "refresh for no-JS visitors");
    assert.ok(html.includes(`location.replace("${to}" + location.hash)`), "script keeps the #section");
    assert.ok(html.includes(`<a href="${to}">`), "a plain link as the last resort");
  });
}

test("the home page opens the MSIT entry for #msit and for the old #strait", () => {
  const html = read("index.html");
  const entry = html.slice(html.indexOf('<article class="entry" id="msit"'));
  const inside = entry.slice(0, entry.indexOf("</article>"));
  assert.ok(inside.length > 0, "the entry has id msit");
  assert.ok(inside.includes('id="strait"'), "the old id sits inside the entry");
  assert.equal(html.split('id="strait"').length - 1, 1, "the old id appears once");
});

test("every local link, image, video and poster on the home and MSIT pages points at a file that exists", () => {
  for (const page of ["index.html", "msit.html"]) {
    const html = read(page);
    for (const match of html.matchAll(/(?:href|src|poster)="([^"#:]+)(?:#[^"]*)?"/g)) {
      assert.ok(fs.existsSync(path.join(root, match[1])), `${page} links to ${match[1]}`);
    }
  }
});

test("the documentation PDF is the web copy: under 10 MB", () => {
  const size = fs.statSync(path.join(root, "assets/msit/msit-documentation.pdf")).size;
  assert.ok(size < 10_000_000, `${size} bytes`);
});

test("every screen recording in assets/media is under 10 MB", () => {
  const dir = path.join(root, "assets/media");
  const clips = fs.readdirSync(dir).filter((f) => f.endsWith(".mp4"));
  assert.ok(clips.length > 0, "no mp4 files found");
  for (const clip of clips) {
    const size = fs.statSync(path.join(dir, clip)).size;
    assert.ok(size < 10_000_000, `${clip}: ${size} bytes`);
  }
});

// Pixel size from a baseline or progressive JPEG's start-of-frame segment.
function jpegSize(file) {
  const buf = fs.readFileSync(file);
  for (let i = 2; i < buf.length; ) {
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc2) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error(`${file}: no start-of-frame segment`);
}

// Pixel size of an mp4's video track, from the first track header with a non-zero size (16.16 fixed point).
function mp4Size(file) {
  const buf = fs.readFileSync(file);
  for (let at = buf.indexOf("tkhd"); at !== -1; at = buf.indexOf("tkhd", at + 4)) {
    const end = at - 4 + buf.readUInt32BE(at - 4);
    const size = [buf.readUInt32BE(end - 8) >>> 16, buf.readUInt32BE(end - 4) >>> 16];
    if (size[0] > 0) return size;
  }
  throw new Error(`${file}: no video track header`);
}

// A recording and its poster are cropped together; if they drift apart the clip jumps when it starts playing.
test("each home-page video, its poster and its width/height attributes have the same size", () => {
  const html = read("index.html");
  const videos = [...html.matchAll(/<video src="([^"]+)" poster="([^"]+)" width="(\d+)" height="(\d+)"/g)];
  assert.ok(videos.length > 0, "no videos found");
  for (const [, src, poster, width, height] of videos) {
    const declared = [Number(width), Number(height)];
    assert.deepEqual(mp4Size(path.join(root, src)), declared, `${src} matches its width/height`);
    assert.deepEqual(jpegSize(path.join(root, poster)), declared, `${poster} matches ${src}`);
  }
});

// Squeezed into a column beside the text, the screenshots shrank to about 470px at 1280 and their labels
// became unreadable; the media must stay under the text at its full width.
test("entry media is never put in a column beside the text", () => {
  const css = read("src/styles/site.css");
  for (const rule of css.matchAll(/([^{}]*\.media[^{}]*)\{([^}]*)\}/g)) {
    assert.ok(!/grid-column\s*:\s*2/.test(rule[2]), `${rule[1].trim()} moves media to column 2`);
  }
  assert.ok(!/\.entry-body\s*\{[^}]*grid-template-columns/.test(css), ".entry-body has no side-by-side columns");
});

// Goal, rule and key hint stacked at 16, 20 and 14px read as three competing levels; the panel under the
// level title keeps two sizes: body for goal and rule, small for the hint.
test("the rule panel uses two text sizes at every screen width", () => {
  const css = read("src/styles/site.css");
  const sizes = new Set();
  for (const rule of css.matchAll(/([^{}]*\.rule[-\w]*[^{}]*)\{([^}]*)\}/g)) {
    const size = /font-size\s*:\s*([^;]+)/.exec(rule[2]);
    if (size) sizes.add(size[1].trim());
  }
  assert.deepEqual([...sizes].sort(), ["var(--text-body)", "var(--text-small)"]);
});

// The HUD counts levels ("Level 1 of 4"); a numbered Contact step ("05") made the path look like five levels.
test("only the four levels carry numbers in the path; Contact is marked End", () => {
  const js = read("src/js/site.js");
  assert.match(js, /Level \$\{i \+ 1\} of \$\{LEVELS\.length\}/, "HUD counts levels");
  const contact = /items\.push\(\{[^}]*name: "Contact"[^}]*\}\)/.exec(js);
  assert.ok(contact, "the path adds a Contact step");
  assert.match(contact[0], /no: "End"/);
});

// "Read without playing" wraps to two lines at 375px; with the browser's default leading (about 1.29x for
// IBM Plex Mono) its lines sat too close. Tool buttons set the body leading instead.
test("tool buttons set their own line height", () => {
  const css = read("src/styles/site.css");
  const tool = /(?:^|\n)\.tool\s*\{([^}]*)\}/.exec(css);
  assert.ok(tool, ".tool rule exists");
  assert.match(tool[1], /line-height\s*:\s*var\(--leading-body\)/);
});
