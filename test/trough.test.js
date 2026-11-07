// Count a trough by touch (idea 7 Nov): the words, where a finger finds a trough, and over random games the count is the engine's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { troughWords, troughAt, troughName, isTrough, countOf, countPlan } from "../web/count.js";
import { translate } from "../web/i18n.js";
import { newGame, legalMoves, applyMove, WIN_SEEDS, TOTAL_SEEDS } from "../engine/ayo.js";
import { storeCenters, STORE_RX, STORE_RZ, pitCenters } from "../web/board.js";

test("the words: the count and how many more that side needs", () => {
  assert.equal(troughWords({ stores: [18, 9], side: 0 }), "your trough · 18 seeds · 7 more to win");
  assert.equal(troughWords({ stores: [18, 9], side: 1 }), "their trough · 9 seeds · 16 more to win");
  assert.equal(troughWords({ stores: [0, 0], side: 1 }), "their trough is empty · 25 more to win");
  assert.equal(troughWords({ stores: [1, 0], side: 0 }), "your trough · 1 seed · 24 more to win");
  assert.equal(troughWords({ stores: [26, 10], side: 0 }), "your trough · 26 seeds · 25 reached");
  assert.equal(troughWords({ stores: [20, 24], side: 0 }), "your trough · 20 seeds · 25 is out of reach", "24 + 25 > 48");
  assert.equal(troughWords({ stores: [24, 24], side: 1 }), "their trough · 24 seeds · 25 is out of reach");
  assert.equal(troughWords({ stores: [3, 2], side: 0, total: 16 }), "your trough · 3 seeds · 25 is out of reach", "the lesson's small board");
});

test("from the far seat the names turn round", () => {
  assert.equal(troughName(1, 1), "your trough"); assert.equal(troughName(0, 1), "their trough");
  assert.match(troughWords({ stores: [5, 12], side: 1, you: 1 }), /^your trough · 12 seeds/);
});

test("a finger finds a trough only inside its cup, never on a pit", () => {
  const g = { centers: storeCenters, rx: STORE_RX, rz: STORE_RZ };
  assert.equal(troughAt(storeCenters[0][0], storeCenters[0][1], g), "S0");
  assert.equal(troughAt(storeCenters[1][0] + STORE_RX * 0.9, storeCenters[1][1], g), "S1");
  assert.equal(troughAt(0, 0, g), null, "the middle of the board");
  for (const [x, z] of pitCenters) assert.equal(troughAt(x, z, g), null, `pit at ${x},${z}`);
  assert.ok(isTrough("S0") && isTrough("S1") && !isTrough(3) && !isTrough("S2"));
});

test("over random games the trough words carry the engine's store, and the count plan has one touch a seed", () => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const v of ["ncho", "ayo"]) for (let g = 0; g < 25; g++) {
    let s = newGame(v);
    for (;;) {
      for (const side of [0, 1]) {
        const n = countOf(s, "S" + side), w = troughWords({ stores: s.stores, side, you: g % 2 });
        assert.equal(n, s.stores[side]);
        assert.ok(n === 0 ? w.includes(" is empty") : w.includes(` · ${n} seed${n === 1 ? "" : "s"} · `), w);
        const need = WIN_SEEDS - n;
        if (need > 0 && TOTAL_SEEDS - s.stores[1 - side] >= WIN_SEEDS) assert.ok(w.endsWith(`${need} more to win`), w);
        assert.equal(countPlan(n).length, n);
        const f = translate(w, "fr"); assert.notEqual(f, w); assert.ok(!/\b(trough|seeds?|more|win|your|their|reached|reach|empty)\b/.test(f), f);
      }
      if (s.over) break;
      const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state;
    }
  }
});

test("French", () => {
  assert.equal(translate("your trough · 18 seeds · 7 more to win", "fr"), "votre réserve · 18 graines · encore 7 pour gagner");
  assert.equal(translate("their trough is empty · 25 more to win", "fr"), "la réserve d’en face est vide · encore 25 pour gagner");
  assert.equal(translate("your trough · 20 seeds · 25 is out of reach", "fr"), "votre réserve · 20 graines · 25 n’est plus atteignable");
});
