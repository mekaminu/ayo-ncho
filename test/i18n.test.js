// French (Launch L18, slice 1): the language picked, the strings, the patterns, and the page turned into French and back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pickLang, langNote, translate, FR, PATTERNS, makeI18n } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("the language: the setting, else the phone's first language", () => {
  assert.equal(pickLang("fr", ["en-GB"]), "fr");
  assert.equal(pickLang("en", ["fr-FR"]), "en");
  assert.equal(pickLang("auto", ["fr-SN", "en"]), "fr");
  assert.equal(pickLang("auto", ["fr"]), "fr");
  assert.equal(pickLang("auto", ["en-GB", "fr"]), "en", "only the first language counts");
  assert.equal(pickLang("auto", ["fy-NL"]), "en");
  assert.equal(pickLang(undefined, []), "en");
  assert.match(langNote("auto", "fr"), /téléphone/);
  assert.match(langNote("auto", "en"), /English now/);
});

test("exact phrases, whitespace kept, English left as it is", () => {
  assert.equal(translate("Settings", "fr"), "Réglages");
  assert.equal(translate("\n   Play  \n", "fr"), "\n   Jouer  \n");
  assert.equal(translate("Lose signal mid-game   and the room keeps your seat: come back and carry on.", "fr"), FR["Lose signal mid-game and the room keeps your seat: come back and carry on."]);
  assert.equal(translate("Settings", "en"), "Settings");
  assert.equal(translate("Mama Ngozi", "fr"), "Mama Ngozi", "names stay");
  assert.equal(translate("17", "fr"), "17");
  assert.equal(translate("", "fr"), "");
  assert.equal(translate(null, "fr"), null);
  assert.equal(translate("constructor", "fr"), "constructor", "no inherited keys");
});

test("lines built from parts", () => {
  assert.equal(translate("vs Nnamdi · Medium", "fr"), "contre Nnamdi · Moyen");
  assert.equal(translate("vs Mama Ngozi · Hard · Mama Ngozi starts", "fr"), "contre Mama Ngozi · Difficile · Mama Ngozi commence");
  assert.equal(translate("Papa Ike · Master", "fr"), "Papa Ike · Maître");
  assert.equal(translate("Player 2 starts · on this phone", "fr"), "Joueur 2 commence · sur ce téléphone");
  assert.equal(translate("Player 2 wins", "fr"), "Joueur 2 gagne");
  assert.equal(translate("Nnamdi wins", "fr"), "Nnamdi gagne");
  assert.equal(translate("Nchò · 14 moves", "fr"), "Nchò · 14 coups");
  assert.equal(translate("Ayo · 1 move", "fr"), "Ayo · 1 coup");
  assert.equal(translate("1 seed", "fr"), "1 graine");
  assert.equal(translate("12 seeds", "fr"), "12 graines");
  assert.equal(translate("now lighter (slow phone)", "fr"), "allégé en ce moment (slow phone)");
  assert.equal(translate("now off (lighter board)", "fr"), "désactivée en ce moment (lighter board)");
  assert.equal(translate("Cowries — in the store", "fr"), "Cauris — dans la boutique");
  assert.equal(translate("River stones — at 7 days played", "fr"), "Galets — après 7 jours de jeu");
  assert.equal(translate("Play again — Tete is ready", "fr"), "Rejouer — Tete est prêt");
  for (const [re] of PATTERNS) assert.ok(re.source.startsWith("^") && re.source.endsWith("$"), "a pattern matches a whole line: " + re);
});

test("every French phrase is French: nothing left in English by mistake, and the dictionary has no empty entry", () => {
  const same = new Set(["Iroko", "iroko", "Auto", "auto", "Clip", "English", "Français", "Vidéo", "Mm.", "Mm-hm."]);
  for (const [en, fr] of Object.entries(FR)) {
    assert.ok(fr && fr.trim(), "empty: " + en);
    if (en === fr) assert.ok(same.has(en), "left as English: " + en);
    assert.ok(!/\s{2,}/.test(en), "keys are single-spaced: " + en);
  }
});

