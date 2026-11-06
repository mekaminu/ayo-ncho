// The board comes back (idea 6 Nov): web/glloss.js decides what to say while the phone has taken the GPU away; game.js steps the
// canvas aside, draws at once when it is back, and offers to bring it back when it never is.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeGlWatch, lineFor, lineWords, WORDS, WAIT_MS, STUCK_MS, STEP_CAP_MS } from "../web/glloss.js";
import { FR } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
// run the clock in 16 ms frames from `from` for `ms`
const run = (w, from, ms, hidden = false) => { let t = from, k = null; for (; t < from + ms; t += 16) k = w.tick(t, hidden); return { t, k }; };

test("a blink says nothing; a moment says it is coming back; a long wait offers to bring it back", () => {
  assert.equal(lineFor(0), null); assert.equal(lineFor(WAIT_MS - 1), null);
  assert.equal(lineFor(WAIT_MS), "back"); assert.equal(lineFor(STUCK_MS - 1), "back"); assert.equal(lineFor(STUCK_MS), "stuck");
  assert.equal(lineFor(NaN), null);
  const w = makeGlWatch();
  assert.equal(w.tick(0), null, "nothing while the board is there");
  assert.equal(w.lost(1000), true); assert.equal(w.phase, "lost");
  assert.equal(w.lost(1001), false, "the browser saying it twice counts once"); assert.equal(w.losses, 1);
  let r = run(w, 1000, 300); assert.equal(r.k, null);
  r = run(w, r.t, 600); assert.equal(r.k, "back");
  assert.deepEqual(w.restored(r.t), { said: true }, "the line was up: the game says the board is back");
  assert.equal(w.phase, "ok"); assert.equal(w.restores, 1); assert.equal(w.tick(r.t + 16), null);
  w.lost(5000); const q = run(w, 5000, 200); assert.deepEqual(w.restored(q.t), { said: false }, "a blink: back without a word");
  assert.deepEqual(w.restored(q.t + 5), { said: false }, "restored twice: once");
  w.lost(9000); const s = run(w, 9000, STUCK_MS + 100); assert.equal(s.k, "stuck");
  assert.deepEqual(w.log.map((e) => e.t), ["lost", "restored", "lost", "restored", "lost"]);
});

test("time out of sight never counts, and one long frame counts at most a quarter second", () => {
  const w = makeGlWatch(); w.lost(0);
  const h = run(w, 0, 60000, true); assert.equal(h.k, null, "a minute in another app: still nothing said");
  assert.equal(w.out, 0);
  w.tick(h.t + 30000); assert.ok(w.out <= STEP_CAP_MS, "coming back after 30 s counts one capped step, not 30 s");
  const v = run(w, h.t + 30000, STUCK_MS); assert.equal(v.k, "stuck", "then six seconds looked at: offer it");
});

test("the words, in English and French", () => {
  assert.deepEqual(lineWords("back"), { title: WORDS.back, small: WORDS.backSmall, button: null });
  assert.deepEqual(lineWords("stuck"), { title: WORDS.stuck, small: WORDS.stuckSmall, button: WORDS.button });
  assert.equal(lineWords(null), null);
  for (const k of ["back", "backSmall", "stuck", "stuckSmall", "button", "again"]) assert.ok(FR[WORDS[k]], "French for " + WORDS[k]);
});

test("the game steps the canvas aside, draws at once when it is back, guards the keys, and caches it offline", () => {
  const g = read("web/game.js"), h = read("web/index.html");
  assert.match(g, /from '\.\/glloss\.js'/);
  assert.match(g, /canvas\.addEventListener\('webglcontextlost', \(e\) => \{ e\.preventDefault\(\);/, "asks for the board back");
  assert.match(g, /canvas\.addEventListener\('webglcontextrestored'/);
  assert.match(g, /glFresh = 3; rest\.reset\(\);/, "three frames drawn at once, whatever the rest check says");
  assert.match(g, /if \(e\.defaultPrevented \|\| glw\.phase === 'lost'\) return;/, "no key plays a move blind");
  assert.match(g, /try \{ save\(\); sessionStorage\.setItem\('ayo\.glback', '1'\); \} catch \{\} if \(window\.__glReload\) window\.__glReload\(\); else location\.reload\(\);/, "the game is saved before the reload");
  assert.match(g, /else if \(glBack && savedGame\(\)\) \{[^\n]*\n  resume\(\); hideExplain\(\); layoutFromState\(state\); refreshStatic\(\); showScreen\('play'\); kickAi\(\);/, "the reload opens straight back into the game");
  assert.match(h, /\.gllost canvas,\.gllost #badges,\.gllost #pits\{visibility:hidden\}/, "the canvas, badges and pit buttons step aside");
  assert.match(read("web/sw.js"), /'\.\/glloss\.js'/, "cached for offline play");
});
