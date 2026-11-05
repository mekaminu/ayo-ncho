// The privacy, terms and support pages in French (Launch L18): served at the same addresses with ?lang=fr or to a browser whose
// first language is French; saying the same facts as the English (the times, the hosts, the law, the age, the settings by their
// French names in the game); no English left in the words; French spacing; and Settings opening them in the game's language.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../server/index.js";
import { legalPage, pageLang, PAGES, UPDATED } from "../server/legal.js";
import { dateFr, frSpaces } from "../server/legal-fr.js";
import { legalLink } from "../web/app.js";
import { translate } from "../web/i18n.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { SELLER_NAME: "Test Seller Ltd", SUPPORT_EMAIL: "help@example.com" };
const srv = createServer({ sweepEvery: 60_000, env });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.server.address().port}`;
after(() => srv.close());
const text = (html) => html.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, "\u00a0").replace(/[ \t\r\n]+/g, " ");
const words = (html) => text(html.replace(/<a [^>]*lang="en"[^>]*>[^<]*<\/a>/g, "").replace(/<a href="\/\w+\?lang=en">[^<]*<\/a>/g, ""));

test("which language a request gets: ?lang wins, then the browser's first language, else English", () => {
  assert.equal(pageLang({}, ""), "en");
  assert.equal(pageLang({}, "fr-FR,fr;q=0.9,en;q=0.8"), "fr");
  assert.equal(pageLang({}, "fr"), "fr");
  assert.equal(pageLang({}, "en-GB,fr;q=0.9"), "en", "only the first language counts, as the game's Auto");
  assert.equal(pageLang({ lang: "en" }, "fr-FR"), "en");
  assert.equal(pageLang({ lang: "FR" }, "en-GB"), "fr");
  assert.equal(pageLang({ lang: "de" }, "en-GB"), "en", "an unknown language is ignored");
  assert.equal(pageLang({ lang: ["fr", "en"] }, ""), "en", "a repeated ?lang is ignored");
});

test("the server serves each page in French at the same address, marked French, and says it varies by language", async () => {
  for (const p of PAGES) {
    for (const [url, headers] of [[`/${p}?lang=fr`, {}], [`/${p}.html`, { "accept-language": "fr-CI,fr;q=0.9" }]]) {
      const r = await fetch(base + url, { headers });
      assert.equal(r.status, 200, url);
      assert.equal(r.headers.get("content-language"), "fr");
      assert.match(r.headers.get("vary"), /Accept-Language/);
      const h = await r.text();
      assert.match(h, /<html lang="fr">/);
      for (const q of PAGES) assert.ok(h.includes(`href="/${q}?lang=fr"`), `${url} links to /${q} in French`);
      assert.ok(h.includes(`href="/${p}?lang=fr" aria-current="page"`));
      assert.ok(h.includes(`href="/?lang=fr"`), "back to the game, in French");
      assert.ok(h.includes(`href="/${p}?lang=en" hreflang="en" lang="en">English</a>`), "the way back to English");
      assert.ok(text(h).includes(`Mis à jour le ${dateFr(UPDATED)}`));
      assert.ok(!/<script/i.test(h) && !/https?:\/\/(fonts\.googleapis|cdnjs)/.test(h));
    }
    const en = await fetch(base + `/${p}`);
    assert.equal(en.headers.get("content-language"), "en");
    const h = await en.text();
    assert.match(h, /<html lang="en">/);
    assert.ok(h.includes(`href="/${p}?lang=fr" hreflang="fr" lang="fr">Français</a>`));
    const forced = await (await fetch(base + `/${p}?lang=en`, { headers: { "accept-language": "fr" } })).text();
    assert.match(forced, /<html lang="en">/, "?lang=en keeps English on a French phone set to English");
  }
});

test("the French says the same facts as the English", () => {
  const priv = text(legalPage("privacy", {}, "fr"));
  for (const must of [
    "Pas de compte, pas de publicité, pas de statistiques et pas de cookies",
    "le nom que vous tapez", "coups", "cris",
    "jamais écrit dans une base de données ni sur disque",
    "supprimée après 10 minutes", "6 heures",
    "Jouer contre l’ordinateur, l’énigme du jour ou à deux sur un téléphone ne nous envoie rien",
    "Render", "Google Fonts", "cdnjs", "Les applis embarquent les deux",
    "App Store d’Apple ou Google Play", "à partir de 13 ans", "Royaume-Uni et de l’UE", "ico.org.uk", "STUN", "WebRTC",
  ]) assert.ok(priv.includes(must), `privacy says: ${must}`);
  const terms = text(legalPage("terms", {}, "fr"));
  for (const must of ["jeu gratuit", "rien de ce que nous vendons ne gagnera jamais une partie", "App Store ou Google Play", "Licensed Application End User License Agreement", "droit de l’Angleterre et du pays de Galles", "consommateur"]) assert.ok(terms.includes(must), `terms say: ${must}`);
  const sup = text(legalPage("support", {}, "fr"));
  for (const must of ["Apprendre à jouer", "jusqu’à une minute", "10 minutes", "sans aucun réseau", "Plateau allégé", "Physique des graines", "effacez les données de ce site", "Restaurer les achats", "three.js", "Fraunces", "Capacitor", "?room="]) assert.ok(sup.includes(must), `support says: ${must}`);
  assert.ok(legalPage("support", {}, "fr").includes('<h2 id="report">'), "the report anchor the camera menu opens");
  // the same numbers in both languages
  for (const p of PAGES) {
    const n = (s) => (s.match(/\b\d+\b/g) || []).filter((x) => x !== "1").sort().join(",");
    assert.equal(n(words(legalPage(p, {}, "fr"))), n(text(legalPage(p, {}))), `${p}: the same numbers`);
  }
  // each says English is the one that counts, and links to it
  for (const p of PAGES) assert.ok(legalPage(p, {}, "fr").includes(`<a href="/${p}?lang=en">`));
});

test("the settings and buttons it names are the game's own French words", () => {
  const all = PAGES.map((p) => text(legalPage(p, {}, "fr"))).join(" ");
  for (const en of ["Settings", "Privacy", "Rules", "Learn to play", "Lighter board", "Seed physics", "Let in", "Restore purchases", "Report a problem", "Share game numbers and crash reports", "Feel"]) {
    const fr = translate(en, "fr");
    assert.notEqual(fr, en, `${en} has French`);
    assert.ok(all.includes(fr.replace(/ /g, " ")) || all.includes(fr), `the pages name "${fr}"`);
  }
  assert.ok(all.includes(translate("Oya, your move!", "fr")), "the shout as the game says it");
});

test("no English left in the French words, French spacing, the seller and email kept as given", () => {
  for (const p of PAGES) {
    const h = legalPage(p, env, "fr");
    const t = words(h);
    for (const en of [" the ", " and ", " your ", " you ", " is ", " with ", "Last updated", "← Play", "coming soon", "run by"]) assert.ok(!t.includes(en), `${p}: no "${en.trim()}"`);
    assert.ok(!/ [:;?!]/.test(t), `${p}: a non-breaking space before : ; ? !`);
    assert.ok(h.includes('<a href="mailto:help@example.com">help@example.com</a>'));
    assert.ok(h.includes("géré par Test Seller Ltd"));
  }
  const none = legalPage("privacy", {}, "fr");
  assert.ok(none.includes("l’adresse e-mail d’assistance (bientôt)"));
  assert.ok(none.includes("géré par le créateur d’Ayo &amp; Nchò"));
  const evil = legalPage("terms", { SELLER_NAME: "<b>x</b> : y" }, "fr");
  assert.ok(evil.includes("&lt;b&gt;x&lt;/b&gt;") && !evil.includes("<b>x"));
  // spacing never touches a tag, and handles « »
  assert.equal(frSpaces('<a href="x?y=1">a : b ?</a> « c »'), '<a href="x?y=1">a&nbsp;: b&nbsp;?</a> «&nbsp;c&nbsp;»');
  assert.equal(dateFr("4 November 2026"), "4 novembre 2026");
  assert.equal(dateFr("1 December 2026"), "1er décembre 2026");
  assert.equal(dateFr("soon"), "soon");
});

test("Settings and the camera menu open the pages in the game's language", () => {
  const web = { location: { protocol: "https:", host: "ayo-ncho.onrender.com", origin: "https://ayo-ncho.onrender.com", pathname: "/" } };
  assert.equal(legalLink("privacy", web, "fr"), "https://ayo-ncho.onrender.com/privacy?lang=fr");
  assert.equal(legalLink("terms", web, "en"), "https://ayo-ncho.onrender.com/terms?lang=en");
  assert.equal(legalLink("support", web, "xx"), "https://ayo-ncho.onrender.com/support");
  const g = readFileSync(path.join(ROOT, "web", "game.js"), "utf8");
  assert.ok(g.includes("legalLink(a.dataset.page, globalThis, i18n.lang)"));
  assert.ok(g.includes("legalLink(REPORT_PAGE, globalThis, i18n.lang) + REPORT_HASH"));
  assert.match(g, /i18n\.set\([^\n]*\); paintLegal\(\)/, "painted again when the language changes");
});
