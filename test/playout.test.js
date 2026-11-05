// Play it out (idea 5 Nov): after your move in the daily puzzle, the game carries on from that position.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyMove, legalMoves, replay, newGame } from "../engine/ayo.js";
import { dailyPuzzle, attempt } from "../engine/puzzle.js";
import { undoPlan } from "../web/takeback.js";
import { translate } from "../web/i18n.js";
import { playoutOf, isPlayout, canPlayOut, playedOut, undoOk, undoReady, playoutButton, playoutToast, playoutEyebrow, playoutShare, PLAYOUT_TAG } from "../web/playout.js";

const days = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.UTC(2026, 9, 1 + i)); return d.toISOString().slice(0, 10); });
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

test("every puzzle's position plays on as an ordinary game: their move after yours, replayable from its moves to the end", () => {
  let offered = 0;
  for (const variant of ["ncho", "ayo"]) for (const key of days(40)) {
    const p = dailyPuzzle(key, variant); const po = playoutOf(p.state);
    assert.equal(po.from, p.state.moves.length);
    assert.deepEqual(replay(p.state.moves, variant).pits, p.state.pits, "the puzzle's position is the game its moves make");
    const rnd = rng(key.length * 7 + key.charCodeAt(9) + (variant === "ayo" ? 99 : 0));
    for (const pit of [p.answer, ...legalMoves(p.state)]) {
      const r = attempt(p, pit); const ok = canPlayOut({ played: true, mine: true, state: r.state });
      assert.equal(ok, !r.state.over, `${variant} ${key} pit ${pit}`);
      if (!ok) continue; offered++;
      assert.equal(r.state.turn, 1); assert.ok(legalMoves(r.state).length > 0, "they always have a reply");
      assert.ok(isPlayout(po, r.state)); assert.equal(playedOut(po, r.state), 1);
      assert.equal(undoReady(po, r.state), false, "nothing of the play-out to take back yet");
      let s = r.state; let guard = 0;
      while (!s.over && guard++ < 400) {
        const ms = legalMoves(s); s = applyMove(s, ms[Math.floor(rnd() * ms.length)]).state;
        assert.ok(isPlayout(po, s));
        if (s.turn === 0 && !s.over) { // your move: Undo may go back to the puzzle's position, never past it
          const u = undoPlan({ moves: s.moves, turn: s.turn, you: 0 });
          assert.equal(undoOk(po, s, u), u.keep.length >= po.from);
          if (undoReady(po, s)) assert.ok(undoOk(po, s, u), "the button is lit only when undo can act");
          if (playedOut(po, s) === 2) { assert.ok(undoOk(po, s, u)); assert.equal(u.keep.length, po.from); assert.deepEqual(replay(u.keep, variant).pits, p.state.pits, "back at the puzzle"); }
        }
      }
      const back = replay(s.moves, variant);
      assert.deepEqual([back.pits, back.stores, back.over, back.winner], [s.pits, s.stores, s.over, s.winner], "resume, undo and replay read it like any game");
      if (pit !== p.answer) break; // the answer and one other pit a day keep the test quick
    }
  }
  assert.ok(offered > 100, `offered ${offered} times`);
});

test("it is offered only after your own move, out of the lesson and rooms, with the game going", () => {
  const p = dailyPuzzle("2026-11-05", "ncho"); const r = attempt(p, p.answer);
  const st = r.state.over ? { ...r.state, over: false, turn: 1 } : r.state;
  assert.equal(canPlayOut({ played: true, mine: true, state: st }), true);
  assert.equal(canPlayOut({ played: false, mine: true, state: st }), false, "not before the move");
  assert.equal(canPlayOut({ played: true, mine: false, state: st }), false, "not after Mama Ngozi's shown move");
  assert.equal(canPlayOut({ played: true, mine: true, lesson: true, state: st }), false);
  assert.equal(canPlayOut({ played: true, mine: true, online: true, state: st }), false);
  assert.equal(canPlayOut({ played: true, mine: true, state: { ...st, over: true } }), false);
  assert.equal(canPlayOut({ played: true, mine: true, state: { ...st, turn: 0 } }), false);
  assert.equal(canPlayOut({}), false);
});

