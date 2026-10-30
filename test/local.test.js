import { test } from "node:test";
import assert from "node:assert/strict";
import { NAMES, TAU, seatOf, swingTheta, badgeFlip, turnWords, overTitle, continueLine, undoTo, shareText } from "../web/local.js";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";

test("the near seat is the player to move, and the board always swings on in the same direction to face them", () => {
  let s = newGame("ncho");
  assert.equal(seatOf(s), 0);
  s = applyMove(s, 0).state; assert.equal(seatOf(s), 1);
  s = applyMove(s, legalMoves(s)[0]).state; assert.equal(seatOf(s), 0);
  // from the start (0) to seat 1 is half a turn on; to seat 0 again is another half on, never back
  let th = 0;
  th = swingTheta(th, 1); assert.ok(Math.abs(th - Math.PI) < 1e-9);
  th = swingTheta(th, 0); assert.ok(Math.abs(th - TAU) < 1e-9, "a whole turn, not back to 0");
  th = swingTheta(th, 1); assert.ok(Math.abs(th - 3 * Math.PI) < 1e-9);
  // already facing the seat (within a drag's wobble): the nearest facing angle at or beyond, never a whole turn for nothing
  assert.ok(Math.abs(swingTheta(0.3, 0) - TAU) < 1e-9, "dragged a little past 0: carries on round to face seat 0 again");
  assert.ok(Math.abs(swingTheta(-0.3, 0) - 0) < 1e-9, "dragged a little short of 0: the short way on");
  assert.ok(Math.abs(swingTheta(Math.PI, 1) - Math.PI) < 1e-9, "exactly facing seat 1 stays put");
  for (let i = 0; i < 50; i++) { const t0 = (Math.random() - 0.5) * 40; for (const seat of [0, 1]) { const t1 = swingTheta(t0, seat); assert.ok(t1 >= t0 - 1e-9, "forward only"); assert.ok(t1 - t0 <= TAU + 1e-9, "at most one turn"); assert.ok(Math.abs(Math.cos(t1) - (seat ? -1 : 1)) < 1e-9, "faces the seat"); } }
});

test("the count badges follow the camera, not the seat: seen from the far end they sit the other way round", () => {
  assert.equal(badgeFlip(0), 1); assert.equal(badgeFlip(Math.PI), -1); assert.equal(badgeFlip(TAU), 1); assert.equal(badgeFlip(3 * Math.PI), -1);
  assert.equal(badgeFlip(1.2), 1, "a tilt short of a quarter turn still reads from the near end");
  assert.equal(badgeFlip(2.0), -1, "past a quarter turn the far side is nearer");
});

test("the HUD, the Game over card, Continue and the share words speak of Player 1 and Player 2, never 'you'", () => {
  let s = newGame("ncho");
  assert.deepEqual(turnWords(s), { turn: "your move", sub: "waiting" });
  assert.equal(continueLine(s), "Two of us · level 0 – 0 · 0 moves in");
  s = { ...s, stores: [12, 8], moves: [0, 6, 1, 7] };
  assert.equal(continueLine(s), "Two of us · Player 1 leads 12 – 8 · 4 moves in");
  s = { ...s, stores: [8, 12] };
  assert.equal(continueLine(s), "Two of us · Player 2 leads 8 – 12 · 4 moves in");
  const over = { ...s, over: true, winner: 1, stores: [21, 27], moves: Array(40).fill(0) };
  assert.deepEqual(turnWords(over), { turn: "game over", sub: "" });
  assert.equal(overTitle(over), "Player 2 wins");
  assert.equal(shareText(over), "Ayo & Nchò — Player 2 beat Player 1 27–21 in 40 moves, both on one phone.");
  assert.equal(overTitle({ ...over, winner: 0 }), "Player 1 wins");
  assert.equal(shareText({ ...over, winner: 0, stores: [27, 21] }), "Ayo & Nchò — Player 1 beat Player 2 27–21 in 40 moves, both on one phone.");
  assert.equal(overTitle({ ...over, winner: "draw", stores: [24, 24] }), "A draw");
  assert.equal(shareText({ ...over, winner: "draw", stores: [24, 24] }), "Ayo & Nchò — Player 1 and Player 2 drew 24–24 in 40 moves, both on one phone.");
  assert.deepEqual(NAMES, ["Player 1", "Player 2"]);
});

test("undo takes back one move, so the player who just played has it again and the board faces them", () => {
  let s = newGame("ncho"); const moves = [];
  for (let i = 0; i < 7; i++) { const m = legalMoves(s)[0]; moves.push(m); s = applyMove(s, m).state; }
  const back = undoTo(moves); assert.equal(back.length, 6);
  const r = replay(back, "ncho"); assert.equal(r.turn, 0, "the seventh move was Player 1's: taking it back, it is Player 1's turn again");
  assert.equal(seatOf(r), 0);
  const r2 = replay(undoTo(back), "ncho"); assert.equal(seatOf(r2), 1, "and the sixth was Player 2's");
  assert.deepEqual(undoTo([3]), [], "the very first move can be taken back too");
});
