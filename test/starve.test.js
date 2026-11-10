// Nothing they can play (web/feed.js starveOf / starveWords): their side is empty and the feed rule does not narrow the move, yet a
// pit that leaves them none ends the game. The hint line says so before the tap; checked against the engine itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { starveOf, starveWords, narrowOf } from "../web/feed.js";
import { newGame, legalMoves, applyMove, seedsOnSide } from "../engine/ayo.js";
import { translate } from "../web/i18n.js";

const at = (pits, turn = 0, variant = "ayo", stores = [22, 22]) => ({ ...newGame(variant), pits, turn, stores });

test("their side empty and no pit of yours reaches them: the game ends on this move", () => {
  const s = at([1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], 0, "ayo", [23, 23]);
  assert.equal(narrowOf(s), null, "the feed rule does not narrow it: no pit can feed them");
  const st = starveOf(s); assert.deepEqual(st, { all: true, pits: [0, 3] });
  assert.equal(starveWords(st), "They have no seeds and no pit of yours gives them any — the game ends on this move");
  for (const p of st.pits) assert.equal(applyMove(s, p).state.over, true, "and the engine ends it");
});

test("from the far seat, and only on your own move", () => {
  const s = at([0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0], 1, "ayo", [23, 23]);
  assert.deepEqual(starveOf(s, 1), { all: true, pits: [6, 9] });
  assert.equal(starveOf(s, 0), null, "not your move");
});

test("only some pits leave them none (Nchò's relay can reach them): those pits are named", () => {
  const s = at([0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0], 1, "ncho", [20, 24]);
  const st = starveOf(s, 1); assert.ok(st && !st.all, JSON.stringify(st));
  for (const p of legalMoves(s)) assert.equal(st.pits.includes(p), seedsOnSide(applyMove(s, p).state, 0) === 0);
  assert.match(starveWords(st, { you: 1 }), /^They have no seeds — pits? [\d, or]+ would leave them none and end the game$/);
});

test("nothing to say when they have seeds, when the rule already narrows it, or when only one pit has seeds", () => {
  assert.equal(starveOf(newGame("ncho")), null);
  assert.equal(starveOf(at([0, 1, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0], 0, "ncho")), null, "feedWords speaks: you must feed them");
  assert.equal(starveOf(at([0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0, "ayo", [23, 24])), null, "one pit: picked for you, its tap says it");
  assert.equal(starveOf(null), null); assert.equal(starveWords(null), "");
});

test("in French", () => {
  assert.equal(translate("They have no seeds and no pit of yours gives them any — the game ends on this move", "fr"),
    "L’autre côté n’a plus de graines et aucun de vos trous ne lui en donne — la partie s’arrête sur ce coup");
  assert.equal(translate("They have no seeds — pits 1, 2 or 5 would leave them none and end the game", "fr"),
    "L’autre côté n’a plus de graines — les trous 1, 2 ou 5 ne laisseraient rien à l’autre côté et finiraient la partie");
  assert.equal(translate("They have no seeds — pit 3 would leave them none and end the game", "fr"),
    "L’autre côté n’a plus de graines — le trou 3 ne laisserait rien à l’autre côté et finirait la partie");
});

test("over random games of both kinds: said exactly when a pit the rule allows ends the game with their side empty", () => {
  let seed = 5; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const seen = { ncho: 0, ayo: 0, all: 0, some: 0 };
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 400; g++) {
    let s = newGame(variant);
    while (!s.over && s.moves.length < 400) {
      const you = s.turn, legal = legalMoves(s), st = starveOf(s, you);
      const hungry = seedsOnSide(s, 1 - you) === 0;
      const enders = legal.filter((p) => seedsOnSide(applyMove(s, p).state, 1 - you) === 0);
      if (hungry && !narrowOf(s, you) && legal.length > 1 && enders.length) {
        assert.deepEqual(st, { all: enders.length === legal.length, pits: enders }); seen[variant]++; seen[st.all ? "all" : "some"]++;
        for (const p of enders) assert.equal(applyMove(s, p).state.over, true, "a pit that leaves them none ends the game");
        assert.ok(translate(starveWords(st, { you }), "fr") !== starveWords(st, { you }), "every such line has its French");
      } else assert.equal(st, null);
      s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
    }
  }
  assert.ok(seen.ncho > 0 && seen.ayo > 0 && seen.all > 0 && seen.some > 0, JSON.stringify(seen));
});