// The words written in the page itself: every one with a letter in it has its French, except names and the lines the
// game writes over before anyone sees them (they are covered by the patterns or by later slices).
function pageWords(html) {
  html = html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const out = new Set();
  for (const m of html.matchAll(/\s(?:aria-label|title|placeholder|alt)="([^"]*)"/g)) out.add(m[1]);
  for (const m of html.replace(/<[^>]*>/g, "\u0000").split("\u0000")) out.add(m);
  const dec = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  return [...out].map((s) => dec(s).replace(/\s+/g, " ").trim()).filter((s) => /\p{L}/u.test(s));
}
const NOT_WORDS = new Set(["Ayo & Nchò", "Nchò", "Ayo", "Meka", "Tete", "G", "Gold", "Adaeze", "Auntie Bisi", "Nnamdi", "Mama Ngozi", "Papa Ike", "A B _ _"]);
const FILLED_IN = [ // placeholders the game replaces as it paints (they reach French through the patterns, or in later slices)
  /^Nnamdi · Medium$/, /^vs Nnamdi · Medium$/, /^Daily puzzle · /, /^playing as /, /^8 of 8/, /^Mahogany · Job's tears$/, /^Nchò · 14 moves$/,
  /^0 seeds$/, /^You led for good/, /^you lead 4–2/, /^“Three in a row/, /^for beating Nnamdi/, /^Ready for Nnamdi/, /^Tete /, /^follows the phone's language/,
];
test("every word written in index.html has its French", () => {
  const words = pageWords(read("web/index.html"));
  assert.ok(words.length > 200, "found the page's words: " + words.length);
  const missing = words.filter((w) => !NOT_WORDS.has(w) && !FILLED_IN.some((re) => re.test(w)) && translate(w, "fr") === w && !Object.hasOwn(FR, w));
  assert.deepEqual(missing, []);
});

test("Settings has the Language row: Auto, English, Français", () => {
  const html = read("web/index.html");
  assert.match(html, /data-set="lang"><button class="segbtn" data-v="auto">Auto<\/button><button class="segbtn" data-v="en"[^>]*>English<\/button><button class="segbtn" data-v="fr"[^>]*>Français<\/button>/);
  assert.match(read("web/sw.js"), /'\.\/i18n\.js'/, "cached for offline play");
  const game = read("web/game.js");
  assert.match(game, /makeI18n\(/); assert.match(game, /name === 'lang'/);
  assert.ok(!/el\.textContent === (mouse|counting)\.words/.test(game), "the hint line is compared in English, whatever it shows");
});

// a small stand-in for the page: elements, text nodes, attributes, and an observer the test calls by hand
class Text { constructor(d) { this.nodeType = 3; this.nodeName = "#text"; this._d = d; this.parentNode = null; this.nextSibling = null; }
  get data() { return this._d; } set data(v) { this._d = v; Doc.log.push({ type: "characterData", target: this }); } }
class El {
  constructor(name, attrs = {}) { this.nodeType = 1; this.nodeName = name; this.attrs = { ...attrs }; this.kids = []; this.parentNode = null; this.dataset = {}; this.nextSibling = null; }
  get firstChild() { return this.kids[0] || null; }
  append(...ns) { for (const n of ns) { n.parentNode = this; const last = this.kids[this.kids.length - 1]; if (last) last.nextSibling = n; this.kids.push(n); } return this; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); Doc.log.push({ type: "attributes", target: this, attributeName: k }); }
  get textContent() { return this.kids.map((k) => (k.nodeType === 3 ? k.data : k.textContent)).join(""); }
  set textContent(v) { for (const k of this.kids) k.parentNode = null; this.kids = []; const t = new Text(v); this.append(t); Doc.log.push({ type: "childList", target: this, addedNodes: [t] }); }
}
const Doc = { log: [] };
function page() {
  Doc.log = [];
  const body = new El("BODY"); const html = new El("HTML"); html.append(body);
  const doc = { nodeType: 9, documentElement: html, body };
  html.lang = "en";
  const h2 = new El("H2").append(new Text("Settings"));
  const btn = new El("BUTTON", { "aria-label": "Back" }).append(new Text("\n  Play  "));
  const hint = new El("P"); hint.append(new Text("your move"));
  const svg = new El("svg").append(new El("title").append(new Text("Home")));
  const keep = new El("SPAN"); keep.dataset.i18nSkip = ""; keep.append(new Text("Home"));
  body.append(h2, btn, hint, svg, keep);
  let cb = null;
  class Obs { constructor(f) { cb = f; } observe() {} takeRecords() { const r = Doc.log; Doc.log = []; return r; } }
  const tick = () => { const r = Doc.log; Doc.log = []; if (r.length) cb(r); };
  return { doc, h2, btn, hint, svg, keep, Obs, tick };
}

