// Tell us what went wrong (web/report.js): the note kept of trouble, made safe to send, and the block of text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clean, errorNote, makeTrouble, rowWords, reportText, shortAgent, MAX_TROUBLE, MAX_LEN, ROW_NONE } from '../web/report.js';
import { makeI18n } from '../web/i18n.js';

test('clean: addresses keep only their file name — no room code, no progress link', () => {
  assert.equal(clean('could not load https://ayo-ncho.onrender.com/game.js?v=3'), 'could not load game.js');
  assert.equal(clean('socket closed wss://ayo-ncho.onrender.com/ws?room=KQPZ&seat=1'), 'socket closed ws');
  assert.equal(clean('at https://ayo-ncho.onrender.com/#carry=zAbCdEfGhIjKlMnOpQrStUvWxYz0123456789'), 'at ayo-ncho.onrender.com');
  assert.ok(!/KQPZ/.test(clean('No room with code KQPZ')));
  assert.ok(!/KQPZ/.test(clean('joining room KQPZ failed')));
});

test('clean: long codes are cut out, one line, never too long, never empty', () => {
  assert.equal(clean('token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdefgh end'), 'token … end');
  assert.equal(clean('a\n  b\tc'), 'a b c');
  assert.equal(clean('x'.repeat(10) + ' ' + 'word '.repeat(80)).length, MAX_LEN);
  assert.equal(clean(''), 'error');
  assert.equal(clean(null), 'error');
  assert.equal(clean('Is it 3? yes'), 'Is it 3 yes');
});

test('errorNote: kind, name, message and where', () => {
  assert.equal(errorNote('error', new TypeError('x is undefined'), 'https://h/game.js?v=1', 120), 'TypeError: x is undefined · game.js:120');
  assert.equal(errorNote('rejection', new Error('nope')), 'promise: nope');
  assert.equal(errorNote('rejection', 'plain words'), 'promise: plain words');
  assert.equal(errorNote('error', null), 'error');
});

test('makeTrouble: the same note is counted, not repeated; at most a few kept, the rest counted', () => {
  let t0 = 1000; const t = makeTrouble(() => t0, 0);
  t.add('boom'); t0 = 2000; t.add('boom'); t.add('other');
  assert.equal(t.notes.length, 2); assert.equal(t.notes[0].n, 2); assert.equal(t.notes[0].first, 1000); assert.equal(t.notes[0].last, 2000);
  for (let i = 0; i < 20; i++) t.add('e' + i);
  assert.equal(t.notes.length, MAX_TROUBLE); assert.equal(t.count(), 23);
});

test('rowWords: what the row says', () => {
  assert.equal(rowWords(0), ROW_NONE);
  assert.equal(rowWords(1), 'the game has met 1 problem since it opened');
  assert.equal(rowWords(4), 'the game has met 4 problems since it opened');
});

const base = (over = {}) => ({ build: 'ayo-v131', where: 'web', ua: 'Mozilla/5.0 (Linux; Android 14; SM-F946B) Chrome/130', screen: { w: 390, h: 844, dpr: 2.625 }, view: { w: 390, h: 760 }, touch: true,
  lang: 'en', words: 'normal', gpu: 'Adreno (TM) 740', lite: false, why: 'fast phone', physics: true, losses: 0, game: { name: 'Nchò', against: 'Nnamdi', moves: 14 }, now: 120000, ...over });

test('reportText: the build, the phone, the board, the game and no trouble', () => {
  const t = makeTrouble(() => 0, 0);
  const s = reportText(base({ trouble: t }));
  assert.match(s, /^Ayo & Nchò — what went wrong\nWhat happened \(write it here\): /);
  assert.match(s, /Build: ayo-v131 · the web link\n/);
  assert.match(s, /Phone: \(Linux; Android 14; SM-F946B\) Chrome\/130/);
  assert.match(s, /Screen: 390×844 at 2\.63× · the game 390×760 · touch/);
  assert.match(s, /Board: full \(fast phone\) · seeds bounce · Adreno \(TM\) 740/);
  assert.match(s, /Game: Nchò against Nnamdi · 14 moves/);
  assert.match(s, /Open for: 2 min/);
  assert.match(s, /Trouble: none seen since the game opened$/);
});

test('reportText: trouble listed with counts and when; apps and rooms named; never a room code', () => {
  let now = 0; const t = makeTrouble(() => now, 0);
  now = 5000; t.add('TypeError: a is null · game.js:9'); now = 6000; t.add('TypeError: a is null · game.js:9'); t.add('could not load https://x/board.js?room=ABCD');
  const s = reportText(base({ where: 'android', trouble: t, losses: 2, lite: true, game: { name: 'Ayo', room: true, against: 'Tete', moves: 3, over: true }, now: 65000 }));
  assert.match(s, /Build: ayo-v131 · the Android app/);
  assert.match(s, /graphics taken away 2×/);
  assert.match(s, /Board: lighter/);
  assert.match(s, /Game: Ayo with a friend · 3 moves · over/);
  assert.ok(!/Tete/.test(s), 'a friend in a room is never named');
  assert.match(s, /Trouble \(3\):\n- TypeError: a is null · game.js:9 \(×2\) · 60 s ago\n- could not load board\.js · 59 s ago/);
  assert.ok(!/ABCD/.test(s));
  assert.match(reportText(base({ where: 'web', installed: true })), /the web link, on the home screen/);
  assert.match(reportText(base({ where: 'ios' })), /the iPhone app/);
});

test('shortAgent: drops the oldest word and keeps it short', () => {
  assert.equal(shortAgent('Mozilla/5.0 (iPhone) Safari'), '(iPhone) Safari');
  assert.equal(shortAgent(''), 'unknown');
  assert.equal(shortAgent('x'.repeat(400)).length, 240);
});

test('the page: the row is in Settings, the game keeps the note and sends it, and the words are French', () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  const game = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../web/sw.js', import.meta.url), 'utf8');
  assert.match(html, /id="reportSend"/); assert.match(html, /id="reportNow"/);
  assert.ok(html.indexOf('id="reportGroup"') < html.indexOf('<span class="eyebrow">Privacy</span>'));
  assert.match(game, /from '\.\/report\.js'/); assert.match(game, /\$\('#reportSend'\)\.addEventListener/);
  assert.match(sw, /'\.\/report\.js'/);
  const i = makeI18n({ doc: null, lang: 'fr' });
  for (const w of ['Something wrong?', 'Tell us what went wrong', ROW_NONE, 'the game has met 1 problem since it opened', 'the game has met 3 problems since it opened',
    'Shared — add a line about what happened', 'Copied — paste it into your message, with a line about what happened', 'Could not copy it here'])
    assert.notEqual(i.t(w), w, w);
});
