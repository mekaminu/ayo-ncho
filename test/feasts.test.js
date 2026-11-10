// Feast days (idea 10 Nov): on Christmas Day, the year's last day, New Year's Day and Nigeria's Independence Day the day's
// first greeting is the opponent's word for the day; later games that day greet for the hour as usual.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FEASTS, FEAST_MOMENTS, feastOf, feastMoment, greetMoment } from "../web/greet.js";
import { CHARACTERS, line, MOOD_FOR } from "../web/characters.js";
import { OPENING, speaks } from "../web/chatter.js";
import { translate } from "../web/i18n.js";

test("the four feast days, on the phone's own date, any year", () => {
  for (const y of [2026, 2027, 2030]) {
    assert.equal(feastOf(`${y}-12-25`), "christmas"); assert.equal(feastOf(`${y}-12-31`), "yearEnd");
    assert.equal(feastOf(`${y}-01-01`), "newYear"); assert.equal(feastOf(`${y}-10-01`), "independence");
  }
  for (const d of ["2026-12-24", "2026-12-26", "2026-11-10", "2027-01-02", "2026-09-30", "2026-10-02"]) assert.equal(feastOf(d), null, d);
  assert.equal(feastOf("bad"), null); assert.equal(feastOf(undefined), null);
  assert.deepEqual(FEAST_MOMENTS, ["christmas", "yearEnd", "newYear", "independence"]);
  assert.equal(Object.keys(FEASTS).length, 4);
});

test("only the day's first greeting is the feast word", () => {
  assert.equal(feastMoment("2026-12-25", ""), "christmas");
  assert.equal(feastMoment("2026-12-25", "2026-12-24:night"), "christmas"); // greeted yesterday: a new day
  assert.equal(feastMoment("2026-12-25", "2026-12-25:morning"), null); // already greeted today: the hour's word again
  assert.equal(feastMoment("2026-11-10", ""), null);
  // a whole Christmas Day as the game plays it: the feast word first, then each part of the day once
  let last = ""; const said = [];
  for (const hour of [9, 10, 14, 15, 19, 23]) {
    const f = feastMoment("2026-12-25", last); const g = greetMoment({ days: ["2026-12-24"], today: "2026-12-25", hour, last });
    said.push(f || g.moment); if (g.moment !== "start") last = g.key;
  }
  assert.deepEqual(said, ["christmas", "start", "afternoon", "start", "evening", "night"]);
  // just after midnight on New Year's Day, the first game greets the new year
  assert.equal(feastMoment("2027-01-01", "2026-12-31:night"), "newYear");
});

test("every opponent has a word for every feast, a happy face, said even with few words on", () => {
  for (const [level, c] of Object.entries(CHARACTERS)) for (const f of FEAST_MOMENTS) {
    assert.ok(c.lines[f] && c.lines[f].length, `${c.name} · ${f}`);
    assert.ok(c.lines[f].includes(line(level, f)), `${c.name} · ${f}`);
    assert.ok(c.lines[f].includes(line(level, f, { weekend: true })), `${c.name} · ${f} on a weekend`);
  }
  for (const f of FEAST_MOMENTS) { assert.equal(MOOD_FOR[f], "happy"); assert.ok(OPENING.includes(f)); assert.equal(speaks("few", f), true); assert.equal(speaks("off", f), false); }
  assert.match(line("easy", "christmas"), /Merry Christmas/); assert.match(line("hard", "christmas"), /Ekeresimesi ọma/);
  assert.match(line("hard", "newYear"), /Afọ ọhụrụ ọma/); assert.match(line("steady", "newYear"), /Ẹ kú ọdún/);
  for (const level of Object.keys(CHARACTERS)) assert.match(line(level, "independence"), /Independence/);
});

test("every feast word is French", () => {
  for (const c of Object.values(CHARACTERS)) for (const f of FEAST_MOMENTS) for (const en of c.lines[f]) {
    const fr = translate(en, "fr"); assert.notEqual(fr, en, `no French for «${en}»`);
    assert.equal(translate(`“${en}”`, "fr"), `« ${fr} »`);
  }
  assert.match(translate(line("easy", "christmas"), "fr"), /Joyeux Noël/);
  assert.match(translate(line("medium", "newYear"), "fr"), /Bonne année/);
  assert.match(translate(line("master", "independence"), "fr"), /Indépendance/);
});
