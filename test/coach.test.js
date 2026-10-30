// Mama Ngozi's take: every move you had is rated by the engine's own search, and she only speaks when a clearly better pit was there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rateMoves, chooseMove, LEVELS } from "../engine/ai.js";
import { takeOn, takeWords, takeLine, LINES, TAKE_GAP, NAME } from "../web/coach.js";
import { sowPath } from "../web/path.js";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";

let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

test("every legal move is rated, best first, and the best is the move Mama Ngozi herself would play", () => {
  for (const variant of ["ncho", "ayo"]) {
    let s = newGame(variant); let checked = 0;
    while (!s.over && s.moves.length < 40) {
      const rated = rateMoves(s, "hard"); const legal = legalMoves(s);
      assert.deepEqual(rated.map((r) => r.pit).sort((a, b) => a - b), legal, "exactly the legal moves, each once");
      for (let i = 1; i < rated.length; i++) assert.ok(rated[i - 1].value >= rated[i].value, "best first");
      for (const r of rated) assert.ok(Number.isFinite(r.value));
      assert.equal(rated[0].pit, chooseMove(s, "hard"), "the top of the list is the hard opponent's move (no noise at that level)");
      assert.equal(LEVELS.hard.noise, 0);
      const m = legal[Math.floor(rnd() * legal.length)]; s = applyMove(s, m).state; checked++;
    }
    assert.ok(checked > 10);
  }
  assert.deepEqual(rateMoves({ ...newGame("ncho"), over: true }), [], "a finished game has no moves to rate");
});

test("a winning move rates as a win; a position one move from the end gives her take its 'win' kind", () => {
  // random play until the player to move can end the game by winning: the ending pit must sit at the top with a win's value
  let found = 0;
  for (let g = 0; g < 400 && found < 3; g++) {
    let s = newGame("ncho");
    while (!s.over && s.moves.length < 300) {
      const legal = legalMoves(s); const ending = legal.find((m) => { const r = applyMove(s, m).state; return r.over && r.winner === s.turn; });
      if (ending !== undefined && legal.length > 1) {
        const rated = rateMoves(s, "hard"); const top = rated.find((r) => r.pit === ending);
        assert.ok(top.value >= 500, "a move that wins the game is worth a win");
        const other = rated.find((r) => r.pit !== ending && r.value < 500);
        if (other) { const t = takeOn(rated, other.pit); assert.ok(t, "walking past the win earns a take"); assert.equal(t.kind, "win"); assert.equal(t.pit, rated[0].pit); found++; }
        break;
      }
      s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
    }
  }
  assert.ok(found >= 1, "no win-in-one position turned up");
});

test("her take: nothing when yours was the move or near enough; the better pit and the gap when it was clearly better", () => {
  const rated = [{ pit: 3, value: 6.2 }, { pit: 0, value: 4.1 }, { pit: 5, value: 1.0 }, { pit: 1, value: -2.5 }];
  assert.equal(takeOn(rated, 3), null, "you played the best move");
  assert.equal(takeOn(rated, 0), null, "within the gap: close enough, no word");
  assert.deepEqual(takeOn(rated, 5), { pit: 3, played: 5, gap: 5, kind: "better" });
  assert.deepEqual(takeOn(rated, 1), { pit: 3, played: 1, gap: 9, kind: "better" });
  assert.equal(takeOn(rated, 4), null, "a pit that was not rated (not played) gets no take");
  assert.equal(takeOn([{ pit: 2, value: 3 }], 2), null, "only one move: nothing to compare");
  assert.equal(takeOn(null, 2), null);
  assert.equal(TAKE_GAP, 3);
  // a forced win walked past, and a forced loss that one pit avoided
  assert.equal(takeOn([{ pit: 2, value: 1000 }, { pit: 4, value: 2 }], 4).kind, "win");
  assert.equal(takeOn([{ pit: 2, value: -1 }, { pit: 4, value: -1000 }], 4).kind, "save");
  assert.equal(takeOn([{ pit: 2, value: 1000 }, { pit: 4, value: 1000 }], 4), null, "two winning moves: either is the move");
  assert.ok(takeOn([{ pit: 2, value: 1000 }, { pit: 4, value: 2 }], 4).gap <= 48, "the gap never claims more seeds than the board holds");
});

test("the words name the better pit from your seat, what it does at once, and how much better it was", () => {
  const s = newGame("ncho"); const p = sowPath(s, 2);
  const t = { pit: 2, played: 0, gap: 4, kind: "better" };
  const w = takeWords(t, p, { you: 0 });
  assert.ok(w.startsWith("your pit 3 was the move · "), w);
  assert.ok(w.endsWith(" · 4 seeds better"), w);
  if (p.relays.length) assert.ok(w.includes("picks up again"), w);
  if (p.got) assert.ok(w.includes(`takes ${p.got}`), w);
  assert.equal(takeWords({ pit: 2, played: 0, gap: 1, kind: "better" }, null), "your pit 3 was the move · 1 seed better");
  assert.equal(takeWords({ pit: 7, played: 0, gap: 30, kind: "win" }, null, { you: 1 }), "your pit 2 was the move · wins the game");
  assert.equal(takeWords({ pit: 4, played: 0, gap: 30, kind: "save" }, null), "your pit 5 was the move · keeps you in the game");
  assert.equal(takeWords(null, p), "");
  assert.equal(NAME, "Mama Ngozi");
  for (const k of ["better", "win", "save"]) { assert.ok(LINES[k].length >= 2); assert.ok(LINES[k].includes(takeLine({ kind: k }, () => 0.3))); }
  assert.equal(takeLine(null), "");
});

test("over random games her take always names a legal, better pit; she never has a take on her own moves", () => {
  let takes = 0, moves = 0, hers = 0;
  for (let g = 0; g < 4; g++) {
    let s = newGame(g % 2 ? "ayo" : "ncho");
    while (!s.over && s.moves.length < 60) {
      const legal = legalMoves(s);
      if (s.turn === 0) { // a careless player: random moves, judged afterwards
        const m = legal[Math.floor(rnd() * legal.length)]; const rated = rateMoves(s, "hard"); const t = takeOn(rated, m); moves++;
        if (t) {
          takes++; assert.ok(legal.includes(t.pit) && t.pit !== m, "the better pit is one you could have played");
          assert.equal(t.pit, rated[0].pit, "the better pit is the best one");
          assert.ok(t.kind !== "better" || t.gap >= TAKE_GAP);
          assert.ok(sowPath(s, t.pit), "the better move has a path to show");
          assert.ok(takeWords(t, sowPath(s, t.pit)).length > 10);
        }
        s = applyMove(s, m).state;
      } else { // Mama Ngozi plays her own move: by her own judgement it is the move, so never a take
        const m = chooseMove(s, "hard"); const t = takeOn(rateMoves(s, "hard"), m); assert.equal(t, null, "her own move earns no take"); hers++;
        s = applyMove(s, m).state;
      }
    }
  }
  assert.ok(takes > 0 && takes < moves, `random play earns some takes, not all (${takes} of ${moves})`);
  assert.ok(hers > 20);
});

test("a rating stands on a copy: the position is untouched, so a saved game replays the same", () => {
  const s = replay([0, 7, 2], "ncho"); const pits = s.pits.slice(), stores = s.stores.slice(), moves = s.moves.slice();
  rateMoves(s, "hard"); rateMoves(s, "medium");
  assert.deepEqual(s.pits, pits); assert.deepEqual(s.stores, stores); assert.deepEqual(s.moves, moves);
});
