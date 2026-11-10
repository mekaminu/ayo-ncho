// Whose move, for the family watching (idea 10 Nov, late night): a watcher's board lights the card to move and answers a tap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { turnSide, glowPits, watchTap, WATCH_WORDS } from '../web/turncue.js';
import { translate } from '../web/i18n.js';

test('a watcher sees the card to move lit: the host (seat 0) at the bottom, their friend at the top', () => {
  assert.equal(turnSide({ turn: 0, near: 0 }), 'near', "Meka's move");
  assert.equal(turnSide({ turn: 1, near: 0 }), 'far', "Tete's move");
  assert.equal(turnSide({ turn: 0, near: 0, playing: 1 }), 'far', "Tete's seeds still flying: her card stays lit");
  assert.equal(turnSide({ turn: 1, near: 0, playing: 0 }), 'near', "Meka's seeds still flying: his card stays lit");
  assert.equal(turnSide({ turn: 1, near: 0, over: true }), null, 'the game over');
  assert.deepEqual(glowPits({ side: 'near', canPress: false, legal: [0, 1, 2] }), [], 'no pit glows on a watcher\'s board: nothing to press');
});

test("a watcher's tap: the card to move pulses and the line says whose move, and that it is their game", () => {
  const a = watchTap({ side: 'far', name: 'Tete' });
  assert.deepEqual(a, { kind: 'watching', words: `Tete's move · ${WATCH_WORDS}`, pulse: 'far' });
  const b = watchTap({ side: 'near', name: 'Meka' });
  assert.equal(b.pulse, 'near'); assert.equal(b.words, "Meka's move · it's their game, you're watching");
  assert.equal(watchTap({ side: 'near' }).words, `their move · ${WATCH_WORDS}`);
  assert.equal(watchTap({ side: null, name: 'Tete' }).kind, null, 'the game over, or a room still waiting for a friend');
  assert.equal(watchTap().kind, null);
});

test('in French', () => {
  assert.equal(translate(watchTap({ side: 'far', name: 'Tete' }).words, 'fr'), 'à Tete de jouer · c’est leur partie, vous regardez');
});

test("the board wires it: a watcher's board is no longer quiet once both players sit, and its taps and keys ask whose move", () => {
  const g = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  assert.match(g, /const turnQuiet = \(\) => [^\n]*spect\.on \? !\(spect\.room && spect\.room\.players && spect\.room\.players\[1\]\)/);
  assert.match(g, /turnCue\.side === 'far' \|\| spect\.on\)\) whoseTap\(p\)/, 'a tap');
  assert.match(g, /if \(turnCue\.side === 'far' \|\| spect\.on\) whoseTap\(a\.pit\)/, 'a key 1–6 on the Mac');
  assert.match(g, /watchTap\(\{ side: turnCue\.side, name: spectateCards\(spect\.room\)\[state\.turn\]\.name \}\)/);
  const h = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  assert.match(h, /\.hud\.bottom\.turn\.poke \.sub\{animation:turnPoke/, 'the bottom card pulses too');
  assert.match(h, /prefers-reduced-motion:reduce\)\{[^}]*\.hud\.bottom\.turn\.poke \.sub\{animation:none\}/, 'Reduce motion: words, no pulse');
});
