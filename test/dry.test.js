// A side run dry (web/dry.js): the engine ends the game when the side to move has no seeds and the other side keeps its own;
// the board only reads and words it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, totalSeeds, seedsOnSide, sideOf, WIN_SEEDS, QUIET_LIMIT } from "../engine/ayo.js";
import { dryOf, dryEnd, dryWords, dryMoment, dryEnded, DRY_RULE } from "../web/dry.js";
import { sowPath, pathWords, playedWords } from "../web/path.js";
import { ruleKeys, LINES } from "../web/rulesays.js";
import { translate } from "../web/i18n.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
let seed = 23;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
function play(variant, first = 0) {
  let s = newGame(variant, {}, first); let last = null;
  while (!s.over && s.moves.length < 600) {
    const legal = legalMoves(s); const m = legal[Math.floor(rnd() * legal.length)];
    const r = applyMove(s, m); last = { before: s, pit: m, ...r }; s = r.state;
  }
  return { end: s, last };
}

test("every game that ends with a side empty and seeds left on the other is marked, with the seeds that side kept", () => {
  const seen = { ayo: 0, ncho: 0 };
  for (const v of ["ayo", "ncho"]) for (let g = 0; g < 1500; g++) {
    const { end, last } = play(v, g % 2); if (!end.over) continue;
    const caps = [0, 0]; for (const e of last.events) if (e.type === "capture") caps[e.by] += e.n;
    const won = [last.before.stores[0] + caps[0], last.before.stores[1] + caps[1]];
    const left = 48 - won[0] - won[1]; // on the board after the move's own captures
    const d = dryOf(last.before, end, last.events);
    const expect = won[0] < WIN_SEEDS && won[1] < WIN_SEEDS && (end.quiet || 0) < QUIET_LIMIT && left > 0;
    assert.equal(!!d, expect, `game ${g} (${v})`);
    if (!d) continue;
    seen[v]++;
    assert.equal(d.empty, end.turn, "the side to move is the one left with nothing");
    assert.equal(d.keeper, 1 - end.turn);
    assert.equal(d.n, left, "it keeps every seed still on the board");
    assert.equal(end.stores[d.keeper], won[d.keeper] + d.n);
    assert.equal(end.stores[d.empty], won[d.empty], "the empty side gets nothing more");
    assert.ok(end.pits.every((n) => n === 0) && totalSeeds(end) === 48);
    assert.equal(d.fed, seedsOnSide(last.before, d.empty) > 0);
    assert.deepEqual(dryEnd(end), d, "the finished game says the same from its moves");
    // the first tap on that move said so, and the kept seeds are not a capture
    const p = sowPath(last.before, last.pit); assert.deepEqual(p.dry, d);
    assert.equal(p.got, caps[d.keeper], "takes only what it captured");
    const mover = d.keeper;
    assert.match(pathWords(p, { you: mover }), new RegExp(`leaves them nothing to play · you keep the ${d.n} on your side`));
    assert.match(playedWords(p, { you: d.empty }), new RegExp(`left you nothing to play · they keep the ${d.n} on their side`));
    assert.doesNotMatch(pathWords(p, { you: mover }), new RegExp(`takes ${caps[d.keeper] + d.n}\\b`));
  }
  assert.ok(seen.ayo > 80, `Ayo meets it often (${seen.ayo})`);
  assert.ok(seen.ncho > 5, `Nchò now and then (${seen.ncho})`);
});

