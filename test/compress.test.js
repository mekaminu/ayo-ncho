// Quick on a slow line (idea 8 Nov): the game's own files go out squeezed (server/compress.js), once per file, with an ETag.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import zlib from "node:zlib";
import { createServer, THREE_FILE } from "../server/index.js";
import { pickEncoding, squeeze, MIN_BYTES } from "../server/compress.js";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url));

test("which squeeze a phone takes: Brotli first, then gzip, never one it says no to", () => {
  assert.equal(pickEncoding("gzip, deflate, br"), "br");
  assert.equal(pickEncoding("gzip, deflate"), "gzip");
  assert.equal(pickEncoding("br;q=0, gzip"), "gzip");
  assert.equal(pickEncoding("br;q=0.5"), "br");
  assert.equal(pickEncoding("identity"), null);
  assert.equal(pickEncoding(""), null);
  assert.equal(pickEncoding(undefined), null);
  assert.equal(pickEncoding("*"), "br");
  const buf = read("../web/game.js");
  assert.deepEqual(zlib.brotliDecompressSync(squeeze(buf, "br")), buf);
  assert.deepEqual(zlib.gunzipSync(squeeze(buf, "gzip")), buf);
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const port = srv.server.address().port;
after(() => srv.close());
const get = (path, headers = {}, method = "GET") => new Promise((res, rej) => {
  const rq = http.request({ host: "127.0.0.1", port, path, method, headers }, (r) => { const parts = []; r.on("data", (c) => parts.push(c)); r.on("end", () => res({ status: r.statusCode, h: r.headers, body: Buffer.concat(parts) })); });
  rq.on("error", rej); rq.end();
});
const unsqueeze = (r) => r.h["content-encoding"] === "br" ? zlib.brotliDecompressSync(r.body) : r.h["content-encoding"] === "gzip" ? zlib.gunzipSync(r.body) : r.body;

test("a game file goes out squeezed, comes back exactly, and much smaller", async () => {
  for (const [path, file] of [["/game.js", "../web/game.js"], ["/i18n.js", "../web/i18n.js"], ["/engine/ayo.js", "../engine/ayo.js"], ["/sw.js", "../web/sw.js"], ["/manifest.webmanifest", "../web/manifest.webmanifest"]]) {
    const raw = read(file);
    const br = await get(path, { "accept-encoding": "gzip, deflate, br" });
    assert.equal(br.status, 200, path);
    assert.equal(br.h["content-encoding"], raw.length >= MIN_BYTES ? "br" : undefined, path);
    assert.match(br.h.vary, /accept-encoding/i);
    assert.deepEqual(unsqueeze(br), raw, path);
    assert.equal(+br.h["content-length"], br.body.length);
    if (raw.length > 20000) assert.ok(br.body.length < raw.length / 3, path + " squeezed to under a third");
    const gz = await get(path, { "accept-encoding": "gzip" });
    assert.equal(gz.h["content-encoding"], raw.length >= MIN_BYTES ? "gzip" : undefined);
    assert.deepEqual(unsqueeze(gz), raw);
    const plain = await get(path);
    assert.equal(plain.h["content-encoding"], undefined);
    assert.deepEqual(plain.body, raw);
  }
  const js = await get("/game.js", { "accept-encoding": "br" });
  assert.match(js.h["content-type"], /javascript/); // a module script must say it is JavaScript
  assert.match(js.h["cache-control"], /max-age=0/); // network first stays as it was: a new build arrives at once
});

test("the same file again costs a nod: its ETag answers 304, with nothing sent", async () => {
  const a = await get("/board.js", { "accept-encoding": "br" });
  assert.ok(a.h.etag);
  const b = await get("/board.js", { "accept-encoding": "br", "if-none-match": a.h.etag });
  assert.equal(b.status, 304); assert.equal(b.body.length, 0);
  const c = await get("/board.js", { "accept-encoding": "gzip", "if-none-match": 'W/' + a.h.etag });
  assert.equal(c.status, 304);
  const head = await get("/board.js", { "accept-encoding": "br" }, "HEAD");
  assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(head.h["content-length"], a.h["content-length"]);
});

test("the page is squeezed as it is sent, with its build and preview still in it", async () => {
  const r = await get("/", { "accept-encoding": "br" });
  assert.equal(r.status, 200); assert.equal(r.h["content-encoding"], "br");
  assert.match(r.h["content-type"], /text\/html/);
  assert.equal(r.h["cache-control"], "no-cache");
  const html = unsqueeze(r).toString();
  assert.ok(html.includes(`<meta name="ayo-build" content="${srv.build}">`));
  assert.ok(html.includes('og:image'));
  assert.ok(r.body.length < html.length / 3);
  const again = await get("/", { "accept-encoding": "br", "if-none-match": r.h.etag });
  assert.equal(again.status, 304);
  assert.equal((await get("/index.html", { "accept-encoding": "gzip" })).h["content-encoding"], "gzip");
});

test("the 3D library from the game's own server is squeezed too, kept for a week, open to the page", async () => {
  const r = await get("/vendor/three.module.min.js", { "accept-encoding": "br" });
  assert.equal(r.status, 200); assert.equal(r.h["content-encoding"], "br");
  assert.match(r.h["cache-control"], /max-age=604800/);
  assert.equal(r.h["access-control-allow-origin"], "*");
  assert.deepEqual(unsqueeze(r), fs.readFileSync(THREE_FILE));
});

test("pictures go out as they are; a missing file is still a 404; nothing outside web/ is reachable", async () => {
  const img = await get("/share-board.jpg", { "accept-encoding": "br" });
  assert.equal(img.status, 200); assert.equal(img.h["content-encoding"], undefined);
  assert.equal((await get("/icon-192.png", { "accept-encoding": "br" })).h["content-encoding"], undefined);
  assert.equal((await get("/nothing-here.js", { "accept-encoding": "br" })).status, 404);
  assert.equal((await get("/../package.json", { "accept-encoding": "br" })).status, 404);
  assert.equal((await get("/%2e%2e/package.json", { "accept-encoding": "br" })).status, 404);
  assert.equal((await get("/engine/%2e%2e/server/index.js", { "accept-encoding": "br" })).status, 404);
});

test("the privacy pages and the rest of the server work as before", async () => {
  assert.equal((await get("/privacy")).status, 200);
  assert.equal((await get("/healthz")).status, 200);
  assert.equal((await get("/version")).h["cache-control"], "no-store");
});
