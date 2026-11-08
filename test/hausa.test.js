// Count in Hausa (idea 8 Nov): Hausa is the most spoken tongue in Nigeria, so a count by touch can be said in Hausa too (web/igbo.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hausa, said, countWord, withIgbo, countPref, countNote, countToast, countLang, HAUSA_WORDS, IGBO_WORDS, YORUBA_WORDS, COUNT_WORDS } from "../web/igbo.js";
import { translate } from "../web/i18n.js";
import { countWords, troughWords } from "../web/count.js";

test("the numbers a board can hold, in Hausa, counting in tens", () => {
  const want = { 0: "sifili", 1: "ɗaya", 2: "biyu", 3: "uku", 4: "huɗu", 5: "biyar", 6: "shida", 7: "bakwai", 8: "takwas", 9: "tara",
    10: "goma", 11: "goma sha ɗaya", 15: "goma sha biyar", 19: "goma sha tara", 20: "ashirin", 21: "ashirin da ɗaya", 25: "ashirin da biyar",
    30: "talatin", 34: "talatin da huɗu", 40: "arbaʼin", 48: "arbaʼin da takwas", 50: "hamsin" };
  for (const [n, w] of Object.entries(want)) assert.equal(hausa(+n), w, `${n}`);
  assert.equal(hausa(-1), null); assert.equal(hausa(60), null); assert.equal(hausa(2.5), null);
  assert.equal(HAUSA_WORDS.size, 60, "every number says a different word");
  for (let n = 11; n <= 19; n++) assert.match(hausa(n), /^goma sha /);
  for (let n = 21; n <= 49; n++) if (n % 10) assert.match(hausa(n), / da /);
  for (const w of HAUSA_WORDS) { assert.ok(!IGBO_WORDS.has(w) && !YORUBA_WORDS.has(w), w); assert.ok(COUNT_WORDS.has(w), w); }
});

test("Hausa is a fourth choice; the word under the number and on the hint line", () => {
  assert.equal(countPref("hausa"), "hausa");
  assert.equal(said(7, "hausa"), "bakwai"); assert.equal(said(7, "yoruba"), "èje"); assert.equal(said(7, "igbo"), "asaa");
  assert.equal(countWord(0, "hausa"), "sifili"); assert.equal(countWord(-1, "hausa"), ""); assert.equal(countLang("hausa"), "ha");
  assert.equal(said(7, "toString"), null, "only the four choices");
  const state = { pits: [5, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], stores: [3, 0] };
  const w = countWords({ state, pit: 0, you: 0 });
  assert.equal(withIgbo(w, 5, "hausa"), `${w} · biyar`);
  assert.match(withIgbo(troughWords({ stores: [18, 4], side: 0, you: 0 }), 18, "hausa"), / · goma sha takwas$/);
  assert.match(countNote("hausa"), /ɗaya, biyu/); assert.match(countToast("hausa"), /Hausa/);
});

test("French keeps the Hausa words as they are", () => {
  const w = withIgbo(countWords({ state: { pits: [5, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], stores: [0, 0] }, pit: 0, you: 0 }), 5, "hausa");
  const fr = translate(w, "fr");
  assert.notEqual(fr, w); assert.match(fr, / · biyar$/);
  for (const s of [countNote("hausa"), countToast("hausa")]) { const t = translate(s, "fr"); assert.notEqual(t, s, s); assert.match(t, /ɗaya, biyu/); }
  assert.match(translate(countToast("hausa"), "fr"), /haoussa/);
  assert.equal(translate("Hausa", "fr"), "Hausa");
});

test("the Hausa choice is in Settings → Language → Count in", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /data-v="yoruba" lang="yo">Yoruba<\/button><button class="segbtn" data-v="hausa" lang="ha">Hausa<\/button><\/div>/);
});

test("a row of choices too wide for its words puts the choices on their own line (four tongues, or Larger words)", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /\.row:has\(> \.seg\)\{flex-wrap:wrap;row-gap:8px\}\.row:has\(> \.seg\) > \.t\{flex:1 1 calc\(96px\*var\(--ts\)\)\}\.row:has\(> \.seg\) > \.seg\{margin-left:auto\}/);
});
