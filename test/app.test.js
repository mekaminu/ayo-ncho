import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, appHtml, THREE_CDN, FONTS } from "../tools/build-app.js";
import { inApp, platform, plugin, wsUrl, publicBase, linkable, hapticPlan, hapticCall, haptic, installShare, installWake, backStep, startApp, SERVER } from "../web/app.js";
import { supported as wakeSupported } from "../web/wake.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = { location: { protocol: "https:", host: "ayo-ncho.onrender.com", origin: "https://ayo-ncho.onrender.com", pathname: "/" } };
const appWin = (plugins = {}) => ({ Capacitor: { isNativePlatform: () => true, Plugins: plugins }, location: { protocol: "https:", host: "localhost", origin: "https://localhost", pathname: "/" }, navigator: {}, document: { documentElement: { classList: { add() {} } } } });

test("the app's web files carry everything: three.js, the fonts, every module, no service worker, nothing from outside", () => {
  const out = mkdtempSync(path.join(tmpdir(), "ayo-www-"));
  try {
    build(out);
    const html = readFileSync(path.join(out, "index.html"), "utf8");
    assert.ok(!html.includes("cdnjs") && !html.includes("googleapis") && !html.includes("serviceWorker"));
    for (const [, src] of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(!/^https?:/.test(src), `${src} is inside the app`);
    const map = JSON.parse(html.match(/<script type="importmap">([^<]*)<\/script>/)[1]);
    assert.equal(map.imports.three, "./vendor/three.module.min.js");
    assert.match(readFileSync(path.join(out, "vendor/three.module.min.js"), "utf8").slice(0, 400), /const t="170"/);
    const css = readFileSync(path.join(out, "fonts/fonts.css"), "utf8");
    for (const [family, weight, , file] of FONTS) { assert.ok(existsSync(path.join(out, "fonts", file)), file); assert.ok(css.includes(`'${family}'`) && css.includes(`font-weight:${weight}`)); }
    assert.ok(!existsSync(path.join(out, "sw.js")));
    // every module the game loads, from game.js down (relative, from the root, and the opponent's worker), is in the folder
    const seen = new Set(), todo = ["/game.js"];
    while (todo.length) {
      const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
      assert.ok(existsSync(path.join(out, f)), `${f} is in the app`);
      const src = readFileSync(path.join(out, f), "utf8");
      const refs = [...src.matchAll(/^\s*import[^'"]*['"]([^'"]+\.js)['"]/gm), ...src.matchAll(/new Worker\(['"]([^'"]+\.js)['"]/g)].map((m) => m[1]);
      for (const r of refs) todo.push(r.startsWith("/") ? r : path.posix.normalize(path.posix.join(path.posix.dirname(f), r)));
    }
    for (const f of ["/app.js", "/engine/ayo.js", "/engine/ai.js", "/ai-worker.js", "/board.js"]) assert.ok(seen.has(f), f);
    const b = JSON.parse(readFileSync(path.join(out, "build.json"), "utf8")); assert.ok(b.version && b.commit);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test("appHtml refuses an index.html it does not recognise rather than shipping the CDN", () => {
  const html = readFileSync(path.join(ROOT, "web/index.html"), "utf8");
  assert.ok(html.includes(THREE_CDN));
  assert.throws(() => appHtml(html.replace(THREE_CDN, "https://example.com/three.js")), /three\.js/);
});

test("the app is set up as planned: id, target Android 16 (API 36), the web files, dark splash", () => {
  const cfg = JSON.parse(readFileSync(path.join(ROOT, "capacitor.config.json"), "utf8"));
  assert.equal(cfg.appId, "com.mekaminu.ayoncho"); assert.equal(cfg.webDir, "app/www");
  assert.equal(cfg.plugins.SplashScreen.backgroundColor, "#0d0906");
  const vars = readFileSync(path.join(ROOT, "android/variables.gradle"), "utf8");
  assert.match(vars, /targetSdkVersion = 36/); assert.match(vars, /compileSdkVersion = 36/);
  assert.match(readFileSync(path.join(ROOT, "android/app/build.gradle"), "utf8"), /applicationId "com\.mekaminu\.ayoncho"/);
  assert.match(readFileSync(path.join(ROOT, "android/app/src/main/res/values/ic_launcher_background.xml"), "utf8"), /#0D0906/);
});

test("on the web link nothing changes; in the app rooms and links go to the live server", () => {
  assert.equal(inApp(web), false); assert.equal(plugin("Haptics", web), null);
  assert.equal(wsUrl(web), "wss://ayo-ncho.onrender.com/ws");
  assert.equal(wsUrl({ location: { protocol: "http:", host: "localhost:3000" } }), "ws://localhost:3000/ws");
  assert.equal(publicBase(web), "https://ayo-ncho.onrender.com/");
  assert.equal(linkable({ location: { protocol: "http:" } }), false);
  const w = appWin();
  assert.equal(inApp(w), true); assert.equal(wsUrl(w), "wss://ayo-ncho.onrender.com/ws"); assert.equal(publicBase(w), SERVER + "/"); assert.equal(linkable(w), true);
  assert.equal(startApp(() => "stay", web), false);
});

test("vibration patterns become the phone's haptics", () => {
  assert.deepEqual(hapticPlan(12), [[0, 12]]);
  assert.deepEqual(hapticPlan([30, 60, 30, 60, 60]), [[0, 30], [90, 30], [180, 60]]);
  assert.deepEqual(hapticPlan([0, 50, 20]), [[50, 20]]);
  assert.deepEqual(hapticCall(8), ["impact", { style: "LIGHT" }]); assert.deepEqual(hapticCall(18), ["impact", { style: "MEDIUM" }]); assert.deepEqual(hapticCall(60), ["vibrate", { duration: 60 }]);
  const calls = []; const H = { impact: (a) => { calls.push(["impact", a]); }, vibrate: (a) => { calls.push(["vibrate", a]); return Promise.reject(new Error("no motor")); } };
  assert.equal(haptic(40, appWin({ Haptics: H })), true); assert.deepEqual(calls, [["vibrate", { duration: 40 }]]);
  assert.equal(haptic(40, web), false);
});

test("the share sheet takes the words and the link; files fall back to words", async () => {
  const got = []; const nav = {};
  assert.ok(installShare(nav, { share: async (d) => { got.push(d); } }));
  assert.equal(nav.canShare({ files: [{}] }), false); assert.equal(nav.canShare({ text: "x" }), true);
  await nav.share({ text: "Come and play", url: "https://ayo-ncho.onrender.com/?room=EDNE" });
  assert.equal(got[0].text, "Come and play"); assert.equal(got[0].url, "https://ayo-ncho.onrender.com/?room=EDNE");
});

test("keep-awake wears the wake lock's shape, so the screen-on code works unchanged", async () => {
  const log = []; const nav = {};
  installWake(nav, { keepAwake: async () => log.push("awake"), allowSleep: async () => log.push("sleep") });
  assert.ok(wakeSupported(nav));
  const s = await nav.wakeLock.request("screen"); let told = 0; s.addEventListener("release", () => told++);
  assert.equal(s.released, false); await s.release(); await s.release();
  assert.deepEqual(log, ["awake", "sleep"]); assert.equal(s.released, true); assert.equal(told, 1);
  await assert.rejects(nav.wakeLock.request("system"));
});

test("the back button steps back like the screens' own Back, and puts the app away from Home or a friend's game", () => {
  const ui = (o) => ({ screen: "play", online: false, busy: false, ...o });
  assert.equal(backStep(ui({ rules: true })), "rulesClose");
  assert.equal(backStep(ui({ shouts: true, online: true })), "shouts");
  assert.equal(backStep(ui({ door: true })), "stay"); assert.equal(backStep(ui({ name: true, screen: "rooms" })), "stay");
  assert.equal(backStep(ui({ screen: "settings" })), "settingsBack");
  assert.equal(backStep(ui({ screen: "rooms" })), "roomsBack");
  assert.equal(backStep(ui({ screen: "store" })), "storeBack");
  assert.equal(backStep(ui({ screen: "puzzle" })), "pzHome"); assert.equal(backStep(ui({ screen: "puzzle", busy: true })), "stay");
  assert.equal(backStep(ui({ screen: "home" })), "minimize");
  assert.equal(backStep(ui({ online: true })), "minimize"); assert.equal(backStep(ui({ online: true, gameover: true })), "minimize");
  assert.equal(backStep(ui({ gameover: true })), "goHome");
  assert.equal(backStep(ui({})), "homeBtn"); assert.equal(backStep(ui({ busy: true })), "stay");
});

test("in the app, start wires the back button, the share sheet and keep-awake", () => {
  let back = null, minimized = 0; const w = appWin({ App: { addListener: (e, f) => { if (e === "backButton") back = f; }, minimizeApp: () => { minimized++; } }, Share: { share: async () => {} }, KeepAwake: { keepAwake: async () => {}, allowSleep: async () => {} } });
  let step = "minimize";
  assert.equal(startApp(() => step, w), true);
  assert.equal(typeof w.navigator.share, "function"); assert.ok(wakeSupported(w.navigator));
  back(); assert.equal(minimized, 1); step = "homeBtn"; back(); assert.equal(minimized, 1);
});

// ---------- the iPhone and iPad app (L4) ----------
const png = (f) => { const b = readFileSync(path.join(ROOT, f)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colour: b[25], b }; };

test("the iPhone and iPad app is set up as planned: same id and name, iPhone and iPad, iOS 15+, dark, no encryption to declare", () => {
  const cfg = JSON.parse(readFileSync(path.join(ROOT, "capacitor.config.json"), "utf8"));
  assert.equal(cfg.ios.backgroundColor, "#0d0906"); assert.equal(cfg.ios.contentInset, "never");   // under the notch: the page uses the safe areas
  assert.equal(cfg.ios.scrollEnabled, false); assert.equal(cfg.ios.allowsLinkPreview, false);        // no rubber-band page, no link preview on a long press
  const pbx = readFileSync(path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
  const ids = [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1]);
  assert.ok(ids.length >= 2 && ids.every((i) => i === cfg.appId), "every build of the app is com.mekaminu.ayoncho");
  assert.ok([...pbx.matchAll(/TARGETED_DEVICE_FAMILY = "([^"]+)";/g)].every((m) => m[1] === "1,2"), "iPhone and iPad");
  assert.ok([...pbx.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/g)].every((m) => +m[1] >= 15));
  const plist = readFileSync(path.join(ROOT, "ios/App/App/Info.plist"), "utf8");
  const key = (k) => { const m = plist.match(new RegExp(`<key>${k}</key>\\s*<([a-z]+)>?([^<]*)`)); return m && (m[1] === "string" ? m[2] : m[1]); };
  assert.equal(key("CFBundleDisplayName"), "Ayo &amp; Nchò");
  assert.equal(key("ITSAppUsesNonExemptEncryption"), "false");            // only HTTPS: no export paperwork in App Store Connect
  assert.equal(key("UIStatusBarStyle"), "UIStatusBarStyleLightContent");    // light icons on the dark wood
  assert.equal(key("LSApplicationCategoryType"), "public.app-category.board-games");
  assert.ok(!plist.includes("armv7"), "no 32-bit requirement (Apple has refused armv7 builds for years)");
  assert.match(plist, /UISupportedInterfaceOrientations~ipad/);
  const launch = readFileSync(path.join(ROOT, "ios/App/App/Base.lproj/LaunchScreen.storyboard"), "utf8");
  assert.match(launch, /red="0\.0509\d*" green="0\.0352\d*" blue="0\.0235\d*"/); assert.ok(!launch.includes("systemBackgroundColor"), "never a white launch screen");
});

test("the iPhone app's icon is 1024 with no transparency, and the splash is the board on the dark wood", () => {
  const icon = png("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
  assert.equal(icon.w, 1024); assert.equal(icon.h, 1024);
  assert.equal(icon.colour, 2, "RGB with no alpha channel: App Store Connect refuses an icon with one");
  const set = JSON.parse(readFileSync(path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json"), "utf8"));
  assert.deepEqual(set.images.map((i) => [i.filename, i.size]), [["AppIcon-512@2x.png", "1024x1024"]]);
  for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    const s = png("ios/App/App/Assets.xcassets/Splash.imageset/" + f); assert.equal(s.w, 2732); assert.equal(s.h, 2732); assert.equal(s.colour, 2);
  }
});

test("every app plugin is in the iPhone app's Swift package, so Xcode builds them all", () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const swift = readFileSync(path.join(ROOT, "ios/App/CapApp-SPM/Package.swift"), "utf8");
  const plugins = Object.keys(pkg.devDependencies).filter((n) => /^@capacitor(-community)?\//.test(n) && !/\/(core|cli|android|ios)$/.test(n));
  assert.ok(plugins.length >= 5);
  for (const n of plugins) assert.ok(swift.includes(`node_modules/${n}"`), `${n} is in Package.swift (run npx cap sync ios)`);
  assert.match(swift, /capacitor-swift-pm\.git", exact: "8\./);
  assert.equal(pkg.devDependencies["@capacitor/ios"].replace(/^\^/, "").split(".")[0], pkg.devDependencies["@capacitor/android"].replace(/^\^/, "").split(".")[0]);
});

test("on the iPhone the page knows it, nothing waits for a back button, and keep-awake comes from the app", async () => {
  assert.equal(platform(web), "web");
  const listened = []; const log = [];
  const w = appWin({ App: { addListener: (e) => { listened.push(e); } }, Share: { share: async () => {} }, KeepAwake: { keepAwake: async () => log.push("awake"), allowSleep: async () => log.push("sleep") } });
  w.Capacitor.getPlatform = () => "ios"; const classes = []; w.document.documentElement.classList.add = (...c) => classes.push(...c);
  // iOS's WKWebView may offer a wake lock that does nothing inside an app (before iOS 18.4): the app's own is used instead
  w.navigator.wakeLock = { request: async () => { throw new Error("not in an app"); } };
  assert.equal(platform(w), "ios");
  assert.equal(startApp(() => "minimize", w), true);
  assert.deepEqual(classes, ["app", "ios"]); assert.deepEqual(listened, [], "an iPhone has no back button");
  const s = await w.navigator.wakeLock.request("screen"); await s.release(); assert.deepEqual(log, ["awake", "sleep"]);
  assert.equal(typeof w.navigator.share, "function");
  w.Capacitor.getPlatform = () => "android"; assert.equal(platform(w), "android");
});
