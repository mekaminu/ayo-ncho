// A nudge (web/nudge.js): after a miss on the daily puzzle, two pits lit — the answer and the most tempting wrong one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { legalMoves } from "../engine/ayo.js";
import { dailyPuzzle, attempt, shareText } from "../engine/puzzle.js";
import { canNudge, nudgeOf, nudgeLine, markNudged, solvedBadge, nudgeShare, CLUES } from "../web/nudge.js";
import { parse, record, entry, markShown, canShow } from "../web/daily.js";
import { translate } from "../web/i18n.js";

const days = Array.from({ length: 60 }, (_, i) => { const d = new Date(2026, 9, 20 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });

test("the two pits are the answer and the pit that takes most short of the target, in pit order", () => {
  let given = 0;
  for (const variant of ["ncho", "ayo"]) for (const key of days) {
    const p = dailyPuzzle(key, variant); const n = nudgeOf(p); const legal = legalMoves(p.state);
    if (!n) { assert.ok(legal.length < 3 || legal.filter((m) => m !== p.answer).every((m) => attempt(p, m).hit), `${key} ${variant}: a nudge should exist`); continue; }
    given++;
    assert.equal(n.pits.length, 2); assert.ok(n.pits.includes(p.answer)); assert.ok(n.pits.includes(n.decoy)); assert.notEqual(n.decoy, p.answer);
    assert.ok(n.pits[0] < n.pits[1], "pit order, so the order says nothing");
    assert.ok(legal.includes(n.decoy) && n.decoy < 6, "the decoy is a pit you could play");
    assert.ok(!attempt(p, n.decoy).hit, "the decoy misses");
    const best = Math.max(...legal.filter((m) => m !== p.answer && !attempt(p, m).hit).map((m) => attempt(p, m).got));
    assert.equal(attempt(p, n.decoy).got, best, "the most tempting wrong pit");
    assert.ok(CLUES[n.clue]);
    assert.deepEqual(nudgeOf(p), n, "the same nudge every time");
  }
  assert.ok(given > 100, `nudges given on most days (${given})`);
});

test("the clue says what the right move does that the other does not", () => {
  for (const key of days) {
    const p = dailyPuzzle(key, "ncho"); const n = nudgeOf(p); if (!n) continue;
    const pick = (pit) => attempt(p, pit).events.filter((e) => e.type === "pickup").length;
    if (n.clue === "relay") assert.ok(pick(n.answer) > 1 && pick(n.answer) > pick(n.decoy));
  }
});

test("offered after one miss, until it is solved, shown or already given; kept with the day", () => {
  const key = "2026-11-08"; const p = dailyPuzzle(key, "ncho"); let d = parse(null);
  assert.equal(canNudge(entry(d, key, "ncho")), false, "not before a move");
  d = record(d, key, "ncho", 0, p.target).data; const e1 = entry(d, key, "ncho");
  assert.equal(canNudge(e1), true, "after one miss"); assert.equal(canShow(e1), false, "Show me still waits for a second");
  d = markNudged(d, key, "ncho"); assert.equal(canNudge(entry(d, key, "ncho")), false, "once a day");
  d = record(d, key, "ncho", p.target, p.target).data; const e2 = entry(d, key, "ncho");
  assert.equal(e2.nudged, true, "a later go keeps it"); assert.equal(e2.solved, true, "a solve after a nudge counts");
  assert.equal(solvedBadge(e2), "Solved · with a nudge"); assert.equal(solvedBadge({ solved: true }), "Solved");
  const shown = markShown(record(parse(null), key, "ncho", 0, p.target).data, key, "ncho");
  assert.equal(canNudge(entry(shown, key, "ncho")), false, "not after the move was shown");
});

test("the share line says it had a nudge, only on a solve", () => {
  const p = dailyPuzzle("2026-11-08", "ncho"); const t = shareText(p, p.target);
  assert.equal(nudgeShare(t, { solved: true, nudged: true }).split("\n")[0], t.split("\n")[0] + " · with a nudge");
  assert.equal(nudgeShare(t, { solved: true }), t); assert.equal(nudgeShare(t, { solved: false, nudged: true }), t);
  assert.equal(nudgeShare(t, { solved: true, nudged: true }).split("\n")[1], t.split("\n")[1], "the seed row stays");
});

test("the words, in English and French", () => {
  const n = { pits: [1, 4], clue: "relay" };
  assert.equal(nudgeLine(n), "Mama Ngozi: one of these two — the right one picks up again where it lands");
  assert.equal(nudgeLine(null), "");
  for (const clue of Object.keys(CLUES)) { const fr = translate(nudgeLine({ pits: [0, 1], clue }), "fr"); assert.ok(fr.startsWith("Mama Ngozi : c’est l’un de ces deux — "), fr); assert.ok(!fr.includes("right one") && !fr.includes("count where"), fr); }
  assert.equal(translate("A nudge", "fr"), "Un coup de pouce");
  assert.equal(translate("Solved · with a nudge", "fr"), "Résolue · avec un coup de pouce");
});
