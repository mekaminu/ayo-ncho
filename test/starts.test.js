import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay, firstMover, owner } from "../engine/ayo.js";
import { parseStarts, recordStart, nextStart, startWords } from "../web/starts.js";
import { gameStory } from "../web/story.js";
import { bestTurn } from "../web/clip.js";

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function randomGame(seed, variant = "ncho", first = 0) {
  const r = rng(seed); let s = newGame(variant, {}, first); const moves = [];
  while (!s.over && moves.length < 300) { const legal = legalMoves(s); const m = legal[Math.floor(r() * legal.length)]; moves.push(m); s = applyMove(s, m).state; }
  return { moves, state: s };
}

test("a game can start with either seat, and the move list says who started", () => {
  const g = newGame("ncho", {}, 1);
  assert.equal(g.turn, 1); assert.equal(g.first, 1);
  assert.deepEqual(legalMoves(g), [6, 7, 8, 9, 10, 11]);
  assert.throws(() => applyMove(g, 0), /not your pit/);
  assert.equal(newGame().turn, 0); assert.equal(newGame().first, 0);
  assert.equal(firstMover([]), 0); assert.equal(firstMover([], 1), 1); assert.equal(firstMover([8, 2]), 1); assert.equal(firstMover([3]), 0);
});

test("replay rebuilds a game the far seat started, move for move (undo, resume, the card's replays)", () => {
  for (const variant of ["ncho", "ayo"]) for (let seed = 1; seed <= 40; seed++) {
    const { moves, state } = randomGame(seed, variant, 1);
    assert.equal(owner(moves[0]), 1);
    const again = replay(moves, variant);
    assert.deepEqual(again.pits, state.pits); assert.deepEqual(again.stores, state.stores);
    assert.equal(again.turn, state.turn); assert.equal(again.winner, state.winner); assert.equal(again.first, 1);
    // every prefix replays too (undo), and an empty list keeps its first mover when told
    for (const k of [1, 2, 5]) if (k <= moves.length) assert.equal(replay(moves.slice(0, k), variant).turn, k % 2 === 1 ? 0 : 1);
    assert.equal(replay([], variant, {}, 1).turn, 1);
  }
});

test("the Game over card's story and the clip read a game the computer started", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { moves, state } = randomGame(seed, "ncho", 1);
    const st = gameStory(moves, "ncho", {}, 0);
    assert.equal(st.leads[st.leads.length - 1], state.stores[0] - state.stores[1]);
    assert.equal(st.turns[0].mover, 1);
    const t = bestTurn(moves, "ncho", {}, 0);
    if (t) assert.equal(t.before.turn, 0);
  }
});

test("the loser starts the next game; after a draw the other side does; the setting can fix it", () => {
  assert.deepEqual(nextStart("loser", undefined), { first: 0, why: "first" });
  assert.deepEqual(nextStart("loser", { first: 0, winner: 0 }), { first: 1, why: "lost" });
  assert.deepEqual(nextStart("loser", { first: 1, winner: 0 }), { first: 1, why: "lost" });
  assert.deepEqual(nextStart("loser", { first: 0, winner: 1 }), { first: 0, why: "lost" });
  assert.deepEqual(nextStart("loser", { first: 0, winner: "draw" }), { first: 1, why: "draw" });
  assert.deepEqual(nextStart("loser", { first: 1, winner: "draw" }), { first: 0, why: "draw" });
  assert.deepEqual(nextStart("you", { first: 0, winner: 0 }), { first: 0, why: "set" });
  assert.deepEqual(nextStart("them", undefined), { first: 1, why: "set" });
  assert.deepEqual(nextStart("loser", { first: 7, winner: 0 }), { first: 0, why: "first" });
});

test("the record of who started is kept per opponent and survives a bad store", () => {
  assert.deepEqual(parseStarts(null), {}); assert.deepEqual(parseStarts("{oops"), {}); assert.deepEqual(parseStarts("[1]"), {});
  let d = recordStart({}, "hard", 0, 0);
  d = recordStart(d, "local", 1, "draw");
  d = recordStart(d, "easy", 0, null); // an unfinished game is not recorded
  assert.deepEqual(parseStarts(JSON.stringify(d)), { hard: { first: 0, winner: 0 }, local: { first: 1, winner: "draw" } });
  assert.equal(nextStart("loser", d.hard).first, 1); assert.equal(nextStart("loser", d.easy).first, 0);
});

test("the words as the game starts", () => {
  assert.equal(startWords({ first: 1, why: "lost" }, ["You", "Mama Ngozi"]), "Mama Ngozi starts — the loser goes first");
  assert.equal(startWords({ first: 0, why: "lost" }, ["You", "Nnamdi"]), "You start — the loser goes first");
  assert.equal(startWords({ first: 1, why: "draw" }, ["You", "Adaeze"]), "Adaeze starts — after a draw, the other side goes first");
  assert.equal(startWords({ first: 1, why: "set" }, ["You", "Adaeze"]), "Adaeze starts");
  assert.equal(startWords({ first: 1, why: "lost" }, ["Player 1", "Player 2"], false), "Player 2 starts — the loser goes first");
  assert.equal(startWords({ first: 0, why: "first" }, ["Player 1", "Player 2"], false), "Player 1 starts");
});
