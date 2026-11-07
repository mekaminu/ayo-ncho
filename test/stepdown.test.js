// A gentler game, and the way back up: three losses in a row offer the opponent a step down; beating them offers the way back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOWN, lowRun, stepDown, backUp, offerAfter, afterTake, parseStepped, pronoun } from "../web/stepdown.js";
import { parse, record } from "../web/record.js";
import { nextUp } from "../web/lesson.js";
import { translate } from "../web/i18n.js";

const names = { easy: "Adaeze", steady: "Auntie Bisi", medium: "Nnamdi", hard: "Mama Ngozi", master: "Papa Ike" };
const fr = (t) => translate(t, "fr").replace(/[\u202f\u00a0]/g, " "); // French puts a thin space before ? and :

test("one step down each, never below Adaeze", () => {
  assert.deepEqual(DOWN, { steady: "easy", medium: "steady", hard: "medium", master: "hard" });
  assert.equal(stepDown("easy", { run: -3 }, true, names), null);
  assert.equal(pronoun("medium"), "him"); assert.equal(pronoun("master"), "him"); assert.equal(pronoun("hard"), "her");
});

test("offered at three losses running, then six, nine — not between, not after a draw", () => {
  assert.deepEqual([-1, -2, -3, -4, -5, -6, -9, -12, 0, 3].map(lowRun), [false, false, true, false, false, true, true, true, false, false]);
  let data = parse(null); const seen = [];
  for (let g = 1; g <= 7; g++) { const r = record(data, "hard", 18, 30, g); data = r.data; const o = stepDown("hard", r.entry, r.counted, names); seen.push(o && o.text); }
  assert.deepEqual(seen, [null, null, "Three in a row to Mama Ngozi — try Nnamdi for a while? · Medium", null, null, "Six in a row to Mama Ngozi — try Nnamdi for a while? · Medium", null]);
  const again = record(data, "hard", 18, 30, 7); assert.equal(stepDown("hard", again.entry, again.counted, names), null, "the same game counted twice offers nothing");
  const draw = record(data, "hard", 24, 24, 8); assert.equal(stepDown("hard", draw.entry, draw.counted, names), null, "a draw ends the run");
  assert.equal(stepDown("master", { run: -3 }, true, names).level, "hard");
  assert.equal(stepDown("steady", { run: -12 }, true, names).text, "12 in a row to Auntie Bisi — try Adaeze for a while? · Easy");
});

test("the way back up: only after beating the one you stepped down to, and only to an opponent open on this phone", () => {
  const stepped = { from: "hard", to: "medium" };
  assert.deepEqual(backUp("medium", "win", stepped, names), { kind: "up", from: "medium", level: "hard", text: "Back to Mama Ngozi? Try her again · Hard" });
  assert.equal(backUp("medium", "loss", stepped, names), null);
  assert.equal(backUp("steady", "win", stepped, names), null, "another opponent");
  assert.equal(backUp("medium", "win", null, names), null);
  assert.equal(backUp("hard", "win", { from: "master", to: "hard" }, names, (lv) => lv !== "master"), null, "Papa Ike locked: no way back offered");
  assert.equal(backUp("hard", "win", { from: "master", to: "hard" }, names).text, "Back to Papa Ike? Try him again · Master");
});

test("one offer at a time: back up first, then the first-win offer, then a step down", () => {
  const entry = { run: 1 }, stepped = { from: "hard", to: "medium" };
  const next = nextUp("medium", "firstWin", names);
  assert.equal(offerAfter({ level: "medium", outcome: "win", entry, counted: true, stepped, names, next }).kind, "up");
  assert.deepEqual(offerAfter({ level: "medium", outcome: "win", entry, counted: true, stepped: null, names, next }), { kind: "next", ...next });
  assert.equal(offerAfter({ level: "hard", outcome: "loss", entry: { run: -3 }, counted: true, stepped: null, names }).kind, "down");
  assert.equal(offerAfter({ level: "hard", outcome: "loss", entry: { run: -3 }, counted: false, stepped: null, names }), null, "a game not counted offers nothing");
  assert.equal(offerAfter({ level: "hard", outcome: "loss", entry: { run: -2 }, counted: true, stepped: null, names }), null);
});

test("what is kept: a step down remembers where from; going up clears it; junk is nothing", () => {
  const down = stepDown("hard", { run: -3 }, true, names);
  const kept = afterTake(null, down); assert.deepEqual(kept, { from: "hard", to: "medium" });
  assert.deepEqual(parseStepped(JSON.stringify(kept)), kept);
  assert.equal(afterTake(kept, backUp("medium", "win", kept, names)), null);
  assert.equal(afterTake(kept, { kind: "next", level: "hard" }), null);
  assert.deepEqual(afterTake(kept, null), kept);
  for (const raw of [null, "", "x", "null", '{"from":"hard","to":"easy"}', '{"from":"nope","to":"hard"}', "[]"]) assert.equal(parseStepped(raw), null, raw);
});

test("in French", () => {
  assert.equal(fr("Three in a row to Mama Ngozi — try Nnamdi for a while? · Medium"), "Trois défaites de suite face à Mama Ngozi — Nnamdi un moment ? · Moyen");
  assert.equal(fr("7 in a row to Nnamdi — try Auntie Bisi for a while? · Steady").startsWith("7 défaites de suite face à Nnamdi — Auntie Bisi un moment ?"), true);
  assert.equal(fr("Back to Mama Ngozi? Try her again · Hard"), "Retour à Mama Ngozi ? Retentez votre chance contre elle · Difficile");
  assert.ok(!/ in a row | Try /.test(fr("Back to Papa Ike? Try him again · Master")), fr("Back to Papa Ike? Try him again · Master"));
});

test("wired into the Game over card, kept on the phone, cached for offline", () => {
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /offerAfter\(\{ level, outcome: r\.outcome/);
  assert.match(game, /prefs\.set\('stepped', JSON\.stringify\(stepped\)\)/);
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/stepdown\.js'/);
});
