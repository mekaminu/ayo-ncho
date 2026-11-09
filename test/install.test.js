// On your home screen (idea 9 Nov): the brass line on Home that offers to keep the game on the phone's home screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installKind, readInstall, installDue, makeInstall, DAYS, GAP_MS, OFFERS, WORDS, IOS_STEPS, ADDED } from '../web/install.js';
import { FR } from '../web/i18n.js';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const DAY = 24 * 3600 * 1000;

test('which offer this browser can take', () => {
  assert.equal(installKind({ prompt: true, ua: ANDROID }), 'prompt');
  assert.equal(installKind({ prompt: false, ua: ANDROID }), null, 'no install question from the browser, nothing to offer');
  assert.equal(installKind({ ua: IPHONE }), 'ios');
  assert.equal(installKind({ ua: IPAD, touch: 5 }), 'ios', 'an iPad asks for the Mac page but has a touch screen');
  assert.equal(installKind({ ua: IPAD, touch: 0 }), null, 'Safari on a Mac');
  assert.equal(installKind({ inApp: true, prompt: true, ua: IPHONE }), null, 'never in the store apps');
  assert.equal(installKind({ standalone: true, prompt: true, ua: IPHONE }), null, 'never in the installed app itself');
  assert.equal(installKind(), null);
});

test('what is kept is read with care', () => {
  const none = { offers: 0, last: 0, done: false };
  for (const raw of [null, '', '{', 'null', '[]', '5', '"x"', '{"offers":"x","last":-4,"done":"yes"}', '{"__proto__":{"done":true}}']) assert.deepEqual(readInstall(raw), none, String(raw));
  assert.deepEqual(readInstall('{"offers":9,"last":123.7,"done":true}'), { offers: OFFERS, last: 123, done: true });
});

test('it waits for a second day, Home in front and no other brass line', () => {
  const kept = readInstall(null); const o = { kind: 'prompt', days: DAYS, home: true, other: false, now: 1e12 };
  assert.equal(installDue(o, kept), true);
  assert.equal(installDue({ ...o, days: DAYS - 1 }, kept), false, 'the first day: not yet');
  assert.equal(installDue({ ...o, home: false }, kept), false, 'never on the board, a card or another screen');
  assert.equal(installDue({ ...o, other: true }, kept), false, 'one brass line at a time');
  assert.equal(installDue({ ...o, kind: null }, kept), false);
  assert.equal(installDue(o, { ...kept, done: true }), false, 'never again once on the home screen');
  assert.equal(installDue(null, kept), false);
});

test('Not now puts it away for two weeks, and it is offered twice at most', () => {
  let t = 1e12; const st = makeInstall(readInstall(null), () => t); const o = { kind: 'ios', days: 3, home: true, other: false };
  assert.equal(st.due(o), true); assert.equal(st.offered(), true); assert.equal(st.offered(), false, 'once a visit');
  assert.equal(st.due(o), true, 'the offer of this visit stays up until answered');
  st.notNow(); assert.equal(st.due(o), false);
  t += GAP_MS - DAY; assert.equal(st.due(o), false, 'not before two weeks');
  t += DAY; assert.equal(st.due(o), true); st.offered(); st.notNow();
  t += GAP_MS * 10; assert.equal(st.due(o), false, 'twice is enough');
  const again = makeInstall(readInstall(st.save()), () => t); assert.equal(again.due(o), false, 'and it is remembered');
  assert.deepEqual(st.log, ['offered', 'not now', 'offered', 'not now']);
});

test('an offer seen once and left (the page closed) still counts', () => {
  let t = 5e11; const st = makeInstall(readInstall(null), () => t); const o = { kind: 'prompt', days: 2, home: true, other: false };
  st.offered(); const next = makeInstall(readInstall(st.save()), () => t + DAY);
  assert.equal(next.due(o), false, 'the next day it is not back');
  const later = makeInstall(readInstall(st.save()), () => t + GAP_MS); assert.equal(later.due(o), true);
});

test('added: never offered again', () => {
  const st = makeInstall(readInstall(null)); const o = { kind: 'prompt', days: 2, home: true, other: false };
  st.offered(); st.added(); assert.equal(st.due(o), false); assert.equal(readInstall(st.save()).done, true);
});

test('the page wires it up: the line, the early catch of the browser question, French words', () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  assert.match(html, /id="installLine"[^>]*hidden/); assert.match(html, /id="installGo"/); assert.match(html, /id="installNo"[^>]*>Not now</);
  assert.match(html, /beforeinstallprompt[\s\S]{0,80}preventDefault\(\)[\s\S]{0,40}__bip/);
  assert.ok(html.includes(WORDS));
  assert.match(js, /addEventListener\('appinstalled'/); assert.match(js, /paintInstall\(\);\n/);
  for (const w of [WORDS, IOS_STEPS, ADDED, 'Not now']) assert.ok(FR[w], 'French for ' + w);
});
