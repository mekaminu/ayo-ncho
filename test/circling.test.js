// The game is circling: the line under the board from 12 moves before the engine calls the game (60 moves with no capture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, QUIET_LIMIT, resign } from "../engine/ayo.js";
import { WARN, movesLeft, keeps, circling, began, endedCircling, standWords, circlingWords, circlingRest, calledWords, endedWords, beganWords } from "../web/circling.js";
import { sowPath, pathWords, playedWords, answerOf } from "../web/path.js";
import { CHARACTERS, line, MOOD_FOR, MOODS } from "../web/characters.js";

const at = (quiet, over = false) => ({ ...newGame("ncho"), quiet, over });

test("the line holds from 12 moves before the call, and never otherwise", () => {
  assert.equal(movesLeft(at(0)), null);
  assert.equal(movesLeft(at(QUIET_LIMIT - WARN - 1)), null);
  assert.equal(movesLeft(at(QUIET_LIMIT - WARN)), 12);
  assert.equal(movesLeft(at(QUIET_LIMIT - 1)), 1);
  assert.equal(movesLeft(at(QUIET_LIMIT - 5, true)), null, "not once the game is over");
  assert.equal(movesLeft(null), null);
  assert.ok(began(at(QUIET_LIMIT - WARN - 1), at(QUIET_LIMIT - WARN)));
  assert.ok(!began(at(QUIET_LIMIT - WARN), at(QUIET_LIMIT - WARN + 1)), "only the move it starts on");
});

test("who keeps what: each side its store and the seeds on its own side", () => {
  const s = { ...newGame("ncho"), quiet: 50, pits: [3, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0], stores: [24, 18] };
  assert.deepEqual(keeps(s), [28, 20]);
  const c = circling(s); assert.equal(c.left, 10); assert.equal(c.winner, 0);
  assert.equal(standWords(c, { you: 0 }), "you'd win 28–20");
  assert.equal(standWords(c, { you: 1 }), "you'd lose 20–28");
  assert.equal(standWords(c, { you: 1, me: "Player 2" }), "Player 2 would lose 20–28");
  assert.equal(circlingWords(c), "10 moves with no capture and it ends · each keeps their side: you'd win 28–20");
  assert.equal(circlingRest({ ...c, left: 1 }), "move with no capture and it ends · each keeps their side: you'd win 28–20");
  const lv = circling({ ...s, stores: [23, 23], pits: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0] });
  assert.equal(lv.winner, "draw"); assert.equal(standWords(lv), "level 24–24");
  assert.match(beganWords(c), /10 moves with no capture/);
  assert.equal(endedWords(), `no capture in ${QUIET_LIMIT} moves`);
});

test("over random games of both kinds: the count runs down one a move, a capture takes it away, and the call comes exactly at 0", () => {
  let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let shown = 0, called = 0, broken = 0, pathCalled = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 120; g++) {
    let s = newGame(variant);
    while (!s.over) {
      const moves = legalMoves(s);
      for (const m of moves) { // the first tap says it on exactly the move the game is called on, and calls nothing a capture then
        const p = sowPath(s, m); const { state: next } = applyMove(s, m);
        assert.equal(p.called, endedCircling(next));
        if (p.called) {
          pathCalled++; const w = pathWords(p);
          assert.ok(w.includes(calledWords()), w); assert.ok(!/takes|gives/.test(w), w);
          assert.ok(playedWords(p).includes(calledWords()));
          assert.equal(movesLeft(s), 1, "the call only ever comes on the last of the 12");
        }
      }
      const m = moves[Math.floor(rnd() * moves.length)];
      const before = s; const { state: next, events } = applyMove(s, m); s = next;
      const capt = events.some((e) => e.type === "capture");
      const L0 = movesLeft(before), L1 = movesLeft(s);
      if (L1 !== null) {
        shown++; assert.ok(s.quiet >= QUIET_LIMIT - WARN && s.quiet < QUIET_LIMIT);
        assert.equal(keeps(s)[0] + keeps(s)[1], 48, "every seed is someone's");
        if (L0 !== null) assert.equal(L1, L0 - 1, "one a move"); else assert.ok(began(before, s));
      }
      if (L0 !== null && capt && !s.over) { broken++; assert.equal(L1, null, "a capture takes the line away"); }
      if (endedCircling(s)) { called++; assert.equal(L0, 1); assert.ok(!capt || events.every((e) => e.type !== "capture")); assert.deepEqual(s.pits, Array(12).fill(0)); }
    }
  }
  assert.ok(shown > 100 && called > 20 && broken > 5 && pathCalled >= called, JSON.stringify({ shown, called, broken, pathCalled }));
});

test("a game given up is not a called game, even after a long quiet stretch", () => {
  const s = { ...newGame("ncho"), quiet: QUIET_LIMIT - 2 };
  assert.ok(!endedCircling(resign(s, 0).state));
  assert.ok(!endedCircling(s));
});

test("what it leaves open never counts a called game as a capture", () => {
  let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let seen = 0;
  for (let g = 0; g < 80 && seen < 5; g++) {
    let s = newGame("ncho");
    while (!s.over) {
      const moves = legalMoves(s);
      if (s.quiet === QUIET_LIMIT - 2) for (const m of moves) {
        const a = answerOf(s, m); if (!a) continue;
        const { state: next } = applyMove(s, m);
        for (const r of legalMoves(next)) { const p = sowPath(next, r); if (p.called && a.pit === r) { assert.equal(a.got, 0); assert.deepEqual(a.captures, []); seen++; } }
      }
      s = applyMove(s, moves[Math.floor(rnd() * moves.length)]).state;
    }
  }
});

test("each opponent has a word for it, with a face", () => {
  assert.ok(MOODS.includes(MOOD_FOR.circling));
  for (const lv of Object.keys(CHARACTERS)) assert.ok(line(lv, "circling").length > 5);
});
