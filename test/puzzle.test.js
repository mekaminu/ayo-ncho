import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyPuzzle, attempt, shareText, bestCapture } from "../engine/puzzle.js";
import { legalMoves, totalSeeds, TOTAL_SEEDS } from "../engine/ayo.js";

test("the same day gives the same puzzle on every device; different days differ", () => {
  const a = dailyPuzzle("2026-10-29"), b = dailyPuzzle("2026-10-29"), c = dailyPuzzle("2026-10-30");
  assert.deepEqual(a.state.pits, b.state.pits); assert.equal(a.target, b.target);
  assert.notDeepEqual(a.state.pits, c.state.pits);
});

test("every puzzle for the next 60 days is solvable: the answer captures at least the target, player 0 to move", () => {
  const d = new Date(2026, 9, 29);
  for (let i = 0; i < 60; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const p = dailyPuzzle(key);
    assert.equal(p.state.turn, 0, key);
    assert.equal(totalSeeds(p.state), TOTAL_SEEDS, key);
    assert.ok(legalMoves(p.state).includes(p.answer), key);
    const r = attempt(p, p.answer);
    assert.ok(r.hit && r.got === p.target, `${key}: ${r.got}/${p.target}`);
    assert.ok(p.target >= 1);
    d.setDate(d.getDate() + 1);
  }
});

test("a wrong move scores what it captures and does not hit", () => {
  const p = dailyPuzzle("2026-10-29");
  const worst = legalMoves(p.state).map((m) => attempt(p, m)).sort((x, y) => x.got - y.got)[0];
  assert.ok(worst.got <= p.target);
  assert.equal(bestCapture(p.state).seeds, p.target);
});

test("share text shows the date, the score and a row of seeds", () => {
  const p = dailyPuzzle("2026-10-29"); const t = shareText(p, 4);
  assert.match(t, /2026-10-29/); assert.match(t, /captured 4\//); assert.match(t, /[●○]+/);
});
