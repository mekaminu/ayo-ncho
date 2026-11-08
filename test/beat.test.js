// Beat my turn (web/beat.js): a best turn travels as a link, comes back as the same position from the near side, and the
// turn to beat is worked out again through the engine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { bestTurn } from "../web/clip.js";
import { attempt } from "../engine/puzzle.js";
import { turnRound, beatQuery, parseBeat, beatResult, beatAsk, beatDay, beatShare, beatLinkWords, beatShowWords, MIN_SEEDS } from "../web/beat.js";
import { translate } from "../web/i18n.js";

let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
function randomGame(variant, first = 0) {
  let s = newGame(variant, {}, first); const moves = [];
  while (!s.over && moves.length < 300) { const ms = legalMoves(s); const m = ms[Math.floor(rnd() * ms.length)]; moves.push(m); s = applyMove(s, m).state; }
  return { variant, rules: s.rules, first, moves, end: s };
}
const q = (query) => new URLSearchParams(query.slice(1));

test("the board turned round plays exactly the same: every move from the far seat matches its twin from the near seat", () => {
  for (const variant of ["ncho", "ayo"]) for (let n = 0; n < 40; n++) {
    const g = randomGame(variant, n % 2); let s = newGame(variant, {}, g.first);
    for (const m of g.moves) {
      if (s.turn === 1) {
        const r = turnRound(s, 1); assert.equal(r.turn, 0);
        assert.deepEqual(legalMoves(r), legalMoves(s).map((p) => p - 6));
        const a = applyMove(s, m).state, b = applyMove(r, m - 6).state;
        assert.deepEqual(b.pits, [...a.pits.slice(6), ...a.pits.slice(0, 6)]); assert.deepEqual(b.stores, [a.stores[1], a.stores[0]]);
      }
      s = applyMove(s, m).state;
    }
  }
});

test("a best turn, from either seat, comes back as the same position with the same take from the near side", () => {
  let made = 0;
  for (const variant of ["ncho", "ayo"]) for (let n = 0; n < 30; n++) {
    const g = randomGame(variant, n % 2);
    for (const player of [0, 1]) {
      const turn = bestTurn(g.moves, variant, g.rules, player); const query = beatQuery(g, turn, "Meka");
      if (!turn || turn.seeds < MIN_SEEDS) { assert.equal(query, null); continue; }
      const p = parseBeat(q(query).get("beat"), q(query).get("n")); assert.ok(p); made++;
      assert.equal(p.name, "Meka"); assert.equal(p.target, turn.seeds); assert.equal(p.state.turn, 0);
      assert.ok(legalMoves(p.state).includes(p.answer));
      const r = attempt(p, p.answer); assert.equal(r.got, turn.seeds); assert.ok(r.hit);
      const back = player ? [...turn.before.pits.slice(6), ...turn.before.pits.slice(0, 6)] : turn.before.pits; assert.deepEqual(p.state.pits, back);
      assert.deepEqual(p.state.moves, []); assert.equal(p.key, "beat");
      assert.equal(parseBeat(q(p.query).get("beat"), q(p.query).get("n")).target, p.target); // the friend's share sends the same turn on
    }
  }
  assert.ok(made > 40);
});

test("nothing else is taken: bad codes, a turn that took too little, made-up moves", () => {
  assert.equal(parseBeat("", "x"), null); assert.equal(parseBeat("n4110.zz", "x"), null); assert.equal(parseBeat(null, null), null);
  assert.equal(parseBeat("n4110.0", "x"), null); // the first move takes nothing
  assert.equal(parseBeat("n4110.6", "x"), null); // not the first mover's pit
  assert.equal(beatQuery({ variant: "ncho", moves: [0] }, { index: 0, seeds: 1 }, "M"), null);
  assert.equal(beatQuery({ variant: "ncho", moves: [0] }, null, "M"), null);
  const g = randomGame("ncho"); const turn = bestTurn(g.moves, "ncho", g.rules, 0); const p = parseBeat(q(beatQuery(g, turn, "<b>Tete</b>\n")).get("beat"), "<b>Tete</b>\n");
  assert.equal(p.name, "bTete/b"); // no markup from a link
  assert.equal(parseBeat(q(beatQuery(g, turn, "")).get("beat"), "").name, "A friend");
});

test("the words: beat it, match it, fall short — and the French", () => {
  const p = { name: "Meka", target: 8, variant: "ncho" };
  assert.deepEqual(beatResult(9, p), { badge: "You beat Meka", hit: true, line: "9 where Meka took 8" });
  assert.equal(beatResult(8, p).badge, "Level with Meka"); assert.ok(beatResult(8, p).hit);
  assert.equal(beatResult(5, p).badge, "Short of Meka"); assert.ok(!beatResult(5, p).hit);
  assert.equal(beatAsk(p), "Meka took 8 in one turn. Can you?"); assert.equal(beatDay(p), "From Meka's game · Nchò");
  const fr = (s) => translate(s, "fr");
  for (const s of [beatAsk(p), beatDay(p), beatResult(9, p).badge, beatResult(8, p).badge, beatResult(5, p).badge, beatResult(9, p).line, beatResult(8, p).line, beatResult(5, p).line, beatLinkWords(8), beatShowWords(p), beatShare(9, p), beatShare(8, p), beatShare(5, p), `${p.name}: watch this one…`, `${p.name}'s move captures`])
    assert.notEqual(fr(s), s, s);
  assert.equal(fr(beatAsk(p)), "Meka en a pris 8 en un tour. Et vous ?");
});
