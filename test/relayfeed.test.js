// Reaches them only by the relay (idea 10 Nov): with their side empty the feed rule counts the seeds you lift (the first lap),
// so a pit whose relay would carry on into their pits is barred — and the board said "doesn't reach them", which was wrong.
// The rule is unchanged; the words now say why, on a tap, under the mouse, and in How to play, in English and French.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, reachesByRelay, sideOf, seedsOnSide, owner, RULES } from "../engine/ayo.js";
import { relayWords } from "../web/feed.js";
import { hoverAt } from "../web/hover.js";
import { ruleKeys, ruleLines, LINES } from "../web/rulesays.js";
import { translate } from "../web/i18n.js";

const at = (pits, turn = 0, variant = "ncho") => ({ ...newGame(variant), pits, turn });
// the hand's whole turn with no feed check: the same position with one seed put in their far pit (so every move is allowed); the
// hand's first drop on their side is always their nearest pit, so that seed cannot change whether the turn gets there
function wholeTurnReaches(s, pit) {
  const them = 1 - s.turn; const far = them * 6 + 5; // the last pit of their side, the farthest the hand reaches
  const t = { ...s, pits: s.pits.slice() }; t.pits[far] = 1;
  const ev = applyMove(t, pit).events;
  return ev.some((e) => e.type === "drop" && owner(e.pit) === them);
}

test("a pit that gets there only by the relay: barred, and said so", () => {
  const s = at([1, 1, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(legalMoves(s), [5], "the rule is unchanged: only the pit whose first lap reaches them");
  assert.equal(reachesByRelay(s, 3), true, "pit 4: one seed makes pit 5 two, the relay goes on into their side");
  assert.equal(reachesByRelay(s, 5), false, "a pit the rule allows is never this");
  assert.equal(relayWords(s, 3), "pit 4 reaches them only by the relay — the seeds you lift must reach them: play pit 6");
  assert.equal(relayWords(s, 5), "");
  assert.equal(relayWords(s, 3, { you: 1 }), "", "not your move");
});

test("not with one lap, not when they have seeds, not a pit that never reaches them", () => {
  const one = { ...at([1, 1, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0]), rules: { ...RULES.ncho, relay: false } };
  assert.equal(reachesByRelay(one, 3), false, "single lap: no relay");
  assert.equal(reachesByRelay(at([1, 1, 2, 1, 1, 2, 0, 0, 0, 0, 0, 1]), 3), false, "they have seeds: nothing is barred");
  const s = at([1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]); // pit 1's seed lands in an empty pit: it stops short, no relay
  assert.deepEqual(legalMoves(s), [5]); assert.equal(reachesByRelay(s, 0), false);
  assert.equal(relayWords(s, 0), "");
  assert.equal(reachesByRelay(s, 7), false, "their pit"); assert.equal(reachesByRelay(s, 2), false, "an empty pit");
  assert.equal(reachesByRelay(null, 0), false); assert.equal(reachesByRelay(s, 99), false);
});

test("over random games: it says relay exactly when the relay would reach them, and only for barred pits", () => {
  let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let said = 0, barred = 0;
  for (let g = 0; g < 2500; g++) {
    let s = newGame("ncho");
    while (!s.over) {
      if (seedsOnSide(s, 1 - s.turn) === 0) {
        const legal = legalMoves(s);
        for (const p of sideOf(s.turn).filter((i) => s.pits[i] > 0)) {
          const r = reachesByRelay(s, p);
          if (legal.includes(p)) { assert.equal(r, false); continue; }
          barred++; assert.equal(r, wholeTurnReaches(s, p), s.pits.join(",") + " pit " + p);
          if (r) said++;
        }
      }
      const m = legalMoves(s); s = applyMove(s, m[Math.floor(rnd() * m.length)]).state;
    }
  }
  assert.ok(said > 20 && said < barred, `said ${said} of ${barred} barred pits`);
});

test("the mouse on the Mac says it too, and the others keep their words", () => {
  const s = at([1, 1, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0]);
  assert.match(hoverAt({ state: s, pit: 3, press: true }).words, /^pit 4 reaches them only by the relay — /);
  assert.equal(hoverAt({ state: s, pit: 3, press: true }).cursor, "not-allowed");
  const t = at([1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]);
  assert.match(hoverAt({ state: t, pit: 0, press: true }).words, /^pit 1 doesn't reach them — they have no seeds: play pit 6$/);
});

test("How to play says it for relay games only, right after the feed line", () => {
  const k = ruleKeys(RULES.ncho); assert.equal(k[k.indexOf("feed") + 1], "feedLap");
  assert.ok(!ruleKeys(RULES.ayo).includes("feedLap"));
  assert.ok(ruleKeys({ capture: 23, relay: true, last8: false }).includes("feedLap"));
  assert.ok(ruleLines(RULES.ncho).includes(LINES.feedLap));
});

test("in French", () => {
  const fr = (s) => translate(s, "fr");
  const w = relayWords(at([1, 1, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0]), 3);
  assert.equal(fr(w).replace(/[\u00a0\u202f]/g, " "), "Le trou 4 n’atteint l’autre côté que par le relais — les graines soulevées doivent y arriver : jouez le trou 6");
  const two = at([1, 1, 2, 1, 2, 3, 0, 0, 0, 0, 0, 0]);
  const tw = relayWords(two, legalMoves(two).length < 6 ? sideOf(0).find((p) => reachesByRelay(two, p)) : -1);
  if (tw) assert.ok(!/[a-z]+ them/.test(fr(tw)), fr(tw));
  assert.notEqual(fr(LINES.feedLap), LINES.feedLap);
});
