// The week gets harder (idea 7 Nov): from Mon 9 Nov 2026 the daily puzzle is gentle on Monday and Tuesday, steady on
// Wednesday and Thursday, tricky on Friday and Saturday and hard on Sunday; the days before keep the puzzle they had.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyPuzzle, attempt, shareText, rate, weekLevel, levelWord, WEEKLY_FROM, LEVEL_WORDS, bestCapture } from "../engine/puzzle.js";
import { legalMoves, totalSeeds, TOTAL_SEEDS, applyMove } from "../engine/ayo.js";
import { dayLine, levelSeeds } from "../web/daily.js";
import { translate } from "../web/i18n.js";

const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const days = (from, n) => { const [y, m, d] = from.split("-").map(Number); return Array.from({ length: n }, (_, i) => keyOf(new Date(y, m - 1, d + i))); };

// What the puzzle was on these days before the week's ramp: pits | stores | target | answer (taken from the generator as it was).
const BEFORE = {"2026-10-01:ncho":"1,3,1,2,13,3,2,1,0,3,0,3|8,8|12|1","2026-10-07:ncho":"11,0,3,1,0,2,9,2,1,0,1,2|8,8|12|5","2026-10-13:ncho":"2,3,2,1,0,3,0,1,1,1,2,12|4,16|8|0","2026-10-19:ncho":"0,1,3,0,0,12,2,0,1,1,11,1|4,12|8|5","2026-10-25:ncho":"0,0,1,0,1,3,1,1,3,2,0,0|24,12|4|4","2026-10-31:ncho":"11,2,1,1,2,3,11,1,2,0,0,2|4,8|12|0","2026-11-06:ncho":"0,1,12,1,2,2,0,0,0,0,2,0|8,20|12|2","2026-10-01:ayo":"3,5,6,1,1,2,2,15,0,3,2,2|2,4|3|1","2026-10-07:ayo":"3,1,1,17,1,2,0,0,1,0,4,4|2,12|9|3","2026-10-13:ayo":"9,2,8,0,0,0,9,0,1,2,4,10|0,3|5|0","2026-10-19:ayo":"1,2,5,9,2,10,2,2,5,0,1,2|5,2|6|2","2026-10-25:ayo":"3,11,5,0,8,4,2,2,3,0,3,1|0,6|6|2","2026-10-31:ayo":"9,2,2,1,0,9,7,7,2,2,7,0|0,0|6|0","2026-11-06:ayo":"0,1,1,8,2,11,9,8,0,1,2,1|0,4|7|3"};

test("the days before the ramp keep the puzzle they always had, and say no level", () => {
  for (const [k, want] of Object.entries(BEFORE)) {
    const [key, variant] = k.split(":"); const p = dailyPuzzle(key, variant);
    assert.equal(`${p.state.pits.join(",")}|${p.state.stores.join(",")}|${p.target}|${p.answer}`, want, k);
    assert.equal(p.weekly, false, k); assert.equal(weekLevel(key), null, k);
  }
  assert.equal(weekLevel("2026-11-08"), null); assert.equal(WEEKLY_FROM, "2026-11-09");
});

test("the week's levels: Mon and Tue gentle, Wed and Thu steady, Fri and Sat tricky, Sun hard", () => {
  assert.deepEqual(days("2026-11-09", 7).map(weekLevel), [1, 1, 2, 2, 3, 3, 4]);
  assert.deepEqual(days("2026-11-09", 7).map((k) => levelWord(weekLevel(k))), ["gentle", "gentle", "steady", "steady", "tricky", "tricky", "hard"]);
  assert.deepEqual(LEVEL_WORDS, ["gentle", "steady", "tricky", "hard"]);
});

test("ten weeks of both games: each day is at the week's level, solvable by its answer, a real position, the same on every device", () => {
  for (const variant of ["ncho", "ayo"]) for (const key of days(WEEKLY_FROM, 70)) {
    const p = dailyPuzzle(key, variant); const again = dailyPuzzle(key, variant);
    assert.deepEqual(again.state.pits, p.state.pits, key); assert.equal(again.answer, p.answer, key);
    assert.equal(p.weekly, true); assert.equal(p.level, weekLevel(key), `${variant} ${key}: level ${p.level}`);
    assert.equal(rate(p.state).level, p.level, `${key}: the level is the position's own`);
    assert.equal(p.state.turn, 0); assert.equal(totalSeeds(p.state), TOTAL_SEEDS);
    assert.ok(p.target >= 4, `${key}: ${p.target}`); assert.equal(bestCapture(p.state).seeds, p.target, key);
    assert.ok(legalMoves(p.state).includes(p.answer)); const r = attempt(p, p.answer); assert.ok(r.hit && r.got === p.target, key);
  }
});

test("harder days are harder: fewer pits do it, more tempt, on average", () => {
  for (const variant of ["ncho", "ayo"]) {
    const by = { 1: [], 4: [] };
    for (const key of days(WEEKLY_FROM, 70)) { const p = dailyPuzzle(key, variant); if (by[p.level]) by[p.level].push(rate(p.state)); }
    const avg = (xs, f) => xs.reduce((a, x) => a + f(x), 0) / xs.length;
    assert.ok(avg(by[4], (x) => x.score) > avg(by[1], (x) => x.score) + 2, variant);
    assert.ok(avg(by[4], (x) => x.solvers) <= avg(by[1], (x) => x.solvers), variant);
  }
});

test("rate reads the position: a pit that is the only answer, decoys and relays count", () => {
  const p = dailyPuzzle("2026-11-15", "ncho"); const r = rate(p.state);
  const outs = legalMoves(p.state).map((m) => applyMove(p.state, m).state.stores[0] - p.state.stores[0]);
  assert.equal(r.solvers, outs.filter((g) => g >= p.target).length); assert.equal(r.decoys, outs.filter((g) => g > 0 && g < p.target).length);
  assert.ok(r.score >= 7.5 && r.level === 4);
});

test("the words: the card's top line, the four seeds, the share line — and in French", () => {
  const before = dailyPuzzle("2026-11-07", "ncho"), mon = dailyPuzzle("2026-11-09", "ncho"), sun = dailyPuzzle("2026-11-15", "ayo");
  assert.equal(dayLine(before), "Daily puzzle · Sat 7 Nov"); assert.equal(dayLine(mon), "Daily puzzle · Mon 9 Nov · gentle"); assert.equal(dayLine(sun), "Daily puzzle · Sun 15 Nov · hard");
  assert.deepEqual(levelSeeds(before), { lit: 0, of: 4, label: "" }); assert.deepEqual(levelSeeds(mon), { lit: 1, of: 4, label: "gentle · 1 of 4" });
  assert.match(shareText(mon, 4), /^Ayo & Nchò daily · 2026-11-09 · gentle · captured 4\/\d+\n/); assert.doesNotMatch(shareText(before, 4), /gentle|steady|tricky|hard/);
  const fr = (s) => translate(s, "fr");
  assert.equal(fr("Daily puzzle · Mon 9 Nov · gentle"), "Énigme du jour · lun. 9 nov. · douce".replace("lun. 9 nov.", fr("Daily puzzle · Mon 9 Nov").split(" · ")[1]));
  assert.match(fr("Daily puzzle · Sun 15 Nov · hard"), /^Énigme du jour · .+ · corsée$/); assert.match(fr("Daily puzzle · Fri 13 Nov · tricky"), /rusée$/);
  assert.equal(fr("steady · 2 of 4"), "posée · 2 sur 4");
  const line = shareText(sun, 2).split("\n")[0]; assert.match(fr(line), /corsée/); assert.notEqual(fr(line), line);
});
