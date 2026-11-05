// Weighing it up: while the computer thinks, its hand hovers over a pit or two of its own (web/ponder.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, owner } from "../engine/ayo.js";
import { ponderOn, ponderPlan, ponderAt, ponderLength, GLANCES, GLANCE_MS, SETTLE_MS, OPACITY, seedOf } from "../web/ponder.js";

function randomGames(variant, n, fn) {
  let x = 7;
  const r = () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; };
  for (let g = 0; g < n; g++) {
    let s = newGame(variant, {}, g % 2);
    while (!s.over) { fn(s); const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(r() * legal.length)]).state; }
  }
}

test("the glances are always pits the engine lets the mover play, distinct, as many as the opponent weighs", () => {
  let positions = 0;
  for (const v of ["ncho", "ayo"]) randomGames(v, 60, (s) => {
    const legal = legalMoves(s);
    for (const lv of Object.keys(GLANCES)) {
      const plan = ponderPlan(s, lv);
      if (legal.length < 2) { assert.deepEqual(plan, [], "one move: nothing to weigh"); continue; }
      assert.equal(plan.length, Math.min(GLANCES[lv], legal.length));
      assert.equal(new Set(plan).size, plan.length, "never the same pit twice");
      for (const p of plan) { assert.ok(legal.includes(p), "a pit it may play"); assert.equal(owner(p), s.turn, "its own pit"); }
      assert.deepEqual(ponderPlan(s, lv), plan, "the same position glances the same way");
    }
    positions++;
  });
  assert.ok(positions > 2000);
});

test("the child barely looks, the elders count", () => {
  assert.ok(GLANCES.easy < GLANCES.medium && GLANCES.medium < GLANCES.hard && GLANCES.hard <= GLANCES.master);
  assert.equal(GLANCES.steady, 2);
  const s = newGame("ncho", {}, 1);
  assert.equal(ponderPlan(s, "easy").length, 1); assert.equal(ponderPlan(s, "master").length, 3);
  assert.equal(ponderPlan(s, "nobody").length, 2, "an unknown level weighs two");
  // the most it adds before the move: under a second even for Papa Ike
  assert.ok(ponderLength(ponderPlan(s, "master")) < 1100); assert.equal(ponderLength([]), 0);
});

test("different positions glance differently", () => {
  const firsts = new Set();
  randomGames("ncho", 10, (s) => { const p = ponderPlan(s, "hard"); if (p.length) firsts.add(p.join(",")); });
  assert.ok(firsts.size > 20);
  const a = newGame("ncho"), b = applyMove(newGame("ncho"), 2).state; assert.notEqual(seedOf(a), seedOf(b));
});

test("when the hand hovers", () => {
  const s = newGame("ncho", {}, 1); const base = { computer: true, state: s };
  assert.equal(ponderOn(base), true);
  for (const k of ["puzzle", "lesson", "replay", "clip", "reduced"]) assert.equal(ponderOn({ ...base, [k]: true }), false, k);
  assert.equal(ponderOn({ ...base, computer: false }), false, "two of us or a room");
  assert.equal(ponderOn({ computer: true }), false); assert.equal(ponderOn(null), false);
  assert.equal(ponderOn({ ...base, state: { ...s, over: true } }), false, "the game over");
  // a position with one move: nothing to weigh
  let one = null; randomGames("ncho", 80, (t) => { if (!one && legalMoves(t).length === 1) one = t; });
  assert.ok(one, "a position with one move exists"); assert.equal(ponderOn({ ...base, state: one }), false);
});

test("the light: fades in on the first pit, holds on each, settles on the pit it plays", () => {
  const plan = [8, 10, 6];
  assert.deepEqual(ponderAt(plan, -5), { pit: -1, op: 0 }); assert.deepEqual(ponderAt([], 100), { pit: -1, op: 0 });
  assert.equal(ponderAt(plan, 0).pit, 8); assert.equal(ponderAt(plan, 0).op, 0);
  assert.equal(ponderAt(plan, 45).op, OPACITY / 2); assert.equal(ponderAt(plan, 200).op, OPACITY);
  assert.equal(ponderAt(plan, GLANCE_MS + 1).pit, 10); assert.equal(ponderAt(plan, 2 * GLANCE_MS + 1).pit, 6);
  assert.equal(ponderAt(plan, 3 * GLANCE_MS + 10).pit, 6, "still searching: it stays on the last pit");
  assert.equal(ponderAt(plan, 3 * GLANCE_MS + 10, 11).pit, 11, "the move is known: it goes there");
  assert.ok(OPACITY < 0.45, "fainter than the mouse's ring"); assert.ok(SETTLE_MS < GLANCE_MS);
});

test("the page wires it: both places the computer picks, the conditions, the render loop, and the service worker", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/ponder\.js'/);
  assert.match(g, /from '\.\/ponder\.js'/);
  const body = g.slice(g.indexOf("async function theirPick("), g.indexOf("function ponderStep("));
  for (const need of ["!online && !local", "puzzle.on && !playingOut()", "lesson.on", "replaying", "clipping", "reduceMotion", "ponderPlan(s, level)", "Promise.all([think", "state !== s"]) assert.ok(body.includes(need), need);
  const live = g.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.equal((live.match(/await theirPick\(/g) || []).length, 2, "after a move and on the computer's opening");
  assert.ok(!/await aiMove\(state\)/.test(live), "no pick left that skips the hand");
  assert.match(live, /ponderStep\(now, \(now - last\) \/ 1000\)/);
});
