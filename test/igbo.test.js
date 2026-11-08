// Count in Igbo (idea 8 Nov): the Igbo numbers for a count by touch (web/igbo.js), the Settings row, French keeping them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { igbo, IGBO_WORDS, countWord, withIgbo, countPref, countNote, countToast } from "../web/igbo.js";
import { translate } from "../web/i18n.js";
import { countWords, troughWords } from "../web/count.js";

test("the numbers a board can hold, in Igbo", () => {
  const want = { 0: "efu", 1: "otu", 2: "abụọ", 3: "atọ", 4: "anọ", 5: "ise", 6: "isii", 7: "asaa", 8: "asatọ", 9: "itoolu",
    10: "iri", 11: "iri na otu", 12: "iri na abụọ", 19: "iri na itoolu", 20: "iri abụọ", 21: "iri abụọ na otu",
    25: "iri abụọ na ise", 30: "iri atọ", 40: "iri anọ", 48: "iri anọ na asatọ", 99: "iri itoolu na itoolu" };
  for (const [n, w] of Object.entries(want)) assert.equal(igbo(+n), w, `${n}`);
  assert.equal(igbo(-1), null); assert.equal(igbo(100), null); assert.equal(igbo(2.5), null);
  for (let n = 0; n <= 48; n++) assert.ok(IGBO_WORDS.has(igbo(n)));
  assert.equal(IGBO_WORDS.size, 100, "every number says a different word");
});

test("figures until Igbo is chosen; the word under the number and on the hint line", () => {
  assert.equal(countPref(undefined), "figures"); assert.equal(countPref("igbo"), "igbo"); assert.equal(countPref("yoruba"), "yoruba"); assert.equal(countPref("hausa"), "figures");
  assert.equal(countWord(5, false), ""); assert.equal(countWord(5, true), "ise"); assert.equal(countWord(-1, true), "");
  const state = { pits: [5, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], stores: [3, 0] };
  const w = countWords({ state, pit: 0, you: 0 });
  assert.equal(withIgbo(w, 5, false), w);
  assert.equal(withIgbo(w, 5, true), `${w} · ise`);
  assert.equal(withIgbo(countWords({ state, pit: 1, you: 0 }), 0, true), "your pit 2 is empty · efu");
  assert.match(withIgbo(troughWords({ stores: [18, 4], side: 0, you: 0 }), 18, true), / · iri na asatọ$/);
  assert.match(countNote("igbo"), /otu, abụọ/); assert.match(countNote("figures"), /in figures/);
  assert.match(countToast("igbo"), /Igbo/);
});

test("French keeps the Igbo words as they are, and translates the rest", () => {
  const w = withIgbo(countWords({ state: { pits: [5, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], stores: [0, 0] }, pit: 0, you: 0 }), 5, true);
  const fr = translate(w, "fr");
  assert.notEqual(fr, w, "the line goes French");
  assert.match(fr, / · ise$/, "the Igbo word stays");
  assert.match(translate(withIgbo(troughWords({ stores: [18, 4], side: 0, you: 0 }), 18, true), "fr"), /iri na asatọ$/);
  for (const s of ["Count in", "Figures", countNote("igbo"), countNote("figures"), countToast("igbo"), countToast("figures")]) assert.notEqual(translate(s, "fr"), s, s);
  assert.equal(translate("Igbo", "fr"), "Igbo");
});

test("the row is in Settings → Language, the board draws the word, and the offline shell carries web/igbo.js", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /data-set="count"><button class="segbtn" data-v="figures">Figures<\/button><button class="segbtn" data-v="igbo" lang="ig">Igbo<\/button>/);
  assert.match(html, /\.cword\{/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /from '\.\/igbo\.js'/);
  assert.match(game, /withIgbo\(/);
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/igbo\.js'/);
});
