// Left hand (idea 7 Nov): Settings → Feel → Hand mirrors the side layout on wide screens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HANDS, handPref, handNow, mirrored, wideRoom, handNote, handToast } from "../web/hand.js";
import { FR } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("the choice: right unless left is chosen; ?hand= wins for a visit", () => {
  assert.deepEqual(HANDS, ["right", "left"]);
  assert.equal(handPref("left"), "left");
  for (const v of ["right", "", null, undefined, "LEFT", "both"]) assert.equal(handPref(v), "right");
  assert.equal(handNow("left", null), "left");
  assert.equal(handNow("right", "left"), "left");
  assert.equal(handNow("left", "right"), "right");
  assert.equal(handNow("left", "nonsense"), "left", "a stray parameter keeps the saved choice");
});

test("mirrored only on a wide screen that is not the Fold half folded", () => {
  assert.equal(mirrored("left", { wide: true, table: null }), true);
  assert.equal(mirrored("left", { wide: false, table: null }), false, "the tall phone: buttons along the bottom");
  assert.equal(mirrored("left", { wide: true, table: { top: 340, bottom: 350 } }), false, "half folded: buttons across the crease");
  assert.equal(mirrored("right", { wide: true, table: null }), false);
});

test("the board's room sits between the cards and the buttons, either way round", () => {
  const w = 832, top = 24;
  // right hand (as before): cards 0..300 on the left, buttons 770..832 on the right
  assert.deepEqual(wideRoom("right", { cards: { left: 24, right: 300 }, bar: { left: 770, right: 832 }, w, top }), { l: 316, r: 754, t: 64 });
  // left hand: buttons 0..62 on the left, cards 532..808 on the right
  const L = wideRoom("left", { cards: { left: 532, right: 808 }, bar: { left: 0, right: 62 }, w, top });
  assert.deepEqual(L, { l: 78, r: 516, t: 64 });
  assert.equal(L.r - L.l, 754 - 316, "the same room, mirrored");
});

test("the words, in English and French", () => {
  assert.match(handNote("left"), /buttons down the left/);
  assert.match(handNote("right"), /buttons down the right/);
  for (const s of [handNote("left"), handNote("right"), handToast("left"), handToast("right"), "Hand", "Right", "Left"]) assert.ok(FR[s], `French for "${s}"`);
});

test("wired: Settings → Feel has the switch, the page mirrors under html.lefty, the shell caches hand.js", () => {
  const html = read("web/index.html"), game = read("web/game.js"), sw = read("web/sw.js");
  assert.match(html, /data-set="hand"[^>]*><button class="segbtn" data-v="right">Right<\/button><button class="segbtn" data-v="left">Left<\/button>/);
  assert.match(html, /html\.lefty \.bar\{right:auto;left:0/);
  assert.match(html, /html\.lefty \.hud\{left:auto;right:0/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{html\.handswap/);
  assert.match(game, /classList\.toggle\('lefty', mirrored\(HAND/);
  assert.match(game, /name === 'hand'/);
  assert.ok(sw.includes("'./hand.js'"));
});
