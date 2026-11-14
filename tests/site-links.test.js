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
