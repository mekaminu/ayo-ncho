// Feed them: what the board says when the rules narrow your move, checked against the engine's own legal moves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { narrowOf, feedWords, onlyLead, pitList } from "../web/feed.js";
import { newGame, legalMoves, applyMove, sideOf, seedsOnSide } from "../engine/ayo.js";

const at = (pits, turn = 0, variant = "ncho") => ({ ...newGame(variant), pits, turn });

test("nothing to say when every pit with seeds may be played", () => {
  assert.equal(narrowOf(newGame("ncho")), null);
  assert.equal(feedWords(null), "");
  assert.equal(narrowOf(newGame("ncho"), 1), null, "not your move");
});

test("their side empty: the pits that reach them, in words from your seat", () => {
  const s = at([0, 1, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0]);
  const n = narrowOf(s);
  assert.equal(n.kind, "feed"); assert.equal(n.hungry, true);
  assert.deepEqual(n.legal, legalMoves(s)); assert.deepEqual(n.legal, [4, 5]); assert.deepEqual(n.barred, [1]); assert.equal(n.only, null);
  assert.equal(feedWords(n), "They have no seeds — you must feed them: pits 5 or 6");
  const one = narrowOf(at([0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0]));
  assert.equal(one.only, 5); assert.equal(feedWords(one), "They have no seeds — only pit 6 reaches them");
  assert.equal(onlyLead(one), "only pit 6 reaches them");
});

test("from the far seat your pits are still 1–6", () => {
  const s = at([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 5, 6], 1);
  const n = narrowOf(s, 1);
  assert.deepEqual(n.legal, [10, 11]); assert.equal(feedWords(n, { you: 1 }), "They have no seeds — you must feed them: pits 5 or 6");
});

test("one pit with seeds and nothing barred: only move", () => {
  const s = at([0, 0, 3, 0, 0, 0, 2, 0, 1, 0, 0, 0]);
  const n = narrowOf(s);
  assert.equal(n.kind, "only"); assert.equal(n.only, 2);
  assert.equal(feedWords(n), "only pit 3 has seeds"); assert.equal(onlyLead(n), "only move");
});

test("pit lists read like speech", () => {
  assert.equal(pitList([3]), "pit 4");
  assert.equal(pitList([5, 0, 2]), "pits 1, 3 or 6");
  assert.equal(pitList([0, 2], 0, "and"), "pits 1 and 3");
});

test("over random games of both kinds the board says exactly what the engine allows", () => {
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let seen = { feed: 0, only: 0, hungry: 0, leaves: 0 };
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 150; g++) {
    let s = newGame(variant);
    while (!s.over && s.moves.length < 300) {
      const you = s.turn, legal = legalMoves(s), n = narrowOf(s, you);
      const mine = sideOf(you).filter((i) => s.pits[i] > 0);
      const barred = mine.filter((i) => !legal.includes(i));
      if (!barred.length && legal.length > 1) assert.equal(n, null);
      else {
        assert.ok(n); assert.deepEqual(n.legal, legal); assert.deepEqual(n.barred, barred); seen[n.kind]++;
        assert.equal(n.only, legal.length === 1 ? legal[0] : null);
        assert.equal(n.hungry, seedsOnSide(s, 1 - you) === 0);
        for (const p of barred) assert.throws(() => applyMove(s, p), /feed/, "a barred pit is one the engine refuses");
        const w = feedWords(n, { you }); assert.ok(w.length > 0);
        if (n.hungry) seen.hungry++; else if (n.kind === "feed") { seen.leaves++; assert.match(w, /would leave them nothing — play pits? /); }
        for (const p of legal) assert.match(w, new RegExp(String(sideOf(you).indexOf(p) + 1)));
      }
      s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
    }
  }
  assert.ok(seen.feed > 0 && seen.only > 0 && seen.hungry > 0, JSON.stringify(seen));
});
