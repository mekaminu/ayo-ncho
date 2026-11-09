// Locked doors (idea 9 Nov): the page goes out with a nonce on its scripts and a Content-Security-Policy naming it; every response
// says nosniff, a same-origin referrer and the Permissions-Policy; HSTS over HTTPS; the legal pages run no script (server/headers.js).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import vm from "node:vm";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { createServer } from "../server/index.js";
import { addNonce, importMaps, importMapHashes, pagePolicy, socketSources, lockPage, LEGAL_POLICY, makeNonce, CDN } from "../server/headers.js";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const html = read("../web/index.html");
const scripts = (h) => [...h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], body: m[2] }));
const directive = (policy, name) => (policy.split(/;\s*/).find((d) => d.startsWith(name + " ")) || "").split(" ").slice(1);

test("every script tag gets the nonce, and no script's body changes", () => {
  const n = makeNonce();
  assert.match(n, /^[A-Za-z0-9+/]{24}$/);
  assert.notEqual(n, makeNonce());
  const out = addNonce(html, n);
  const a = scripts(html), b = scripts(out);
  assert.ok(a.length >= 6);
  assert.equal(b.length, a.length);
  for (let i = 0; i < a.length; i++) {
    assert.equal(b[i].body, a[i].body, "script " + i + " body untouched");
    assert.equal(b[i].attrs, ` nonce="${n}"` + a[i].attrs);
  }
  assert.equal(out.replaceAll(` nonce="${n}"`, ""), html, "nothing else in the page changes");
  assert.equal(addNonce(out, "other"), out, "a tag that has a nonce keeps it");
  // the import map written by document.write is inside a script's body: it is not given the nonce (its hash lets it in)
  assert.ok(out.includes(`document.write('<script type="importmap">`));
});

test("the two import maps the page can write are exactly the ones hashed", () => {
  const body = scripts(html).map((s) => s.body).find((b) => b.includes("window.__ayo3d="));
  assert.ok(body);
  const written = [false, true].map((local) => {
    let out = ""; const window = { __ayo3dLocal: local };
    vm.runInNewContext(body, { window, document: { write: (s) => { out += s; } } });
    const m = out.match(/^<script type="importmap">([\s\S]*)<\/script>$/); assert.ok(m, out);
    return m[1];
  });
  assert.deepEqual(importMaps(html), written);
  assert.equal(JSON.parse(written[0]).imports.three, CDN + "/ajax/libs/three.js/0.170.0/three.module.min.js");
  assert.equal(JSON.parse(written[1]).imports.three, "./vendor/three.module.min.js");
  assert.deepEqual(importMapHashes(html), written.map((w) => "'sha256-" + createHash("sha256").update(w).digest("base64") + "'"));
  assert.deepEqual(importMaps("<p>no map</p>"), []);
});

test("the policy: nothing inline runs without the key, no eval, no plugins, no <base>", () => {
  const p = pagePolicy({ nonce: "abc", hashes: ["'sha256-x'"], host: "ayo-ncho.onrender.com", secure: true });
  const script = directive(p, "script-src");
  assert.deepEqual(script, ["'self'", "'nonce-abc'", "'sha256-x'", CDN, "blob:"]);
  assert.ok(!p.includes("unsafe-eval"));
  assert.ok(!script.includes("'unsafe-inline'"));
  assert.deepEqual(directive(p, "object-src"), ["'none'"]);
  assert.deepEqual(directive(p, "base-uri"), ["'none'"]);
  assert.deepEqual(directive(p, "default-src"), ["'self'"]);
  assert.ok(directive(p, "connect-src").includes("wss://ayo-ncho.onrender.com"));
  assert.ok(!directive(p, "connect-src").includes("ws://ayo-ncho.onrender.com"), "over HTTPS only the secure socket");
  assert.ok(directive(p, "style-src").includes("https://fonts.googleapis.com"));
  assert.ok(directive(p, "font-src").includes("https://fonts.gstatic.com"));
  assert.ok(directive(p, "worker-src").includes("'self'"));
  assert.ok(!/frame-ancestors/.test(p), "framing stays allowed");
});

test("only a plain host goes into the policy", () => {
  assert.deepEqual(socketSources("127.0.0.1:8767", false), ["ws://127.0.0.1:8767", "wss://127.0.0.1:8767"]);
  assert.deepEqual(socketSources("Ayo-Ncho.onrender.com", true), ["wss://ayo-ncho.onrender.com"]);
  for (const bad of ["", undefined, "evil.com; script-src *", "a b", "x'y", "host:99999999"]) assert.deepEqual(socketSources(bad, true), [], String(bad));
});

