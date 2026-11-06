// Play keeps your game (web/keepgame.js): when Play asks before ending the game kept on this phone, and what it says,
// in English and in French (web/i18n.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";
import { playAsks, keptWords, askWords, makeGuard, ARM_MS, KEEP_MIN_MOVES } from "../web/keepgame.js";
import { translate } from "../web/i18n.js";

const seeded = (seed = 7) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const play = (s, n, rnd) => { for (let i = 0; i < n && !s.over; i++) { const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state; } return s; };

test("Play asks only over a game worth keeping: under way, a few moves in, and not when the lesson comes first", () => {
  assert.equal(playAsks(null), false, "no game kept: Play just plays");
  const rnd = seeded(5);
  for (let g = 0; g < 80; g++) {
    const s = play(newGame(g % 2 ? "ayo" : "ncho"), Math.floor(rnd() * 70), rnd);
    const saved = s.over ? null : replay(s.moves, s.variant, s.rules); // as web/game.js savedGame() hands it over: a finished game is null
    const want = !!saved && saved.moves.length >= KEEP_MIN_MOVES;
    assert.equal(playAsks(saved), want, `${s.moves.length} moves, over ${s.over}`);
    if (saved) assert.equal(playAsks(saved, { lessonDue: true }), false, "the lesson starts no game, so nothing to ask");
  }
  const over = play(newGame(), 400, seeded(9)); assert.equal(over.over, true); assert.equal(playAsks(over), false, "a finished game is nothing to lose");
  assert.equal(playAsks({ moves: [0, 1, 2] }), false); assert.equal(playAsks({ moves: [0, 1, 2, 3] }), true);
});

test("the two-tap guard: the first tap asks, a second within three seconds starts the new game, a late one asks again", () => {
  const g = makeGuard(ARM_MS);
  assert.equal(ARM_MS, 3000);
  assert.equal(g.tap(0), "armed"); assert.equal(g.armed, true);
  assert.equal(g.tap(2900), "go"); assert.equal(g.armed, false);
  assert.equal(g.tap(5000), "armed"); assert.equal(g.expired(8100), true); assert.equal(g.tap(8100), "armed", "too late: it asks again");
  g.reset(); assert.equal(g.armed, false);
});

test("the words: the score of the game that would end, from your seat or the two of us", () => {
  assert.equal(keptWords({ stores: [12, 8] }), "you lead 12–8");
  assert.equal(keptWords({ stores: [3, 9] }), "you trail 3–9");
  assert.equal(keptWords({ stores: [6, 6] }), "level 6–6");
  assert.equal(keptWords({ stores: [4, 9] }, { local: true, names: ["Meka", "Tete"] }), "Tete leads 9–4");
  assert.equal(keptWords({ stores: [9, 4] }, { local: true }), "Player 1 leads 9–4");
  const w = askWords({ stores: [12, 8] });
  assert.deepEqual(w, { title: "New game?", sub: "Tap again — your game ends (you lead 12–8)", label: "Start a new game? Your game in progress ends — tap again to start one, or Continue to keep it" });
  assert.equal(askWords({ stores: [0, 0] }, { keys: true }).sub, "Click again — your game ends (level 0–0)");
});

test("in French", () => {
  const fr = (s) => translate(s, "fr");
  assert.equal(fr("New game?"), "Nouvelle partie ?");
  assert.equal(fr("Tap again — your game ends (you lead 12–8)"), "Touchez encore — votre partie s’arrête (vous menez 12–8)");
  assert.equal(fr("Click again — your game ends (you trail 3–9)"), "Cliquez encore — votre partie s’arrête (vous êtes mené 3–9)");
  assert.equal(fr("Tap again — your game ends (level 6–6)"), "Touchez encore — votre partie s’arrête (égalité 6–6)");
  assert.equal(fr("Tap again — your game ends (Player 2 leads 9–4)"), "Touchez encore — votre partie s’arrête (Joueur 2 mène 9–4)");
  assert.equal(fr("Tap again — your game ends (Tete leads 9–4)"), "Touchez encore — votre partie s’arrête (Tete mène 9–4)");
  for (const k of [false, true]) assert.match(fr(askWords({ stores: [1, 2] }, { keys: k }).label), /^Commencer une nouvelle partie/);
});
