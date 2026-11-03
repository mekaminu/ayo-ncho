// Undo against the computer and two of us: the seeds fly back rather than jump (web/takeback.js undoPlan / undoWords,
// with planReturn saying which seed goes where — the same flight a friend's yes uses).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";
import { planReturn, undoPlan, undoWords } from "../web/takeback.js";
import { undoTo } from "../web/local.js";

const seeded = (seed = 3) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const counts = (s) => { const c = {}; s.pits.forEach((n, i) => { c[i] = n; }); c.S0 = s.stores[0]; c.S1 = s.stores[1]; return c; };

test("which moves Undo takes back: yours and the reply against the computer, one for two of us, never her opening alone", () => {
  assert.equal(undoPlan({ moves: [], turn: 0, you: 0 }), null);
  assert.equal(undoPlan({ moves: [8], turn: 0, you: 0 }), null, "her opening stays");
  assert.deepEqual(undoPlan({ moves: [2, 9], turn: 0, you: 0 }), { keep: [], played: 2, gone: 2 });
  assert.deepEqual(undoPlan({ moves: [8, 2, 9], turn: 0, you: 0 }), { keep: [8], played: 2, gone: 2 });
  assert.deepEqual(undoPlan({ moves: [2, 9, 4], turn: 1, you: 0 }), { keep: [2, 9], played: 4, gone: 1 }, "her reply not on the board yet");
  assert.equal(undoPlan({ moves: [], turn: 0, local: true }), null);
  assert.deepEqual(undoPlan({ moves: [2, 9], turn: 0, you: 1, local: true }), { keep: [2], played: 9, gone: 1 });
  const m = [1, 7, 3, 10]; assert.deepEqual(undoPlan({ moves: m, turn: 0, local: true }).keep, undoTo(m), "the same as two of us has always undone");
});

test("over random games the seeds' return lands every seed exactly where the position before was, into the pit played", () => {
  const rnd = seeded(21); let checked = 0;
  for (let g = 0; g < 160; g++) {
    const variant = g % 2 ? "ayo" : "ncho", local = g % 4 >= 2, first = g % 3 === 0 ? 1 : 0;
    let s = newGame(variant, {}, first); const n = 2 + Math.floor(rnd() * 50);
    for (let i = 0; i < n && !s.over; i++) { const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state; }
    const u = undoPlan({ moves: s.moves, turn: s.turn, you: 0, local }); if (!u) continue;
    const back = replay(u.keep, variant, {}, first);
    const plan = planReturn(s, back, u.played); const c = counts(s), want = counts(back);
    for (const p of plan) { assert.ok(c[p.from] > 0); c[p.from] -= 1; c[p.to] += 1; }
    assert.deepEqual(c, want, "the counts come out as the engine's position before");
    const keys = plan.map((p) => p.from + ":" + p.fromSlot); assert.equal(new Set(keys).size, keys.length, "no seed leaves twice");
    if (plan.length && want[u.played] > counts(s)[u.played]) assert.equal(plan[0].to, u.played, "the first seed back goes into the pit played");
    const fromStore = plan.findIndex((p) => typeof p.from === "string"), fromPit = plan.findIndex((p) => typeof p.from === "number");
    if (fromStore >= 0 && fromPit >= 0) assert.ok(fromStore < fromPit, "the troughs give theirs back first");
    checked++;
  }
  assert.ok(checked > 100, "enough games checked: " + checked);
});

test("what the hint line says while the seeds go back", () => {
  assert.equal(undoWords({ gone: 2, name: "Mama Ngozi" }), "Taking back your move and Mama Ngozi's reply");
  assert.equal(undoWords({ gone: 1, name: "Nnamdi" }), "Taking back your move");
  assert.equal(undoWords({ local: true, mover: "Player 2" }), "Taking back Player 2's move");
});
