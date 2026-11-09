// Stronger words when asked (idea 9 Nov, late night): a phone or Mac set to "Increase contrast" says prefers-contrast: more,
// and the game then brings its soft greys up, firms the outlines and darkens the glass behind words over the board.
// tools/contrast.py judges every word against the real pixels behind it; this keeps the sums it trusts honest and the
// stylesheet saying what it promised.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { luminance, ratio, over, needs, large, judge } from "../tools/contrast.js";
import { legalPage, PAGES, LANGS } from "../server/legal.js";
import { appHtml } from "../tools/build-app.js";

const index = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const block = (html) => { const at = html.indexOf("@media (prefers-contrast:more){"); assert.ok(at > 0, "a prefers-contrast: more block"); return html.slice(at, html.indexOf("\n}", at) + 2); };
const varOf = (css, name) => (css.match(new RegExp(name + ":(#[0-9a-f]{6})")) || [])[1];

test("the contrast sums are WCAG's", () => {
  assert.equal(luminance(0, 0, 0), 0);
  assert.ok(Math.abs(luminance(255, 255, 255) - 1) < 1e-9);
  assert.ok(Math.abs(ratio([0, 0, 0], [255, 255, 255]) - 21) < 1e-9);
  assert.equal(ratio([119, 119, 119], [255, 255, 255]).toFixed(2), "4.48"); // #777 on white, the classic just-fails
  assert.equal(ratio([118, 118, 118], [255, 255, 255]).toFixed(2), "4.54");
  assert.deepEqual(over([255, 255, 255], 0.5, [0, 0, 0]), [127.5, 127.5, 127.5]);
  assert.equal(needs(14, 400, false), 4.5); assert.equal(needs(14, 400, true), 7);
  assert.equal(needs(24, 400, false), 3); assert.equal(needs(19, 700, true), 4.5);
  assert.ok(large(18.66, 700) && !large(18.66, 600) && !large(23, 400));
});

test("a word is judged on the worst tenth of what is behind it, not one stray grain", () => {
  const px = (cols) => Uint8ClampedArray.from(cols.flatMap((c) => [...c, 255]));
  const dark = Array(95).fill([13, 9, 6]), light = Array(5).fill([240, 230, 210]);
  const w = [241, 230, 210];
  assert.ok(judge(w, 1, px([...dark, ...light])) > 14, "five bright grains in a hundred do not fail it");
  assert.ok(judge(w, 1, px([...Array(70).fill([13, 9, 6]), ...Array(30).fill([240, 230, 210])])) < 1.1, "a band of them does");
  assert.ok(judge(w, 0.3, px(dark)) < judge(w, 1, px(dark)), "a faded word reads weaker");
  assert.equal(judge(w, 1, new Uint8ClampedArray(0)), 21);
});

test("asked for more contrast, the game's greys and outlines come up", () => {
  const css = block(index);
  const root = index.match(/:root\{[^}]*\}/)[0];
  const bg = hex(varOf(root, "--bg"));
  const normal = hex(varOf(root, "--muted")), more = hex(varOf(css, "--muted"));
  assert.ok(ratio(more, bg) >= 12, `--muted asked for more reads ${ratio(more, bg).toFixed(1)}:1 on the page`);
  assert.ok(ratio(more, bg) > ratio(normal, bg) + 3, "well above the drawn grey");
  assert.match(css, /--line:rgba\(243,233,215,\.(4|5|6)\d?\)/, "the outlines firm up");
  for (const sel of ["#hint", ".badge", ".dailyCard", ".nowCard", ".goldCard li em", ".play small"]) assert.ok(css.includes(sel), `${sel} is looked after`);
  // the drawn look is untouched: the block only adds, and the root keeps its approved greys
  assert.equal(varOf(root, "--muted"), "#b9a58d");
});

test("no fixed faint grey escapes it: each one in the page has a stronger colour in the block", () => {
  const css = block(index);
  const rest = index.replace(css, "");
  for (const grey of ["#8f7d66", "#9c876d"]) {
    const uses = [...rest.matchAll(new RegExp("([^{}]+)\\{[^}]*color:" + grey, "g"))].map((m) => m[1].trim().split("\n").pop());
    for (const sel of uses) for (const one of sel.split(",")) assert.ok(css.includes(one.trim()) || css.includes("html " + one.trim()), `${one.trim()} (${grey}) comes up when asked`);
  }
});

test("the privacy, terms and support pages and the store apps' page follow it too", () => {
  for (const name of PAGES) for (const lang of LANGS) assert.match(legalPage(name, {}, lang), /@media \(prefers-contrast:more\)\{:root\{--muted:#e2d3bc/, `${name} (${lang})`);
  assert.ok(appHtml(index).includes("@media (prefers-contrast:more){"), "the apps' copy of the page");
});

test("the check is the real one: Chromium told the setting, every word against the pixels behind it", () => {
  const py = readFileSync(new URL("../tools/contrast.py", import.meta.url), "utf8");
  assert.match(py, /contrast="more" if more else "no-preference"/);
  assert.match(py, /emulate_media\(contrast="more"\)/, "and switched with the game open");
  assert.match(py, /color:transparent!important/, "the words taken away to see what is behind them");
});
