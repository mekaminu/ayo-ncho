// The score between us (web/pair.js): two of us on one phone, counted by the pair of typed names, once per game, in French.
import test from "node:test";
import assert from "node:assert/strict";
import { parse, pairOf, record, entryOf, cardLine, startLine, standingParts, wentUp, played, MAX_PAIRS } from "../web/pair.js";
import { translate } from "../web/i18n.js";
import { newGame, legalMoves, applyMove } from "../engine/ayo.js";

test("only two typed, different names keep a count", () => {
  assert.equal(pairOf(["Player 1", "Player 2"], [false, false]), null);
  assert.equal(pairOf(["Meka", "Player 2"], [true, false]), null, "one name typed is not yet a pair");
  assert.equal(pairOf(["Meka", "meka"], [true, true]), null);
  const p = pairOf(["Tete", "Meka"], [true, true]); const q = pairOf(["Meka", "Tete"], [true, true]);
  assert.equal(p.key, q.key, "the same two names are one count whichever field each is in");
  assert.deepEqual(p.order, [1, 0]); assert.deepEqual(q.order, [0, 1]);
  assert.notEqual(pairOf(["Mum", "Dad"], [true, true]).key, p.key);
});

test("counts each game once, by name, whichever seat each name has", () => {
  let d = parse(null); const p = pairOf(["Meka", "Tete"], [true, true]);
  let r = record(d, p, 1000, 0); d = r.data; assert.equal(r.counted, true); assert.deepEqual(r.before, { w: [0, 0], d: 0 });
  r = record(d, p, 1000, 0); d = r.data; assert.equal(r.counted, false, "the same game again (a reload, the card twice) is not counted again");
  r = record(d, p, 2000, 1); d = r.data; r = record(d, p, 3000, "draw"); d = r.data; r = record(d, p, 4000, 0); d = r.data;
  assert.deepEqual(entryOf(d, p).w, [2, 1]); assert.equal(entryOf(d, p).d, 1); assert.equal(played(entryOf(d, p)), 4);
  const swapped = pairOf(["Tete", "Meka"], [true, true]); // they typed the names the other way round
  assert.deepEqual(entryOf(d, swapped).w, [1, 2], "read by seat: Tete is now seat 0 with 1 win");
  r = record(d, swapped, 5000, 0); d = r.data; assert.equal(wentUp(r.before, r.entry), 0);
  assert.deepEqual(entryOf(d, p).w, [2, 2], "Tete's win counts for Tete");
  assert.deepEqual(parse(JSON.stringify(d)), d, "survives storage");
  assert.equal(record(d, null, 6000, 0).counted, false); assert.equal(record(d, p, 6000, null).counted, false);
});

test("the words", () => {
  const n = ["Meka", "Tete"];
  assert.equal(cardLine({ w: [3, 1], d: 1 }, n), "Meka leads 3–1 · 1 drawn · 5 games between you");
  assert.equal(cardLine({ w: [0, 1], d: 0 }, n), "Tete leads 1–0 · 1 game between you");
  assert.equal(cardLine({ w: [2, 2], d: 2 }, n), "level 2–2 · 2 drawn · 6 games between you");
  assert.equal(cardLine({ w: [0, 0], d: 0 }, n), ""); assert.equal(startLine({ w: [0, 0], d: 0 }, n), "");
  assert.equal(startLine({ w: [2, 1], d: 0 }, n), "game 4 · Meka leads 2–1");
  assert.deepEqual(standingParts({ w: [0, 3], d: 0 }, n), ["Tete leads 3–0"]);
  assert.equal(wentUp(null, { w: [1, 0], d: 0 }), null); assert.equal(wentUp({ w: [0, 0], d: 0 }, { w: [0, 0], d: 1 }), "draw");
});

test("in French", () => {
  assert.equal(translate("Meka leads 3–1 · 1 drawn · 5 games between you", "fr"), "Meka mène 3–1 · 1 nulle · 5 parties entre vous");
  assert.equal(translate("level 1–1 · 1 game between you", "fr"), "égalité 1–1 · 1 partie entre vous");
});

test("keeps the last few pairs only", () => {
  let d = parse(null);
  for (let i = 0; i < MAX_PAIRS + 3; i++) d = record(d, pairOf([`A${i}`, `B${i}`], [true, true]), i, 0, 1000 + i).data;
  assert.equal(Object.keys(d.pairs).length, MAX_PAIRS);
  assert.equal(played(entryOf(d, pairOf(["A0", "B0"], [true, true]))), 0, "the oldest pair went");
  assert.equal(parse("not json").pairs && Object.keys(parse("{bad").pairs).length, 0);
});

test("40 real games: the count matches the winners", () => {
  let d = parse(null); const p = pairOf(["Mum", "Dad"], [true, true]); const truth = { w: [0, 0], d: 0 };
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let g = 0; g < 40; g++) {
    let s = newGame("ncho"); let n = 0;
    while (!s.over && n++ < 600) { const m = legalMoves(s); s = applyMove(s, m[Math.floor(rnd() * m.length)]).state; }
    if (!s.over) continue;
    d = record(d, p, g, s.winner).data; d = record(d, p, g, s.winner).data; // the card shown twice
    if (s.winner === "draw") truth.d++; else truth.w[s.winner]++;
  }
  assert.deepEqual(entryOf(d, p), truth);
});
