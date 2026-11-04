// The store screen (L11): what each row says and does, from what the phone owns. Looks only: nothing here touches the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { storeView, tapAction, priceLabel, nowLine, restoreWords, GOLD_OPENS, BOARDS, SEEDS } from "../web/store.js";
import { LOOKS, WOODS, BUNDLE, parseOwned } from "../web/entitle.js";
import { FINISHES, SEED_SETS } from "../web/board.js";
import { backStep } from "../web/app.js";

const base = { finish: "mahogany", seeds: "jobs", days: 3, need: 7 };
const row = (v, kind, id) => (kind === "board" ? v.boards : v.seeds).find((r) => r.id === id);

test("every board and seed set the game can draw is a row, in the mockup's order, with its product", () => {
  assert.deepEqual(BOARDS.map((r) => r.id), Object.keys(FINISHES));
  assert.deepEqual(SEEDS.map((r) => r.id), Object.keys(SEED_SETS));
  const v = storeView(base);
  for (const r of [...v.boards, ...v.seeds]) assert.equal(r.product, LOOKS[r.id] ? LOOKS[r.id].product : null, r.id);
  assert.equal(v.bundle.product, BUNDLE);
  assert.equal(v.gold.product, "gold");
});

test("a new phone on the web link: the free looks are yours, the store's say Get the app, river stones count the days", () => {
  const v = storeView(base);
  assert.deepEqual(v.boards.map((r) => [r.id, r.state, r.button]), [
    ["mahogany", "on", "On the board"], ["iroko", "use", "Use"], ["ebony", "use", "Use"],
    ["benin", "buy", "Get the app"], ["grandpa", "buy", "Get the app"]]);
  assert.deepEqual(v.seeds.map((r) => [r.id, r.state, r.button]), [
    ["jobs", "on", "On the board"], ["stones", "earn", "3 of 7 days"], ["cowries", "buy", "Get the app"], ["kernels", "buy", "Get the app"]]);
  assert.match(row(v, "board", "iroko").sub, /yours$/);
  assert.match(row(v, "seeds", "stones").sub, /earned: 7 days played/);
  assert.equal(v.gold.state, "buy"); assert.equal(v.gold.button, "Get the app");
  assert.equal(v.bundle.button, "Get the app");
  assert.match(v.note, /web link sells nothing/);
});

test("prices are never written in: inside the app they come from the store, Soon until then", () => {
  assert.equal(priceLabel("gold", { inApp: false, prices: { gold: "£3.99" } }), "Get the app", "the web link never shows a price");
  assert.equal(priceLabel("gold", { inApp: true }), "Soon");
  assert.equal(priceLabel("gold", { inApp: true, prices: { gold: "  " } }), "Soon");
  assert.equal(priceLabel("gold", { inApp: true, prices: { gold: "€4,49" } }), "€4,49");
  const v = storeView({ ...base, inApp: true, prices: { board_benin_bronze: "£2.99", gold: "£3.99" } });
  assert.equal(row(v, "board", "benin").button, "£2.99");
  assert.equal(row(v, "board", "grandpa").button, "Soon");
  assert.equal(v.gold.button, "£3.99");
  const src = readFileSync(new URL("../web/store.js", import.meta.url), "utf8");
  assert.ok(!/[£$€]\s?\d/.test(src), "no price is hard-coded in the store");
});

test("bought looks, the bundle and Gold", () => {
  let v = storeView({ ...base, owned: parseOwned('["board_grandpa"]'), finish: "grandpa" });
  assert.equal(row(v, "board", "grandpa").state, "on"); assert.match(row(v, "board", "grandpa").sub, /yours$/);
  assert.equal(row(v, "board", "benin").state, "buy"); assert.equal(v.bundle.state, "buy");
  v = storeView({ ...base, owned: parseOwned('["bundle_all"]') });
  for (const id of Object.keys(LOOKS)) assert.equal(row(v, LOOKS[id].kind === "board" ? "board" : "seeds", id).state, "use", id);
  assert.equal(v.bundle.state, "yours"); assert.equal(v.bundle.button, "Yours");
  assert.equal(v.gold.state, "buy", "the bundle is looks, not Gold");
  v = storeView({ ...base, owned: parseOwned('["seeds_cowries","seeds_palm_kernels","board_benin_bronze","board_grandpa"]') });
  assert.equal(v.bundle.state, "yours", "every look bought one by one owns the bundle's worth");
  v = storeView({ ...base, owned: parseOwned('["gold"]') });
  assert.equal(v.gold.state, "yours"); assert.equal(row(v, "board", "benin").state, "buy", "Gold does not open looks");
});

