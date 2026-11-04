// The app icon (L6): one pit of Job's tears cut from the real 3D board (tools/icon-scene.html + tools/app-icons.py), in every
// size the web, Android and iOS ask for. These check the files are there at the right sizes and shapes, opaque where a store
// refuses transparency, that the masked icons are the roomy picture, and that the tab's icon still takes the away dot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dotIcon } from "../web/away.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const png = (f) => { const b = readFileSync(path.join(ROOT, f)); assert.equal(b.toString("latin1", 1, 4), "PNG", f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colour: b[25], bytes: b.length }; };
const RGB = 2, RGBA = 6;

test("the web link's icons: every size, the masked ones separate, opaque where the phone shows them square", () => {
  for (const [f, s, c] of [["icon-512.png", 512, RGB], ["icon-192.png", 192, RGB], ["icon-maskable-512.png", 512, RGB], ["icon-maskable-192.png", 192, RGB], ["icon-180.png", 180, RGB], ["icon-32.png", 32, RGBA]]) {
    const p = png("web/" + f); assert.equal(p.w, s, f); assert.equal(p.h, s, f); assert.equal(p.colour, c, f);
  }
  const man = JSON.parse(readFileSync(path.join(ROOT, "web/manifest.webmanifest"), "utf8"));
  const by = (purpose) => man.icons.filter((i) => i.purpose.split(" ").includes(purpose)).map((i) => i.src);
  assert.deepEqual(by("maskable").sort(), ["icon-maskable-192.png", "icon-maskable-512.png"], "a masked icon is the roomy picture, never the whole one cut by the launcher");
  assert.ok(by("any").includes("icon-512.png") && by("any").includes("icon-192.png"));
  for (const i of man.icons) assert.ok(existsSync(path.join(ROOT, "web", i.src)), i.src);
  const html = readFileSync(path.join(ROOT, "web/index.html"), "utf8");
  assert.match(html, /rel="icon" href="\.\/icon\.svg"/); assert.match(html, /rel="apple-touch-icon" href="\.\/icon-180\.png"/); assert.match(html, /rel="alternate icon" href="\.\/icon-32\.png"/);
});

test("the tab's icon is the render on a rounded tile, carries nothing from outside, and still takes the away dot", () => {
  const svg = readFileSync(path.join(ROOT, "web/icon.svg"), "utf8");
  assert.match(svg, /viewBox="0 0 512 512"/); assert.match(svg, /href="data:image\/png;base64,[A-Za-z0-9+/=]{2000,}"/, "the picture itself is inside the file");
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(svg), "nothing loaded from outside");
  assert.ok(svg.length < 60000, "small enough for the tab and the offline cache");
  const dotted = dotIcon(svg); assert.ok(dotted.includes('cx="420"') && dotted.trimEnd().endsWith("</svg>") && dotted.indexOf("<image") < dotted.indexOf('cx="420"'), "the dot lands on top of the picture");
});

test("Android: legacy, round and adaptive icons at every density; the adaptive foreground is full bleed at 108 dp", () => {
  const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(D)) {
    const dir = `android/app/src/main/res/mipmap-${d}/`;
    for (const f of ["ic_launcher.png", "ic_launcher_round.png"]) { const p = png(dir + f); assert.equal(p.w, Math.round(48 * k)); assert.equal(p.colour, RGBA, "cut to its shape"); }
    const fg = png(dir + "ic_launcher_foreground.png"); assert.equal(fg.w, Math.round(108 * k)); assert.equal(fg.h, fg.w); assert.equal(fg.colour, RGB, "the picture fills the foreground; the launcher cuts its own shape");
  }
  assert.match(readFileSync(path.join(ROOT, "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"), "utf8"), /@mipmap\/ic_launcher_foreground/);
});

test("the stores' icons: App Store 1024 and Google Play 512, square and opaque, and they are a render, not flat shapes", () => {
  for (const [f, s] of [["docs/launch/store/icon-appstore-1024.png", 1024], ["docs/launch/store/icon-play-512.png", 512], ["ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", 1024]]) {
    const p = png(f); assert.equal(p.w, s); assert.equal(p.h, s); assert.equal(p.colour, RGB, f + " has no alpha channel");
    assert.ok(p.bytes > s * s * 0.15, f + " carries a picture's worth of detail (a flat drawing compresses to far less)");
  }
});

test("the icon is drawn by the game's own board, seeds and light, not a copy of them", () => {
  const scene = readFileSync(path.join(ROOT, "tools/icon-scene.html"), "utf8");
  for (const m of ["/web/board.js", "/web/slots.js"]) assert.ok(scene.includes(m), m);
  assert.match(scene, /buildBoard\(/); assert.match(scene, /pour\(/); assert.match(scene, /seedMaterialFor\(/);
  assert.match(readFileSync(path.join(ROOT, "tools/app-icons.py"), "utf8"), /icon-scene\.html/);
});
