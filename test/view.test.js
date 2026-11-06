// Set the board straight (web/view.js): a double-tap on the wood, a double-click or the 0 key glides the board back to rest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TAU, DOUBLE, restTheta, restOf, offBy, isOff, glideMs, glideAt, isDoubleTap, mayStraighten, tipWords } from "../web/view.js";
import { keyAction } from "../web/keys.js";
import { translate } from "../web/i18n.js";

const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

test("the rest angle is the seat's facing nearest the board, the short way round", () => {
  assert.equal(restTheta(0.3, 0), 0);
  assert.ok(near(restTheta(TAU + 0.4, 0), TAU), "a board turned a whole way round rests a whole turn on, never swinging back");
  assert.ok(near(restTheta(-0.5, 0), 0));
  assert.ok(near(restTheta(Math.PI + 0.2, Math.PI), Math.PI), "the far seat rests at π");
  assert.ok(near(restTheta(0.1, Math.PI), -Math.PI) || near(restTheta(0.1, Math.PI), Math.PI));
  for (let k = 0; k < 400; k++) { // never more than half a turn to go
    const th = (Math.random() - 0.5) * 8 * Math.PI, base = Math.random() < 0.5 ? 0 : Math.PI, r = restTheta(th, base);
    assert.ok(Math.abs(r - th) <= Math.PI + 1e-9, `${th} → ${r}`);
    assert.ok(near(((r - base) / TAU) % 1, 0, 1e-9) || near(Math.abs(((r - base) / TAU) % 1), 1, 1e-9));
  }
});

test("off or not: small nudges are rest, a real drag, tilt or zoom is off", () => {
  const fit = { base: 0, phi: 0.72, dist: 1.5 };
  assert.equal(isOff({ theta: 0, phi: 0.72, dist: 1.5 }, fit), false);
  assert.equal(isOff({ theta: 0.1, phi: 0.75, dist: 1.55 }, fit), false);
  assert.equal(isOff({ theta: 0.5, phi: 0.72, dist: 1.5 }, fit), true, "turned");
  assert.equal(isOff({ theta: 0, phi: 1.0, dist: 1.5 }, fit), true, "tilted");
  assert.equal(isOff({ theta: 0, phi: 0.72, dist: 0.9 }, fit), true, "nearer");
  assert.equal(isOff({ theta: 0, phi: 0.72, dist: 2.2 }, fit), true, "farther");
  assert.equal(isOff({ theta: TAU, phi: 0.72, dist: 1.5 }, fit), false, "a whole turn round is straight");
  assert.ok(near(offBy({ theta: 0, phi: 0.72, dist: 3 }, fit).zoom, offBy({ theta: 0, phi: 0.72, dist: 0.75 }, fit).zoom), "twice as far weighs the same as twice as near");
});

test("the glide: 380–900 ms, longer the farther, and it lands exactly on rest", () => {
  const fit = { base: Math.PI, phi: 0.5, dist: 2 };
  const short = glideMs({ theta: Math.PI + 0.25, phi: 0.5, dist: 2 }, fit), long = glideMs({ theta: Math.PI * 1.9, phi: 1.2, dist: 1 }, fit);
  assert.ok(short >= 380 && short < long && long <= 900, `${short} ${long}`);
  assert.equal(glideMs({ theta: Math.PI, phi: 0.5, dist: 2 }, fit), 380);
  for (let k = 0; k < 200; k++) {
    const from = { theta: (Math.random() - 0.5) * 10, phi: 0.35 + Math.random() * 0.95, dist: 0.8 + Math.random() * 2 };
    const to = restOf(from, fit);
    const ms = glideMs(from, fit); assert.ok(ms >= 380 && ms <= 900);
    const a = glideAt(from, to, 0), b = glideAt(from, to, 1);
    assert.ok(near(a.theta, from.theta) && near(a.phi, from.phi) && near(a.dist, from.dist));
    assert.ok(near(b.theta, to.theta) && near(b.phi, to.phi) && near(b.dist, to.dist, 1e-9));
    assert.equal(isOff(b, fit), false, "after the glide the board is straight");
    const m = glideAt(from, to, 0.5); // every step between the two, never past either end
    assert.ok(m.dist >= Math.min(from.dist, to.dist) - 1e-9 && m.dist <= Math.max(from.dist, to.dist) + 1e-9);
    assert.ok(m.phi >= Math.min(from.phi, to.phi) - 1e-9 && m.phi <= Math.max(from.phi, to.phi) + 1e-9);
  }
});

test("a double-tap is two taps on the wood, quick and close", () => {
  const a = { t: 1000, x: 100, y: 200 };
  assert.equal(isDoubleTap(null, a), false);
  assert.equal(isDoubleTap(a, { t: 1200, x: 110, y: 205 }), true);
  assert.equal(isDoubleTap(a, { t: 1000 + DOUBLE.ms + 1, x: 100, y: 200 }), false, "too slow");
  assert.equal(isDoubleTap(a, { t: 1100, x: 100 + DOUBLE.px + 5, y: 200 }), false, "too far apart");
  assert.equal(isDoubleTap(a, { t: 900, x: 100, y: 200 }), false, "out of order");
});

test("when it may: on the board only, never on a screen, in the clip, on Home or while a tap would hurry a turn", () => {
  assert.equal(mayStraighten({}), true);
  for (const k of ["screen", "clipping", "hurrying", "idle"]) assert.equal(mayStraighten({ [k]: true }), false, k);
});

test("the 0 key sets it straight; a modifier or a field keeps the key", () => {
  assert.deepEqual(keyAction({ key: "0" }), { type: "straight" });
  assert.equal(keyAction({ key: "0", metaKey: true }), null);
  assert.equal(keyAction({ key: "0" }, { tag: "INPUT" }), null);
});

test("the words, in French too; the offline app and the game carry view.js", () => {
  for (const mouse of [false, true]) {
    const w = tipWords({ mouse }), f = translate(w, "fr");
    assert.ok(/straight/.test(w)); assert.notEqual(f, w, `no French for «${w}»`); assert.ok(!/ [:;?!]/.test(f));
  }
  assert.match(tipWords({ mouse: true }), /0/);
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"); assert.match(sw, /'\.\/view\.js'/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8"); assert.match(game, /from '\.\/view\.js'/);
  assert.match(game, /fitPhi = phi/, "the framing remembers the tilt it chose");
});
