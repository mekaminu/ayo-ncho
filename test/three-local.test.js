// The board on a slow or patchy line: the page says the board is on its way, and a phone that cannot reach cdnjs starts the
// page again with three.js from the game's own server (the same file, three 0.170.0 from node_modules).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer, THREE_FILE } from "../server/index.js";
import { THREE_CDN, appHtml } from "../tools/build-app.js";

const html = fs.readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("three.js is a dependency of the server (Render installs without dev tools), pinned to the version the page asks cdnjs for", () => {
  assert.ok(pkg.dependencies.three, "three is under dependencies");
  assert.equal(pkg.devDependencies.three, undefined);
  const installed = JSON.parse(fs.readFileSync(new URL("../node_modules/three/package.json", import.meta.url), "utf8")).version;
  assert.equal(installed, "0.170.0");
  assert.ok(THREE_CDN.includes("/three.js/" + installed + "/"));
  assert.ok(fs.existsSync(THREE_FILE));
});

test("the page: the watch runs before the shim, the import map is written after it, and it still speaks plainly", () => {
  const watch = html.indexOf("/* start-up watch."), shim = html.indexOf('<script async src="./es-module-shims.js">'), map = html.indexOf("/* the import map:");
  assert.ok(watch > 0 && watch < shim && shim < map && map < html.indexOf('<script type="module" src="./game.js">'));
  assert.equal(html.split(THREE_CDN).length - 1, 1, "cdnjs's address once, in the import map");
  assert.ok(html.includes("window.__ayo3d=window.__ayo3dLocal?'./vendor/three.module.min.js':'" + THREE_CDN + "'"));
  assert.ok(html.includes(`document.write('<script type="importmap">{"imports":{"three":"'+window.__ayo3d+'"}}<\\/script>')`));
  for (const s of ["The board is on its way", "Le plateau arrive", "ayo.3dlocal", "ayo.3dtried", "local3d", "3*864e5", "role','status'", "t>=60000", "t>=12000", "nothing came back in", "3D: ", "own server"])
    assert.ok(html.includes(s), s);
  assert.ok(!/document\.cookie/.test(html), "no cookie: the privacy page says the game sets none");
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{#bootWait \.seeds i\{animation:none\}\}/);
  // the apps carry three.js inside: their page names no outside address, so the watch never sends them anywhere
  const app = appHtml(html);
  assert.ok(!app.includes("cdnjs") && !app.includes("/* the import map:"));
  assert.ok(app.includes('<script type="importmap">{"imports":{"three":"./vendor/three.module.min.js"}}</script>'));
});

test("the watch in a pretend page: the import map follows the phone's memory and ?local3d=1", () => {
  const src = html.slice(html.indexOf("/* the import map:"), html.indexOf("</script>", html.indexOf("/* the import map:")));
  const run = (local) => { const w = { __ayo3dLocal: local }, written = []; new Function("window", "document", src)(w, { write: (x) => written.push(x) }); return [w.__ayo3d, written.join("")]; };
  const [cdn, m1] = run(false), [here, m2] = run(true);
  assert.equal(cdn, THREE_CDN); assert.equal(JSON.parse(m1.replace(/^<script type="importmap">|<\/script>$/g, "")).imports.three, THREE_CDN);
  assert.equal(here, "./vendor/three.module.min.js"); assert.ok(m2.includes('"three":"./vendor/three.module.min.js"'));
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.server.address().port}`;
after(() => srv.close());

test("the server: the page asks cdnjs, and the same file is here at /vendor/three.module.min.js", async () => {
  const page = await (await fetch(base + "/")).text();
  assert.ok(page.includes(THREE_CDN));
  const f = await fetch(base + "/vendor/three.module.min.js");
  assert.equal(f.status, 200);
  assert.match(f.headers.get("content-type"), /javascript/);
  assert.match(f.headers.get("cache-control"), /max-age=604800/);
  assert.equal(f.headers.get("access-control-allow-origin"), "*");
  assert.equal((await f.arrayBuffer()).byteLength, fs.statSync(THREE_FILE).size);
});
