// The privacy, terms and support pages: served by the real server at the addresses the stores ask for, saying what the game
// actually does, with the seller and support email from the environment (placeholders until set, never from the repo), and
// linked from Settings in the browser and the apps.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../server/index.js";
import { legalPage, contact, esc, PAGES, UPDATED } from "../server/legal.js";
import { legalLink, LEGAL, SERVER } from "../web/app.js";
import { SEAT_HOLD_MS, IDLE_MS } from "../server/rooms.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { SELLER_NAME: "Test Seller Ltd", SUPPORT_EMAIL: "help@example.com" };
const srv = createServer({ sweepEvery: 60_000, env });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.server.address().port}`;
after(() => srv.close());
const text = (html) => html.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("the server serves /privacy, /terms and /support (and .html) as pages, each linking to the others and back to the game", async () => {
  for (const p of PAGES) {
    for (const url of [`/${p}`, `/${p}.html`]) {
      const r = await fetch(base + url);
      assert.equal(r.status, 200, url);
      assert.match(r.headers.get("content-type"), /text\/html/);
      const h = await r.text();
      assert.match(h, /^<!doctype html>/);
      assert.match(h, /name="viewport"/);
      for (const q of PAGES) assert.ok(h.includes(`href="/${q}"`), `${url} links to /${q}`);
      assert.ok(h.includes('href="/"'), "back to the game");
      assert.ok(h.includes(`aria-current="page"`) && h.includes(`href="/${p}" aria-current="page"`), "its own tab is marked");
      assert.ok(text(h).includes(`Last updated ${UPDATED}`));
      assert.ok(!/https?:\/\/(fonts\.googleapis|cdnjs)/.test(h), "the legal pages load nothing from outside");
      assert.ok(!/<script/i.test(h), "no scripts on the legal pages");
    }
  }
  assert.equal((await fetch(base + "/privacyx")).status, 404);
  // the game itself still comes up
  assert.equal((await fetch(base + "/")).status, 200);
});

test("the seller and support email come from the environment, escaped; placeholders until they are set", () => {
  const set = legalPage("privacy", env);
  assert.ok(set.includes('<a href="mailto:help@example.com">help@example.com</a>'));
  assert.ok(set.includes("run by Test Seller Ltd"));
  assert.ok(!set.includes("coming soon"));
  const none = legalPage("support", {});
  assert.ok(none.includes("the support email address (coming soon)"));
  assert.ok(none.includes("run by the maker of Ayo &amp; Nchò"));
  assert.ok(!none.includes("mailto:"));
  // a bad address is not a link; markup in the name is shown as text
  assert.equal(contact({ SUPPORT_EMAIL: "not an email" }).email, "");
  assert.equal(contact({ SUPPORT_EMAIL: 'a@b.c"><script>' }).email, "");
  const evil = legalPage("terms", { SELLER_NAME: "<script>alert(1)</script>" });
  assert.ok(!evil.includes("<script>alert"));
  assert.ok(evil.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.equal(esc(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  assert.throws(() => legalPage("nope", {}));
  // nothing private sits in the repo: no address in the pages' source
  const src = readFileSync(path.join(ROOT, "server", "legal.js"), "utf8");
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(src), "no email address in server/legal.js");
});

test("the privacy page says what the game actually does", () => {
  const t = text(legalPage("privacy", {}));
  for (const must of [
    "no accounts, no ads, no analytics and no cookies",
    "the name you typed", "moves", "shouts",
    "never written to a database or to disk",
    "removed after 10 minutes", "6 hours",
    "Playing the computer, the daily puzzle or two of you on one phone sends nothing to us",
    "Render", "Google Fonts", "cdnjs", "The apps carry both inside them",
    "App Store or Google Play", "aged 13 and over", "UK and EU data protection law", "ico.org.uk",
  ]) assert.ok(t.includes(must), `privacy says: ${must}`);
  // the times it gives are the server's own
  assert.equal(SEAT_HOLD_MS, 10 * 60 * 1000);
  assert.equal(IDLE_MS, 6 * 60 * 60 * 1000);
  // the server really keeps nothing on disk and runs no analytics: no fs writes or outside calls in the server's code
  for (const f of ["index.js", "rooms.js", "legal.js"]) {
    const s = readFileSync(path.join(ROOT, "server", f), "utf8");
    assert.ok(!/writeFile|appendFile|createWriteStream/.test(s), `${f} writes nothing to disk`);
    assert.ok(!/\bfetch\(|https\.request|http\.request/.test(s), `${f} calls nothing outside`);
  }
  // and the game page sets no cookies
  for (const f of ["game.js", "index.html", "app.js"]) assert.ok(!/document\.cookie/.test(readFileSync(path.join(ROOT, "web", f), "utf8")), `${f} sets no cookie`);
});

test("terms and support cover what the stores and players need", () => {
  const terms = text(legalPage("terms", {}));
  for (const must of ["free game", "nothing we sell will ever win a game", "App Store or Google Play", "Licensed Application End User License Agreement", "law of England and Wales", "consumer"]) assert.ok(terms.includes(must), `terms say: ${must}`);
  const sup = text(legalPage("support", {}));
  for (const must of ["Learn to play", "up to a minute", "10 minutes", "no signal", "Lighter board", "Seed physics", "clear this site's data", "Restore purchases", "three.js", "Fraunces", "Capacitor"]) assert.ok(sup.includes(must), `support says: ${must}`);
});

test("Settings links to all three, opened beside the game; the apps open the web link's pages", () => {
  const html = readFileSync(path.join(ROOT, "web", "index.html"), "utf8");
  for (const p of LEGAL) {
    const m = html.match(new RegExp(`<a [^>]*data-page="${p}"[^>]*>`));
    assert.ok(m, `Settings links ${p}`);
    assert.match(m[0], /target="_blank"/); assert.match(m[0], /rel="noopener"/);
  }
  assert.ok(readFileSync(path.join(ROOT, "web", "game.js"), "utf8").includes("a.href = legalLink(a.dataset.page, globalThis, i18n.lang)"));
  const web = { location: { protocol: "https:", host: "ayo-ncho.onrender.com", origin: "https://ayo-ncho.onrender.com", pathname: "/" } };
  assert.equal(legalLink("privacy", web), "https://ayo-ncho.onrender.com/privacy");
  const appWin = { Capacitor: { isNativePlatform: () => true, Plugins: {} }, location: { protocol: "https:", host: "localhost", origin: "https://localhost", pathname: "/" } };
  assert.equal(legalLink("terms", appWin), SERVER + "/terms");
  assert.deepEqual(LEGAL, PAGES);
});
