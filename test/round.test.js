// Round and round (idea 10 Nov): relay sowing that comes back to the same seeds in the same pits stops the third time
// (engine/ayo.js); the engine marks where it first comes round again and where it stops, and web/round.js only reads and
// words it. game.js says it, hurries the rest of that turn by itself and gives the stopping pit a shiver.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, RULE_VALUES } from "../engine/ayo.js";
import { roundOf, roundWords, autoHurry, ROUND_PATH, ROUND_PLAYED, ROUND_AGAIN, ROUND_STOP } from "../web/round.js";
import { sowPath, pathWords, playedWords } from "../web/path.js";
import { ruleKeys, LINES } from "../web/rulesays.js";
import { translate } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
// a late Nchò position found in random play: twelve seeds spread thin, and pit 10 (theirs) sends the hand round 315 seeds
const LOOP = () => { const s = newGame("ncho", {}, 1); s.pits = [1, 0, 2, 1, 0, 2, 1, 0, 1, 3, 1, 0]; s.stores = [20, 16]; s.turn = 1; return s; };

// the engine's own count, rebuilt from the events: the position (pits and where the hand is) at each relay moment
function rebuilt(state, events) {
  const p = state.pits.slice(); const seen = new Map(); const marks = [];
  events.forEach((e, ix) => {
    if (e.type === "drop") { p[e.pit]++; const last = events[ix + 1]; if (e.round === 3 || (last && last.type === "pickup" && last.relay)) { const k = p.join(",") + "|" + e.pit; const t = (seen.get(k) || 0) + 1; seen.set(k, t); marks.push({ ix, t, kind: e.round === 3 ? "stop" : "relay", round: last && last.round }); } }
    else if (e.type === "pickup") p[e.pit] = 0;
    else if (e.type === "capture") for (const k of e.pits) p[k] = 0;
  });
  return marks;
}

test("the engine marks the hand coming round again, and the turn stopping the third time", () => {
  const s = LOOP(); const { state, events } = applyMove(s, 9);
  const drops = events.filter((e) => e.type === "drop"); const last = drops[drops.length - 1];
  assert.equal(drops.length, 315); assert.equal(last.round, 3, "the last drop says the turn stopped for it");
  assert.ok(state.pits[last.pit] > 1, "it stopped on seeds — the only way a relay turn ever does");
  assert.ok(!events.some((e) => e.type === "capture"), "a loop never captures (it would not come round again if it did)");
  const firstAgain = events.findIndex((e) => e.round === 2);
  assert.ok(firstAgain > 0 && events[firstAgain].type === "pickup" && events[firstAgain].relay);
  const marks = rebuilt(s, events);
  for (const m of marks) {
    if (m.kind === "stop") assert.equal(m.t, 3, "it stops exactly the third time");
    else assert.equal(m.round === 2, m.t === 2, "round: 2 on exactly the pickups of a position seen once before");
  }
  assert.ok(marks.every((m) => m.t <= 3));
});

test("every mix of the switches: marked only with relay sowing, and only when a position really comes round", () => {
  let x = 99; const r = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (const capture of RULE_VALUES.capture) for (const relay of RULE_VALUES.relay) for (const last8 of RULE_VALUES.last8) {
    let rounds = 0, stops = 0;
    for (let g = 0; g < 300; g++) {
      let s = newGame("ncho", { capture, relay, last8 }, g % 2);
      while (!s.over) {
        const ms = legalMoves(s); const m = ms[Math.floor(r() * ms.length)]; const { state, events } = applyMove(s, m);
        const marked = events.filter((e) => e.round); if (!relay) assert.equal(marked.length, 0, "one lap never goes round");
        const ro = roundOf(events);
        if (ro) {
          rounds++; if (ro.stop !== null) stops++;
          for (const mk of rebuilt(s, events)) { if (mk.kind === "stop") assert.equal(mk.t, 3); else assert.equal(mk.round === 2, mk.t === 2); }
        }
        s = state;
      }
    }
    assert.ok(stops <= rounds, `${capture}/${last8}: ${rounds} rounds, ${stops} stops`);
  }
});

