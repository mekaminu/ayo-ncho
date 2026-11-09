// Firefox's own engine (idea 9 Nov): the Firefox check runs in GitHub Actions (Firefox cannot be downloaded into the build
// container), so these keep it wired: the workflow dresses both phones, reports without holding up main, and the check knows
// both dresses and drops the phone mode Playwright's Firefox does not have.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(new URL("../.github/workflows/firefox.yml", import.meta.url), "utf8");
const tool = readFileSync(new URL("../tools/webkit-check.py", import.meta.url), "utf8");

test("the Firefox workflow checks Android and the Mac in Firefox, and never blocks main", () => {
  assert.match(wf, /playwright install --with-deps firefox/);
  assert.match(wf, /--browser firefox/);
  assert.match(wf, /HEADED=1 xvfb-run/);  // headless Gecko has no WebGL on a runner with no graphics card
  assert.match(wf, /"Firefox on Android"/);
  assert.match(wf, /"Firefox on a Mac"/);
  assert.match(wf, /continue-on-error: true/);
  assert.match(wf, /fail-fast: false/);
  for (const p of ["web/**", "engine/**", "server/**"]) assert.ok(wf.includes(`"${p}"`), p);
});

test("the check knows both Firefox dresses and leaves out the phone mode Firefox lacks", () => {
  assert.match(tool, /"Firefox on Android": \{[^}]*"width": 390/);
  assert.match(tool, /"Firefox on Android":[\s\S]*?"has_touch": True/);
  assert.match(tool, /"Firefox on a Mac":[\s\S]*?"has_touch": False/);
  assert.match(tool, /if browser == "firefox": dev\.pop\("is_mobile", None\)/);
  assert.match(tool, /how = "a finger" if dev\.get\("has_touch"\) else "the mouse"/);
});

// The boot screen's words when the browser's 3D drawing is off: the helper is lifted out of the page's own boot script and run
// with each browser's name, so what a player reads is what is tested.
const page = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const src = page.match(/function noGL\(list\)\{[\s\S]*?return \{en:en,fr:fr\};\}/)[0];
const noGL = (ua, errs) => new Function("navigator", src + "; return noGL;")({ userAgent: ua })(errs);
const UA = {
  ffMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0",
  ffAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0",
  chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
};
const GL = ["Error: Error creating WebGL context. · three.module.min.js:6"];

test("a board that failed for any other reason keeps the usual words", () => {
  assert.equal(noGL(UA.ffMac, ["TypeError: x is undefined"]), null);
  assert.equal(noGL(UA.ffMac, []), null);
});
test("Firefox on a Mac is told where hardware acceleration is, in English and French", () => {
  const w = noGL(UA.ffMac, GL);
  assert.match(w.en, /3D drawing switched off/);
  assert.match(w.en, /Settings › General › Performance/);
  assert.match(w.fr, /Paramètres › Général › Performances/);
});
test("Chrome on a Mac is told where graphics acceleration is", () => {
  assert.match(noGL(UA.chromeMac, GL).en, /Settings › System/);
});
test("a phone (Firefox on Android, Samsung Internet) is told to reopen the browser or try another", () => {
  for (const ua of [UA.ffAndroid, UA.samsung]) {
    const w = noGL(ua, GL);
    assert.match(w.en, /another browser/);
    assert.doesNotMatch(w.en, /Settings ›/);
    assert.match(w.fr, /autre navigateur/);
  }
});
