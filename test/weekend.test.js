// The weekend (idea 10 Nov): on a Saturday or Sunday the hour's greeting comes from a character's weekend words where they
// have one — no school for Adaeze or Auntie Bisi's class, no office for Nnamdi — and every other word is the same any day.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isWeekend, PARTS } from "../web/greet.js";
import { CHARACTERS, line } from "../web/characters.js";
import { translate } from "../web/i18n.js";

test("Saturday and Sunday are the weekend, on the phone's own date", () => {
  assert.equal(isWeekend("2026-11-07"), true); // Saturday
  assert.equal(isWeekend("2026-11-08"), true); // Sunday
  for (const d of ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]) assert.equal(isWeekend(d), false, d);
  assert.equal(isWeekend("2027-01-02"), true); // across a year end
  assert.equal(isWeekend("2026-03-29"), true); // the Sunday the clocks change
  assert.equal(isWeekend("bad"), false); assert.equal(isWeekend(undefined), false);
});

test("on the weekend no greeting talks of school or work; on a weekday the usual one is said", () => {
  const WORK = /school|class|working|office|homework/i;
  for (const [level, c] of Object.entries(CHARACTERS)) for (const part of PARTS) {
    const weekend = new Set(); const weekday = new Set();
    for (let i = 0; i < 40; i++) { weekend.add(line(level, part, { weekend: true })); weekday.add(line(level, part, { weekend: false })); }
    for (const l of weekend) assert.ok(l, `${c.name} · ${part} on the weekend says nothing`);
    for (const l of weekday) assert.ok(c.lines[part].includes(l), `${c.name} · ${part} on a weekday: «${l}»`);
    for (const l of weekend) {
      const own = c.weekend && c.weekend[part];
      if (own) assert.ok(own.includes(l), `${c.name} · ${part}: «${l}» is not a weekend word`);
      else assert.ok(c.lines[part].includes(l), `${c.name} · ${part}: «${l}»`);
    }
  }
  assert.ok(WORK.test(CHARACTERS.easy.lines.afternoon[0]) && WORK.test(CHARACTERS.medium.lines.afternoon[0]) && WORK.test(CHARACTERS.steady.lines.morning[0]));
  assert.equal(line("easy", "afternoon", { weekend: true }), "No school today! All afternoon for seeds. Go!");
  assert.equal(line("medium", "afternoon", { weekend: true }), "Weekend game! No office, no excuses, cousin.");
  assert.match(line("steady", "morning", { weekend: true }), /No class today/);
  assert.equal(line("hard", "morning", { weekend: true }), CHARACTERS.hard.lines.morning[0]); // the market is open on a Saturday
});

test("weekend words are only for the hour's greeting, and other moments ignore the weekend", () => {
  for (const c of Object.values(CHARACTERS)) for (const k of Object.keys(c.weekend || {})) assert.ok(PARTS.includes(k), `${c.name}: weekend ${k}`);
  for (const level of Object.keys(CHARACTERS)) for (const m of ["start", "capture", "lost", "win", "lose", "back", "last8", "waiting"]) {
    const ctx = { got: 4, capture: 4 }; const plain = new Set(); for (let i = 0; i < 60; i++) plain.add(line(level, m, ctx));
    for (let i = 0; i < 30; i++) assert.ok(plain.has(line(level, m, { ...ctx, weekend: true })), `${level} · ${m}`);
  }
});

test("every weekend word is French, in the same voice", () => {
  for (const c of Object.values(CHARACTERS)) for (const arr of Object.values(c.weekend || {})) for (const en of arr) {
    const fr = translate(en, "fr"); assert.notEqual(fr, en, `no French for «${en}»`);
    assert.ok(!/(?<!\p{L})(the|today|school|class|office|game|seeds?|no|we|still|count|before)(?!\p{L})/iu.test(fr.replace(/Ẹ káàárọ̀/, "")), `English left in «${fr}»`);
    assert.equal(translate(`“${en}”`, "fr"), `« ${fr} »`);
  }
  assert.match(translate(line("easy", "afternoon", { weekend: true }), "fr"), /Pas d’école/);
  assert.match(translate(line("medium", "afternoon", { weekend: true }), "fr"), /Pas de bureau/);
});
