// Which pit they played: the faint light stays on the pit the other side played until your move (web/lastmark.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, owner } from "../engine/ayo.js";
import { lastMarkPit, lastMarkOp, withLast, OPACITY, FADE_IN_MS, WORDS } from "../web/lastmark.js";
import { pitLabel } from "../web/keys.js";
import { translate } from "../web/i18n.js";

function randomGames(variant, n, fn) {
  let x = 11;
  const r = () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; };
  for (let g = 0; g < n; g++) {
    let s = newGame(variant, {}, g % 2);
    while (!s.over) { const legal = legalMoves(s), pit = legal[Math.floor(r() * legal.length)]; const next = applyMove(s, pit).state; fn(s, pit, next); s = next; }
  }
}

test("against the computer or a friend, the mark sits on exactly the pit they played, while the move is yours", () => {
  let shown = 0;
  for (const v of ["ncho", "ayo"]) randomGames(v, 60, (before, pit, next) => {
    for (const you of [0, 1]) { // either seat: the computer's game (you 0), the far seat of a room (you 1)
      const got = lastMarkPit({ theirs: { pit, before }, state: next, you, playing: true });
      if (next.over || next.turn !== you) { assert.equal(got, -1, "never once the game is over, nor while it is not your move"); continue; }
      assert.equal(got, pit); assert.equal(owner(got), before.turn, "a pit of the side that just played"); assert.notEqual(owner(got), you, "never one of yours");
      shown++;
    }
    // two of us: `you` is whoever is to move now, so the mark is always on the other player's pit
    if (!next.over) assert.equal(lastMarkPit({ theirs: { pit, before }, state: next, you: next.turn, playing: true }), pit);
  });
  assert.ok(shown > 2000, `${shown}`);
});

test("it steps aside for a replay, the clip, a screen or card, and goes with the explained move", () => {
  const s0 = newGame("ncho", {}, 1), pit = legalMoves(s0)[0], s1 = applyMove(s0, pit).state, theirs = { pit, before: s0 };
  const base = { theirs, state: s1, you: 0, playing: true };
  assert.equal(lastMarkPit(base), pit);
  assert.equal(lastMarkPit({ ...base, replaying: true }), -1, "watching a turn again: the ring lights the pit itself");
  assert.equal(lastMarkPit({ ...base, clip: true }), -1);
  assert.equal(lastMarkPit({ ...base, playing: false }), -1, "Home, Settings, a card");
  assert.equal(lastMarkPit({ ...base, theirs: null }), -1, "your move, Undo or a new game take the explained move away");
  assert.equal(lastMarkPit({ ...base, theirs: { pit: 12, before: s0 } }), -1);
  assert.equal(lastMarkPit({ ...base, theirs: { pit: 2, before: s0 } }), -1, "a pit of yours is never theirs");
  assert.equal(lastMarkPit(null), -1);
});

test("it fades in once and then holds still, so the resting board stays at rest", () => {
  assert.equal(lastMarkOp(-5), 0);
  assert.equal(lastMarkOp(0), 0);
  assert.ok(lastMarkOp(FADE_IN_MS / 2) > 0 && lastMarkOp(FADE_IN_MS / 2) < OPACITY);
  for (const t of [FADE_IN_MS, 1000, 5000, 60000]) assert.equal(lastMarkOp(t), OPACITY, "no breathing: the same every frame");
  assert.equal(lastMarkOp(0, { reduced: true }), OPACITY, "reduced motion: straight there");
  assert.ok(OPACITY < 0.34, "fainter than the hand weighing its move");
});

test("the screen reader and the mouse say it on that pit only, in French too", () => {
  const label = pitLabel(8, 0, { you: 0 });
  assert.equal(withLast(label, 8, 8), `Their pit 3 · empty · ${WORDS}`);
  assert.equal(withLast(label, 8, 9), label); assert.equal(withLast(label, 8, -1), label);
  assert.equal(withLast(null, 8, 8), null, "no words, nothing added (the mouse over the wood)");
  assert.equal(withLast("their pit 2 · 6 seeds", 7, 7), "their pit 2 · 6 seeds · played last");
  assert.equal(translate("Their pit 3 · empty · played last", "fr"), "Le trou 3 d’en face · vide · joué en dernier");
});

test("the page wires it to the explained move, the render loop, the labels and the mouse, and the service worker carries it", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(g, /import \{ lastMarkPit, lastMarkOp, withLast \} from '\.\/lastmark\.js'/);
  assert.match(g, /lastM\.t0 = performance\.now\(\)/, "set when their move is explained");
  assert.match(g, /lastStep\(now\); sim\.step/, "stepped in the render loop");
  assert.match(g, /withLast\(pitLabel\(i, state\.pits\[i\]/, "the hidden pit buttons");
  assert.match(g, /withLast\(h\.words, pit, lastM\.pit\)/, "the mouse's words");
  assert.ok(g.indexOf("const lastM =") < g.indexOf("function paintPits"), "declared before anything paints the pits");
  assert.match(sw, /'\.\/lastmark\.js'/);
});