test("only a board whose moves still begin with the puzzle's is the play-out", () => {
  const p = dailyPuzzle("2026-11-05", "ayo"); const po = playoutOf(p.state);
  assert.equal(isPlayout(po, p.state), true);
  assert.equal(isPlayout(null, p.state), false);
  assert.equal(isPlayout(po, newGame("ayo")), false, "a new game");
  const other = replay(p.state.moves.slice(0, -1), "ayo");
  assert.equal(isPlayout(po, other), false, "a shorter game");
  const swapped = { ...p.state, moves: p.state.moves.slice(0, -1).concat((p.state.moves.at(-1) + 1) % 12) };
  assert.equal(isPlayout(po, swapped), false, "another game of the same length");
  assert.equal(undoOk(null, p.state, { keep: [] }), true, "out of a play-out undo is as before");
  assert.equal(undoOk(po, p.state, null), false);
  assert.equal(undoReady(null, newGame()), true);
});

test("the words, in English and French", () => {
  assert.equal(playoutButton("Nnamdi"), "Play it out vs Nnamdi");
  assert.equal(translate(playoutButton("Nnamdi"), "fr"), "Jouer la suite contre Nnamdi");
  assert.equal(translate(playoutButton("Papa Ike"), "fr"), "Jouer la suite contre Papa Ike");
  assert.equal(playoutToast("Mama Ngozi"), "Playing it out from today's puzzle — Mama Ngozi's move");
  assert.equal(translate(playoutToast("Mama Ngozi"), "fr"), "La partie continue depuis l’énigme du jour — à Mama Ngozi de jouer");
  assert.equal(playoutEyebrow("ncho", 23), `Nchò · ${PLAYOUT_TAG} · 23 moves`);
  assert.equal(playoutEyebrow("ayo", 1), "Ayo · from today's puzzle · 1 move");
  assert.equal(translate(playoutEyebrow("ncho", 23), "fr"), "Nchò · depuis l’énigme du jour · 23 coups");
  const end = { stores: [27, 21], winner: 0 };
  assert.equal(playoutShare(end, 0, "Nnamdi"), "Ayo & Nchò — played out from today's puzzle, I beat Nnamdi 27–21.");
  assert.equal(playoutShare({ stores: [20, 28], winner: 1 }, 0, "Adaeze"), "Ayo & Nchò — played out from today's puzzle, I lost to Adaeze 20–28.");
  assert.equal(playoutShare({ stores: [24, 24], winner: "draw" }, 0, "Adaeze"), "Ayo & Nchò — played out from today's puzzle, I drew with Adaeze 24–24.");
  assert.equal(translate(playoutShare(end, 0, "Nnamdi"), "fr"), "Ayo & Nchò — en jouant la suite de l’énigme du jour, j’ai battu Nnamdi 27–21.");
});

test("the page: the card's button, a play-out never saved or counted, and it is carried offline", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(html, /id="pzOut"[^>]*hidden/);
  assert.match(js, /function save\(\) \{ if \(online \|\| playingOut\(\)\) return; prefs\.set\('game'/, "save skips a play-out (and still saves otherwise)");
  assert.match(js, /if \(!online && !out\) prefs\.set\('game', 'null'\)/, "its game over leaves your saved game alone");
  assert.match(js, /if \(!online && !puzzle\.on && !out\) \{ starts = recordStart/);
  assert.match(js, /if \(!endPlayout\(\)\) save\(\); showScreen\('home'\)/);
  assert.match(js, /function newRound\(\) \{\n  playout = null;/);
  assert.ok(sw.includes("'./playout.js'"));
  // Share on the Game over card: the picture's file is made before it is shared (5 Nov it sat behind a comment)
  const share = js.slice(js.indexOf("$('#shareBtn')"), js.indexOf("// ---------- the replay clip"));
  assert.match(share, /\n\s+renderer\.render\(scene, camera\); const blob = .*; const file = blob && new File/);
  for (const line of js.split("\n")) { // no code left hiding behind a // comment on its line, as save() and Share nearly had
    const i = line.indexOf(" // "); if (i < 0) continue;
    assert.doesNotMatch(line.slice(i), /\b(const|let) [\w{}[\], ]+ = |\bprefs\.set\(/, line.slice(0, 80));
  }
});
