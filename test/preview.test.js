// A shared link's card (server/preview.js): the Open Graph tags the server writes into the page per address.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { WebSocket } from "ws";
import { previewOf, previewTags, pageWithPreview, originOf, MARK, IMAGE, IMAGE_W, IMAGE_H } from "../server/preview.js";
import { createServer } from "../server/index.js";
import { build as buildApp } from "../tools/build-app.js";
import os from "node:os";
import path from "node:path";
import { dailyPuzzle, todayKey } from "../engine/puzzle.js";

const O = "https://ayo-ncho.onrender.com";
const tag = (html, k) => { const m = html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)">`)); return m && m[1]; };

test("the game's own link: the board, the name and what it is", () => {
  const p = previewOf({ origin: O });
  assert.equal(p.title, "Ayo & Nchò · Nigerian mancala in 3D"); assert.match(p.description, /Free, no ads/);
  assert.equal(p.image, `${O}/share-board.jpg`); assert.equal(p.url, `${O}/`); assert.equal(p.locale, "en_GB");
  const fr = previewOf({ origin: O, lang: "fr" });
  assert.equal(fr.image, `${O}/share-board-fr.jpg`); assert.match(fr.title, /Mancala nigérian/); assert.equal(fr.locale, "fr_FR");
  assert.equal(previewOf({ origin: O, lang: "de" }).lang, "en");
});

test("an invite: who asks, the room and its rules; a gone room or a bad code still reads well", () => {
  const room = (c) => (c === "EDNE" ? { host: "Meka", variant: "ncho" } : c === "AYOO" ? { host: null, variant: "ayo" } : null);
  const p = previewOf({ origin: O, query: { room: "edne" }, room });
  assert.equal(p.title, "Meka asks you to a game of Ayo & Nchò");
  assert.equal(p.description, "Room EDNE · Nchò rules · open the link, say your name and knock, and you'll be let in.");
  assert.equal(p.url, `${O}/?room=EDNE`);
  const anon = previewOf({ origin: O, query: { room: "AYOO" }, room });
  assert.equal(anon.title, "Come and play Ayo & Nchò"); assert.match(anon.description, /Ayo rules/);
  const gone = previewOf({ origin: O, query: { room: "ZZZZ" }, room });
  assert.equal(gone.title, "Come and play Ayo & Nchò"); assert.match(gone.description, /Room ZZZZ · open the link to play/);
  assert.equal(previewOf({ origin: O, query: { room: "AB" }, room }).title, "Ayo & Nchò · Nigerian mancala in 3D", "not a code: the game's card");
  assert.equal(previewOf({ origin: O, query: { room: ["EDNE", "X"] }, room }).title, "Ayo & Nchò · Nigerian mancala in 3D", "a repeated ?room= is not trusted");
  const fr = previewOf({ origin: O, lang: "fr", query: { room: "EDNE" }, room });
  assert.equal(fr.title, "Meka vous invite à une partie d'Ayo & Nchò"); assert.match(fr.description, /^Salle EDNE · règles du Nchò/);
});

test("the daily puzzle: today's ask, the same target the game sets", () => {
  const now = new Date(2026, 10, 6, 12);
  const t = dailyPuzzle(todayKey(now), "ncho").target, ta = dailyPuzzle(todayKey(now), "ayo").target;
  const p = previewOf({ origin: O, query: { puzzle: "1" }, now });
  assert.equal(p.title, `Today's Ayo & Nchò puzzle: capture ${t} in one turn`); assert.match(p.description, /^Nchò rules · one move/);
  assert.equal(p.url, `${O}/?puzzle=1`);
  assert.equal(previewOf({ origin: O, query: { puzzle: "1", variant: "ayo" }, now }).title, `Today's Ayo & Nchò puzzle: capture ${ta} in one turn`);
  assert.match(previewOf({ origin: O, lang: "fr", query: { puzzle: "1" }, now }).title, new RegExp(`prenez ${t} en un coup`));
});

