// Found by search (idea 9 Nov, server/search.js): the game's page reads right in a search result, and the links the family send
// each other (an invite, a watch link, a turn to beat, the puzzle) never become search results of their own.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { indexable, searchTags, gameData, inlineJson, robotsTxt, sitemapXml, PRIVATE } from "../server/search.js";
import { createServer } from "../server/index.js";

const O = "https://ayo-ncho.onrender.com";
const ld = (html) => { const m = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/); return m && JSON.parse(m[1]); };

test("only the game's own address is a search result", () => {
  assert.ok(indexable({})); assert.ok(indexable({ lang: "fr" })); assert.ok(indexable({ utm_source: "whatsapp" }));
  for (const q of [{ room: "EDNE" }, { watch: "EDNE-k" }, { beat: "x", n: "Meka" }, { watch: "c", a: "Meka", b: "Tete" }, { puzzle: "1" }, { n: "Meka" }]) assert.ok(!indexable(q), JSON.stringify(q));
});

test("the tags: one canonical address always; noindex on private links; the game's facts on its own page", () => {
  const home = searchTags({ origin: O });
  assert.match(home, new RegExp(`<link rel="canonical" href="${O}/">`)); assert.doesNotMatch(home, /noindex/);
  const d = ld(home);
  assert.equal(d["@type"], "VideoGame"); assert.equal(d.url, `${O}/`); assert.equal(d.image, `${O}/share-board.jpg`);
  assert.ok(d.alternateName.includes("Ayo") && d.alternateName.includes("Nchò")); assert.equal(d.offers.price, "0"); assert.equal(d.isAccessibleForFree, true);
  assert.match(d.description, /Free, no ads/);
  assert.match(ld(searchTags({ origin: O, lang: "fr" })).description, /Gratuit, sans pub/);
  assert.equal(ld(searchTags({ origin: O, lang: "fr" })).image, `${O}/share-board-fr.jpg`);
  for (const k of PRIVATE) {
    const t = searchTags({ origin: O, query: { [k]: "x" } });
    assert.match(t, /<meta name="robots" content="noindex">/, k); assert.equal(ld(t), null, k);
    assert.match(t, new RegExp(`<link rel="canonical" href="${O}/">`), k); // never the address with a name in it
  }
});

test("the data block cannot be closed from inside", () => {
  const s = inlineJson({ a: "</script><script>alert(1)</script>", b: "x\u2028y & z" });
  assert.doesNotMatch(s, /<|>|&|\u2028/); assert.deepEqual(JSON.parse(s), { a: "</script><script>alert(1)</script>", b: "x\u2028y & z" });
  assert.ok(!JSON.stringify(gameData({ origin: O })).includes("<"));
});

test("robots.txt and the sitemap", () => {
  const r = robotsTxt(O);
  assert.match(r, /^User-agent: \*$/m); assert.match(r, /^Allow: \/$/m);
  for (const p of ["/api/", "/ws", "/version", "/healthz"]) assert.match(r, new RegExp(`^Disallow: ${p}$`, "m"));
  assert.match(r, new RegExp(`^Sitemap: ${O}/sitemap.xml$`, "m"));
  const s = sitemapXml(O);
  assert.match(s, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  for (const p of ["/", "/privacy", "/terms", "/support"]) assert.ok(s.includes(`<loc>${O}${p}</loc>`), p);
  assert.ok(!s.includes("room") && !s.includes("<loc>?") && !s.includes("/?"));
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.server.address().port}`;
after(() => srv.close());

test("the real server: the page, a private link, robots.txt, the sitemap and the hidden addresses", async () => {
  const home = await fetch(base + "/?lang=fr", { headers: { "x-forwarded-proto": "https", "x-forwarded-host": "ayo-ncho.onrender.com" } });
  const html = await home.text();
  assert.equal(home.headers.get("x-robots-tag"), null);
  assert.match(html, new RegExp(`<link rel="canonical" href="${O}/">`)); assert.equal(ld(html)["@type"], "VideoGame");
  assert.match(html, /<script nonce="[^"]+" type="application\/ld\+json">/); // given the page's key like every script (harmless: it never runs)
  const csp = home.headers.get("content-security-policy"); assert.ok(csp && !/unsafe-inline'[^;]*script|script-src[^;]*'unsafe-inline'/.test(csp));
  const inv = await fetch(base + "/?room=EDNE");
  assert.equal(inv.headers.get("x-robots-tag"), "noindex");
  const it = await inv.text(); assert.match(it, /<meta name="robots" content="noindex">/); assert.equal(ld(it), null);
  const beat = await fetch(base + "/index.html?beat=abc&n=Meka"); assert.equal(beat.headers.get("x-robots-tag"), "noindex"); await beat.text();
  const r = await fetch(base + "/robots.txt"); assert.match(r.headers.get("content-type"), /text\/plain/); assert.match(await r.text(), /Disallow: \/api\//);
  const s = await fetch(base + "/sitemap.xml"); assert.match(s.headers.get("content-type"), /xml/); assert.match(await s.text(), /<loc>http:\/\/127\.0\.0\.1:\d+\/privacy<\/loc>/);
  for (const p of ["/version", "/healthz", "/api/rooms/ABCD"]) { const x = await fetch(base + p); assert.equal(x.headers.get("x-robots-tag"), "noindex", p); await x.text(); }
  const priv = await fetch(base + "/privacy"); assert.equal(priv.headers.get("x-robots-tag"), null); await priv.text();
});
