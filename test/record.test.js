import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, record, outcome, standing, cardLine, remarkable, played, LEVELS } from "../web/record.js";
import { runLine, CHARACTERS, RUN_MOOD, MOODS } from "../web/characters.js";

test("wins, losses and draws are counted per opponent, and the standing reads in plain words", () => {
  let d = parse(null);
  assert.deepEqual(LEVELS, ["easy", "medium", "hard"]);
  for (const k of LEVELS) assert.equal(standing(d[k]), "", "nothing to say before the first game");
  let r = record(d, "medium", 27, 21, 1); d = r.data;
  assert.equal(r.outcome, "win"); assert.equal(r.counted, true); assert.equal(standing(d.medium), "you lead 1–0");
  r = record(d, "medium", 20, 28, 2); d = r.data; assert.equal(r.outcome, "loss"); assert.equal(standing(d.medium), "level 1–1");
  r = record(d, "medium", 24, 24, 3); d = r.data; assert.equal(r.outcome, "draw"); assert.equal(d.medium.d, 1); assert.equal(standing(d.medium), "level 1–1");
  r = record(d, "medium", 18, 30, 4); d = r.data; assert.equal(standing(d.medium), "you trail 1–2");
  assert.equal(played(d.medium), 4); assert.equal(played(d.easy), 0, "another opponent's record is untouched");
  assert.equal(outcome(25, 23), "win"); assert.equal(outcome(23, 25), "loss"); assert.equal(outcome(24, 24), "draw");
});

test("the best win is the widest margin; a tie goes to the higher score; losses never set it", () => {
  let d = parse(null);
  d = record(d, "hard", 25, 23, 1).data; assert.deepEqual(d.hard.best, [25, 23]);
  let r = record(d, "hard", 30, 18, 2); d = r.data; assert.deepEqual(d.hard.best, [30, 18]); assert.equal(r.newBest, true);
  r = record(d, "hard", 27, 21, 3); d = r.data; assert.deepEqual(d.hard.best, [30, 18]); assert.equal(r.newBest, false, "a narrower win is not a new best");
  r = record(d, "hard", 36, 24, 4); d = r.data; assert.deepEqual(d.hard.best, [36, 24], "the same margin with more seeds is the better win"); assert.equal(r.newBest, true);
  r = record(d, "hard", 10, 38, 5); d = r.data; assert.deepEqual(d.hard.best, [36, 24]); assert.equal(r.newBest, false);
  assert.equal(cardLine(d.hard), "you lead 4–1 · best win 36–24");
  assert.equal(cardLine(d.hard, true), "you lead 4–1 · new best win 36–24");
  d = record(d, "hard", 24, 24, 6).data;
  assert.equal(cardLine(d.hard), "you lead 4–1 · best win 36–24 · 1 draw");
  let e = parse(null); e = record(e, "easy", 12, 36, 1).data;
  assert.equal(cardLine(e.easy), "you trail 0–1", "no best win to show until you have won");
});

test("a run counts wins or losses in a row from your side; a draw ends it; three, five and every fifth are worth a word", () => {
  let d = parse(null); let id = 0; const play = (lvl, a, b) => { const r = record(d, lvl, a, b, ++id); d = r.data; return r; };
  let r = play("hard", 26, 22); assert.equal(d.hard.run, 1); assert.equal(r.moment, "firstWin", "the first ever win against them is a moment");
  r = play("hard", 26, 22); assert.equal(d.hard.run, 2); assert.equal(r.moment, null);
  r = play("hard", 26, 22); assert.equal(d.hard.run, 3); assert.equal(r.moment, "run");
  r = play("hard", 26, 22); assert.equal(d.hard.run, 4); assert.equal(r.moment, null);
  r = play("hard", 26, 22); assert.equal(d.hard.run, 5); assert.equal(r.moment, "run");
  r = play("hard", 20, 28); assert.equal(d.hard.run, -1, "a loss starts their run");
  r = play("hard", 20, 28); r = play("hard", 20, 28); assert.equal(d.hard.run, -3); assert.equal(r.moment, "run");
  r = play("hard", 24, 24); assert.equal(d.hard.run, 0, "a draw ends a run"); assert.equal(r.moment, null);
  for (let i = 0; i < 10; i++) r = play("easy", 30, 18);
  assert.equal(d.easy.run, 10); assert.equal(r.moment, "run");
  assert.deepEqual([1, 2, 3, 4, 5, 6, 10, 12, 15, 20].map(remarkable), [false, false, true, false, true, false, true, false, true, true]);
  assert.equal(remarkable(-3), true);
});

test("one game is counted once however many times the card is shown; storage survives garbage and old shapes", () => {
  let d = parse(null);
  let r = record(d, "easy", 30, 18, "g1"); d = r.data; assert.equal(r.counted, true);
  r = record(d, "easy", 30, 18, "g1"); d = r.data; assert.equal(r.counted, false); assert.equal(d.easy.w, 1); assert.equal(r.moment, null);
  r = record(d, "easy", 30, 18, "g2"); d = r.data; assert.equal(d.easy.w, 2);
  const back = parse(JSON.stringify(d)); assert.deepEqual(back, d, "a round trip through storage keeps everything");
  assert.equal(parse("not json").medium.w, 0);
  assert.deepEqual(parse('{"hard":{"w":"3","l":2,"best":[30]}}').hard, { w: 0, l: 2, d: 0, best: null, run: 0 }, "bad fields fall back to zero");
  assert.equal(parse('{"nobody":{"w":4}}').nobody, undefined, "unknown opponents are dropped");
  assert.equal(record(parse(null), "nobody", 25, 23).data.medium.w, 1, "an unknown level counts for the medium opponent rather than breaking");
});

test("every opponent has a word for a first win and for runs, in their own voice; quiet runs say nothing", () => {
  for (const k of LEVELS) {
    assert.ok(CHARACTERS[k].lines.firstWin.length >= 1 && CHARACTERS[k].lines.firstWin[0].length > 4);
    assert.ok(runLine(k, 3).length > 4 && runLine(k, 5).length > 4 && runLine(k, 10).includes("10"), k + " says something when you are on a run");
    assert.ok(runLine(k, -3).length > 4 && runLine(k, -5).length > 4 && runLine(k, -15).includes("15"), k + " says something when they are");
    assert.notEqual(runLine(k, 3), runLine(k, -3), "winning and losing runs sound different");
    for (const n of [0, 1, 2, 4, 6, 7, 11, -1, -4]) assert.equal(runLine(k, n), "", `${k}: no word for a run of ${n}`);
  }
  assert.equal(runLine("hard", 3), "Three in a row? Mama Ngozi is watching.");
  assert.notEqual(runLine("easy", 3), runLine("hard", 3), "each opponent has their own words");
  assert.ok(MOODS.includes(RUN_MOOD.yours) && MOODS.includes(RUN_MOOD.theirs));
});
