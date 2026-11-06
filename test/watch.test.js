// Watch the whole game (web/watch.js): a game sent as a link plays back exactly as it was played, and nothing else is accepted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, owner, RULES } from "../engine/ayo.js";
import { encodeGame, decodeGame, watchQuery, cleanName, titleWords, moveWords, endWords, linkWords, MAX_NAME } from "../web/watch.js";
import { translate } from "../web/i18n.js";

let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
function randomGame(variant, rules, first, stopAt = Infinity) {
  let s = newGame(variant, rules, first); const moves = [];
  while (!s.over && moves.length < stopAt) { const ms = legalMoves(s); const m = ms[Math.floor(rnd() * ms.length)]; moves.push(m); s = applyMove(s, m).state; }
  return { variant, rules: s.rules, first, moves, end: s };
}

test("every game, of both kinds, either seat first, any rules, comes back move for move through the link", () => {
  let n = 0;
  for (const variant of ["ncho", "ayo"]) for (const first of [0, 1]) for (const tweak of [{}, { relay: !RULES[variant].relay }, { capture: RULES[variant].capture === 4 ? 23 : 4, last8: !RULES[variant].last8 }]) for (let g = 0; g < 15; g++) {
    const rules = { ...RULES[variant], ...tweak };
    const game = randomGame(variant, rules, first, g % 5 === 0 ? 7 + g : Infinity);
    const q = watchQuery(game, ["Meka", "Mama Ngozi"]); assert.ok(q && q.length < 900);
    const p = new URLSearchParams(q.slice(1));
    const w = decodeGame(p.get("watch"), p.get("a"), p.get("b"));
    assert.ok(w, `decodes ${p.get("watch")}`);
    assert.equal(w.variant, variant); assert.deepEqual(w.rules, { capture: rules.capture, relay: rules.relay, last8: rules.last8 }); assert.equal(w.first, first);
    assert.deepEqual(w.moves, game.moves); assert.deepEqual(w.names, ["Meka", "Mama Ngozi"]);
    const last = w.states[w.states.length - 1];
    assert.deepEqual(last.pits, game.end.pits); assert.deepEqual(last.stores, game.end.stores); assert.equal(last.over, game.end.over);
    assert.equal(w.states.length, game.moves.length + 1);
    n++;
  }
  assert.equal(n, 180);
});

test("anything that is not a legal game is refused, never guessed", () => {
  const game = randomGame("ncho", RULES.ncho, 0);
  const code = encodeGame(game);
  assert.equal(decodeGame(code.slice(0, 6)), null); // no moves
  assert.equal(decodeGame("x" + code.slice(1)), null);
  assert.equal(decodeGame(code + "z"), null);
  assert.equal(decodeGame(code.replace(/^(.{4})0/, "$11")), null); // seat 1 said to start but seat 0's pit moves first
  assert.equal(decodeGame(code + "0"), null); // a move after the game is over
  assert.equal(decodeGame(null), null); assert.equal(decodeGame(""), null);
  // an illegal move somewhere: an empty pit played
  let bad = 0;
  for (let i = 1; i < Math.min(game.moves.length, 30); i++) {
    let s = newGame("ncho", RULES.ncho, 0); for (const m of game.moves.slice(0, i)) s = applyMove(s, m).state;
    const illegal = [...Array(12).keys()].find((p) => !legalMoves(s).includes(p));
    if (illegal == null) continue;
    const moves = [...game.moves.slice(0, i), illegal];
    assert.equal(decodeGame(code.split(".")[0] + "." + moves.map((m) => "0123456789ab"[m]).join("")), null); bad++;
  }
  assert.ok(bad > 5);
  assert.equal(encodeGame({ variant: "ncho", moves: [] }), null);
});

test("names from a link are made safe and short", () => {
  assert.equal(cleanName("  Tete  ", "x"), "Tete");
  assert.equal(cleanName("<b>Ada</b>\n\u0007", "x"), "bAda/b");
  assert.equal(cleanName("", "Player 1"), "Player 1"); assert.equal(cleanName(null, "Player 2"), "Player 2");
  assert.ok(cleanName("a".repeat(80), "x").length <= MAX_NAME);
  const w = decodeGame(encodeGame(randomGame("ayo", RULES.ayo, 1)), "<script>", undefined);
  assert.deepEqual(w.names, ["script", "Player 2"]);
});

test("the words say who plays each move and how it ended, in English and in French", () => {
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 20; g++) {
    const game = randomGame(variant, RULES[variant], g % 2, g % 4 === 0 ? 11 : Infinity);
    const w = decodeGame(encodeGame(game), "Meka", "Tete");
    assert.equal(titleWords(w), `Meka vs Tete · ${variant === "ayo" ? "Ayo" : "Nchò"} · ${game.moves.length} moves`);
    w.moves.forEach((m, i) => { const l = moveWords(w, i); assert.ok(l.endsWith(owner(m) === 0 ? "Meka plays" : "Tete plays")); assert.ok(l.startsWith(`Move ${i + 1} of ${w.moves.length}`)); });
    const e = endWords(w), s = game.end;
    if (!s.over) assert.match(e, /^Meka and Tete stopped at \d+–\d+ after \d+ moves$/);
    else if (s.winner === "draw") assert.equal(e, `Meka and Tete drew ${s.stores[0]}–${s.stores[1]}`);
    else if (s.winner === 0) assert.equal(e, `Meka beat Tete ${s.stores[0]}–${s.stores[1]}`);
    else assert.equal(e, `Tete beat Meka ${s.stores[1]}–${s.stores[0]}`);
    for (const l of [titleWords(w), moveWords(w, 0), endWords(w), linkWords(), moveWords(w, 0) + " — tap the board to hurry", moveWords(w, 0) + " · click the board or press Space to hurry"]) {
      const f = translate(l, "fr"); assert.notEqual(f, l, `French for «${l}»`);
      assert.ok(!/\b(vs|Move|of|plays|beat|and|drew|stopped|after|moves|Watch)\b/.test(f), `English left in «${f}»`);
    }
  }
  assert.equal(translate("Move 1 of 3 · Player 2 plays", "fr"), "Coup 1 sur 3 · Joueur 2 joue");
});