test("the page writes nothing the policy would refuse: no inline handlers, no javascript: links, no eval", () => {
  const tags = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "");
  assert.doesNotMatch(tags, /<[a-z][^>]*\son[a-z]+\s*=/i, "an onclick=… in the page's markup would never run");
  assert.doesNotMatch(html, /javascript:/i);
  for (const f of fs.readdirSync(new URL("../web/", import.meta.url)).filter((f) => f.endsWith(".js"))) {
    const src = read("../web/" + f);
    assert.doesNotMatch(src, /\beval\s*\(|new Function\s*\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]/, f + " would need unsafe-eval");
    assert.doesNotMatch(src, /setAttribute\(\s*['"]on[a-z]+['"]/, f + " sets an inline handler");
    assert.doesNotMatch(src, /href\s*=\s*['"`]javascript:/i, f);
    assert.doesNotMatch(src, /<[a-z][^>`'"]*\son(click|error|load|mouseover|focus)\s*=/i, f + " writes an inline handler into markup");
  }
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const port = srv.server.address().port;
after(() => srv.close());
const get = (path, headers = {}) => new Promise((res, rej) => {
  const rq = http.request({ host: "127.0.0.1", port, path, headers }, (r) => { const parts = []; r.on("data", (c) => parts.push(c)); r.on("end", () => res({ status: r.statusCode, h: r.headers, body: Buffer.concat(parts) })); });
  rq.on("error", rej); rq.end();
});
const text = (r) => (r.h["content-encoding"] === "br" ? zlib.brotliDecompressSync(r.body) : r.h["content-encoding"] === "gzip" ? zlib.gunzipSync(r.body) : r.body).toString("utf8");

test("the page: a fresh key every time, on every script, named by its policy", async () => {
  const a = await get("/?room=ABCD", { "accept-encoding": "br" }), b = await get("/");
  for (const r of [a, b]) {
    assert.equal(r.status, 200);
    const p = r.h["content-security-policy"]; assert.ok(p);
    const nonce = p.match(/'nonce-([^']+)'/)[1];
    const page = text(r), s = scripts(page);
    assert.ok(s.length >= 6);
    for (const x of s) assert.ok(x.attrs.includes(`nonce="${nonce}"`), x.attrs);
    for (const h of importMapHashes(page)) assert.ok(p.includes(h));
    assert.ok(directive(p, "connect-src").includes(`ws://127.0.0.1:${port}`));
  }
  assert.notEqual(a.h["content-security-policy"], b.h["content-security-policy"]);
  const c = await get("/");
  assert.notEqual(c.h["content-security-policy"], b.h["content-security-policy"]);
  assert.equal(c.h.etag, b.h.etag, "the key is not part of the page's ETag");
});

test("a page the phone already has is a 304 with no new policy, so the kept page and its key stay together", async () => {
  const a = await get("/");
  const again = await get("/", { "if-none-match": a.h.etag });
  assert.equal(again.status, 304);
  assert.equal(again.h["content-security-policy"], undefined);
  assert.equal(again.h["x-content-type-options"], "nosniff");
});

test("every response: nosniff, a same-origin referrer, the camera and microphone kept to the page, no x-powered-by", async () => {
  for (const path of ["/", "/game.js", "/engine/ayo.js", "/version", "/healthz", "/icon-192.png", "/api/rooms/ZZZZ", "/privacy", "/nothing-here"]) {
    const r = await get(path);
    assert.equal(r.h["x-content-type-options"], "nosniff", path);
    assert.equal(r.h["referrer-policy"], "same-origin", path);
    assert.match(r.h["permissions-policy"], /camera=\(self\), microphone=\(self\)/, path);
    assert.match(r.h["permissions-policy"], /geolocation=\(\)/, path);
    assert.equal(r.h["x-powered-by"], undefined, path);
    assert.equal(r.h["strict-transport-security"], undefined, path + ": no HSTS over plain http");
  }
  const s = await get("/", { "x-forwarded-proto": "https" });
  assert.equal(s.h["strict-transport-security"], "max-age=63072000");
  assert.deepEqual(directive(s.h["content-security-policy"], "connect-src").filter((x) => x.startsWith("ws")), [`wss://127.0.0.1:${port}`]);
  assert.equal((await get("/game.js")).h["content-security-policy"], undefined, "the scripts themselves carry no page policy");
});

test("the privacy, terms and support pages run no script at all", async () => {
  for (const path of ["/privacy", "/terms", "/support", "/privacy?lang=fr"]) {
    const r = await get(path);
    assert.equal(r.status, 200);
    assert.equal(r.h["content-security-policy"], LEGAL_POLICY);
    assert.doesNotMatch(r.body.toString(), /<script/i);
  }
  assert.ok(LEGAL_POLICY.includes("default-src 'none'"));
});

test("lockPage keeps the preview tags and the build as they were", () => {
  const l = lockPage(html, { headers: { host: "x.test" } });
  assert.match(l.policy, /'nonce-[A-Za-z0-9+/]{24}'/);
  assert.equal(l.html.replace(/ nonce="[^"]+"/g, ""), html);
});
