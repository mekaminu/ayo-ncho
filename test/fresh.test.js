// A newer game, without asking: the page's build, the server's /version, and when the page may update itself.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildOf, newer, safeNow, makeFresh, fetchBuild, WORDS, AWAY_MS, GAP_MS, TRIED_KEY } from "../web/fresh.js";
import { createServer, buildId, pageWithBuild } from "../server/index.js";
import { FR } from "../web/i18n.js";

const metaDoc = (content) => ({ querySelector: (q) => (q === 'meta[name="ayo-build"]' && content !== undefined ? { getAttribute: () => content } : null) });
const memStore = () => { const m = new Map(); return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), m }; };

test("the page's own build: a hash the server wrote, never 'dev' or anything else", () => {
  assert.equal(buildOf(metaDoc("3f9a0c12bd44")), "3f9a0c12bd44");
  assert.equal(buildOf(metaDoc("dev")), null);
  assert.equal(buildOf(metaDoc(undefined)), null);
  assert.equal(buildOf(metaDoc("<script>")), null);
  assert.equal(buildOf(null), null);
});

test("newer: only a different build that looks like ours", () => {
  assert.equal(newer("aaaaaa111111", "bbbbbb222222"), true);
  assert.equal(newer("aaaaaa111111", "aaaaaa111111"), false);
  assert.equal(newer(null, "bbbbbb222222"), false);
  assert.equal(newer("aaaaaa111111", null), false);
  assert.equal(newer("aaaaaa111111", "<html>"), false);
});

test("a safe moment: Home only, no room, no lesson, no card", () => {
  assert.equal(safeNow({ screen: "home", online: false, lesson: false, card: false }), true);
  for (const bad of [{ screen: "play" }, { screen: "other" }, { online: true }, { lesson: true }, { card: true }])
    assert.equal(safeNow({ screen: "home", online: false, lesson: false, card: false, ...bad }), false, JSON.stringify(bad));
});

test("checks, the line on Home, a quiet update on coming back, and never twice for one build", async () => {
  let t = 0, served = "aaaaaa111111", reloads = 0; const store = memStore();
  const f = makeFresh({ mine: "aaaaaa111111", fetchVersion: async () => served, store, reload: () => reloads++, now: () => t });
  assert.equal(f.on, true);
  assert.equal(await f.check(true), false); assert.equal(f.line(true), null);
  served = "bbbbbb222222";
  t += 1000; assert.equal(await f.check(), false, "within the gap nothing is asked"); assert.equal(f.checks, 1);
  t += GAP_MS; assert.equal(await f.check(), true); assert.equal(f.checks, 2);
  assert.equal(f.line(true), WORDS); assert.equal(f.line(false), null, "said on Home only");
  assert.equal(f.back(AWAY_MS - 1, true), false, "away too short: no reload without a word");
  assert.equal(f.back(AWAY_MS, false), false, "not safe: no reload");
  assert.equal(reloads, 0);
  assert.equal(f.back(AWAY_MS, true), true); assert.equal(reloads, 1);
  assert.equal(store.get(TRIED_KEY), "bbbbbb222222");
  // the reload came back still on the old build (a stale cache): the same build is never offered again this visit
  const g = makeFresh({ mine: "aaaaaa111111", fetchVersion: async () => served, store, reload: () => reloads++, now: () => t });
  assert.equal(await g.check(true), false); assert.equal(g.line(true), null); assert.equal(g.update(), false); assert.equal(reloads, 1);
  served = "cccccc333333"; assert.equal(await g.check(true), true, "a build newer still is offered");
  assert.equal(g.update(), true); assert.equal(reloads, 2);
});

test("off without a build of its own (the store apps, a plain file server), and a failed look changes nothing", async () => {
  let asked = 0;
  const off = makeFresh({ mine: null, fetchVersion: async () => { asked++; return "bbbbbb222222"; }, store: memStore(), reload: () => assert.fail("reloaded") });
  assert.equal(off.on, false); assert.equal(await off.check(true), false); assert.equal(asked, 0); assert.equal(off.back(10 * AWAY_MS, true), false);
  const down = makeFresh({ mine: "aaaaaa111111", fetchVersion: async () => { throw new Error("offline"); }, store: memStore(), reload: () => assert.fail("reloaded") });
  assert.equal(await down.check(true), false); assert.deepEqual(down.log, ["check:failed"]); assert.equal(down.line(true), null);
  const broken = makeFresh({ mine: "aaaaaa111111", fetchVersion: async () => "bbbbbb222222", store: { get: () => { throw new Error("no storage"); }, set: () => { throw new Error("no storage"); } }, reload: () => {} });
  await broken.check(true); assert.equal(broken.ready, true); assert.equal(broken.update(), true, "a private window still updates");
});

test("the build hash follows the files", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-"));
  fs.writeFileSync(path.join(d, "a.js"), "one");
  const one = buildId([d]); assert.match(one, /^[0-9a-f]{12}$/); assert.equal(buildId([d]), one, "the same files, the same build");
  fs.writeFileSync(path.join(d, "a.js"), "two"); assert.notEqual(buildId([d]), one);
  fs.writeFileSync(path.join(d, "a.js"), "one"); fs.writeFileSync(path.join(d, "b.js"), ""); assert.notEqual(buildId([d]), one, "a new file is a new build");
  fs.rmSync(d, { recursive: true });
  assert.equal(pageWithBuild('<meta name="ayo-build" content="dev">', "abc123abc123"), '<meta name="ayo-build" content="abc123abc123">');
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.server.address().port}`;
after(() => srv.close());

test("the server: /version, and the page carries the same build (/ and /index.html, with a query too)", async () => {
  const r = await fetch(`${base}/version`); assert.equal(r.headers.get("cache-control"), "no-store");
  const { v } = await r.json(); assert.equal(v, srv.build); assert.match(v, /^[0-9a-f]{12}$/);
  assert.equal(await fetchBuild(fetch, base), v);
  for (const p of ["/", "/index.html", "/?puzzle=1"]) {
    const html = await (await fetch(base + p)).text();
    assert.ok(html.includes(`<meta name="ayo-build" content="${v}">`), p);
    assert.equal(buildOf({ querySelector: () => ({ getAttribute: () => html.match(/name="ayo-build" content="([^"]+)"/)[1] }) }), v);
  }
  const raw = fs.readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.ok(raw.includes('<meta name="ayo-build" content="dev">'), "the file itself says dev, so a plain file server and the apps stay off");
});

test("the service worker never keeps /version, and carries fresh.js for offline play", () => {
  const sw = fs.readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /url\.pathname === '\/version'( \|\| url\.pathname === '\/healthz')?\)\) return;|url\.pathname === '\/version'\) return;/);
  assert.ok(sw.includes("'./fresh.js'"));
});

test("the line in French", () => { assert.equal(FR[WORDS], "Une nouvelle version est prête · touchez pour mettre à jour"); });
