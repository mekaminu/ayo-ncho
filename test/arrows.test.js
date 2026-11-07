// Turn the board from the keys (idea 7 Nov): ← → turn, ↑ ↓ higher / lower, + − nearer / farther, inside the drag's and the wheel's limits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NUDGE, LIMITS, nudgeView, nudgeMoves, mayNudge, keysTip, glideAt, isOff, restOf } from "../web/view.js";
import { keyAction } from "../web/keys.js";
import { translate } from "../web/i18n.js";

const fit = { base: 0, phi: 0.72, dist: 1.5 };
const near = (a, b) => Math.abs(a - b) < 1e-9;

test("the keys say what they turn, and a modifier or a field keeps them", () => {
  assert.deepEqual(keyAction({ key: "ArrowLeft" }), { type: "view", kind: "turn", dir: 1 });
  assert.deepEqual(keyAction({ key: "ArrowRight" }), { type: "view", kind: "turn", dir: -1 });
  assert.deepEqual(keyAction({ key: "ArrowUp" }), { type: "view", kind: "tilt", dir: 1 });
  assert.deepEqual(keyAction({ key: "ArrowDown" }), { type: "view", kind: "tilt", dir: -1 });
  for (const k of ["+", "="]) assert.deepEqual(keyAction({ key: k }), { type: "view", kind: "zoom", dir: 1 });
  for (const k of ["-", "_", "−"]) assert.deepEqual(keyAction({ key: k }), { type: "view", kind: "zoom", dir: -1 });
  assert.equal(keyAction({ key: "+", metaKey: true }), null, "⌘+ is the browser's own zoom");
  assert.equal(keyAction({ key: "-", ctrlKey: true }), null);
  assert.equal(keyAction({ key: "ArrowLeft" }, { tag: "input" }), null, "the arrows move the caret in the name field");
  assert.equal(keyAction({ key: "ArrowDown" }, { tag: "SELECT" }), null);
  assert.deepEqual(keyAction({ key: "ArrowUp" }, { tag: "BUTTON" }), { type: "view", kind: "tilt", dir: 1 }, "a focused pit button still turns the board");
  assert.deepEqual(keyAction({ key: "0" }), { type: "straight" }, "0 still sets it straight");
});

test("each press is one step, the way a drag goes", () => {
  const v = { theta: 0, phi: 0.72, dist: 1.5 };
  assert.ok(near(nudgeView(v, fit, "turn", 1).theta, NUDGE.turn), "← as a drag to the left");
  assert.ok(near(nudgeView(v, fit, "turn", -1).theta, -NUDGE.turn));
  assert.ok(near(nudgeView(v, fit, "tilt", 1).phi, 0.72 - NUDGE.tilt), "↑ from higher up");
  assert.ok(near(nudgeView(v, fit, "tilt", -1).phi, 0.72 + NUDGE.tilt));
  assert.ok(nudgeView(v, fit, "zoom", 1).dist < 1.5 && nudgeView(v, fit, "zoom", -1).dist > 1.5);
  let t = { ...v }; for (let i = 0; i < 24; i++) t = nudgeView(t, fit, "turn", 1);
  assert.ok(near(t.theta, Math.PI * 2), "twelve presses a half turn, 24 a whole turn round");
  assert.equal(isOff(t, fit), false, "a whole turn round is straight again");
  const z = nudgeView(nudgeView(v, fit, "zoom", 1), fit, "zoom", -1); assert.ok(near(z.dist, 1.5), "+ then − comes back exactly");
});

test("held keys stop at the limits and never pass them", () => {
  for (const [kind, dir] of [["tilt", 1], ["tilt", -1], ["zoom", 1], ["zoom", -1]]) {
    let v = { theta: 0.3, phi: 0.72, dist: 1.5 }, n = 0;
    while (nudgeMoves(v, fit, kind, dir) && n < 200) { v = nudgeView(v, fit, kind, dir); n++; }
    assert.ok(n < 60, `${kind} ${dir} reaches its limit in a few presses (${n})`);
    assert.ok(v.phi >= LIMITS.phiMin - 1e-12 && v.phi <= LIMITS.phiMax + 1e-12);
    assert.ok(v.dist >= fit.dist * LIMITS.near - 1e-12 && v.dist <= fit.dist * LIMITS.far + 1e-12);
    assert.equal(nudgeMoves(v, fit, kind, dir), false); assert.equal(nudgeMoves(v, fit, kind, -dir), true, "and the other way frees it");
  }
  for (let k = 0; k < 500; k++) { // random presses from random views inside the limits stay inside
    let v = { theta: (Math.random() - 0.5) * 10, phi: 0.35 + Math.random() * 0.95, dist: fit.dist * (0.5 + Math.random() * 1.1) };
    for (let i = 0; i < 20; i++) { v = nudgeView(v, fit, ["turn", "tilt", "zoom"][i % 3], Math.random() < 0.5 ? 1 : -1); }
    assert.ok(v.phi >= LIMITS.phiMin - 1e-12 && v.phi <= LIMITS.phiMax + 1e-12 && v.dist >= fit.dist * 0.5 - 1e-12 && v.dist <= fit.dist * 1.6 + 1e-12, JSON.stringify(v));
  }
  assert.equal(nudgeMoves({ theta: 0, phi: 0.72, dist: 1.5 }, fit, "turn", 1), true, "turning has no limit");
});

test("the glide lands on the step; 0 still puts it back", () => {
  const from = { theta: 0, phi: 0.72, dist: 1.5 }, to = nudgeView(from, fit, "zoom", 1);
  const end = glideAt(from, to, 1); assert.ok(near(end.dist, to.dist) && near(end.theta, to.theta));
  assert.ok(NUDGE.ms >= 100 && NUDGE.ms <= 250, "short enough for a held key to keep going");
  const off = nudgeView(nudgeView(from, fit, "turn", 1), fit, "tilt", 1), rest = restOf(off, fit);
  assert.equal(isOff(rest, fit), false);
});

test("when the keys may turn it", () => {
  assert.equal(mayNudge({}), true);
  assert.equal(mayNudge({ screen: true }), false, "not on Home, Settings or the store");
  assert.equal(mayNudge({ clipping: true }), false, "the clip keeps its own camera");
  assert.equal(mayNudge({ idle: true }), false, "not Home's slow turn");
});

test("the tip in English and French", () => {
  const w = keysTip(); assert.ok(/Arrow keys/.test(w) && /0/.test(w));
  const f = translate(w, "fr"); assert.notEqual(f, w); assert.ok(/flèches/.test(f));
  const lab = "The pits — keys 1 to 6 pick yours near to far, Enter sows, U undoes, H hints, Escape puts a pit back, S says the score, arrow keys turn the board";
  assert.notEqual(translate(lab, "fr"), lab, "the pits' label has its French");
});