test("the page turns into French, a line the game writes again is French too, and English comes back", () => {
  const p = page();
  const i = makeI18n({ doc: p.doc, lang: "fr", Observer: p.Obs }).start();
  assert.equal(p.doc.documentElement.lang, "fr");
  assert.equal(p.h2.textContent, "Réglages");
  assert.equal(p.btn.textContent, "\n  Jouer  ");
  assert.equal(p.btn.getAttribute("aria-label"), "Retour");
  assert.equal(p.svg.firstChild.textContent, "Home", "inside an svg nothing is touched");
  assert.equal(p.keep.textContent, "Home", "data-i18n-skip is left alone");
  assert.equal(p.hint.textContent, "à vous");
  assert.equal(i.src(p.hint), "your move", "src gives the English");
  p.hint.textContent = "waiting"; p.tick();
  assert.equal(p.hint.textContent, "attend");
  assert.equal(i.src(p.hint), "waiting");
  p.hint.textContent = "pit 3 · 5 seeds"; p.tick(); // the board's words (slice 2)
  assert.equal(p.hint.textContent, "trou 3 · 5 graines"); assert.equal(i.src(p.hint), "pit 3 · 5 seeds");
  p.hint.textContent = "pit 3 · a line with no French yet"; p.tick(); // no French for a part: stays as written
  assert.equal(p.hint.textContent, "pit 3 · a line with no French yet"); assert.equal(i.src(p.hint), "pit 3 · a line with no French yet");
  p.hint.firstChild.data = "thinking…"; p.tick();
  assert.equal(p.hint.textContent, "réfléchit…");
  p.btn.setAttribute("aria-label", "Settings"); p.tick();
  assert.equal(p.btn.getAttribute("aria-label"), "Réglages");
  assert.equal(Doc.log.length, 0, "its own writes do not loop back");
  i.set("en");
  assert.equal(p.doc.documentElement.lang, "en");
  assert.equal(p.h2.textContent, "Settings"); assert.equal(p.btn.textContent, "\n  Play  "); assert.equal(p.btn.getAttribute("aria-label"), "Settings");
  assert.equal(p.hint.textContent, "thinking…");
  i.set("fr");
  assert.equal(p.h2.textContent, "Réglages"); assert.equal(p.hint.textContent, "réfléchit…");
});

test("English: nothing changes and nothing is remembered", () => {
  const p = page();
  const i = makeI18n({ doc: p.doc, lang: "en", Observer: p.Obs }).start();
  assert.equal(p.h2.textContent, "Settings"); assert.equal(p.hint.textContent, "your move");
  p.hint.textContent = "waiting"; p.tick(); assert.equal(p.hint.textContent, "waiting"); assert.equal(i.src(p.hint), "waiting");
});

test("a French word the game writes is never taken for English", () => {
  const p = page();
  const i = makeI18n({ doc: p.doc, lang: "fr", Observer: p.Obs }).start();
  p.hint.textContent = "à vous"; p.tick();
  assert.equal(p.hint.textContent, "à vous");
  i.set("en"); assert.equal(p.hint.textContent, "à vous", "nothing to put back: it was written that way");
});

test("lines put together from parts are French only when every part is", () => {
  assert.equal(translate("mahogany · iroko · ebony · Benin bronze and Grandpa's board in the store", "fr"), "acajou · iroko · ébène · le bronze du Bénin et le plateau de grand-père dans la boutique");
  assert.equal(translate("Job's tears · river stones at 7 days played (2 so far) · cowries in the store", "fr"), "Larmes de Job · galets après 7 jours de jeu (2 pour l’instant) · les cauris dans la boutique");
  assert.equal(translate("pit 3 · 5 seeds · a part with no French", "fr"), "pit 3 · 5 seeds · a part with no French", "never half French");
  assert.equal(translate("ends in their pit 3 — a part with no French", "fr"), "ends in their pit 3 — a part with no French", "never half French either side of a dash");
  assert.equal(translate("Nnamdi · waiting", "fr"), "Nnamdi · attend");
  assert.equal(FR["What do we call you?"], "Comment vous appelle-t-on ?", "a thin space keeps ? off the start of a line");
  assert.ok(Object.values(FR).every((v) => !/ [:;?!]/.test(v)));
});

test("Home's lines: the puzzle card and the calm streak", async () => {
  const { homeLine } = await import("../web/streak.js");
  const { cardLine, dayLabel } = await import("../web/daily.js");
  assert.equal(translate(`Daily puzzle · ${dayLabel("2026-11-05")}`, "fr"), "Énigme du jour · jeu. 5 nov.");
  assert.equal(translate(`Daily puzzle · ${dayLabel("2026-12-01")}`, "fr"), "Énigme du jour · mar. 1er déc.");
  assert.equal(translate("Capture 12 in one turn", "fr"), "Prenez 12 en un tour");
  for (const e of [null, { solved: true }, { shown: true }, { got: 5, target: 8 }]) assert.notEqual(translate(cardLine(e), "fr"), cardLine(e));
  assert.equal(translate(cardLine({ got: 5, target: 8 }), "fr"), "meilleur : 5 sur 8");
  const day = (k) => `2026-11-${String(k).padStart(2, "0")}`;
  const lines = [homeLine({ days: [] }, day(1))];
  for (let n = 1; n <= 16; n++) { const days = [...Array(n).keys()].map((k) => day(k + 1)); lines.push(homeLine({ days }, day(n)), homeLine({ days }, day(n + 1))); }
  for (const l of lines) { const f = translate(l, "fr"); assert.notEqual(f, l, "in French: " + l); assert.ok(!/ days?\b| played| more /.test(f), f); }
});
