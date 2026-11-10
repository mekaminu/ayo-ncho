import test from 'node:test';
import assert from 'node:assert/strict';
import { shapeOf, shouldGlide, glideStart, unfoldAt, glideClock, STEP_MAX, UNFOLD_MS } from '../web/unfold.js';

const folded = shapeOf(390, 760), open = shapeOf(800, 760), mac = shapeOf(1180, 820, { wide: true });
const sideways = shapeOf(844, 390, { wide: true, side: Math.PI / 2 });

test('a real change of shape glides', () => {
  assert.equal(shouldGlide(folded, open), true, 'the Fold opened');
  assert.equal(shouldGlide(open, folded), true, 'the Fold closed');
  assert.equal(shouldGlide(open, mac), true, 'into the wide layout');
  assert.equal(shouldGlide(folded, sideways), true, 'a phone on its side');
  assert.equal(shouldGlide(open, shapeOf(800, 690, { table: true })), true, 'half folded');
});

test('small changes and the first framing do not', () => {
  assert.equal(shouldGlide(null, folded), false, 'the first framing');
  assert.equal(shouldGlide(folded, shapeOf(390, 700)), false, 'the browser bar or the keyboard: height only');
  assert.equal(shouldGlide(folded, shapeOf(420, 760)), false, 'a few pixels wider');
  assert.equal(shouldGlide(folded, open, { reduce: true }), false, 'Reduce motion');
  assert.equal(shouldGlide(folded, shapeOf(0, 0)), false, 'a hidden canvas');
  assert.equal(shouldGlide(shapeOf(0, 0), folded), false, 'from a hidden canvas');
});

test('the glide starts where the board was seen and turns the short way', () => {
  const from = { theta: 0.3, side: 0, phi: 0.72, dist: 1.6, x: 4, y: -10 };
  const s = glideStart(from, { theta: 0, side: 0 });
  assert.deepEqual(s, { theta: 0.3, phi: 0.72, dist: 1.6, x: 4, y: -10 });
  // on its side: the old picture had no quarter turn, the new one does — start a quarter back so nothing jumps
  const t = glideStart({ ...from, theta: 0 }, { theta: 0, side: Math.PI / 2 });
  assert.ok(Math.abs(t.theta + Math.PI / 2) < 1e-9);
  // a board dragged round several turns comes back the short way
  for (const th of [7, -7, 13.2, Math.PI * 5]) {
    const g = glideStart({ ...from, theta: th }, { theta: Math.PI, side: 0 });
    assert.ok(Math.abs(g.theta - Math.PI) <= Math.PI + 1e-9, `from ${th}: ${g.theta}`);
    assert.ok(Math.abs(Math.cos(g.theta) - Math.cos(th)) < 1e-9 && Math.abs(Math.sin(g.theta) - Math.sin(th)) < 1e-9, 'the same picture');
  }
});

test('the glide runs end to end', () => {
  const a = { theta: 0.4, phi: 0.6, dist: 2, x: 10, y: 0 }, b = { theta: 0, phi: 0.8, dist: 1, x: 0, y: -20 };
  assert.deepEqual(unfoldAt(a, b, 0), a);
  const e = unfoldAt(a, b, 1); for (const k of Object.keys(b)) assert.ok(Math.abs(e[k] - b[k]) < 1e-9, k);
  const m = unfoldAt(a, b, 0.5);
  assert.ok(Math.abs(m.dist - Math.SQRT2) < 1e-9, 'the distance as a ratio');
  assert.ok(m.phi > a.phi && m.phi < b.phi && m.x < a.x && m.y < 0);
  assert.deepEqual(unfoldAt(a, b, -1), a); // clamped
  assert.ok(UNFOLD_MS >= 300 && UNFOLD_MS <= 900);
});

test('a slow first frame cannot eat the glide', () => {
  const c = glideClock(500, 0);
  assert.equal(c.tick(450), STEP_MAX / 500, 'a 450 ms frame counts for 50');
  let k = 0, now = 450; while (k < 1) { now += 16; k = c.tick(now); }
  assert.ok(now - 450 >= 400, 'the rest of it still plays at the frame rate');
  const d = glideClock(500, 100); assert.equal(d.tick(90), 0, 'a clock never runs backwards');
  assert.equal(glideClock(0, 0).tick(1), 1);
});

import { afterResize, framingMoved, SETTLE_MS } from '../web/unfold.js';

test('a glide is never left half way: what a resize does to one still on its way', () => {
  const opened = shapeOf(816, 505, { wide: true, side: Math.PI / 2 }), barGone = shapeOf(816, 530, { wide: true, side: Math.PI / 2 });
  assert.equal(afterResize({ gliding: false, prev: folded, next: opened }), 'glide', 'the Fold opened: it glides');
  assert.equal(afterResize({ gliding: true, prev: folded, next: opened }), 'glide', 'a new shape while gliding: glides on from where it is seen');
  assert.equal(afterResize({ gliding: true, prev: opened, next: barGone }), 'retarget', 'the same shape a little changed: the glide goes on to the new framing');
  assert.equal(afterResize({ gliding: false, prev: opened, next: barGone }), 'snap', 'nothing gliding: reframed at once');
  assert.equal(afterResize({ gliding: true, prev: opened, next: barGone, reduce: true }), 'snap', 'Reduce motion: never a glide');
  assert.equal(afterResize({ gliding: false, prev: null, next: folded }), 'snap', 'the first framing');
});

test('the page settling after a resize: only a change you could see reframes the board', () => {
  const v = { phi: 0.5, dist: 2, x: -77, y: -25 };
  assert.equal(framingMoved(v, { ...v }), false);
  assert.equal(framingMoved(v, { ...v, x: -76 }), false, 'a pixel is nothing');
  assert.equal(framingMoved(v, { ...v, x: -70 }), true, 'the room moved: the picture moves with it');
  assert.equal(framingMoved(v, { ...v, dist: 2.04 }), true, 'a 2% bigger board');
  assert.equal(framingMoved(v, { ...v, phi: 0.52 }), true, 'a new tilt');
  assert.equal(framingMoved(null, v), true);
  assert.ok(SETTLE_MS >= 200 && SETTLE_MS <= 800);
});
