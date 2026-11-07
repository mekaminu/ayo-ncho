// The server, woken early: Home knocks on the free server at most once every 4 minutes, never with no signal, and the room
// card says the server is waking while a room is slow to open. French too; the server answers the knock.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeWarm, healthUrl, openingWords, WORDS, EVERY_MS, SLOW_KNOCK_MS, WAKING_MS, LONG_MS } from "../web/warm.js";
import { translate } from "../web/i18n.js";
import { createServer } from "../server/index.js";

const tick = () => new Promise((r) => setImmediate(r));

test("where to knock: /healthz beside the page, the live server's inside the apps", () => {
  assert.equal(healthUrl("https://ayo-ncho.onrender.com/"), "https://ayo-ncho.onrender.com/healthz");
  assert.equal(healthUrl("https://ayo-ncho.onrender.com/index.html"), "https://ayo-ncho.onrender.com/healthz");
  assert.equal(healthUrl("http://localhost:3000/"), "http://localhost:3000/healthz");
  assert.equal(healthUrl("not a url"), null);
});

test("one knock, then quiet for 4 minutes; nothing with no signal; a failed knock may try again", async () => {
  let t = 1000, sig = true; const calls = [];
  let answer = () => Promise.resolve({});
  const w = makeWarm({ url: "https://x/healthz", fetch: (u, o) => { calls.push([u, o]); return answer(); }, now: () => t, online: () => sig });
  assert.equal(w.ping("home"), true);
  assert.deepEqual(calls[0], ["https://x/healthz", { cache: "no-store", mode: "no-cors", credentials: "omit" }]);
  await tick(); await tick();
  t += 60000; assert.equal(w.ping("friends"), false, "a minute later: no second knock");
  t += EVERY_MS; assert.equal(w.ping("home"), true, "after 4 minutes: again");
  await tick(); await tick();
  t += EVERY_MS; sig = false; assert.equal(w.ping("home"), false, "no signal, no knock");
  sig = true; answer = () => Promise.reject(new Error("down"));
  assert.equal(w.ping("home"), true); await tick(); await tick();
  assert.equal(w.state.ok, false);
  assert.equal(w.ping("friends"), true, "a knock that failed does not hold the next one back");
  assert.equal(calls.length, 4);
  assert.equal(makeWarm({ url: null, fetch: () => Promise.resolve() }).ping(), false);
  assert.equal(makeWarm({ url: "https://x/healthz" }).ping(), false, "no fetch, no knock");
});

test("waking: a knock out with no answer for 2.5 s means the server is asleep; never two knocks out at once", async () => {
  let t = 0, done; const w = makeWarm({ url: "u", fetch: () => new Promise((r) => { done = r; }), now: () => t, every: 0 });
  w.ping();
  assert.equal(w.waking(), false);
  t = SLOW_KNOCK_MS; assert.equal(w.waking(), true);
  assert.equal(w.ping(), false, "the first knock is still out");
  t = 40000; done({}); await tick(); await tick();
  assert.equal(w.waking(), false); assert.equal(w.state.ms, 40000); assert.equal(w.state.ok, true);
});

test("the room card's words while a room opens", () => {
  assert.equal(openingWords(0), null);
  assert.equal(openingWords(WAKING_MS - 1), null);
  assert.equal(openingWords(500, true), WORDS.waking, "straight away when Home's knock is still waiting");
  assert.equal(openingWords(WAKING_MS), WORDS.waking);
  assert.equal(openingWords(LONG_MS), WORDS.long);
  assert.equal(openingWords(NaN), null);
  for (const s of Object.values(WORDS)) { const f = translate(s, "fr"); assert.notEqual(f, s, s); assert.doesNotMatch(f, /server|waking|up to/); }
});

test("the board wires it: Home knocks, With friends knocks on touch, the card ticks; the knock is never cached", () => {
  const g = fs.readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(g, /if \(which === 'home'\) warm\.ping\('home'\)/);
  assert.match(g, /#friendsBtn'\)\.addEventListener\('pointerdown', \(\) => warm\.ping/);
  assert.match(g, /openingWords\(Date\.now\(\) - opening\.since, warm\.waking\(\)\)/);
  const sw = fs.readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/warm\.js'/);
  assert.match(sw, /url\.pathname === '\/healthz'/);
});

test("the server answers the knock", async () => {
  const srv = createServer({ sweepEvery: 60_000 }); const { server } = srv;
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/healthz`, { cache: "no-store" });
    assert.equal(res.status, 200); assert.equal((await res.json()).ok, true);
  } finally { srv.close(); }
});
