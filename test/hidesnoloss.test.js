// A take-back hides no loss (idea 10 Nov, night): a game with an Undo leaves a win or a draw out of the rating, but a loss
// still counts — so one Undo while trailing cannot keep a defeat off the number. Checked on the pure rules (web/rated.js),
// through web/rating.js, for a game walked away from (web/walkaway.js), and in French.
import { test } from "node:test";
import assert from "node:assert/strict";
import { counts, countsFor, lossKeptWords, tookBack, unratedWords, UNDO_NOTE } from "../web/rated.js";
import { rate, parse, cardWords } from "../web/rating.js";
import { translate } from "../web/i18n.js";

const settled = () => parse(JSON.stringify({ r: 1180, n: 30, last: 4, change: 6 }));
// what web/game.js does on the Game over card
function finish(rating, stats, a, b, level = "hard") {
  const outcome = a > b ? "win" : a < b ? "loss" : "draw";
  if (!countsFor(stats, outcome)) return { data: rating, counted: false, outcome };
  return { ...rate(rating, level, a, b, stats.started), outcome };
}

test("without a take-back every ending counts, as before", () => {
  for (const o of ["win", "loss", "draw"]) assert.equal(countsFor({ undos: 0 }, o), true);
  assert.equal(countsFor(null, "win"), true); assert.equal(countsFor({}, "draw"), true);
});

test("with a take-back a win or a draw stays out, a loss counts", () => {
  const s = tookBack({ started: 9 }).stats;
  assert.equal(counts(s), false);
  assert.equal(countsFor(s, "win"), false);
  assert.equal(countsFor(s, "draw"), false);
  assert.equal(countsFor(s, "loss"), true);
  assert.equal(countsFor({ undos: 7 }, "loss"), true);
});

test("one Undo while trailing no longer keeps the loss off the rating", () => {
  const plain = finish(settled(), { started: 11 }, 10, 38);
  const undone = finish(settled(), tookBack({ started: 11 }).stats, 10, 38);
  assert.equal(undone.counted, true);
  assert.ok(undone.data.r < 1180, "the rating comes down");
  assert.deepEqual(undone.data, plain.data, "exactly as if the move had never been taken back");
});

test("a won game with a take-back leaves the rating where it was", () => {
  const r = finish(settled(), tookBack({ started: 12 }).stats, 30, 18);
  assert.equal(r.counted, false); assert.deepEqual(r.data, settled());
  const d = finish(settled(), tookBack({ started: 13 }).stats, 24, 24);
  assert.equal(d.counted, false); assert.deepEqual(d.data, settled());
});

test("a loss is counted once, whatever the take-backs", () => {
  let st = tookBack(tookBack({ started: 14 }).stats).stats;
  const once = finish(settled(), st, 12, 36), twice = finish(once.data, st, 12, 36);
  assert.equal(twice.counted, false); assert.deepEqual(twice.data, once.data);
});

test("a game walked away from with a take-back counts as the loss it is", () => {
  assert.equal(countsFor({ undos: 3, started: 5 }, "loss"), true);
});

test("the words: the note, and the card's line on a loss", () => {
  assert.equal(UNDO_NOTE, "Taken back · a win or draw won't count for your rating now, a loss still will");
  assert.equal(lossKeptWords({ undos: 1 }, "loss"), "you took back a move, the loss still counts");
  assert.equal(lossKeptWords({ undos: 3 }, "loss"), "you took back 3 moves, the loss still counts");
  assert.equal(lossKeptWords({ undos: 0 }, "loss"), "");
  assert.equal(lossKeptWords({ undos: 2 }, "win"), "");
  assert.equal(lossKeptWords(null, "loss"), "");
  assert.equal(unratedWords({ undos: 2 }), "Not rated · you took back 2 moves");
});

test("French, the whole card line too", () => {
  const fr = (s) => translate(s, "fr");
  assert.equal(fr(UNDO_NOTE), "Coup repris · une victoire ou une nulle ne comptera plus pour votre classement, une défaite si");
  assert.equal(fr(lossKeptWords({ undos: 1 }, "loss")), "vous avez repris un coup, la défaite compte quand même");
  assert.equal(fr(lossKeptWords({ undos: 4 }, "loss")), "vous avez repris 4 coups, la défaite compte quand même");
  const line = cardWords("hard", -9, "loss", "Mama Ngozi") + " · " + lossKeptWords({ undos: 1 }, "loss");
  const f = fr(line);
  assert.notEqual(f, line); assert.ok(f.endsWith(" · vous avez repris un coup, la défaite compte quand même"), f);
  assert.ok(!/\b(took|loss|counts|for)\b/.test(f), f);
  const withN = line + " · 4 of 10 games, it is still finding you";
  assert.ok(fr(withN).endsWith("le classement se cale encore"), fr(withN));
});
