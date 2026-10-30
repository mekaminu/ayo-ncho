import { test } from "node:test";
import assert from "node:assert/strict";
import { HURRY, hurried, squeeze, longTurn, canHurry, hurryWords } from "../web/hurry.js";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";

test("hurried waits and tweens run HURRY times faster, never below a frame and never reordered", () => {
  assert.equal(hurried(150, false), 150);
  assert.equal(hurried(150, true), Math.round(150 / HURRY));
  assert.equal(hurried(0, true), 0);
  assert.equal(hurried(10, true), 8);
  const paces = [45, 90, 120, 150, 230, 400];
  const fast = paces.map((ms) => hurried(ms, true));
  for (let i = 1; i < fast.length; i++) assert.ok(fast[i] >= fast[i - 1], "a longer wait stays at least as long");
});

test("a tween already in flight carries on from where it was, with what is left squeezed", () => {
  const tw = { t0: 1000, ms: 500 };
  const ms = squeeze(tw, 1200); // 200 done, 300 left -> 60 left
  assert.equal(ms, 200 + 300 / HURRY);
  // the seed moves on from about where it was (eased tweens jump a little forward) and finishes sooner
  assert.ok(ms < tw.ms && ms > 200);
  assert.equal(squeeze({ t0: 0, ms: 100 }, 500), 100, "a finished tween is left alone");
});

test("long turns (relays, a dozen seeds, a big capture) get the words; quiet turns do not", () => {
  assert.equal(longTurn([]), false);
  assert.equal(longTurn([{ type: "pickup", pit: 0 }, ...Array(4).fill({ type: "drop" })]), false);
  assert.equal(longTurn([{ type: "pickup", pit: 0 }, ...Array(12).fill({ type: "drop" })]), true);
  assert.equal(longTurn([{ type: "pickup", pit: 0 }, { type: "drop" }, { type: "pickup", pit: 1, relay: true }]), true);
  assert.equal(longTurn([{ type: "pickup" }, ...Array(8).fill({ type: "drop" }), { type: "capture", pits: [3], by: 0 }]), true);
  // a real Ayo opening (4 seeds, one lap, no capture) is a quiet turn
  assert.equal(longTurn(applyMove(newGame("ayo"), 0).events), false);
});

test("longTurn reads every real turn without throwing, and every relay turn is long", () => {
  for (const v of ["ncho", "ayo"]) {
    let s = newGame(v); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < 200 && !s.over; n++) {
      const legal = legalMoves(s); const r = applyMove(s, legal[Math.floor(rnd() * legal.length)]);
      const relay = r.events.some((e) => e.type === "pickup" && e.relay);
      if (relay) assert.equal(longTurn(r.events), true);
      s = r.state;
    }
  }
});

test("a tap hurries only while a turn plays, not over a clip or a screen, and once per turn", () => {
  assert.equal(canHurry({ animating: true }), true);
  assert.equal(canHurry({}), false);
  assert.equal(canHurry({ animating: true, clipping: true }), false);
  assert.equal(canHurry({ animating: true, screen: true }), false);
  assert.equal(canHurry({ animating: true, already: true }), false);
});

test("the words under the board", () => {
  assert.equal(hurryWords(""), "tap the board to hurry");
  assert.equal(hurryWords("", { keys: true }), "click the board or press Space to hurry");
  assert.equal(hurryWords("Nnamdi's move again, slowly"), "Nnamdi's move again, slowly · tap the board to hurry");
  assert.equal(hurryWords("x", { on: true }), "x · hurrying…");
});
