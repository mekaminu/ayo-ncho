import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, resign } from "../engine/ayo.js";
import { winWave, waveOrder, hopAt, waveLength, lampAt, notes, WAVE_MS, HOP_MS, SETTLE_MS, HOP, DRAW_HOP, LAMP } from "../web/winwave.js";

function rng(seed) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
function ends(variant, n, seed) {
  const r = rng(seed); const out = [];
  for (let g = 0; g < n; g++) {
    let s = newGame(variant);
    while (!s.over && s.moves.length < 400) { const l = legalMoves(s); s = applyMove(s, l[Math.floor(r() * l.length)]).state; }
    if (s.over) out.push(s);
  }
  return out;
}

test("over 160 random games of both kinds, the winner's trough answers, from either seat", () => {
  let wins = 0, draws = 0;
  for (const variant of ["ncho", "ayo"]) for (const s of ends(variant, 80, variant === "ncho" ? 3 : 11)) {
    for (const near of [0, 1]) {
      const w = winWave(s, near);
      if (s.winner === "draw") { draws++; assert.deepEqual(w.troughs, [near, 1 - near]); assert.equal(w.kind, "draw"); assert.equal(w.hop, DRAW_HOP); continue; }
      wins++; assert.deepEqual(w.troughs, [s.winner]); assert.ok(s.stores[s.winner] > 0);
      assert.equal(w.kind, s.winner === near ? "win" : "lose"); assert.equal(w.hop, HOP);
      assert.equal(winWave(s, near, { local: true }).kind, "win", "two of us: a win at this board whoever won");
    }
  }
  assert.ok(wins > 100, wins);
});

test("nothing before the end, in the puzzle, a replay, or a game given up", () => {
  const s = newGame("ncho"); assert.equal(winWave(s), null); assert.equal(winWave(null), null);
  const [end] = ends("ncho", 1, 5);
  assert.equal(winWave(end, 0, { puzzle: true }), null); assert.equal(winWave(end, 0, { replaying: true }), null);
  const gave = resign(applyMove(s, legalMoves(s)[0]).state, 1).state;
  assert.ok(gave.over && gave.resigned === 1); assert.equal(winWave(gave, 0), null);
});

test("the wave runs along the trough from the end the winner starts sowing, spread over the time", () => {
  const xs = [0.05, -0.1, 0.12, 0, -0.03];
  const o = waveOrder(xs, true); assert.deepEqual(o.map((p) => xs[p.i]), [-0.1, -0.03, 0, 0.05, 0.12]);
  assert.equal(o[0].at, 0); assert.ok(o.every((p, k) => k === 0 || p.at > o[k - 1].at));
  assert.deepEqual(waveOrder(xs, false).map((p) => xs[p.i]), [0.12, 0.05, 0, -0.03, -0.1]);
  const many = waveOrder(Array.from({ length: 40 }, (_, i) => Math.sin(i)), true); assert.equal(many[many.length - 1].at, WAVE_MS);
  assert.equal(o[o.length - 1].at, 5 * 45, "a few seeds do not spread out over the whole time");
  assert.deepEqual(waveOrder([0.2], true), [{ i: 0, at: 0 }]); assert.deepEqual(waveOrder([]), []);
  assert.deepEqual(new Set(many.map((p) => p.i)).size, 40, "every seed jumps once");
});

test("a hop goes up and comes down where it was", () => {
  assert.equal(hopAt(0), 0); assert.equal(hopAt(HOP_MS), 0); assert.equal(hopAt(-5), 0);
  let top = 0; for (let t = 0; t < HOP_MS; t += 5) { const h = hopAt(t); assert.ok(h >= 0 && h <= HOP + 1e-9); top = Math.max(top, h); }
  assert.ok(top > HOP * 0.95); assert.ok(hopAt(HOP_MS * 0.9) < HOP * 0.2, "the little bounce at the end is small");
});

test("the length of the moment, the lamp, and the notes", () => {
  assert.equal(waveLength([0]), 0); assert.equal(waveLength([30]), WAVE_MS + HOP_MS + SETTLE_MS);
  assert.equal(waveLength([24, 24]), 2 * (WAVE_MS + HOP_MS) + SETTLE_MS, "a draw: one trough after the other");
  assert.ok(waveLength([48]) < 2000, "about a second and a half");
  const T = 1500; assert.equal(lampAt(0, T), 1); assert.equal(lampAt(T, T), 1); assert.ok(Math.abs(lampAt(T / 2, T) - (1 + LAMP)) < 1e-9);
  const up = notes("win"); assert.ok(up.every((p, k) => k === 0 || p > up[k - 1]), "a win rises");
  const down = notes("lose"); assert.ok(down.every((p, k) => k === 0 || p < down[k - 1]), "a loss falls"); assert.ok(down[0] < up[up.length - 1]);
  assert.deepEqual(notes("draw"), [1.2, 1.2]);
});

test("the page plays it before the card, and the app shell carries it", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.equal((g.match(/await winMoment\(\); (return )?gameOver\(\)/g) || []).length, 2, "after your move (or theirs) and after a friend's");
  assert.ok(g.includes("from './winwave.js'"));
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"); assert.ok(sw.includes("'./winwave.js'"));
  const b = readFileSync(new URL("../web/board.js", import.meta.url), "utf8"); assert.ok(/return \{ key, rim, fill \}/.test(b));
});
