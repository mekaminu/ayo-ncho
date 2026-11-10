// Their words say what happened (idea 10 Nov): an opponent's line that names a number — "Did you see that? Four!",
// "Four seeds, no stress.", "Homework: count to four" — names the seeds they really just won, or the count the game's
// capture rule really asks for; played through the engine for every mix of the rule switches, in English and French.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, RULE_VALUES } from "../engine/ayo.js";
import { CHARACTERS, COUNTED, fitLine, line, numberWord } from "../web/characters.js";
import { translate } from "../web/i18n.js";

const WORD = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const FRW = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12 };
// every number a line names, as figures (words or digits)
const named = (s, words) => [...s.toLowerCase().matchAll(/\p{L}+|\d+/gu)].map((m) => (/^\d+$/.test(m[0]) ? +m[0] : words[m[0]])).filter((n) => n != null);
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const MIXES = [];
for (const capture of RULE_VALUES.capture) for (const relay of RULE_VALUES.relay) for (const last8 of RULE_VALUES.last8) MIXES.push({ capture, relay, last8 });

test("the lines that name a number are the ones written with Four, and each still has unnumbered company", () => {
  for (const c of Object.values(CHARACTERS)) for (const [moment, arr] of Object.entries(c.lines)) {
    for (const t of arr) {
      if (/\b(four|Four)\b/.test(t)) assert.ok(COUNTED[t], `${c.name} · ${moment}: «${t}» names four but is not counted`);
    }
    if (arr.some((t) => COUNTED[t])) assert.ok(arr.some((t) => !COUNTED[t]), `${c.name} · ${moment}: nothing left to say when the count is wrong`);
  }
  for (const t of Object.keys(COUNTED)) assert.ok(Object.values(CHARACTERS).some((c) => Object.values(c.lines).some((a) => a.includes(t))), `«${t}» is said by nobody`);
});

test("without knowing what happened, a line never names a count", () => {
  for (const t of Object.keys(COUNTED)) assert.equal(fitLine(t, null), null);
  for (let i = 0; i < 200; i++) for (const level of Object.keys(CHARACTERS)) for (const m of ["capture", "win"]) assert.ok(!COUNTED[line(level, m)]);
});

test("after every capture the computer makes, in every mix of the rules, the line names exactly the seeds it won", () => {
  let said = 0; const sizes = new Set();
  for (const rules of MIXES) {
    const r = rng(7 + rules.capture + (rules.relay ? 1 : 0) * 3 + (rules.last8 ? 1 : 0) * 5);
    for (let g = 0; g < 25; g++) {
      let s = newGame("ncho", rules, g % 2);
      while (!s.over) {
        const ms = legalMoves(s); const by = s.turn; const before = s.stores[by];
        s = applyMove(s, ms[Math.floor(r() * ms.length)]).state;
        const got = s.stores[by] - before; if (got <= 0) continue;
        for (const level of Object.keys(CHARACTERS)) for (const t of CHARACTERS[level].lines.capture) {
          const out = fitLine(t, { got, capture: rules.capture }); if (!COUNTED[t]) { assert.equal(out, t); continue; }
          if (got < 2) { assert.equal(out, null, `${t} after ${got}`); continue; }
          assert.deepEqual(named(out, WORD), [got], `«${out}» after winning ${got}`);
          assert.deepEqual(named(translate(out, "fr"), FRW), [got], `«${translate(out, "fr")}» after winning ${got}`);
          said++; sizes.add(got);
        }
      }
    }
  }
  assert.ok(said > 500, `only ${said} counted lines`);
  for (const n of [2, 3, 4, 8]) assert.ok(sizes.has(n), `no capture of ${n} seen`);
  assert.ok([...sizes].some((n) => n > 12), "no capture over twelve seen");
});

test("the homework is counting to four where pits of 4 are taken, to three where 2s and 3s are", () => {
  const t = "Homework: count to four, carefully.";
  assert.equal(fitLine(t, { capture: 4 }), t);
  assert.equal(fitLine(t, { capture: 23 }), "Homework: count to three, carefully.");
  assert.equal(translate(fitLine(t, { capture: 23 }), "fr"), "Devoir\u00a0: compter jusqu’à trois, soigneusement.");
  assert.equal(fitLine(t, { got: 4 }), null);
  for (let i = 0; i < 100; i++) assert.notEqual(line("steady", "win", { capture: 23 }), t);
});

test("every counted line is French for every count from 2 to 48, with no English left", () => {
  for (const t of Object.keys(COUNTED)) for (let got = 2; got <= 48; got++) for (const capture of [4, 23]) {
    const en = fitLine(t, { got, capture }); const fr = translate(en, "fr");
    assert.notEqual(fr, en, `no French for «${en}»`);
    assert.ok(!/\b(seeds|you|see|count|that)\b/i.test(fr), `English left in «${fr}»`);
    assert.equal(translate(`“${en}”`, "fr"), `« ${fr} »`);
  }
  assert.equal(numberWord(4), "four"); assert.equal(numberWord(13), "13");
});

test("the game passes what happened: the seeds the computer won, and the game's capture rule", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(g, /say\('capture', \{ got: aiGot \}\)/);
  assert.match(g, /line\(level, moment, \{ capture: state\.rules && state\.rules\.capture, \.\.\.ctx \}\)/);
});
