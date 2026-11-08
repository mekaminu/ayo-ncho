// Who is ahead (idea 8 Nov): Mama Ngozi's count of a position (engine/ai.js leanOf) and the bead and word that show it (web/lean.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { leanOf, rateMoves } from "../engine/ai.js";
import { leanOn, leanShows, leanAt, leanWords, leanNote, leanSays, REACH } from "../web/lean.js";
import { translate } from "../web/i18n.js";

const rng = (seed) => { let x = seed; return () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; }; };
function walk(variant, seed, n) { // a random game, n moves in (or to its end)
  let s = newGame(variant); const r = rng(seed);
  for (let k = 0; k < n && !s.over; k++) { const m = legalMoves(s); s = applyMove(s, m[Math.floor(r() * m.length)]).state; }
  return s;
}
const mirror = (s) => ({ ...s, pits: [...s.pits.slice(6), ...s.pits.slice(0, 6)], stores: [s.stores[1], s.stores[0]], turn: 1 - s.turn, first: 1 - s.first, winner: s.winner == null ? s.winner : 1 - s.winner });

test("her count is from seat 0's side whoever is to move: the same position seen from the other seat is the same count, turned over", () => {
  for (const v of ["ncho", "ayo"]) for (let g = 0; g < 6; g++) {
    const s = walk(v, 11 + g, 6 + g * 3); if (s.over) continue;
    const a = leanOf(s), b = leanOf(mirror(s));
    assert.equal(a.decided + b.decided, 0, `${v} game ${g}`);
    assert.ok(Math.abs(a.v + b.v) < 1e-9, `${v} game ${g}: ${a.v} vs ${b.v}`);
  }
});

test("it agrees with her own search: the count's sign follows her best move's value, and a forced win she sees is decided", () => {
  let decided = 0, counted = 0;
  for (const v of ["ncho", "ayo"]) for (let g = 0; g < 10; g++) for (const n of [4, 12, 24, 36]) {
    const s = walk(v, 101 + g, n); if (s.over) continue;
    const l = leanOf(s), best = rateMoves(s, "hard")[0].value, sg = s.turn === 0 ? 1 : -1;
    if (Math.abs(best) >= 1000) { assert.equal(l.decided, sg * Math.sign(best)); decided++; continue; }
    assert.equal(l.decided, 0); counted++;
    if (Math.abs(best) >= 4) assert.equal(Math.sign(l.v), sg * Math.sign(best), `${v} ${g} ${n}: ${l.v} vs ${best}`);
  }
  assert.ok(decided > 0 && counted > 20, `${decided} decided, ${counted} counted`);
});

test("a finished game is the trough difference and its winner", () => {
  for (const v of ["ncho", "ayo"]) {
    const s = walk(v, 5, 999); assert.ok(s.over);
    const l = leanOf(s);
    assert.equal(l.over, true); assert.equal(l.v, s.stores[0] - s.stores[1]);
    assert.equal(l.decided, s.winner === 0 ? 1 : s.winner === 1 ? -1 : 0);
  }
});

test("the count is quick enough to ask after every move (her hint and her take ask for as much)", () => {
  const s = walk("ncho", 3, 8); const t0 = performance.now(); for (let k = 0; k < 3; k++) leanOf(s);
  assert.ok((performance.now() - t0) / 3 < 1500);
});

test("where the bead sits: even in the middle, leaning further the more seeds ahead, never off the inlay; a forced win goes to the end", () => {
  assert.equal(leanAt(null), 0); assert.equal(leanAt({ v: 0, decided: 0 }), 0);
  const at = [1, 3, 6, 10, 20, 40].map((v) => leanAt({ v, decided: 0 }));
  for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1]);
  assert.ok(at.at(-1) < 0.91 && at[0] > 0);
  assert.equal(leanAt({ v: -5, decided: 0 }), -leanAt({ v: 5, decided: 0 }));
  assert.equal(leanAt({ v: 1, decided: 1 }), 1); assert.equal(leanAt({ v: -1, decided: -1 }), -1);
  assert.ok(REACH < 0.44, "the inlay stops short of the troughs");
});

test("the word over the bead: you by 'You', the opponent and two of us by name, even under a seed", () => {
  const ai = { you: 0, local: false, names: ["You", "Nnamdi"] };
  assert.equal(leanWords({ v: 4.2, decided: 0 }, ai), "You +4");
  assert.equal(leanWords({ v: -6.6, decided: 0 }, ai), "Nnamdi +7");
  assert.equal(leanWords({ v: 0.4, decided: 0 }, ai), "Even");
  assert.equal(leanWords({ v: 1, decided: 1 }, ai), "You can win from here");
  assert.equal(leanWords({ v: -1, decided: -1 }, ai), "Nnamdi can win from here");
  const two = { you: 1, local: true, names: ["Meka", "Tete"] };
  assert.equal(leanWords({ v: 3, decided: 0 }, two), "Meka +3");
  assert.equal(leanWords({ v: -1, decided: -1 }, two), "Tete can win from here");
  assert.equal(leanWords({ v: 12, decided: 1, over: true }, ai), "", "the Game over card says the end");
  assert.equal(leanWords(null, ai), "");
  assert.ok(leanSays("You +3", "You +4")); assert.ok(!leanSays("You +4", "You +4")); assert.ok(!leanSays("You +4", ""));
  assert.equal(leanNote("You +4"), " · now You +4"); assert.equal(leanNote(""), "");
});

test("only where it helps a learner and is fair: never with a friend, in the puzzle, the lesson, her review or a watched game", () => {
  const base = { on: true, playing: true };
  assert.ok(leanShows(base));
  assert.ok(!leanShows({ ...base, on: false }));
  assert.ok(!leanShows({ ...base, playing: false }));
  for (const k of ["online", "puzzle", "lesson", "review", "watch", "spect", "clip"]) assert.ok(!leanShows({ ...base, [k]: true }), k);
  const prefs = (v) => ({ get: (k, d) => (k === "lean" && v != null ? v : d) });
  assert.equal(leanOn(prefs(null)), false, "off until turned on");
  assert.equal(leanOn(prefs("1")), true);
});

test("French: the words over the bead and Settings' row", () => {
  assert.equal(translate("You +4", "fr"), "Vous +4");
  assert.equal(translate("Mama Ngozi +12", "fr"), "Mama Ngozi +12");
  assert.equal(translate("Even", "fr"), "Égalité");
  assert.equal(translate("You can win from here", "fr"), "Vous pouvez gagner d’ici");
  assert.equal(translate("Player 2 can win from here", "fr"), "Joueur 2 peut gagner d’ici");
  assert.equal(translate(" · now Nnamdi +3", "fr"), " · en ce moment Nnamdi +3");
  assert.equal(translate("Who's ahead", "fr"), "Qui mène");
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const row = /<b>Who's ahead<\/b><span>([^<]+)<em id="leanNow">/.exec(html);
  assert.ok(row, "the row is in Settings → Feel");
  assert.notEqual(translate(row[1], "fr"), row[1]);
  assert.match(html, /data-set="lean" aria-checked="false"/);
});

test("the worker answers a lean question, and the offline shell carries web/lean.js", () => {
  const w = readFileSync(new URL("../web/ai-worker.js", import.meta.url), "utf8");
  assert.match(w, /lean \? leanOf\(state\)/);
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/lean\.js'/);
});
