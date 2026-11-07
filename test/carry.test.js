// Move to a new phone (web/carry.js): one link carries this phone's progress, never its purchases.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gather, storageEntries, pack, unpack, carryLink, codeFrom, fromHash, summary, summaryWords, whyWords, merge, apply, broughtToast, sentToast, SEND_TEXT, KEEP_OUT, MAX_CODE } from "../web/carry.js";
import { translate } from "../web/i18n.js";

const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
function fakeLS(init = {}) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
const OLD = {
  "ayo.streak": JSON.stringify({ days: ["2026-11-01", "2026-11-02", "2026-11-05"], seen: ["stones"] }),
  "ayo.record": JSON.stringify({ easy: { w: 3, l: 1, d: 0, best: [30, 18], run: 2 }, hard: { w: 0, l: 4, d: 1, best: null, run: -4 }, last: "g9" }),
  "ayo.rating": JSON.stringify({ r: 1180, n: 9, last: "g9", change: 12 }),
  "ayo.daily": JSON.stringify({ days: { "2026-11-05:ncho": { got: 8, target: 8, tries: 2, solved: true } }, solved: ["2026-11-05"] }),
  "ayo.game": JSON.stringify({ moves: [2, 7, 4], variant: "ncho", rules: {}, level: "medium", stats: {}, local: null }),
  "ayo.name": "Meka", "ayo.lang": "fr", "ayo.lesson": "done",
  "ayo.owned": JSON.stringify(["gold", "bundle_all"]), "ayo.room": JSON.stringify({ code: "EDNE", token: "secret" }),
  "ayo.quality.measured": "slow", "ayo.full": "1", "other.app": "x",
};

test("gather takes the game's entries and leaves out purchases, a room's seat and the phone's own measures", () => {
  const g = gather(Object.entries(OLD));
  assert.equal(g.name, "Meka"); assert.ok(g.streak && g.record && g.rating && g.daily && g.game && g.lesson);
  for (const k of ["owned", "room", "quality.measured", "full"]) assert.equal(g[k], undefined, k);
  assert.equal(g["other.app"], undefined); assert.equal(Object.keys(g).some((k) => k.startsWith("ayo.")), false);
  assert.ok(KEEP_OUT.has("owned"));
  assert.equal(gather([["ayo.game", "null"]]).game, undefined, "no game under way, nothing to carry");
  assert.equal(gather([["ayo.big", "x".repeat(30000)]]).big, undefined);
  assert.deepEqual(gather(storageEntries(fakeLS({ "ayo.a": "1" }))), { a: "1" });
});

test("a code comes back exactly as it went, squeezed or plain", async () => {
  const d = gather(Object.entries(OLD));
  const z = await pack(d, { at: 5 }); assert.equal(z[0], "z"); assert.match(z, /^[zj][A-Za-z0-9_-]+$/);
  const j = await pack(d, { at: 5, CS: null }); assert.equal(j[0], "j"); assert.ok(z.length < j.length, "deflate makes it shorter");
  for (const c of [z, j]) { const r = await unpack(c); assert.ok(r.ok); assert.deepEqual(r.data, d); assert.equal(r.at, 5); }
  const uni = await unpack(await pack({ localNames: JSON.stringify(["Adaeze", "Ọ̀ṣun é"]) })); assert.equal(JSON.parse(uni.data.localNames)[1], "Ọ̀ṣun é");
});

test("a broken, cut or made-up code is refused, and purchases slipped in are dropped", async () => {
  const c = await pack({ name: "Meka" });
  assert.equal((await unpack(c.slice(0, c.length - 6))).ok, false);
  assert.deepEqual(await unpack("hello"), { ok: false, why: "broken" });
  assert.equal((await unpack("z" + "A".repeat(40))).why, "broken");
  const enc = (o) => "j" + Buffer.from(JSON.stringify(o)).toString("base64url");
  assert.equal((await unpack(enc({ v: 2, d: { name: "x" } }))).why, "newer");
  assert.equal((await unpack(enc({ v: 1, d: { owned: '["gold"]' } }))).why, "empty");
  const r = await unpack(enc({ v: 1, d: { owned: '["gold"]', room: "{}", name: "Meka", "../x": "1", n: 5 } }));
  assert.ok(r.ok); assert.deepEqual(r.data, { name: "Meka" });
  assert.ok(whyWords("broken").includes("copy it again"));
});

test("a game too long for one link is left behind, the rest still goes", async () => {
  const d = { name: "Meka", game: JSON.stringify({ moves: Array.from({ length: 19000 }, () => Math.random().toString(36).slice(2, 4)) }) };
  const c = await pack(d, { CS: null }); assert.ok(c.length <= MAX_CODE, c.length);
  const r = await unpack(c); assert.equal(r.data.game, undefined); assert.equal(r.data.name, "Meka");
});