test("round.js reads it: where it comes round, where it stops, who sowed, what is left", () => {
  const s = LOOP(); const { events } = applyMove(s, 9); const ro = roundOf(events);
  assert.equal(ro.by, 1); assert.equal(ro.stop, events.filter((e) => e.type === "drop").pop().pit);
  assert.equal(ro.drops, 315); assert.ok(ro.after > 100 && ro.after < 315, "the second time round is about half the turn: " + ro.after);
  assert.equal(roundOf([{ type: "pickup", pit: 2, n: 3 }, { type: "drop", pit: 3 }]), null);
  assert.equal(roundOf(null), null);
  assert.ok(autoHurry(ro)); assert.ok(!autoHurry(ro, { clipping: true }), "a clip keeps its own timing"); assert.ok(!autoHurry(ro, { already: true })); assert.ok(!autoHurry(null));
  assert.equal(roundWords(ro), ROUND_PATH); assert.equal(roundWords(ro, { played: true }), ROUND_PLAYED); assert.equal(roundWords(null), "");
});

test("the first tap says it, and their move explained says it, from either seat", () => {
  const s = LOOP(); const path = sowPath(s, 9);
  assert.ok(path.round && path.round.stop === path.end);
  for (const you of [0, 1]) {
    assert.ok(pathWords(path, { you }).endsWith(ROUND_PATH), pathWords(path, { you }));
    const said = playedWords(path, { you });
    assert.ok(/ended in (your|their) pit \d · went round and round/.test(said), said);
  }
  const plain = sowPath(newGame("ncho"), 2); assert.equal(plain.round, null);
  assert.ok(!pathWords(plain).includes("round and round"));
});

test("the rules card says it whenever the hand picks up again, never with one lap", () => {
  for (const capture of RULE_VALUES.capture) for (const last8 of RULE_VALUES.last8) {
    assert.ok(ruleKeys({ capture, relay: true, last8 }).includes("round"));
    assert.ok(!ruleKeys({ capture, relay: false, last8 }).includes("round"));
  }
  const k = ruleKeys({}); assert.equal(k[k.indexOf("relay4") + 1], "round", "right after the relay line");
});

test("every word has its French, taken whole", () => {
  for (const w of [ROUND_PATH, ROUND_PLAYED, ROUND_AGAIN, ROUND_STOP, LINES.round]) {
    const fr = translate(w, "fr"); assert.notEqual(fr, w, w); assert.ok(!/round|turn|seeds/.test(fr), fr);
    assert.ok(!w.includes(" · ") && !w.includes(" — "), "one phrase: " + w);
  }
  const s = LOOP(); const said = playedWords(sowPath(s, 9), { you: 0 }); const fr = translate(said, "fr");
  assert.notEqual(fr, said); assert.ok(fr.includes("a tourné en rond"), fr);
});

test("game.js says it, hurries the rest by itself and shivers the stopping pit; the page and the offline cache know it", () => {
  const g = read("web/game.js");
  assert.ok(g.includes("from './round.js'"));
  assert.ok(/e\.round === 2[^\n]*roundAgain\(events\)/.test(g), "the first pickup of the second time round");
  assert.ok(/e\.round === 3[^\n]*roundStop\(e\.pit, pace\)/.test(g), "the last drop");
  assert.ok(/autoHurry\(r, \{ clipping, already: hurry\.on \}\) && hurryNow\(\)/.test(g), "hurried by itself, as a tap would");
  assert.ok(/if \(!clipping && !replaying\) \{ roundSeen\.words = ROUND_AGAIN; toast/.test(g));
  assert.ok(read("web/index.html").includes(LINES.round), "the card as the page first shows it");
  assert.ok(read("web/sw.js").includes("'./round.js'"), "kept for offline play");
});
