// Clear marks (idea 7 Nov): the marks' colours checked as a colour-blind eye sees them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WARM, CLEAR, MEET, VISIONS, seen, lab, apart, closest, clearOn, marksPalette, doubleCaps, clearNote } from "../web/clearmarks.js";
import { translate } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const prefs = (v) => ({ get: (k, d) => (k === "clear" && v != null ? v : d) });
// the woods' middle tones (web/textures.js) and the bronze's
const WOODS = { mahogany: 0x6e3920, iroko: 0xa97a3d, ebony: 0x2a221c, grandpa: 0x4c3320 };

test("seeing as a colour-blind eye does: white stays white, grey stays grey, and red and green meet for red–green eyes", () => {
  for (const v of VISIONS) {
    const w = seen(0xffffff, v); assert.ok(w.every((c) => c > 0.97), v + " white");
    const [L] = lab(seen(0x777777, v)); assert.ok(Math.abs(L - 50) < 2, v + " grey keeps its lightness: " + L);
  }
  assert.ok(apart(0xd62728, 0x2ca02c, "normal") > 60, "red and green plainly apart for most eyes");
  assert.ok(apart(0xcc3300, 0x669900, "deutan") < apart(0xcc3300, 0x669900, "normal") / 2, "a deutan eye brings red and green together");
  assert.equal(apart(0x123456, 0x123456, "protan"), 0);
});

test("the warm marks are the reason: copper and ember all but meet for a red–green colour-blind eye", () => {
  const [d, pair, v] = closest(WARM);
  assert.ok(d < 10, "the warm look's closest pair " + pair + " for " + v + ": " + d.toFixed(1));
  assert.ok(apart(WARM.caps, WARM.risk, "deutan") < 10, "a pit you take vs what you leave open, seen deutan");
});

test("clear marks: every pair of marks that can meet stays plainly apart for every eye", () => {
  for (const v of VISIONS) for (const [a, b] of MEET) {
    const d = apart(CLEAR[a], CLEAR[b], v);
    assert.ok(d >= 20, `${a} vs ${b} seen ${v}: ΔE ${d.toFixed(1)}`);
  }
  const [d] = closest(CLEAR); assert.ok(d > closest(WARM)[0] * 3, "three times further apart at the worst than the warm marks");
});

test("clear marks stand off every board, for every eye, as well as the warm ones wherever those were hard to see", () => {
  for (const [name, wood] of Object.entries(WOODS)) {
    const worst = (pal) => Math.min(...Object.values(pal).flatMap((c) => VISIONS.map((v) => apart(c, wood, v))));
    assert.ok(worst(CLEAR) >= 12, `${name}: ${worst(CLEAR).toFixed(1)}`);
    assert.ok(worst(CLEAR) >= Math.min(worst(WARM), 30), `${name}: clear ${worst(CLEAR).toFixed(1)} vs warm ${worst(WARM).toFixed(1)}`);
  }
});

test("both palettes paint every mark, the warm one exactly as board.js draws them", () => {
  const keys = Object.keys(WARM).sort();
  assert.deepEqual(Object.keys(CLEAR).sort(), keys);
  for (const [a, b] of MEET) assert.ok(keys.includes(a) && keys.includes(b), a + "/" + b);
  const board = read("web/board.js");
  for (const k of ["steps", "dots", "caps", "gifts", "slams", "risk", "may"]) assert.ok(board.includes("0x" + WARM[k].toString(16).padStart(6, "0")), k + " drawn warm by default");
  assert.match(board, /setMarks/); assert.match(board, /userData\.inner/);
});

test("the setting: off by default, the palette and the second ring follow it, and its words", () => {
  assert.equal(clearOn(prefs(null)), false); assert.equal(clearOn(prefs("0")), false); assert.equal(clearOn(prefs("1")), true); assert.equal(clearOn(null), false);
  assert.equal(marksPalette(false), WARM); assert.equal(marksPalette(true), CLEAR);
  assert.equal(doubleCaps(false), false); assert.equal(doubleCaps(true), true);
  assert.match(clearNote(true), /blue/); assert.match(clearNote(false), /colour-blind/);
  for (const on of [true, false]) { const fr = translate(clearNote(on), "fr"); assert.notEqual(fr, clearNote(on), "French: " + clearNote(on)); }
  assert.equal(translate("Clear marks", "fr"), "Repères bien distincts");
  const html = read("web/index.html");
  assert.match(html, /data-set="clear" aria-checked="false"/, "Settings → Board has the switch, off");
  assert.match(read("web/sw.js"), /'\.\/clearmarks\.js'/, "the offline copy carries it");
});