test("the link puts the code after the #, and a pasted link or bare code is read back", async () => {
  const code = await pack({ name: "Meka" });
  const l = carryLink("https://ayo-ncho.onrender.com/", code);
  assert.equal(l, "https://ayo-ncho.onrender.com/#carry=" + code);
  assert.equal(new URL(l).search, "", "nothing about it in what the server is sent");
  assert.equal(codeFrom(l), code); assert.equal(codeFrom("  " + code + "\n"), code);
  assert.equal(codeFrom("My progress · open this " + l), code);
  assert.equal(codeFrom("https://ayo-ncho.onrender.com/"), null); assert.equal(codeFrom(""), null);
  assert.equal(fromHash("#carry=" + code), code); assert.equal(fromHash(""), null); assert.equal(fromHash("#watch"), null);
  assert.equal(carryLink("https://x/#old", "zAB"), "https://x/#carry=zAB");
});

test("the summary counts what the link carries", () => {
  const s = summary(gather(Object.entries(OLD)));
  assert.deepEqual(s, { days: 3, games: 9, rating: 1180, puzzles: 1, game: true });
  assert.equal(summaryWords(s), "3 days played · 9 games · rating 1180 · 1 puzzle solved · a game under way");
  assert.equal(summaryWords(summary({})), "0 days played · 0 games");
  assert.equal(summary({ rating: JSON.stringify({ r: 1000, n: 0 }) }).rating, null, "no rated game yet, no rating said");
  assert.equal(broughtToast({ days: 1, games: 1, rating: null, puzzles: 0, game: false }), "Brought across · 1 day played · 1 game");
});

test("bringing it in: the old phone's progress, with the days of both phones put together", () => {
  const here = { streak: JSON.stringify({ days: ["2026-11-06", "2026-11-02"], seen: [] }), daily: JSON.stringify({ days: { "2026-11-05:ncho": { got: 4, target: 8, tries: 1, solved: false }, "2026-11-06:ncho": { got: 8, target: 8, tries: 1, solved: true } }, solved: ["2026-11-06"] }), name: "New", level: "easy" };
  const there = gather(Object.entries(OLD));
  const w = merge(here, there);
  assert.deepEqual(JSON.parse(w.streak).days, ["2026-11-01", "2026-11-02", "2026-11-05", "2026-11-06"]);
  assert.deepEqual(JSON.parse(w.streak).seen, ["stones"]);
  const d = JSON.parse(w.daily); assert.deepEqual(d.solved, ["2026-11-05", "2026-11-06"]);
  assert.equal(d.days["2026-11-05:ncho"].solved, true, "the solved day wins"); assert.equal(d.days["2026-11-06:ncho"].got, 8);
  assert.equal(w.name, "Meka", "the rest is the old phone's"); assert.equal(w.level, undefined, "this phone's own other entries are left alone");
  const w2 = merge({ streak: here.streak }, { name: "Meka" }); assert.equal(w2.streak, here.streak, "an old phone with no days keeps the new phone's");
  const ls = fakeLS({ "ayo.level": "easy", "ayo.owned": '["gold"]' }); assert.equal(apply(ls, w), Object.keys(w).length);
  assert.equal(ls.getItem("ayo.name"), "Meka"); assert.equal(ls.getItem("ayo.level"), "easy"); assert.equal(ls.getItem("ayo.owned"), '["gold"]');
});

test("Settings carries the row, the service worker the module, and every word has its French", () => {
  const html = read("../web/index.html");
  for (const id of ["carrySend", "carryBring", "carryAsk", "carryPaste", "carryYes", "carryNo", "carryWhat"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(read("../web/sw.js").includes("'./carry.js'"));
  const game = read("../web/game.js"); assert.ok(game.includes("from './carry.js'")); assert.ok(game.includes("history.replaceState(null, '', location.pathname + location.search)"));
  const lines = [SEND_TEXT, sentToast("copied"), sentToast("shared"), whyWords("broken"), whyWords("newer"), whyWords("empty"), "Could not make the link here", "Bringing it across…",
    broughtToast({ days: 12, games: 31, rating: 1240, puzzles: 1, game: true }), "2 days played · 1 game — it replaces this phone’s own (days played and puzzles are put together)", "paste the link sent from the old phone"];
  for (const l of lines) { const f = translate(l, "fr"); assert.notEqual(f, l, l); assert.ok(!/(^|[^\p{L}])(days|games|played|phone|link)(?!\p{L})/u.test(f), f); }
  assert.equal(translate("12 days played · 31 games · rating 1240", "fr"), "12 jours de jeu · 31 parties · classement 1240");
});
