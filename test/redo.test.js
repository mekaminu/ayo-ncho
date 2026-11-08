// Put it back (web/redo.js): after an Undo the moves taken back can be played again, the computer's reply exactly as before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterUndo, ready, step, afterMove, gameKey, chipWords } from "../web/redo.js";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { undoPlan } from "../web/takeback.js";

const K = gameKey({ variant: "ncho", first: 0, rules: { capture: 4 } });

test("one Undo against the computer puts back your move and their reply, two at a time", () => {
  const line = afterUndo(null, [2, 7, 4, 9], [2, 7], K);
  assert.deepEqual(line, { base: [2, 7], rest: [4, 9], key: K });
  assert.ok(ready(line, [2, 7], K));
  assert.deepEqual(step(line), { mine: 4, reply: 9 });
  assert.deepEqual(step(line, { local: true }), { mine: 4, reply: null }, "two of us: one move a press");
  const a = afterMove(line, [2, 7, 4], K); assert.deepEqual(a.rest, [9]);
  assert.equal(afterMove(a, [2, 7, 4, 9], K), null, "all put back: the chip goes");
});

test("Undo twice queues four moves in the order they were played", () => {
  let line = afterUndo(null, [1, 7, 2, 8], [1, 7], K);
  line = afterUndo(line, [1, 7], [], K);
  assert.deepEqual(line.rest, [1, 7, 2, 8]); assert.deepEqual(line.base, []);
  assert.equal(chipWords(line.rest.length), "4 moves"); assert.equal(chipWords(1), "1 move");
});

test("a different pit, another game or a move since ends it", () => {
  const line = afterUndo(null, [2, 7, 4, 9], [2, 7], K);
  assert.equal(afterMove(line, [2, 7, 5], K), null, "a different pit");
  assert.equal(ready(line, [2, 7], gameKey({ variant: "ayo", first: 0 })), false, "another game");
  assert.equal(ready(line, [2, 7, 4], K), false, "a move played since");
  assert.equal(afterUndo(line, [3, 8], [3], gameKey({ variant: "ncho", first: 1, rules: { capture: 4 } })).rest.length, 1, "a new line in a new game");
  assert.equal(ready(null, [], K), false);
});

test("putting back replays the game exactly: the engine reaches the same position", () => {
  let s = newGame("ncho"); const moves = [];
  for (let i = 0; i < 10 && !s.over; i++) { const m = legalMoves(s)[i % legalMoves(s).length]; s = applyMove(s, m).state; moves.push(m); }
  const full = s; const u = undoPlan({ moves: s.moves, turn: s.turn, you: s.turn, local: false });
  let line = afterUndo(null, s.moves, u.keep, gameKey(s));
  let t = newGame("ncho"); for (const m of u.keep) t = applyMove(t, m).state;
  while (line) { const st = step(line); t = applyMove(t, st.mine).state; line = afterMove(line, t.moves, gameKey(t)); if (st.reply !== null) { t = applyMove(t, st.reply).state; line = afterMove(line, t.moves, gameKey(t)); } }
  assert.deepEqual(t.pits, full.pits); assert.deepEqual(t.stores, full.stores); assert.equal(t.turn, full.turn);
});

test("the board wires it: a chip under the board, R on the keys, the shell caches it", () => {
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(game, /from '\.\/redo\.js'/);
  assert.match(game, /a\.type === 'redo'/);
  assert.match(html, /id="redoBtn" hidden/);
  assert.ok(sw.includes("'./redo.js'"));
});
