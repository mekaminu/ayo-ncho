// Count in Yoruba (idea 8 Nov): Ayo is the Yoruba game, so a count by touch can be said in Yoruba too (web/igbo.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { yoruba, said, countWord, withIgbo, countPref, countNote, countToast, countLang, YORUBA_WORDS, IGBO_WORDS } from "../web/igbo.js";
import { translate } from "../web/i18n.js";
import { countWords, troughWords } from "../web/count.js";

test("the numbers a board can hold, in Yoruba, counting by twenties and back from the next five", () => {
  const want = { 0: "òdo", 1: "ọ̀kan", 2: "èjì", 3: "ẹ̀ta", 4: "ẹ̀rin", 5: "àrún", 6: "ẹ̀fà", 10: "ẹ̀wá", 11: "ọ̀kanlá", 14: "ẹ̀rìnlá",
    15: "ẹ̀ẹ́dógún", 16: "ẹ̀rìndínlógún", 19: "ọ̀kàndínlógún", 20: "ogún", 21: "ọ̀kànlélógún", 25: "ẹ̀ẹ́dọ́gbọ̀n", 30: "ọgbọ̀n",
    35: "àrúndínlógójì", 40: "ogójì", 45: "àrúndínláàádọ́ta", 48: "èjìdínláàádọ́ta", 50: "àádọ́ta" };
  for (const [n, w] of Object.entries(want)) assert.equal(yoruba(+n), w, `${n}`);
  assert.equal(yoruba(-1), null); assert.equal(yoruba(51), null); assert.equal(yoruba(1.5), null);
  assert.equal(YORUBA_WORDS.size, 51, "every number says a different word");
  for (const w of YORUBA_WORDS) assert.ok(!IGBO_WORDS.has(w), w);
  // the pattern the table follows: 16–19 are "less" twenty (dín … lógún), 21–24 "more than" twenty (lé … lógún)
  for (let n = 16; n <= 19; n++) assert.match(yoruba(n), /dínlógún$/);
  for (let n = 21; n <= 24; n++) assert.match(yoruba(n), /lélógún$/);
  for (let n = 36; n <= 39; n++) assert.match(yoruba(n), /dínlógójì$/);
  for (let n = 46; n <= 49; n++) assert.match(yoruba(n), /dínláàádọ́ta$/);
});

test("the chosen tongue says the count; true still means Igbo; figures say nothing", () => {
  assert.equal(said(5, "yoruba"), "àrún"); assert.equal(said(5, "igbo"), "ise"); assert.equal(said(5, true), "ise");
  assert.equal(said(5, null), null); assert.equal(said(5, false), null); assert.equal(said(5, "figures"), null);
  assert.equal(countWord(5, "yoruba"), "àrún"); assert.equal(countWord(-1, "yoruba"), ""); assert.equal(countWord(0, "yoruba"), "òdo");
  assert.equal(countLang("yoruba"), "yo"); assert.equal(countLang("igbo"), "ig"); assert.equal(countLang(null), "");
  const state = { pits: [5, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], stores: [3, 0] };
  const w = countWords({ state, pit: 0, you: 0 });
  assert.equal(withIgbo(w, 5, "yoruba"), `${w} · àrún`);
  assert.match(withIgbo(troughWords({ stores: [18, 4], side: 0, you: 0 }), 18, "yoruba"), / · èjìdínlógún$/);
  assert.equal(countPref("yoruba"), "yoruba");
  assert.match(countNote("yoruba"), /ọ̀kan, èjì/); assert.match(countToast("yoruba"), /Yoruba/);
});

test("French keeps the Yoruba words as they are", () => {
  const w = withIgbo(countWords({ state: { pits: [5, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], stores: [0, 0] }, pit: 0, you: 0 }), 5, "yoruba");
  const fr = translate(w, "fr");
  assert.notEqual(fr, w); assert.match(fr, / · àrún$/);
  for (const s of [countNote("yoruba"), countToast("yoruba")]) { const t = translate(s, "fr"); assert.notEqual(t, s, s); assert.match(t, /ọ̀kan, èjì/); }
  assert.equal(translate("Yoruba", "fr"), "Yoruba");
});

test("the Yoruba choice is in Settings → Language → Count in, and the board says the word in the chosen tongue", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /data-v="igbo" lang="ig">Igbo<\/button><button class="segbtn" data-v="yoruba" lang="yo">Yoruba<\/button>/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /counting\.word\.lang = countLang\(/);
  assert.match(game, /countWord\(k \+ 1, ig\)/);
});
