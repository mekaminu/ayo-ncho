// Still, if you ask (idea 9 Nov, night): the phone's reduce-motion setting is followed while the game is open.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { motionWatch, physicsNote, restless, STILL_QUERY, GLANCE_MS } from '../web/still.js';
import { translate } from '../web/i18n.js';

function fakeMq(matches, { old = false } = {}) {
  const ls = [];
  const mq = { matches, media: STILL_QUERY };
  if (old) mq.addListener = (f) => ls.push(f); else mq.addEventListener = (k, f) => { assert.equal(k, 'change'); ls.push(f); };
  mq.flip = (v) => { mq.matches = v; for (const f of ls) f({ matches: v }); };
  return mq;
}

test('the watch reads the setting at once and follows each real change, once', () => {
  const mq = fakeMq(false); const heard = [];
  let asked = null;
  const w = motionWatch((q) => { asked = q; return mq; }, (r) => heard.push(r));
  assert.equal(asked, '(prefers-reduced-motion: reduce)');
  assert.equal(w.reduce, false);
  mq.flip(true); assert.equal(w.reduce, true);
  mq.flip(true); // the same again: nothing new
  mq.flip(false);
  assert.deepEqual(heard, [true, false]); assert.equal(w.changes, 2); assert.deepEqual(w.log, [true, false]);
  assert.equal(motionWatch(() => fakeMq(true)).reduce, true, 'a phone already asking: still from the first frame');
});

test('older Safari (addListener only), no matchMedia, a throwing one, a throwing listener: never breaks the page', () => {
  const mq = fakeMq(false, { old: true }); const w = motionWatch(() => mq);
  mq.flip(true); assert.equal(w.reduce, true);
  assert.equal(motionWatch(undefined).reduce, false);
  assert.equal(motionWatch(() => { throw new Error('no'); }).reduce, false);
  const m2 = fakeMq(false); const w2 = motionWatch(() => m2, () => { throw new Error('page'); });
  m2.flip(true); assert.equal(w2.reduce, true);
  const many = fakeMq(false); const w3 = motionWatch(() => many);
  for (let i = 0; i < 30; i++) many.flip(i % 2 === 0);
  assert.equal(w3.log.length, 20, 'its log is bounded');
});

test('Seed physics says why, and the phone asking for less motion comes first', () => {
  assert.equal(physicsNote({ physics: true, reason: 'auto' }, false), 'now on (auto)');
  assert.equal(physicsNote({ physics: false, reason: 'the lighter board is on' }, false), 'now off (the lighter board is on)');
  assert.equal(physicsNote({ physics: true, reason: 'chosen in Settings' }, true), 'now off (your phone asks for less motion)');
  assert.equal(translate('now off (your phone asks for less motion)', 'fr'), 'désactivée en ce moment (votre téléphone demande moins de mouvement)');
  assert.equal(translate('now off (the battery is low)', 'fr'), 'désactivée en ce moment (la batterie est faible)');
});

test('what counts as moving: longer than a glance, or for ever; finished and instant ones do not', () => {
  assert.equal(GLANCE_MS, 300);
  const r = restless([
    { who: 'p.fade', kind: 'transition', name: 'opacity', duration: 250, iterations: 1, playState: 'running' },
    { who: 'i.pulse', kind: 'animation', name: 'pulse', duration: 1200, iterations: 'Infinity', playState: 'running' },
    { who: 'b.bump', kind: 'animation', name: 'bump', duration: 500, iterations: 1, playState: 'running' },
    { who: 'b.done', kind: 'animation', name: 'bump', duration: 500, iterations: 1, playState: 'finished' },
    { who: 'b.none', kind: 'animation', name: 'none', duration: 0, iterations: Infinity, playState: 'running' },
    { who: 'b.twice', kind: 'animation', name: 'tick', duration: 200, iterations: 2, playState: 'running' },
  ]);
  assert.deepEqual(r.map((a) => [a.who, a.ms]), [['i.pulse', Infinity], ['b.bump', 500], ['b.twice', 400]]);
  assert.deepEqual(restless(null), []);
});

test('the page: one watch for the whole game, never a reading of the setting kept from the page opening', () => {
  const js = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../web/sw.js', import.meta.url), 'utf8');
  assert.match(js, /from '\.\/still\.js'/);
  assert.match(js, /const stillW = motionWatch\(\(q\) => matchMedia\(q\), \(r\) => \{ reduceMotion = r;/);
  assert.match(js, /let reduceMotion = stillW\.reduce;/);
  assert.doesNotMatch(js, /matchMedia\('\(prefers-reduced-motion/, 'every reading goes through the watch');
  assert.doesNotMatch(js, /const reduceMotion/);
  assert.match(js, /function stillChanged\(r\) \{/);
  assert.match(js, /if \(idle && !reduceMotion\) theta \+=/, 'the board behind Home turns only when the phone does not ask for stillness, read every frame');
  assert.equal((js.match(/physicsNote\(PHYS, reduceMotion\)/g) || []).length, 2, 'both places that write the Seed physics line');
  assert.match(sw, /'\.\/still\.js'/, 'carried offline');
  const tool = readFileSync(new URL('../tools/still.py', import.meta.url), 'utf8');
  assert.match(tool, /reduced_motion="reduce"/); assert.match(tool, /emulate_media\(reduced_motion=/, 'the check changes the setting with the game open');
});
