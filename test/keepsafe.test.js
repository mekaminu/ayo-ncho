// Kept safe (idea 9 Nov): the browser asked to keep the game's storage for good once there is something worth keeping, and a
// save the phone refuses said once and shown in Settings → New phone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readKeep, worthKeeping, askDue, failKind, keepWords, makeKeep, GAP_MS, FULL, BLOCKED, W_APP, W_SAFE, W_HOME, W_MAY, W_FULL, W_OFF } from '../web/keepsafe.js';
import { FR } from '../web/i18n.js';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const DAY = 24 * 3600 * 1000;

test('what is kept is read with care', () => {
  const none = { asked: 0, granted: false };
  for (const raw of [null, '', '{', 'null', '[]', '5', '"x"', '{"asked":"x","granted":"yes"}', '{"asked":-3}', '{"__proto__":{"granted":true}}']) assert.deepEqual(readKeep(raw), none, String(raw));
  assert.deepEqual(readKeep('{"asked":123.9,"granted":true}'), { asked: 123, granted: true });
});

test('worth keeping: a game finished, or a second day played', () => {
  assert.equal(worthKeeping(), false);
  assert.equal(worthKeeping({ days: 1 }), false, 'a first visit with nothing finished asks nothing');
  assert.equal(worthKeeping({ days: 2 }), true);
  assert.equal(worthKeeping({ days: 0, finished: true }), true);
});

test('the browser is asked once, never in the apps, again a month after a no', () => {
  const o = { supported: true, worth: true, now: 10 * DAY };
  assert.equal(askDue(o, { asked: 0, granted: false }), true);
  assert.equal(askDue({ ...o, inApp: true }, { asked: 0 }), false, 'the store apps keep their own storage');
  assert.equal(askDue({ ...o, supported: false }, { asked: 0 }), false, 'a browser without the question');
  assert.equal(askDue({ ...o, persisted: true }, { asked: 0 }), false, 'already kept for good');
  assert.equal(askDue({ ...o, worth: false }, { asked: 0 }), false, 'nothing worth keeping yet');
  assert.equal(askDue(o, { asked: 0 }, true), false, 'a question already out');
  assert.equal(askDue(o, { asked: 10 * DAY - GAP_MS + 1 }), false, 'said no under a month ago');
  assert.equal(askDue(o, { asked: 10 * DAY - GAP_MS }), true, 'a month on');
  assert.equal(askDue(null, {}), false);
});

test('a refused save: full, or storage turned off', () => {
  assert.equal(failKind({ name: 'QuotaExceededError' }), 'full');
  assert.equal(failKind({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }), 'full');
  assert.equal(failKind({ name: 'Error', code: 22 }), 'full', 'older WebKit');
  assert.equal(failKind({ code: 1014 }), 'full', 'older Firefox');
  assert.equal(failKind({ name: 'SecurityError' }), 'off');
  assert.equal(failKind(null), 'off');
});

test('the line in Settings says where the game stands', () => {
  assert.equal(keepWords(), W_MAY);
  assert.equal(keepWords({ inApp: true }), W_APP);
  assert.equal(keepWords({ persisted: true }), W_SAFE);
  assert.equal(keepWords({ standalone: true }), W_HOME);
  assert.equal(keepWords({ persisted: true, standalone: true }), W_SAFE, 'a promise beats the home screen');
  assert.equal(keepWords({ inApp: true, failing: 'full' }), W_FULL, 'a full phone is said even in the app');
  assert.equal(keepWords({ persisted: true, failing: 'off' }), W_OFF);
});

test('the bookkeeping: asked, answered, a refused save said once a visit for each reason', () => {
  let t = 5 * DAY; const k = makeKeep(readKeep(null), () => t);
  const o = { supported: true, worth: true };
  assert.equal(k.due(o), true);
  k.asked(); assert.equal(k.due(o), false, 'one question at a time');
  k.answer(false); assert.equal(k.persisted, false); assert.equal(k.due(o), false, 'a no waits a month');
  t += GAP_MS; assert.equal(k.due(o), true);
  k.asked(); k.answer(true); assert.equal(k.due(o), false); assert.deepEqual(JSON.parse(k.save()), { asked: t, granted: true });
  assert.deepEqual(k.log, ['asked', 'not yet', 'asked', 'kept']);
  const j = makeKeep(readKeep('{"granted":true}'));
  assert.equal(j.persisted, true); j.known(false); assert.equal(j.persisted, false, 'a promise taken back since');

  const f = makeKeep(readKeep(null));
  const full = { name: 'QuotaExceededError' };
  assert.equal(f.failed(full, 'game'), FULL); assert.equal(f.failing, 'full');
  assert.equal(f.failed(full, 'game'), null, 'said once');
  f.ok('sound'); assert.equal(f.failing, 'full', 'a small setting that fits does not mean the game is kept');
  f.ok('game'); assert.equal(f.failing, null, 'the game kept again');
  assert.equal(f.failed(full, 'game'), null, 'not said twice in a visit');
  assert.equal(f.failed({ name: 'SecurityError' }, 'x'), BLOCKED, 'another reason is said');
  assert.equal(f.fails, 4);
});

test('every word in French', () => {
  for (const w of [FULL, BLOCKED, W_APP, W_SAFE, W_HOME, W_MAY, W_FULL, W_OFF, 'Kept on this phone']) assert.ok(FR[w], w);
});

test('wired into the page: every write checked, asked at game over, the row in Settings, cached offline', () => {
  const game = read('web/game.js'), html = read('web/index.html'), sw = read('web/sw.js');
  assert.match(game, /localStorage\.setItem\('ayo\.' \+ k, v\); keepS\.ok\(k\); \} catch \(e\) \{ keepRefused\(e, k\); \}/);
  assert.match(game, /function gameOver\(\) \{\n  safeAsk\(true\)/);
  assert.match(game, /storageApi\.persist\(\)/);
  assert.match(html, /<b>Kept on this phone<\/b><span id="keepNow">/);
  assert.match(sw, /'\.\/keepsafe\.js'/);
});
