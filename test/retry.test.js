// Try again from where it turned (web/retry.js): where a lost game goes back to, when the card offers it, and the words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";
import { gameStory } from "../web/story.js";
import { isPlayout, playedOut, undoOk } from "../web/playout.js";
import { undoPlan } from "../web/takeback.js";
import { turnPoint, retryOf, isRetry, retryOffer, retryButton, retryToast, retryEyebrow, retryLine, retryShare, MIN_AT, MIN_LEFT } from "../web/retry.js";
import { translate } from "../web/i18n.js";

function randomGame(variant, seed, first = 0) {
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let s = newGame(variant, {}, first);
  while (!s.over) { const ms = legalMoves(s); s = applyMove(s, ms[Math.floor(rnd() * ms.length)]).state; }
  return s;
}

test("over random games of both kinds, from either seat: a loss goes back to your own move, before they led for good", () => {
  let offered = 0, lost = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 150; g++) for (const you of [0, 1]) {
    const s = randomGame(variant, 11 + g * 7, g % 2);
    const tp = turnPoint(s.moves, variant, {}, you);
    if (s.winner !== 1 - you) { assert.equal(tp, null, "never for a win or a draw"); continue; }
    lost += 1; if (!tp) continue; offered += 1;
    const st = gameStory(s.moves, variant, {}, you);
    assert.ok(tp.at >= MIN_AT && s.moves.length - tp.at >= MIN_LEFT, "not at the very start, and something left to play");
    assert.equal(tp.n, tp.at + 1);
    const before = replay(s.moves.slice(0, tp.at), variant, {}, s.first);
    assert.equal(before.turn, you, "the board goes back to your move");
    assert.ok(!before.over, "a position still in play");
    assert.deepEqual(before.pits, replay(s.moves.slice(0, tp.at), variant, {}, s.first).pits);
    assert.equal(tp.lead, before.stores[you] - before.stores[1 - you], "the lead then, as the story reads it");
    if (st.forGood !== null && tp.at <= st.forGood) {
      for (let i = tp.at + 1; i <= st.forGood; i++) assert.notEqual(st.turns[i].mover, you, "the last move of yours at or before the turn");
    }
  }
  assert.ok(lost > 100 && offered > lost * 0.6, `offered for most losses (${offered} of ${lost})`);
});

test("a retry is a play-out of the kept moves: undo stops at it, and it ends when the moves no longer begin with them", () => {
  const s = randomGame("ncho", 99);
  const you = s.winner === 1 ? 0 : 1; const tp = turnPoint(s.moves, "ncho", {}, you) || { at: 4, n: 5 };
  const r = retryOf(s.moves, tp, [s.stores[you], s.stores[1 - you]]);
  assert.ok(isRetry(r) && r.from === tp.at && r.n === tp.n);
  let b = replay(s.moves.slice(0, tp.at), "ncho", {}, s.first);
  assert.ok(isPlayout(r, b) && playedOut(r, b) === 0);
  const m1 = legalMoves(b)[0]; b = applyMove(b, m1).state; const m2 = legalMoves(b)[0]; b = applyMove(b, m2).state;
  assert.equal(playedOut(r, b), 2);
  assert.ok(undoOk(r, b, undoPlan({ moves: b.moves, turn: b.turn, you })), "your move and their reply go back");
  const one = replay(b.moves.slice(0, -1), "ncho", {}, s.first);
  if (one.turn === you) assert.ok(!undoOk(r, one, { keep: one.moves.slice(0, tp.at - 1) }), "no further back than where it turned");
  assert.ok(!isPlayout(r, newGame("ncho")), "a new game is not the retry");
});

test("when the card offers it", () => {
  const s = randomGame("ncho", 5); const you = s.winner === 1 ? 0 : s.winner === 0 ? 1 : 0;
  const tp = turnPoint(s.moves, "ncho", {}, you);
  for (const k of ["online", "local", "puzzle", "lesson"]) assert.equal(retryOffer({ [k]: true, state: s, you }), null, k);
  assert.equal(retryOffer({ state: { ...s, over: false }, you }), null, "only once the game is over");
  assert.deepEqual(retryOffer({ state: s, you }), tp);
  assert.equal(retryOffer({ state: { ...s, winner: you }, you }), null, "never after a win");
  assert.equal(retryOffer({ state: { ...s, winner: "draw" }, you }), null, "or a draw");
  const r = { kind: "retry", from: 7, prefix: "", n: 8, last: [20, 28] };
  const won = { ...s, winner: you };
  assert.deepEqual(retryOffer({ state: won, you, retry: r }), { at: 7, n: 8, again: true }, "a retry offers the same move again, won or lost");
  assert.equal(retryOffer({ state: won, you, retry: { from: 3, prefix: "" } }), null, "a play-out from the puzzle never offers it after a win");
});

test("the words, and their French", () => {
  assert.equal(retryButton(14), "Try again from move 14 · where it turned");
  assert.equal(retryToast(14), "Back to move 14, where it turned — your move");
  assert.equal(retryEyebrow("ncho", 14, 1), "Nchò · from move 14 of your last game · 1 move");
  assert.equal(retryEyebrow("ayo", 9, 12), "Ayo · from move 9 of your last game · 12 moves");
  assert.equal(retryLine([20, 28], [27, 21]), "last time 20–28 · this time 27–21");
  const st = (stores, winner) => ({ stores, winner });
  const r = { n: 14, last: [20, 28] };
  assert.equal(retryShare(st([27, 21], 0), 0, "Nnamdi", r), "Ayo & Nchò — I went back to move 14 of a game I lost 20–28 to Nnamdi: this time I won 27–21.");
  assert.equal(retryShare(st([24, 24], "draw"), 0, "Nnamdi", r), "Ayo & Nchò — I went back to move 14 of a game I lost 20–28 to Nnamdi: this time a draw, 24–24.");
  assert.equal(retryShare(st([22, 26], 1), 0, "Mama Ngozi", r), "Ayo & Nchò — I went back to move 14 of a game I lost 20–28 to Mama Ngozi: I lost again, 22–26.");
  const fr = (s) => translate(s, "fr");
  assert.equal(fr(retryButton(14)), "Rejouer depuis le coup 14 · là où la partie a basculé");
  assert.equal(fr(retryToast(14)), "Retour au coup 14, là où la partie a basculé — à vous");
  assert.equal(fr(retryEyebrow("ncho", 14, 6)), "Nchò · depuis le coup 14 de votre dernière partie · 6 coups");
  assert.equal(fr(retryLine([20, 28], [27, 21])), "la dernière fois 20–28 · cette fois 27–21");
  assert.equal(fr(retryShare(st([27, 21], 0), 0, "Nnamdi", r)), "Ayo & Nchò — je suis revenu au coup 14 d’une partie perdue 20–28 contre Nnamdi : cette fois j’ai gagné 27–21.".replace(" :", " :"));
  assert.equal(fr(retryShare(st([24, 24], "draw"), 0, "Nnamdi", r)), "Ayo & Nchò — je suis revenu au coup 14 d’une partie perdue 20–28 contre Nnamdi : cette fois match nul, 24–24.");
  assert.equal(fr(retryShare(st([22, 26], 1), 0, "Nnamdi", r)), "Ayo & Nchò — je suis revenu au coup 14 d’une partie perdue 20–28 contre Nnamdi : perdu encore, 22–26.");
});