test("the tags: every value escaped, the picture's size, the twitter card too", () => {
  const p = previewOf({ origin: O, query: { room: "EDNE" }, room: () => ({ host: `"><script>alert(1)</script>`, variant: "ncho" }) });
  const html = previewTags(p);
  assert.ok(!html.includes("<script>")); assert.ok(html.includes("&quot;&gt;&lt;script&gt;"));
  assert.equal(tag(html, "og:image:width"), String(IMAGE_W)); assert.equal(tag(html, "og:image:height"), String(IMAGE_H));
  assert.equal(tag(html, "twitter:card"), "summary_large_image"); assert.equal(tag(html, "og:image"), `${O}/share-board.jpg`);
  for (const k of ["og:title", "og:description", "og:url", "og:site_name", "og:image:alt", "description"]) assert.ok(tag(html, k), k);
});

test("the address the crawler asked for: https behind Render's proxy, nothing odd let into it", () => {
  assert.equal(originOf({ headers: { host: "ayo-ncho.onrender.com", "x-forwarded-proto": "https" }, protocol: "http" }), O);
  assert.equal(originOf({ headers: { host: "127.0.0.1:3000" }, protocol: "http" }), "http://127.0.0.1:3000");
  assert.equal(originOf({ headers: { host: 'evil"><x' }, protocol: "http" }), "http://evilx");
});

test("the pictures exist, are the size the tags say, and are small enough for WhatsApp", () => {
  for (const f of Object.values(IMAGE)) {
    const b = fs.readFileSync(new URL(`../web/${f}`, import.meta.url));
    assert.ok(b.length < 300 * 1024, f); assert.equal(b[0], 0xff); assert.equal(b[1], 0xd8, `${f} is a JPEG`);
    let i = 2, size = null; // read the JPEG's frame header for its size
    while (i < b.length) { const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc2) { size = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; } i += 2 + len; }
    assert.deepEqual(size, [IMAGE_W, IMAGE_H], f);
  }
  const raw = fs.readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.equal(raw.split(MARK).length, 2, "index.html carries the mark once");
  assert.equal(pageWithPreview("<head></head>", { query: {}, headers: {} }), "<head></head>", "a page without the mark is left alone");
});

test("the apps carry no preview pictures (they are for links only)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ayo-app-")) + "/";
  buildApp(dir);
  assert.ok(!fs.existsSync(dir + "share-board.jpg")); assert.ok(fs.existsSync(dir + "game.js")); fs.rmSync(dir, { recursive: true, force: true });
});

// over the real server: a room opened over the socket, then the invite link read as WhatsApp's crawler would
const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.server.address().port}`;
after(() => srv.close());

test("the server writes the card for each address, from the live room", async () => {
  const ws = new WebSocket(base.replace("http", "ws") + "/ws");
  await new Promise((r) => ws.once("open", r));
  const joined = new Promise((r) => ws.on("message", (m) => { const x = JSON.parse(String(m)); if (x.t === "joined") r(x); }));
  ws.send(JSON.stringify({ t: "create", variant: "ncho", name: "Tete" }));
  const { code } = await joined;
  const inv = await (await fetch(`${base}/?room=${code}`)).text();
  assert.equal(tag(inv, "og:title"), "Tete asks you to a game of Ayo &amp; Nchò");
  assert.equal(tag(inv, "og:url"), `${base}/?room=${code}`); assert.equal(tag(inv, "og:image"), `${base}/share-board.jpg`);
  assert.ok(!inv.includes(MARK));
  const fr = await (await fetch(`${base}/?room=${code}`, { headers: { "accept-language": "fr-FR,fr;q=0.9" } })).text();
  assert.match(tag(fr, "og:title"), /^Tete vous invite/); assert.equal(tag(fr, "og:image"), `${base}/share-board-fr.jpg`);
  const home = await (await fetch(`${base}/`)).text();
  assert.equal(tag(home, "og:title"), "Ayo &amp; Nchò · Nigerian mancala in 3D");
  const pz = await (await fetch(`${base}/?puzzle=1&lang=en`)).text();
  assert.match(tag(pz, "og:title"), /^Today&#39;s Ayo &amp; Nchò puzzle: capture \d+ in one turn$/);
  const img = await fetch(`${base}/share-board.jpg`); assert.equal(img.status, 200); assert.match(img.headers.get("content-type"), /jpeg/);
  ws.close();
});
