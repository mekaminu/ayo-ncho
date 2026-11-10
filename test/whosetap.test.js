import test from 'node:test';
import assert from 'node:assert/strict';
import { tapCue, backSweep, BACK_MS, LIT_WORDS, WAIT_WORDS } from '../web/turncue.js';
import { translate } from '../web/i18n.js';

test('a tap on their pit on your move: the glow sweeps again and the line says which pits are yours', () => {
  const c = tapCue({ side: 'near', mine: false, name: 'Nnamdi' });
  assert.equal(c.kind, 'theirs'); assert.equal(c.sweep, true); assert.equal(c.pulse, false);
  assert.equal(c.words, `that's their side · ${LIT_WORDS}`);
});

test('a tap while they think: their card pulses and the line names whose move it is', () => {
  const c = tapCue({ side: 'far', mine: true, name: 'Mama Ngozi' });
  assert.equal(c.kind, 'wait'); assert.equal(c.pulse, true); assert.equal(c.sweep, false);
  assert.equal(c.words, `Mama Ngozi's move · ${WAIT_WORDS}`);
  assert.equal(tapCue({ side: 'far', mine: false }).words, `their move · ${WAIT_WORDS}`, 'no name (a shared phone): their move');
});

test('nothing on your own pit, or when nobody is to move', () => {
  assert.equal(tapCue({ side: 'near', mine: true }).kind, null, 'your own pit plays or says why it cannot');
  assert.equal(tapCue({ side: null, mine: false }).kind, null, 'a puzzle, the lesson, a game watched, the game over');
  assert.equal(tapCue().kind, null);
});

test('coming back after a while on your move sweeps the glow once; a glance away does not', () => {
  assert.equal(backSweep({ side: 'near', canPress: true, awayMs: BACK_MS }), true);
  assert.equal(backSweep({ side: 'near', canPress: true, awayMs: BACK_MS - 1 }), false, 'a glance away');
  assert.equal(backSweep({ side: 'far', canPress: false, awayMs: 60000 }), false, 'their move');
  assert.equal(backSweep({ side: 'near', canPress: true, selected: 2, awayMs: 60000 }), false, 'a pit picked: its path is showing');
  assert.equal(backSweep({ side: 'near', canPress: false, awayMs: 60000 }), false, 'a card up or a turn playing');
});

test('in French, every part of both lines', () => {
  assert.equal(translate(tapCue({ side: 'near' }).words, 'fr'), 'c’est le côté d’en face · les vôtres sont ceux qui brillent');
  assert.equal(translate(tapCue({ side: 'far', name: 'Nnamdi' }).words, 'fr'), 'à Nnamdi de jouer · vos trous s’allument quand c’est à vous');
  assert.equal(translate(tapCue({ side: 'far' }).words, 'fr'), 'à l’autre · vos trous s’allument quand c’est à vous');
});
