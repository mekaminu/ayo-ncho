// Full screen (web/fullscreen.js): Settings → Feel → Full screen and F on the keys, on the game link only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KEYS, fullSupport, isFull, enterFull, exitFull, fullPref, shouldRestore, afterChange, fullNote, fullToast, FULL_REFUSED } from "../web/fullscreen.js";
import { keyAction } from "../web/keys.js";
import { translate } from "../web/i18n.js";

const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");

function fakeDoc({ enabled = true, webkit = false, refuse = false } = {}) {
  const d = { fullscreenElement: null, asked: [] };
  const el = {};
  if (webkit) { d.webkitFullscreenEnabled = enabled; el.webkitRequestFullscreen = () => { d.webkitFullscreenElement = el; d.asked.push("webkit"); }; d.webkitExitFullscreen = () => { d.webkitFullscreenElement = null; }; }
  else {
    d.fullscreenEnabled = enabled;
    el.requestFullscreen = (o) => { d.asked.push(o); if (refuse) return Promise.reject(new Error("NotAllowedError")); d.fullscreenElement = el; return Promise.resolve(); };
    d.exitFullscreen = () => { d.fullscreenElement = null; return Promise.resolve(); };
  }
  d.documentElement = el; return d;
}

test("only the game link in a browser that can: never the store apps, never the game installed from its icon, never an iPhone's Safari", () => {
  assert.equal(fullSupport(fakeDoc()), "ok");
  assert.equal(fullSupport(fakeDoc({ webkit: true })), "ok", "an older Safari on the Mac or an iPad");
  assert.equal(fullSupport(fakeDoc(), { inApp: true }), "app");
  assert.equal(fullSupport(fakeDoc(), { standalone: true }), "installed");
  assert.equal(fullSupport(fakeDoc({ enabled: false })), "none", "an iPhone: no element full screen, or a frame that does not allow it");
  assert.equal(fullSupport({ documentElement: {} }), "none");
  assert.equal(fullSupport(null), "none");
});

test("in and out: the phone's own bar hidden too; a refusal says no instead of throwing", async () => {
  const d = fakeDoc(); assert.equal(isFull(d), false);
  assert.equal(await enterFull(d.documentElement), true); assert.equal(isFull(d), true); assert.deepEqual(d.asked[0], { navigationUI: "hide" });
  assert.equal(await exitFull(d), true); assert.equal(isFull(d), false);
  assert.equal(await exitFull(d), true, "already out is fine");
  const w = fakeDoc({ webkit: true }); assert.equal(await enterFull(w.documentElement), true); assert.equal(isFull(w), true); await exitFull(w); assert.equal(isFull(w), false);
  const r = fakeDoc({ refuse: true }); assert.equal(await enterFull(r.documentElement), false); assert.equal(isFull(r), false);
  assert.equal(await enterFull(null), false); assert.equal(await enterFull({}), false);
});

test("the choice is kept: after a reload the first tap goes back to full screen, and leaving it the browser's way turns it off", () => {
  assert.equal(fullPref("1"), true); assert.equal(fullPref("0"), false); assert.equal(fullPref(null), false, "off until chosen");
  assert.equal(shouldRestore({ pref: "1", support: "ok", full: false }), true);
  assert.equal(shouldRestore({ pref: "1", support: "ok", full: true }), false, "already full");
  assert.equal(shouldRestore({ pref: "0", support: "ok", full: false }), false);
  assert.equal(shouldRestore({ pref: "1", support: "app", full: false }), false);
  assert.equal(afterChange({ full: false, asked: false }), "0", "Esc, the phone's back or a swipe: the player chose off");
  assert.equal(afterChange({ full: false, asked: true }), null, "the switch or F asked: already kept as off");
  assert.equal(afterChange({ full: true, asked: false }), null);
});

test("F on the Mac's keys, never with a modifier (Cmd-F still finds) and never while typing a name", () => {
  assert.deepEqual(KEYS, ["f", "F"]);
  assert.deepEqual(keyAction({ key: "f" }), { type: "full" });
  assert.deepEqual(keyAction({ key: "F" }), { type: "full" });
  assert.equal(keyAction({ key: "f", metaKey: true }), null);
  assert.equal(keyAction({ key: "f", ctrlKey: true }), null);
  assert.equal(keyAction({ key: "f" }, { tag: "INPUT" }), null);
  assert.deepEqual(keyAction({ key: "s" }), { type: "say" }, "S still says the score");
});

test("its words, and every one in French", () => {
  assert.match(fullNote("ok", false), /address bar/);
  assert.match(fullNote("ok", true), /Esc or the phone’s back/);
  assert.match(fullNote("app"), /already fills/); assert.match(fullNote("installed"), /already fills/);
  assert.match(fullNote("none"), /cannot/);
  assert.match(fullToast(true, { keys: true }), /Esc or F/); assert.match(fullToast(true), /back/); assert.equal(fullToast(false), "Full screen off");
  const all = ["Full screen", fullNote("ok", false), fullNote("ok", true), fullNote("app"), fullNote("none"), fullToast(false), fullToast(true, { keys: true }), fullToast(true), FULL_REFUSED];
  for (const w of all) { const f = translate(w, "fr"); assert.ok(f && f !== w, `French for "${w}"`); }
  assert.equal(translate("Full screen", "fr"), "Plein écran");
});

test("wired in: the row in Settings → Feel (hidden where the screen is already full), the game, the service worker", () => {
  const html = read("../web/index.html"), game = read("../web/game.js"), sw = read("../web/sw.js");
  assert.match(html, /id="fullRow" hidden[^]*?data-set="full"/);
  assert.ok(html.indexOf('id="fullRow"') > html.indexOf('data-set="wake"'), "beside Keep the screen on");
  assert.match(game, /from '\.\/fullscreen\.js'/);
  assert.match(game, /addEventListener\('fullscreenchange'/);
  assert.match(game, /a\.type === 'full'/);
  assert.match(sw, /'\.\/fullscreen\.js'/);
});