test("a game won on 25, given up, agreed, called or ended on an empty board is not a side run dry", () => {
  let s = newGame("ayo"); s.pits = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]; s.stores = [23, 24];
  let r = applyMove(s, 5); // the last seed goes over; their side then has one seed and they play
  assert.equal(r.state.over, false);
  const given = { ...r.state, over: true, winner: 1, resigned: 0 }; assert.equal(dryEnd(given), null);
  assert.equal(dryEnd({ ...r.state, over: true, winner: "draw", agreed: true }), null);
  assert.equal(dryOf(null, null, []), null); assert.equal(dryEnd(null), null); assert.equal(dryEnd(newGame("ayo")), null);
  // Ayo: their side is empty and nothing of yours reaches them: the move ends it, you keep yours
  s = newGame("ayo"); s.pits = [0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0]; s.stores = [22, 23];
  r = applyMove(s, 1); const d = dryOf(s, r.state, r.events);
  assert.deepEqual(d, { empty: 1, keeper: 0, n: 3, fed: false });
  assert.deepEqual(r.state.stores, [25, 23]);
  assert.equal(dryMoment(d, { you: 0, names: ["You", "Mama Ngozi"] }), "No seeds left on Mama Ngozi's side — you keep the 3 on yours");
  assert.equal(dryMoment(d, { you: 1, names: ["Tete", "You"] }), "No seeds left on your side — Tete keeps the 3 on their side");
  assert.equal(dryMoment(d, { you: null, names: ["Player 1", "Player 2"] }), "No seeds left on Player 2's side — Player 1 keeps the 3 on their side");
  assert.equal(dryEnded(d, { you: 0 }), "their side ran dry"); assert.equal(dryEnded(d, { you: 1 }), "your side ran dry");
  assert.equal(dryEnded(d, { you: null, names: ["Ada", "Obi"] }), "Obi's side ran dry");
  assert.equal(dryWords(null), ""); assert.equal(dryMoment(null), ""); assert.equal(dryEnded(null), "");
  // a position that is not the deal's (a puzzle, the lesson) never speaks from a replay of its moves
  const fake = { ...r.state, moves: [1] }; assert.equal(dryEnd(fake), null);
});

test("How to play has the rule in every mix of the switches", () => {
  for (const capture of [4, 23]) for (const relay of [true, false]) for (const last8 of [true, false]) {
    const k = ruleKeys({ capture, relay, last8 }); assert.equal(k[k.indexOf(relay ? "feedLap" : "feed") + 1], "dry");
  }
  assert.equal(LINES.dry, DRY_RULE);
  assert.ok(read("web/index.html").includes(`<li>${DRY_RULE}</li>`));
});

test("the board says it, as the seeds fly and on the Game over card, and keeps the file offline", () => {
  const game = read("web/game.js");
  assert.match(game, /import \{ dryEnd, dryMoment, dryEnded \} from '\.\/dry\.js';/);
  assert.match(game, /async function winMoment\(\) \{\n  const d = !clipping && !endedCircling\(state\) \? dryEnd\(state\) : null;\n  if \(d\) \{ dry\.said\+\+; dry\.words = dryMoment\(d, dryNames\(\)\); toast\(dry\.words/);
  assert.match(game, /const ranDry = gave \|\| endedCircling\(state\) \? '' : dryEnded\(dryEnd\(state\), dryNames\(\)\);/);
  assert.ok(read("web/sw.js").includes("'./dry.js'"));
});

test("every word of it, in French", () => {
  const lines = [
    DRY_RULE, "leaves them nothing to play", "leaves you nothing to play", "left them nothing to play", "left you nothing to play",
    "you keep the 6 on your side", "they keep the 1 on their side", "your side ran dry", "their side ran dry", "Obi's side ran dry",
    "No seeds left on Mama Ngozi's side — you keep the 3 on yours", "No seeds left on your side — Tete keeps the 3 on their side",
    "No seeds left on Player 2's side — Player 1 keeps the 1 on their side", "Ayo · 41 moves · their side ran dry",
    "ends in their pit 3 · leaves them nothing to play · you keep the 6 on your side · wins the game",
  ];
  for (const l of lines) { const fr = translate(l, "fr"); assert.notEqual(fr, l, l); assert.doesNotMatch(fr, /\b(side|keep|keeps|seeds|nothing|dry)\b/, fr); }
  assert.equal(translate("you keep the 1 on yours", "fr"), "vous gardez la graine du vôtre");
});
