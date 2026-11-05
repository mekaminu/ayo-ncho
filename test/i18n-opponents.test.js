// French (Launch L18, slice 4): the opponents' own words — every line each of them says (start, captures, losing a pit, undo,
// the end, the first win, the last 8, circling), their runs (3, 5, then every fifth from 10, either way), their bios and Mama
// Ngozi's take — are French, in the bubble and in « » on the Game over card, each in a voice that holds: the child and the
// cousin say tu, the three elders say vous.
import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../web/i18n.js";
import { CHARACTERS, line, runLine } from "../web/characters.js";
import { LINES as TAKE } from "../web/coach.js";

const fr = (s) => translate(s, "fr");
const SAME = new Set(["Mm.", "Mm-hm."]); // the same sound in both languages
const ENGLISH = /(?<!\p{L})(the|you|your|I|is|are|was|my|mine|one|and|again|now|seeds?|board|count|row|three|five|play|played|move|win|won|beat|last|eight|round|somebody|someone|who|that|this|them|they|we|of|it|for|to|be|not)(?!\p{L})/iu;
const NAMES = /Mama Ngozi|Nnamdi|Adaeze|Auntie Bisi|Papa Ike|Lagos|GG|OK|suya/g;

function french(en, what) {
  const f = fr(en);
  if (SAME.has(en)) { assert.equal(f, en); return f; }
  assert.notEqual(f, en, `${what}: no French for «${en}»`);
  assert.ok(!ENGLISH.test(f.replace(NAMES, "")), `${what}: English left in «${f}»`);
  assert.ok(!/ [:;?!]/.test(f), `${what}: a plain space before : ; ? ! in «${f}»`);
  // on the Game over card the word sits in quotes, which turn into « »
  assert.equal(fr(`“${en}”`), `« ${f} »`, `${what}: the card's quoted form`);
  return f;
}

const every = (c) => Object.entries(c.lines).flatMap(([moment, arr]) => arr.map((l) => [moment, l]));
const runs = (level) => [3, 5, 10, 15, 20, 35, -3, -5, -10, -15, -25].map((n) => [n, runLine(level, n)]);

test("every line each opponent says is French", () => {
  let n = 0;
  for (const [level, c] of Object.entries(CHARACTERS)) {
    for (const [moment, l] of every(c)) { french(l, `${c.name} · ${moment}`); n++; }
    french(c.bio, `${c.name} · bio`);
  }
  assert.ok(n >= 95, `only ${n} lines`);
});

test("their runs either way, 3 and 5 and every fifth after, are French with the number kept", () => {
  for (const level of Object.keys(CHARACTERS)) for (const [n, l] of runs(level)) {
    assert.ok(l, `${level} has a word for a run of ${n}`);
    const f = french(l, `${level} · run ${n}`);
    if (Math.abs(n) >= 10) assert.ok(f.startsWith(String(Math.abs(n))), `${level} · run ${n}: «${f}» keeps the number first`);
  }
});

test("line() and runLine() as the game calls them always land in French", () => {
  for (const level of Object.keys(CHARACTERS)) for (const moment of Object.keys(CHARACTERS[level].lines)) for (let i = 0; i < 20; i++) {
    const l = line(level, moment); assert.ok(SAME.has(l) || fr(l) !== l, `${level} · ${moment}: «${l}»`);
  }
});

test("Mama Ngozi's take, said once a game across the board from her", () => {
  for (const [kind, arr] of Object.entries(TAKE)) for (const l of arr) french(l, `her take · ${kind}`);
});

test("each voice holds: Adaeze and Nnamdi say tu, the elders vous; the speaker's own gender, never the player's", () => {
  const TU = /(?<!\p{L})(tu|toi|te|t’|ton|ta|tes)(?!\p{L})/iu; const VOUS = /(?<!\p{L})(vous|votre|vos)(?!\p{L})/iu;
  const said = (level) => [...every(CHARACTERS[level]).map(([, l]) => l), ...runs(level).map(([, l]) => l)].map(fr);
  for (const level of ["easy", "medium"]) for (const f of said(level)) assert.ok(!VOUS.test(f), `${level} says vous: «${f}»`);
  for (const level of ["steady", "hard", "master"]) for (const f of said(level)) assert.ok(!TU.test(f), `${level} says tu: «${f}»`);
  for (const f of [...said("hard"), ...Object.values(TAKE).flat().map(fr)]) assert.ok(!TU.test(f), `her take says tu: «${f}»`);
  assert.match(fr(CHARACTERS.easy.lines.firstWin[0]), /battue/); // she was beaten
  assert.match(fr(CHARACTERS.hard.lines.firstWin[0]), /battue/);
  assert.match(fr(CHARACTERS.master.lines.firstWin[0]), /battu\b/); // he was
  // nothing they say decides the player's gender (no past participle agreeing with "vous" / "tu" as the subject)
  for (const level of Object.keys(CHARACTERS)) for (const f of said(level)) assert.ok(!/(?:vous|tu) (?:êtes|es|étiez) (?:allé|venu|entraîné|passé)e?/u.test(f), `«${f}» guesses the player's gender`);
});

test("English stays English", () => {
  for (const level of Object.keys(CHARACTERS)) for (const [, l] of every(CHARACTERS[level])) assert.equal(translate(l, "en"), l);
});
