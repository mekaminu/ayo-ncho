import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { dealPlan, dealsIn, afterPlan, GAP_MS, PIT_GAP_MS, FLY_MS } from "../web/deal.js";

function rng(seed) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
function positions(variant, n, seed, toEnd) {
  const r = rng(seed); const out = [];
  for (let g = 0; g < n; g++) {
    let s = newGame(variant); const stop = toEnd ? 400 : 1 + Math.floor(r() * 50);
    while (!s.over && s.moves.length < stop) { const l = legalMoves(s); s = applyMove(s, l[Math.floor(r() * l.length)]).state; }
    out.push(s);
  }
  return out;
}
// the seeds as the board shows them at the end: the engine settles what is left in the pits into the troughs with no event
const lying = (s) => ({ pits: s.pits.slice(), stores: s.stores.slice() });
const homeSide = (h) => (typeof h === "string" ? +h[1] : h < 6 ? 0 : 1);

test("over 200 positions of both kinds, mid-game and finished, the deal ends exactly at a new game, moving the fewest seeds", () => {
  for (const variant of ["ncho", "ayo"]) for (const toEnd of [false, true]) for (const s of positions(variant, 50, variant === "ncho" ? 7 : 13, toEnd)) {
    for (const first of [0, 1]) {
      const fresh = newGame(variant, {}, first); const from = lying(s); const plan = dealPlan(from, fresh);
      assert.ok(plan, "same number of seeds");
      assert.deepEqual(afterPlan(from, plan), { pits: fresh.pits, stores: fresh.stores });
      const short = fresh.pits.reduce((a, n, i) => a + Math.max(0, n - from.pits[i]), 0);
      assert.equal(plan.moves.length, short, "only the seeds that must move do");
      // a seed never leaves a home that is short, nor lands in one with too many
      for (const m of plan.moves) { assert.ok(typeof m.from === "string" || from.pits[m.from] > fresh.pits[m.from]); assert.equal(typeof m.to, "number"); assert.ok(from.pits[m.to] < fresh.pits[m.to]); assert.equal(m.hand, homeSide(m.to)); }
    }
  }
});

test("each hand deals from its own trough first, into its own pits near to far, and only then do seeds come across", () => {
  // a finished game 30–18: the near trough fills its own six; the far trough's 18 fill four pits and a half, the near trough's 6 left finish it
  const plan = dealPlan({ pits: Array(12).fill(0), stores: [30, 18] }, newGame("ncho"));
  const near = plan.moves.filter((m) => m.hand === 0), far = plan.moves.filter((m) => m.hand === 1);
  assert.equal(near.length, 24); assert.equal(far.length, 24);
  assert.ok(near.every((m) => m.from === "S0"));
  assert.ok(far.slice(0, 18).every((m) => m.from === "S1") && far.slice(18).every((m) => m.from === "S0"), "the far side's own seeds first, then the near trough's");
  const order = (l) => l.map((m) => m.to);
  assert.deepEqual(order(near), [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]);
  assert.deepEqual(order(far).filter((v, i, a) => a.indexOf(v) === i), [6, 7, 8, 9, 10, 11], "near to far in the order it sows");
  // both hands at once: the first seed from each leaves at 0
  assert.equal(near[0].at, 0); assert.equal(far[0].at, 0);
});

test("the timing: a gap between seeds, a beat more between pits, the whole deal about a second and a half", () => {
  const plan = dealPlan({ pits: Array(12).fill(0), stores: [24, 24] }, newGame("ncho"));
  const near = plan.moves.filter((m) => m.hand === 0);
  assert.equal(near[1].at - near[0].at, GAP_MS); assert.equal(near[4].at - near[3].at, GAP_MS + PIT_GAP_MS);
  for (let k = 1; k < near.length; k++) assert.ok(near[k].at > near[k - 1].at);
  assert.equal(plan.length, 23 * GAP_MS + 5 * PIT_GAP_MS + FLY_MS);
  assert.ok(plan.length > 1000 && plan.length < 2200, plan.length);
  const sorted = plan.moves.map((m) => m.at); assert.deepEqual(sorted, sorted.slice().sort((a, b) => a - b));
});

test("nothing to deal on a board already set, and no deal for a board of another size, under reduced motion or the clip", () => {
  const fresh = newGame("ncho");
  const none = dealPlan(lying(fresh), fresh); assert.equal(none.moves.length, 0); assert.equal(dealsIn(none), false);
  assert.equal(dealPlan({ pits: Array(12).fill(2), stores: [0, 0] }, fresh), null, "the lesson's 24 seeds: laid out instead");
  const full = dealPlan({ pits: Array(12).fill(0), stores: [25, 23] }, fresh);
  assert.equal(dealsIn(full), true); assert.equal(dealsIn(full, { reduceMotion: true }), false); assert.equal(dealsIn(full, { clipping: true }), false);
  assert.equal(dealsIn(null), false);
});

test("the page deals a new game and the computer waits for it; the service worker carries the file", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/deal\.js'/);
  assert.match(g, /from '\.\/deal\.js'/);
  const body = g.slice(g.indexOf("function newRound()"), g.indexOf("function homeCounts()"));
  for (const need of ["dealPlan(homeCounts(), state, {", "dealsIn(plan, { reduceMotion, clipping })", "dealIn(plan, state)", "dealt.then(() => { if (deal.again) return; kickAi(); })", "if (deal.live) { deal.again = true; return; }"]) assert.ok(body.includes(need), need);
  const di = g.slice(g.indexOf("async function dealIn("), g.indexOf("async function dealIn(") + 3000);
  for (const need of ["busy = true", "hurry.depth++", "layoutFromState(s)", "tickScore(", "setBadge(", "land(", "deal.live = false"]) assert.ok(di.includes(need), need);
});
