import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, record, entry, solvedRun, cardLine, resultLabel, runLine, dayLabel } from "../web/daily.js";

test("a day keeps your best over several goes, and counts the goes", () => {
  let d = parse(null); assert.equal(entry(d, "2026-10-29", "ncho"), null); assert.equal(cardLine(null), "not yet played");
  let r = record(d, "2026-10-29", "ncho", 3, 8); d = r.data;
  assert.deepEqual(r.entry, { got: 3, target: 8, tries: 1, solved: false }); assert.equal(r.improved, true); assert.equal(r.firstSolve, false);
  assert.equal(cardLine(entry(d, "2026-10-29", "ncho")), "best 3 of 8");
  r = record(d, "2026-10-29", "ncho", 1, 8); d = r.data; assert.equal(r.improved, false); assert.equal(r.entry.got, 3); assert.equal(r.entry.tries, 2);
  r = record(d, "2026-10-29", "ncho", 8, 8); d = r.data; assert.equal(r.firstSolve, true); assert.equal(r.entry.solved, true);
  assert.equal(cardLine(entry(d, "2026-10-29", "ncho")), "solved ✓");
  r = record(d, "2026-10-29", "ncho", 8, 8); assert.equal(r.firstSolve, false, "a day is solved once");
  assert.equal(r.data.solved.length, 1);
});

test("Nchò and Ayo have their own puzzle each day; the run counts the date once", () => {
  let d = parse(null);
  d = record(d, "2026-10-29", "ncho", 8, 8).data; d = record(d, "2026-10-29", "ayo", 2, 6).data;
  assert.equal(entry(d, "2026-10-29", "ayo").solved, false); assert.equal(entry(d, "2026-10-29", "ncho").solved, true);
  assert.deepEqual(d.solved, ["2026-10-29"]);
  d = record(d, "2026-10-29", "ayo", 6, 6).data; assert.deepEqual(d.solved, ["2026-10-29"]);
});

test("days solved in a row: counts back from today, or from yesterday while today is still open; a gap ends it", () => {
  let d = parse(null); assert.equal(solvedRun(d, "2026-10-29"), 0);
  for (const k of ["2026-10-27", "2026-10-28", "2026-10-29"]) d = record(d, k, "ncho", 5, 5).data;
  assert.equal(solvedRun(d, "2026-10-29"), 3);
  assert.equal(solvedRun(d, "2026-10-30"), 3, "today not played yet: yesterday's run still stands");
  assert.equal(solvedRun(d, "2026-10-31"), 0, "a missed day ends the run");
  d = record(d, "2026-11-01", "ncho", 4, 4).data; assert.equal(solvedRun(d, "2026-11-01"), 1);
  // across a month end
  let m = parse(null); for (const k of ["2026-10-31", "2026-11-01"]) m = record(m, k, "ncho", 4, 4).data; assert.equal(solvedRun(m, "2026-11-01"), 2);
});

test("the words on the card", () => {
  assert.equal(resultLabel(8, 8), "Solved"); assert.equal(resultLabel(9, 8), "Solved"); assert.equal(resultLabel(5, 8), "3 short"); assert.equal(resultLabel(0, 8), "Nothing captured");
  assert.equal(runLine(0), "none yet"); assert.equal(runLine(1), "1 day"); assert.equal(runLine(5), "5 in a row");
  assert.equal(dayLabel("2026-10-29"), "Thu 29 Oct");
});

test("storage survives garbage and old shapes", () => {
  assert.deepEqual(parse("not json"), { days: {}, solved: [] });
  assert.deepEqual(parse('{"days":{"2026-10-29:ncho":{"got":2,"target":8,"tries":1,"solved":false}}}').solved, []);
  assert.equal(parse('{"days":[]}').solved.length, 0);
});
