// The turn, read out (web/sayturn.js): the hidden line a screen reader speaks after each turn, and S on the keys.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, sideOf, seedsOnSide } from "../engine/ayo.js";
import { turnSaid, standWords, scoreWords, whoseWords, playedPit } from "../web/sayturn.js";
import { keyAction, KEYS } from "../web/keys.js";
import { translate } from "../web/i18n.js";

const rng = (seed) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const ENGLISH = /\b(pit|pits|seeds?|took|gave|ended|picked|again|their|they|them|your|you|move|played|board|side|theirs|wins?)\b/i;

test("every turn of random games is said with the engine's own score and whose move it is, from either seat", () => {
  const r = rng(5); let lines = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 60; g++) {
    let s = newGame(variant, {}, g % 2);
    while (!s.over) {
      const moves = legalMoves(s); const m = moves[Math.floor(r() * moves.length)];
      const next = applyMove(s, m).state;
      for (const you of [0, 1]) {
        const names = []; names[you] = "You"; names[1 - you] = "Mama Ngozi";
        const line = turnSaid(s, m, next, { you, names });
        const k = sideOf(s.turn).indexOf(m) + 1;
        assert.ok(line.startsWith(s.turn === you ? `You played pit ${k} · ` : `Mama Ngozi played their pit ${k} · `), line);
        assert.ok(line.includes(` · You ${next.stores[you]}, Mama Ngozi ${next.stores[1 - you]}`), line);
        if (next.over) assert.ok(!/move$/.test(line), line);
        else assert.ok(line.endsWith(next.turn === you ? " · your move" : " · Mama Ngozi's move"), line);
        const f = translate(line, "fr"); assert.notEqual(f, line, `no French for «${line}»`);
        assert.ok(!ENGLISH.test(f.replace(/Mama Ngozi/g, "")), `English left in «${f}»`);
        lines++;
      }
      s = next;
    }
  }
  assert.ok(lines > 2000, `only ${lines} lines`);
});

test("two of us: names for both, the pit counted from the mover's own side, the next player told it is theirs", () => {
  let s = newGame("ncho"); const names = ["Meka", "Tete"];
  const next = applyMove(s, 2).state;
  const line = turnSaid(s, 2, next, { you: 1, names, local: true });
  assert.ok(line.startsWith("Meka played pit 3 · "), line);
  assert.ok(line.includes(`Tete ${next.stores[1]}, Meka ${next.stores[0]}`), line);
  assert.ok(line.endsWith("Tete, your move"), line);
  assert.equal(translate("Tete, your move", "fr"), "Tete, à vous");
  assert.equal(playedPit(8, 1, { you: 1, names, local: true }), "Tete played pit 3");
});

test("S says where the game stands, and the key means S only without a modifier or a field", () => {
  const s = applyMove(newGame("ncho"), 5).state; const names = ["You", "Nnamdi"];
  const w = standWords(s, { you: 0, names });
  assert.equal(w, `You ${s.stores[0]}, Nnamdi ${s.stores[1]} · on the board: ${seedsOnSide(s, 0)} on your side, ${seedsOnSide(s, 1)} on theirs · Nnamdi's move`);
  assert.equal(translate(w, "fr"), `Vous ${s.stores[0]}, Nnamdi ${s.stores[1]} · sur le plateau : ${seedsOnSide(s, 0)} de votre côté, ${seedsOnSide(s, 1)} en face · à Nnamdi de jouer`);
  const done = { ...s, over: true, winner: 1 };
  assert.ok(standWords(done, { you: 0, names }).endsWith(" · Nnamdi wins"));
  assert.ok(standWords({ ...s, over: true, winner: 0 }, { you: 0, names }).endsWith(" · you win"));
  assert.ok(standWords({ ...s, over: true, winner: "draw" }, { you: 0, names }).endsWith(" · the game ends level"));
  assert.equal(whoseWords(done, { you: 0, names }), "");
  assert.equal(scoreWords(s, { you: 1, names: ["Adaeze", "You"] }), `You ${s.stores[1]}, Adaeze ${s.stores[0]}`);
  assert.deepEqual(KEYS.say, ["s", "S"]);
  assert.deepEqual(keyAction({ key: "s" }), { type: "say" });
  assert.equal(keyAction({ key: "s", metaKey: true }), null);
  assert.equal(keyAction({ key: "S" }, { tag: "input" }), null);
});

test("a move that cannot be read says nothing", () => {
  const s = newGame("ncho");
  assert.equal(turnSaid(s, 7, s, {}), "");
  assert.equal(turnSaid(s, 2, null, {}), "");
});
