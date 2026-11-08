// The rematch, remembered (idea 8 Nov): web/rematch.js picks the opponent's first word of a game played straight after one
// against them — you won, you won big, they won, a draw — once per finished game; every opponent has each, in French too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REMATCH_MIN, WIDE, MOMENTS, keep, parse, rematchMoment } from "../web/rematch.js";
import { CHARACTERS, MOOD_FOR, MOODS, line } from "../web/characters.js";
import { translate } from "../web/i18n.js";

const T = Date.UTC(2026, 10, 8, 11, 0);
const min = (m) => T + m * 60000;

test("how the last game went picks the word", () => {
  assert.equal(rematchMoment(keep("hard", 26, 22, "g1", T), "hard", min(1)), "againWon");
  assert.equal(rematchMoment(keep("hard", 25 + WIDE / 2, 23 - WIDE / 2, "g1", T), "hard", min(1)), "againWonBig");
  assert.equal(rematchMoment(keep("hard", 29, 19, "g1", T), "hard", min(1)), "againWonBig"); // exactly WIDE
  assert.equal(rematchMoment(keep("hard", 28, 20, "g1", T), "hard", min(1)), "againWon");
  assert.equal(rematchMoment(keep("hard", 10, 30, "g1", T), "hard", min(1)), "againLost");
  assert.equal(rematchMoment(keep("hard", 24, 24, "g1", T), "hard", min(1)), "againDrew");
});

test("only straight after, only the same opponent, only once per game", () => {
  const k = keep("medium", 26, 22, "g7", T);
  assert.equal(rematchMoment(k, "medium", min(REMATCH_MIN)), "againWon");
  assert.equal(rematchMoment(k, "medium", min(REMATCH_MIN + 1)), null); // a while later: the usual greeting
  assert.equal(rematchMoment(k, "hard", min(1)), null); // someone else across the board
  assert.equal(rematchMoment(k, "medium", min(-5)), null); // a clock put back
  assert.equal(rematchMoment(k, "medium", min(1), "g7"), null); // already answered
  assert.equal(rematchMoment(k, "medium", min(1), "g6"), "againWon");
  assert.equal(rematchMoment("", "medium", min(1)), null);
  assert.equal(rematchMoment("{bad", "medium", min(1)), null);
  assert.equal(parse(null), null);
  assert.deepEqual(parse(k), { level: "medium", a: 26, b: 22, id: "g7", at: T });
});

test("every opponent has each rematch word, with a face, in French", () => {
  for (const [lv, c] of Object.entries(CHARACTERS)) for (const m of MOMENTS) {
    assert.ok(c.lines[m] && c.lines[m].length, `${c.name}: no ${m}`);
    const l = line(lv, m); assert.ok(l, `${c.name} ${m}`);
    assert.ok(MOODS.includes(MOOD_FOR[m]), m);
    const fr = translate(l, "fr"); assert.notEqual(fr, l, `${c.name} ${m}: no French`);
  }
  // the words differ between opponents: each speaks for themselves
  for (const m of MOMENTS) { const all = Object.values(CHARACTERS).map((c) => c.lines[m][0]); assert.equal(new Set(all).size, all.length, m); }
});
