// A Windows Contrast theme (idea 9 Nov, late night): Windows' high-contrast themes repaint a page in the theme's few colours
// (forced-colors: active) and drop backgrounds, so chosen choices and switches lost their look. tools/forced.py checks the
// real screens in Chromium's own forcing; this keeps the answers in index.html from being lost.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appHtml } from "../tools/build-app.js";

const index = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

function block(html) {
  const at = html.indexOf("@media (forced-colors:active){");
  assert.ok(at > 0, "the page answers a Contrast theme");
  assert.ok(at < html.indexOf("</style>"), "…in the first stylesheet, before anything is drawn");
  return html.slice(at, html.indexOf("\n}\n", at));
}

test("a chosen choice takes the theme's own Highlight, in every kind of choice", () => {
  const b = block(index);
  for (const sel of ['.segbtn[aria-pressed="true"]', '.gamePick .segbtn[aria-pressed="true"]', '.pill[aria-pressed="true"]', '.choose[aria-pressed="true"]'])
    assert.ok(b.includes(sel), sel);
  assert.match(b, /background:Highlight;color:HighlightText/);
});

test("switches keep a knob, on and off; swatches keep their wood and seeds inside a frame", () => {
  const b = block(index);
  assert.match(b, /\.sw\{forced-color-adjust:none;[^}]*\}/);
  assert.match(b, /\.sw i\{background:ButtonText/);
  assert.match(b, /\.sw\[aria-checked="true"\] i\{background:HighlightText\}/);
  assert.match(b, /\.swatch\{forced-color-adjust:none;border:2px solid CanvasText\}/);
  assert.match(b, /\.swatch\[aria-pressed="true"\]\{[^}]*outline:2px solid Highlight/);
});

test("only the theme's own colours are used inside the block (never the wood's browns)", () => {
  assert.doesNotMatch(block(index), /#[0-9a-f]{3,6}\b|rgba?\(|var\(--/i);
});

test("the store apps' page keeps it", () => { block(appHtml(index)); });

test("the check is the real one: Chromium's own forcing, judged on pixels", () => {
  const py = readFileSync(new URL("../tools/forced.py", import.meta.url), "utf8");
  assert.match(py, /forced_colors="active" if forced else "none"/);
  assert.match(py, /check\(d >= 120,/);
});
