// Mama Ngozi doesn't play the same game twice (idea 7 Nov): in a game she picks at random among the moves her own search
// scores exactly as high as her best, so a win against her can't be copied move for move. Everything that asks for her one
// best move (hint, her take, the review, Master's model of her) still gets it from chooseMove.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { chooseMove, playMove, pickNear, rateMoves, LEVELS } from "../engine/ai.js";

const lcg = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test("pickNear: ties only, each as likely; a decided position gets the best", () => {
  const rated = [{ pit: 3, value: 2.16 }, { pit: 1, value: 2.16 }, { pit: 5, value: 2.08 }, { pit: 0, value: -1 }];
  const seen = new Map();
  const r = lcg(5);
  for (let i = 0; i < 400; i++) { const p = pickNear(rated, 0.001, r); seen.set(p, (seen.get(p) || 0) + 1); }
  assert.deepEqual([...seen.keys()].sort(), [1, 3], "only the two tied moves, never the one 0.08 worse");
  for (const n of seen.values()) assert.ok(n > 150, "each tie about half the time");
  assert.equal(pickNear([{ pit: 4, value: 1000 }, { pit: 2, value: 1000 }], 0.001, () => 0.99), 4, "a forced win: her best, as before");
  assert.equal(pickNear([{ pit: 4, value: -1000 }, { pit: 2, value: -1000 }], 0.001, () => 0.99), 4);
  assert.equal(pickNear([{ pit: 2, value: 0 }], 0.001, () => 0.999999), 2, "one move: that one, whatever the dice");
});

test("only Mama Ngozi varies; the other levels play as they did", () => {
  assert.ok(LEVELS.hard.vary > 0 && LEVELS.hard.vary < 0.01, "ties only");
  for (const lvl of ["easy", "steady", "medium"]) {
    assert.ok(!LEVELS[lvl].vary);
    let s = newGame("ncho");
    for (let k = 0; k < 12 && !s.over; k++) {
      assert.equal(playMove(s, lvl, lcg(40 + k)), chooseMove(s, lvl, lcg(40 + k)), `${lvl} move ${k}`);
      s = applyMove(s, legalMoves(s)[0]).state;
    }
  }
});

test("her move in a game is always one her search rates as her best", () => {
  for (const variant of ["ncho", "ayo"]) {
    const rnd = lcg(variant === "ncho" ? 3 : 4);
    let s = newGame(variant);
    while (!s.over && s.moves.length < 30) {
      const rated = rateMoves(s, "hard");
      const m = playMove(s, "hard", rnd);
      const v = rated.find((r) => r.pit === m).value;
      assert.ok(v >= rated[0].value - 0.001 - 1e-9, `${variant} move ${s.moves.length}: ${v} vs best ${rated[0].value}`);
      s = applyMove(s, s.turn === 0 ? m : chooseMove(s, "medium", rnd)).state;
    }
  }
});

test("the same moves from you no longer get the same game from her", () => {
  // you play the same strong line every game (her own old, fixed choices: the kind of game that beats her); she meets it with
  // different dice each game. Before, all eight games were one game.
  const games = new Set();
  for (let g = 0; g < 8; g++) {
    const rnd = lcg(1000 + g * 77);
    let s = newGame("ncho");
    while (!s.over && s.moves.length < 400) s = applyMove(s, s.turn === 1 ? playMove(s, "hard", rnd) : chooseMove(s, "hard")).state;
    games.add(s.moves.join(","));
  }
  assert.ok(games.size >= 3, `at least 3 different games out of 8 (got ${games.size})`);
});
