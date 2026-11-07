// Your best ever (idea 7 Nov): the bests read from a replay of the engine, kept per game, said only when beaten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, resign, replay } from "../engine/ayo.js";
import { parse, gameBests, record, bestsWords, bestMove, QUIET_GAMES } from "../web/bests.js";
import { translate } from "../web/i18n.js";

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function randomGame(seed, variant = "ncho", first = 0) {
  const r = rng(seed); let s = newGame(variant, {}, first); const moves = []; const turns = [];
  while (!s.over && moves.length < 300) {
    const legal = legalMoves(s); const m = legal[Math.floor(r() * legal.length)]; const mover = s.turn; const before = s.stores.slice();
    const res = applyMove(s, m); moves.push(m); turns.push({ mover, got: res.state.stores.map((v, k) => v - before[k]), relays: res.events.filter((e) => e.type === "pickup" && e.relay).length }); s = res.state;
  }
  return { moves, state: s, turns };
}

test("a game's bests are the engine's own: the most seeds in one of your turns, the most relays, the result", () => {
  for (const variant of ["ncho", "ayo"]) for (let seed = 1; seed <= 80; seed++) for (const first of [0, 1]) {
    const { moves, state, turns } = randomGame(seed, variant, first);
    for (const player of [0, 1]) {
      const g = gameBests(moves, variant, {}, player, first);
      const mine = turns.map((t, i) => ({ ...t, i })).filter((t) => t.mover === player);
      const most = Math.max(0, ...mine.map((t) => t.got[player]));
      assert.equal(g.turn, most);
      if (most) assert.equal(g.turnAt, mine.find((t) => t.got[player] === most).i, "the first such turn");
      const rl = Math.max(0, ...mine.map((t) => t.relays));
      assert.equal(g.relay, rl);
      if (rl) { assert.equal(g.relayAt, mine.find((t) => t.relays === rl).i); assert.equal(turns[g.relayAt].mover, player); }
      if (variant === "ayo") assert.equal(g.relay, 0, "no relays in Ayo");
      assert.deepEqual(g.score, [state.stores[player], state.stores[1 - player]]);
      assert.equal(g.won, state.winner === player); assert.equal(g.moves, moves.length);
      if (g.turnAt >= 0) assert.equal(turns[g.turnAt].mover, player, "a best turn is always your own");
    }
  }
});

test("a game given up or agreed is never a widest or quickest win", () => {
  const { moves } = randomGame(3);
  const g = gameBests(moves.slice(0, 6), "ncho", {}, 0, 0, "gave_up");
  assert.equal(g.won, false);
  const s = resign(replay(moves.slice(0, 6), "ncho"), 1).state; assert.equal(s.winner, 0); // the engine says you won; the best doesn't
  const r = record({ ...parse(null), ncho: { games: 9, turn: 30, relay: 9, margin: [30, 10], quick: 80 } }, "ncho", g, 1);
  assert.deepEqual(r.news, []); assert.equal(r.entry.quick, 80);
});

test("the record: kept per game, counted once, quiet for the first games, then says what was beaten", () => {
  let d = parse(null); const g = (turn, relay, won, score, moves) => ({ turn, relay, won, score, moves });
  // the first QUIET_GAMES games keep their bests without a word
  for (let i = 0; i < QUIET_GAMES; i++) { const r = record(d, "ncho", g(4 + i, i, true, [26, 20 - i], 60 - i), i); d = r.data; assert.deepEqual(r.news, []); assert.ok(r.counted); }
  assert.deepEqual(d.ncho, { games: 3, turn: 6, relay: 2, margin: [26, 18], quick: 58 });
  // the same game again is not counted
  const again = record(d, "ncho", g(40, 9, true, [40, 8], 10), 2); assert.equal(again.counted, false); assert.deepEqual(again.data.ncho, d.ncho);
  // a game that beats nothing says nothing
  let r = record(d, "ncho", g(6, 2, false, [20, 25], 70), 10); assert.deepEqual(r.news, []); d = r.data; assert.equal(d.ncho.games, 4);
  // a win that beats all four, in the card's order
  r = record(d, "ncho", g(12, 5, true, [30, 14], 41), 11); assert.deepEqual(r.news, ["turn", "relay", "margin", "quick"]); d = r.data;
  assert.deepEqual(d.ncho, { games: 5, turn: 12, relay: 5, margin: [30, 14], quick: 41 });
  // a level margin with more seeds is the better win; a loss never touches the wins
  r = record(d, "ncho", g(3, 0, true, [33, 17], 60), 12); assert.deepEqual(r.news, ["margin"]); d = r.data;
  r = record(d, "ncho", g(3, 0, false, [1, 47], 5), 13); assert.deepEqual(r.news, []); assert.equal(r.data.ncho.quick, 41);
  // Ayo is kept apart and starts quiet
  r = record(r.data, "ayo", g(20, 0, true, [40, 8], 30), 14); assert.deepEqual(r.news, []); assert.equal(r.data.ncho.turn, 12); assert.equal(r.data.ayo.turn, 20);
  // the input is never changed
  assert.equal(d.ncho.games, 6);
});

test("storage survives a round trip and refuses nonsense", () => {
  const d = record(parse(null), "ncho", { turn: 8, relay: 3, won: true, score: [27, 21], moves: 50 }, 77).data;
  assert.deepEqual(parse(JSON.stringify(d)), d);
  assert.deepEqual(parse("{not json").ncho, { games: 0, turn: 0, relay: 0, margin: null, quick: 0 });
  const odd = parse(JSON.stringify({ ncho: { games: -2, turn: "9", relay: 1.5, margin: [10, 20], quick: 7 } }));
  assert.deepEqual(odd.ncho, { games: 0, turn: 0, relay: 0, margin: null, quick: 7 });
});

test("the card's words, and the French part by part", () => {
  const e = { turn: 18, relay: 6, margin: [30, 18], quick: 34 };
  assert.equal(bestsWords([], e), "");
  assert.equal(bestsWords(["turn", "relay", "margin", "quick"], e), "Your best ever · biggest turn, 18 seeds · 6 pick-ups in one turn · widest win, 30–18 · quickest win, 34 moves");
  assert.equal(bestsWords(["relay"], { ...e, relay: 1 }), "Your best ever · 1 pick-up in one turn");
  assert.equal(translate("Your best ever", "fr"), "Votre record");
  assert.equal(translate("biggest turn, 18 seeds", "fr"), "plus grand tour, 18 graines");
  assert.equal(translate("6 pick-ups in one turn", "fr"), "6 reprises en un tour");
  assert.equal(translate("1 pick-up in one turn", "fr"), "1 reprise en un tour");
  assert.equal(translate("widest win, 30–18", "fr"), "plus large victoire, 30–18");
  assert.equal(translate("quickest win, 34 moves", "fr"), "victoire la plus rapide, 34 coups");
  assert.equal(translate("biggest turn, 18 seeds · quickest win, 34 moves", "fr"), "plus grand tour, 18 graines · victoire la plus rapide, 34 coups");
  // the turn to watch: the biggest turn first, else the relay, else none (a whole-game best)
  const g = { turnAt: 9, relayAt: 4 };
  assert.equal(bestMove(["turn", "relay"], g), 9); assert.equal(bestMove(["relay", "quick"], g), 4); assert.equal(bestMove(["margin"], g), -1);
});
