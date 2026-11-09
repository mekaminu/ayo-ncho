// Never the same puzzle twice (idea 9 Nov, night): every daily puzzle from the week's ramp (9 Nov 2026) to the end of 2030, in
// both games, sets pits no earlier day set, at the week's level, solvable by its answer — and the table of days dealt again
// (engine/puzzle.js REROLLS) is exactly what tools/puzzle-years.js gives, so the phone, the server and the reminder agree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyPuzzle, weekLevel, attempt, bestCapture, rate, REROLLS, REROLLS_UNTIL, WEEKLY_FROM, rerollOf } from "../engine/puzzle.js";
import { totalSeeds, TOTAL_SEEDS } from "../engine/ayo.js";
import { dealYears, daysBetween, tableSource } from "../tools/puzzle-years.js";

test("the table is what the years give (run node tools/puzzle-years.js after any change to the engine or the puzzle)", () => {
  const { table, report } = dealYears();
  assert.equal(tableSource(table), tableSource({ ncho: REROLLS.ncho, ayo: REROLLS.ayo }));
  for (const v of ["ncho", "ayo"]) { assert.equal(report[v].repeats, 0, v); assert.equal(report[v].offLevel, 0, v); }
  assert.ok(report.ncho.repeatsLeftAlone > 0, "the repeats this fixes are real");
});

test("every day to the end of 2030, both games: new pits, the week's level, solvable, a real position", () => {
  for (const variant of ["ncho", "ayo"]) {
    const seen = new Map();
    for (const key of daysBetween(WEEKLY_FROM, REROLLS_UNTIL)) {
      const p = dailyPuzzle(key, variant); const sig = p.state.pits.join(",");
      assert.ok(!seen.has(sig), `${variant} ${key} sets the same pits as ${seen.get(sig)}`); seen.set(sig, key);
      assert.equal(p.weekly, true); assert.equal(p.level, weekLevel(key), `${variant} ${key}`);
      assert.equal(p.state.turn, 0); assert.equal(totalSeeds(p.state), TOTAL_SEEDS);
      assert.equal(bestCapture(p.state).seeds, p.target); assert.ok(attempt(p, p.answer).hit, `${variant} ${key}`);
    }
  }
});

test("today and every day before keep the puzzle they had; days after the table are dealt as they always were", () => {
  for (const v of ["ncho", "ayo"]) for (const k of Object.keys(REROLLS[v])) assert.ok(k > "2026-11-09" && k <= REROLLS_UNTIL, k);
  assert.equal(rerollOf("2026-11-09", "ncho"), 0); assert.equal(rerollOf("2031-01-05", "ncho"), 0);
  assert.equal(rerollOf("2027-12-20", "ncho") > 0, true, "13 and 20 Dec 2027 were the same pits a week apart");
  const a = dailyPuzzle("2027-12-13", "ncho"), b = dailyPuzzle("2027-12-20", "ncho");
  assert.notEqual(a.state.pits.join(","), b.state.pits.join(",")); assert.equal(rate(b.state).level, b.level);
});
