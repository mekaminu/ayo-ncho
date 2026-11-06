// Bigger words (web/textsize.js): Settings → Language → Word size scales every small word on the page through --ts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SIZES, SCALE, BIG, textScale, sizePref, sizeNote, sizeToast, applyScale, scaleCss, unscaled } from "../web/textsize.js";
import { translate } from "../web/i18n.js";

const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");

test("three sizes, normal by default; anything else is normal", () => {
  assert.deepEqual(SIZES, ["normal", "large", "larger"]);
  assert.equal(textScale("normal"), 1); assert.equal(textScale("large"), 1.15); assert.equal(textScale("larger"), 1.3);
  assert.equal(textScale(undefined), 1); assert.equal(textScale("huge"), 1);
  assert.equal(sizePref("huge"), "normal"); assert.equal(sizePref("larger"), "larger");
});

test("the rewrite: small sizes scale, big ones stay, nothing is scaled twice", () => {
  assert.equal(scaleCss("a{font-size:13px}"), "a{font-size:calc(13px*var(--ts))}");
  assert.equal(scaleCss("a{font:600 12px Inter,sans-serif}"), "a{font:600 calc(12px*var(--ts)) Inter,sans-serif}");
  assert.equal(scaleCss("a{font:14px/1.45 Inter}"), "a{font:calc(14px*var(--ts))/1.45 Inter}");
  assert.equal(scaleCss("h{font:600 22px Fraunces;font-size:40px}"), "h{font:600 22px Fraunces;font-size:40px}");
  const once = scaleCss("a{font-size:11.5px}"); assert.equal(scaleCss(once), once);
  assert.equal(BIG, 20);
});

test("every small word in the page scales: no font size under 20px in index.html's style or markup is left fixed", () => {
  const cut = html.indexOf("<style>#bootWait"); // the start-up line before anything is chosen is left as it is
  assert.ok(cut > 0);
  assert.deepEqual(unscaled(html.slice(0, cut)), []);
  assert.ok((html.match(/var\(--ts\)/g) || []).length > 80);
  assert.match(html, /:root\{--ts:1;/);
  assert.deepEqual(unscaled(game), [], "game.js writes no fixed small size either");
});

test("the page sets the saved size before it paints, with the same scale as the module", () => {
  const m = html.match(/var ts=\{large:([0-9.]+),larger:([0-9.]+)\}\[localStorage\.getItem\('ayo\.textsize'\)\]/);
  assert.ok(m, "the head script");
  assert.equal(Number(m[1]), SCALE.large); assert.equal(Number(m[2]), SCALE.larger);
  assert.ok(html.indexOf("ayo.textsize") < html.indexOf("<body"), "in the head, before the body");
});

test("the Settings row: three buttons, wired, painted", () => {
  for (const v of SIZES) assert.match(html, new RegExp(`data-set="textsize"[^]*?data-v="${v}"`));
  assert.match(game, /name === 'textsize'/);
  assert.match(game, /set\('textsize'/);
});

test("putting it on the page: --ts on the root and one class", () => {
  const props = {}; const cls = new Set();
  const doc = { documentElement: { style: { setProperty: (k, v) => { props[k] = v; } }, classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) } } };
  assert.equal(applyScale(doc, "larger"), 1.3); assert.equal(props["--ts"], "1.3"); assert.deepEqual([...cls], ["ts-larger"]);
  applyScale(doc, "normal"); assert.equal(props["--ts"], "1"); assert.deepEqual([...cls], ["ts-normal"]);
});

test("the words, in French too; the offline app carries textsize.js", () => {
  for (const p of SIZES) {
    const fr = translate(sizeNote(p), "fr"); assert.notEqual(fr, sizeNote(p)); assert.doesNotMatch(fr, /the hints|drawn|bigger/);
    assert.notEqual(translate(sizeToast(p), "fr"), sizeToast(p));
  }
  for (const w of ["Word size", "Large", "Larger", "Normal"]) assert.notEqual(translate(w, "fr"), w);
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/textsize\.js'/);
});