test("?try=looks opens the looks for the visit and says so; ?try=gold says Gold is open for the visit", () => {
  let v = storeView({ ...base, preview: "looks" });
  assert.equal(row(v, "seeds", "cowries").state, "use"); assert.match(row(v, "seeds", "cowries").sub, /open for this visit/);
  assert.equal(v.bundle.state, "buy", "a preview owns nothing");
  v = storeView({ ...base, preview: "gold" });
  assert.match(v.gold.sub, /Open for this visit/); assert.equal(v.gold.state, "buy");
  assert.equal(row(v, "seeds", "cowries").state, "buy");
});

test("trying a look: the row and the card say so, and Back is said to put yours back", () => {
  const v = storeView({ ...base, tryFinish: "benin", trySeeds: "cowries" });
  assert.ok(row(v, "board", "benin").trying && row(v, "seeds", "cowries").trying);
  assert.ok(!row(v, "board", "mahogany").trying);
  assert.equal(row(v, "board", "mahogany").state, "on", "your own stays yours while another is tried");
  assert.deepEqual(nowLine({ finish: "mahogany", seeds: "jobs", tryFinish: "benin", trySeeds: "cowries" }).title, "Benin bronze · Cowries");
  assert.equal(v.now.tag, "Trying on the board"); assert.match(v.now.words, /Back puts your own/);
  const mine = nowLine({ finish: "iroko", seeds: "stones" });
  assert.equal(mine.tag, "Your board now"); assert.equal(mine.title, "Iroko · River stones"); assert.ok(!mine.trying);
  assert.ok(!nowLine({ finish: "iroko", seeds: "jobs", tryFinish: "iroko" }).trying, "trying your own is not trying");
});

test("what each button does", () => {
  const web = storeView(base), app = storeView({ ...base, inApp: true }), priced = { inApp: true, prices: { seeds_cowries: "£1.99" } };
  assert.deepEqual(tapAction(row(web, "board", "iroko")), { act: "use", id: "iroko" });
  assert.equal(tapAction(row(web, "board", "mahogany")).act, "say");
  let a = tapAction(row(web, "seeds", "cowries"));
  assert.equal(a.act, "try"); assert.match(a.words, /Cowries are bought in the app — the web link sells nothing/);
  a = tapAction(row(web, "board", "benin")); assert.match(a.words, /Benin bronze is bought in the app/);
  a = tapAction(row(web, "seeds", "stones"), base); assert.equal(a.act, "try"); assert.match(a.words, /7 days played — 3 so far/);
  a = tapAction(row(app, "seeds", "cowries"), { inApp: true }); assert.equal(a.act, "try"); assert.match(a.words, /no price for Cowries yet/);
  a = tapAction(row(storeView({ ...base, ...priced }), "seeds", "cowries"), priced); assert.deepEqual(a, { act: "buy", id: "cowries", product: "seeds_cowries" });
  a = tapAction({ ...web.gold, id: "gold", name: "Gold" }); assert.equal(a.act, "say"); assert.match(a.words, /Gold is bought in the app/);
  a = tapAction({ ...storeView({ ...base, owned: parseOwned('["gold"]') }).gold, id: "gold", name: "Gold" }); assert.equal(a.words, "Gold is yours");
  a = tapAction(web.bundle); assert.equal(a.act, "say"); assert.match(a.words, /The whole market is bought in the app/);
  assert.match(restoreWords(false), /web link/); assert.match(restoreWords(true), /Asking the store/);
});

test("Gold's card lists what it opens, the two not built yet marked coming", () => {
  assert.deepEqual(GOLD_OPENS.map((o) => [o.id, o.ready]), [["master", true], ["review", true], ["archive", false], ["history", false]]);
  assert.match(storeView(base).gold.sub, /never a win bought/);
});

test("the screen is in the page, reachable from Home and Settings, and the phone's back button leaves it", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  for (const id of ["store", "storeBack", "goldCard", "nowCard", "shopBoards", "shopSeeds", "shopBundle", "restoreBtn", "homeStore", "settingsStore"]) assert.ok(html.includes(`id="${id}"`), id);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.ok(game.includes("from './store.js'"));
  assert.equal(backStep({ screen: "store" }), "storeBack");
  for (const w of WOODS) assert.ok(BOARDS.some((b) => b.id === w));
});
