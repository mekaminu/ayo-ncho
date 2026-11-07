// Play on from here (web/watch.js takeoverOf): the watcher of a shared game takes over at any move, always as the side to
// move from the near seat, and the position is exactly the one they were watching — mirrored when it was the far side's move.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, RULES, replay } from "../engine/ayo.js";
import { encodeGame, decodeGame, takeoverOf, canTakeOver, mirrorPit, isTakeover, takeoverChip, takeoverToast, takeoverEyebrow, takeoverShare, takeoverLabel, TAKE_TITLE } from "../web/watch.js";
import { isPlayout, playedOut, undoOk, undoReady } from "../web/playout.js";
import { translate } from "../web/i18n.js";

let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
function watched(variant, rules, first) {
  let s = newGame(variant, rules, first); const moves = [];
  while (!s.over) { const ms = legalMoves(s); const m = ms[Math.floor(rnd() * ms.length)]; moves.push(m); s = applyMove(s, m).state; }
  return decodeGame(encodeGame({ variant, rules: s.rules, first, moves }), "Meka", "Tete");
}

test("at every move of 80 random games of both kinds, either seat first, the take-over is the watched position from the side to move", () => {
  let n = 0, flips = 0;
  for (const variant of ["ncho", "ayo"]) for (const first of [0, 1]) for (let g = 0; g < 20; g++) {
    const w = watched(variant, RULES[variant], first); assert.ok(w);
    for (let k = 0; k <= w.moves.length; k++) {
      const s = w.states[k]; const t = takeoverOf(w, k);
      if (k === 0 || s.over) { assert.equal(t, null); continue; }
      assert.ok(t, `move ${k}`); assert.equal(t.state.turn, 0); assert.equal(t.flip, s.turn === 1); assert.equal(t.n, k);
      const mirror = (i) => (t.flip ? mirrorPit(i) : i);
      for (let i = 0; i < 12; i++) assert.equal(t.state.pits[mirror(i)], s.pits[i]);
      assert.deepEqual(t.state.stores, t.flip ? [s.stores[1], s.stores[0]] : s.stores);
      assert.deepEqual(legalMoves(t.state).slice().sort(), legalMoves(s).map(mirror).sort());
      assert.equal(t.side, t.flip ? "Tete" : "Meka"); assert.equal(t.other, t.flip ? "Meka" : "Tete");
      // the board keeps it as a play-out: it replays through the engine and undo goes back no further than the take-over
      assert.ok(isTakeover(t.po)); assert.ok(isPlayout(t.po, t.state)); assert.equal(playedOut(t.po, t.state), 0);
      const again = replay(t.state.moves, variant, t.state.rules, t.state.first); assert.deepEqual(again.pits, t.state.pits);
      assert.ok(!undoReady(t.po, t.state));
      assert.ok(!undoOk(t.po, t.state, { keep: t.state.moves.slice(0, -1) }));
      if (t.flip) flips++; n++;
    }
  }
  assert.ok(n > 1000); assert.ok(flips > 300);
});

test("the chip is offered only while the game plays back, after a move, with the game going", () => {
  const w = watched("ncho", RULES.ncho, 0);
  assert.ok(canTakeOver({ watching: true, k: 3, state: w.states[3] }));
  assert.ok(!canTakeOver({ watching: false, k: 3, state: w.states[3] }));
  assert.ok(!canTakeOver({ watching: true, done: true, k: 3, state: w.states[3] }));
  assert.ok(!canTakeOver({ watching: true, k: 0, state: w.states[0] }));
  assert.ok(!canTakeOver({ watching: true, k: w.moves.length, state: w.states[w.moves.length] }));
  assert.equal(takeoverOf(null, 2), null); assert.equal(takeoverOf(w, 999), null);
});

test("the words, in English and French", () => {
  assert.equal(TAKE_TITLE, "Play on from here");
  assert.equal(takeoverChip("Tete", "Nnamdi"), "you take Tete's side · vs Nnamdi");
  assert.equal(takeoverLabel("Tete", "Nnamdi"), "Play on from here: you take Tete's side against Nnamdi");
  assert.equal(takeoverToast(14, "Meka"), "From move 14, you play on as Meka — your move");
  assert.equal(takeoverEyebrow("ncho", 14, 1), "Nchò · from move 14 of a shared game · 1 move");
  assert.equal(takeoverEyebrow("ayo", 9, 6), "Ayo · from move 9 of a shared game · 6 moves");
  const end = { stores: [27, 21], winner: 0 };
  assert.equal(takeoverShare(end, 0, "Nnamdi", { side: "Meka", n: 14 }), "Ayo & Nchò — I played on as Meka from move 14 of a shared game and beat Nnamdi 27–21.");
  assert.equal(takeoverShare({ stores: [24, 24], winner: "draw" }, 0, "Nnamdi", { side: "Meka", n: 3 }), "Ayo & Nchò — I played on as Meka from move 3 of a shared game and drew with Nnamdi 24–24.");
  const fr = (s) => translate(s, "fr");
  assert.equal(fr("Play on from here"), "Continuer d’ici");
  assert.equal(fr("you take Tete's side · vs Nnamdi"), "vous prenez la place de Tete · contre Nnamdi");
  assert.equal(fr("Play on from here: you take Tete's side against Nnamdi"), "Continuer d’ici : vous prenez la place de Tete contre Nnamdi");
  assert.equal(fr("From move 14, you play on as Meka — your move"), "Depuis le coup 14, vous continuez à la place de Meka — à vous de jouer");
  assert.equal(fr("from move 14 of a shared game"), "depuis le coup 14 d’une partie partagée");
  assert.equal(fr("Ayo & Nchò — I played on as Meka from move 14 of a shared game and lost to Nnamdi 20–28."), "Ayo & Nchò — j’ai continué à la place de Meka depuis le coup 14 d’une partie partagée et j’ai perdu contre Nnamdi 20–28.");
  assert.equal(fr("you take Player 2's side · vs Mama Ngozi"), "vous prenez la place de Joueur 2 · contre Mama Ngozi");
});
