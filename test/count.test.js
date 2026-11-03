// Count a pit by touch: the pace, the plan, when a press counts, and the words — checked against the engine's own counts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HOLD_MS, HOLD_SLOP, countPace, countPlan, canCount, stillHolding, countWords } from "../web/count.js";
import { newGame, legalMoves, applyMove } from "../engine/ayo.js";

test("a steady finger: never slower than 130 ms a seed, never faster than 45, the whole count short", () => {
  assert.equal(countPace(0), 0);
  assert.equal(countPace(4), 130);
  for (let n = 1; n <= 48; n++) {
    const p = countPace(n); assert.ok(p >= 45 && p <= 130, `${n}: ${p}`);
    assert.ok(p * (n - 1) <= 2200, `${n} seeds count in ${p * (n - 1)} ms`);
    if (n > 1) assert.ok(p <= countPace(n - 1), "a bigger pit is never counted slower");
  }
});

test("the plan: one touch per seed, evenly spaced; all at once under reduced motion", () => {
  assert.deepEqual(countPlan(4), [0, 130, 260, 390]);
  assert.deepEqual(countPlan(0), []);
  assert.deepEqual(countPlan(3, { reduce: true }), [0, 0, 0]);
  const p = countPlan(20); assert.equal(p.length, 20); for (let k = 1; k < 20; k++) assert.equal(p[k] - p[k - 1], countPace(20));
});

test("a press counts only on the board at rest, with one finger", () => {
  assert.equal(canCount({}), true);
  assert.equal(canCount({ screen: true }), false, "Home, Settings, Rooms");
  assert.equal(canCount({ clipping: true }), false);
  assert.equal(canCount({ playing: true }), false, "a turn on the board: a tap hurries it instead");
  assert.equal(canCount({ replaying: true }), false);
  assert.equal(canCount({ fingers: 2 }), false, "a pinch zooms");
  assert.ok(HOLD_MS >= 350 && HOLD_MS <= 700, "longer than a tap, short enough not to feel stuck");
  assert.equal(stillHolding(3, 4), true); assert.equal(stillHolding(HOLD_SLOP, 1), false, "past the slop it is a drag");
});

test("the words, from either seat", () => {
  const s = newGame("ncho");
  assert.equal(countWords({ state: s, pit: 2 }), "your pit 3 · 4 seeds");
  assert.equal(countWords({ state: s, pit: 7 }), "their pit 2 · 4 seeds");
  assert.equal(countWords({ state: s, pit: 8, you: 1 }), "your pit 3 · 4 seeds", "at the far seat your pits are still 1–6");
  const e = { ...s, pits: [0, 1, 11, 12, 20, 0, 0, 0, 0, 0, 0, 4] };
  assert.equal(countWords({ state: e, pit: 0 }), "your pit 1 is empty");
  assert.equal(countWords({ state: e, pit: 1 }), "your pit 2 · 1 seed");
  assert.equal(countWords({ state: e, pit: 2 }), "your pit 3 · 11 seeds · reaches every other pit");
  assert.equal(countWords({ state: e, pit: 3 }), "your pit 4 · 12 seeds · goes right round the board, past its own pit");
  assert.match(countWords({ state: e, pit: 4 }), /^your pit 5 · 20 seeds · goes right round/);
});

test("over random games the words always carry the engine's count", () => {
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const v of ["ncho", "ayo"]) for (let g = 0; g < 25; g++) {
    let s = newGame(v);
    while (!s.over) {
      for (let pit = 0; pit < 12; pit++) {
        const w = countWords({ state: s, pit, you: g % 2 }), n = s.pits[pit];
        assert.ok(n === 0 ? w.endsWith(" is empty") : w.includes(` · ${n} seed${n === 1 ? "" : "s"}`), w);
        assert.equal(countPlan(n).length, n);
      }
      const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state;
    }
  }
});
