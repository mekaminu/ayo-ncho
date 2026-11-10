import test from 'node:test';
import assert from 'node:assert/strict';
import { turnSide, glowPits, glowOrder, GLOW, GLOW_IN_MS, GLOW_STAGGER_MS, GLOW_OUT_MS } from '../web/turncue.js';

test('the card to move: yours at the bottom, theirs at the top, nobody when nobody is', () => {
  assert.equal(turnSide({ turn: 0, near: 0 }), 'near', 'your move');
  assert.equal(turnSide({ turn: 1, near: 0 }), 'far', 'their move');
  assert.equal(turnSide({ turn: 1, near: 1 }), 'near', 'the far seat of a room, or the second player on a shared phone: still the bottom card');
  assert.equal(turnSide({ turn: 0, near: 1 }), 'far');
  assert.equal(turnSide({ turn: 0, near: 0, over: true }), null, 'the game over');
  assert.equal(turnSide({ turn: 0, near: 0, quiet: true }), null, 'a puzzle, the lesson, a game watched');
  assert.equal(turnSide({ turn: undefined, near: 0 }), null);
});

test('while a turn plays, its player\'s card stays lit: "your move" lights only when their seeds have settled', () => {
  assert.equal(turnSide({ turn: 0, near: 0, playing: 1 }), 'far', 'their seeds still moving, though the engine already says it is yours');
  assert.equal(turnSide({ turn: 1, near: 0, playing: 0 }), 'near', 'your own seeds still moving');
  assert.equal(turnSide({ turn: 0, near: 0, over: true, playing: 1 }), 'far', 'the last turn of the game, until it lands');
  assert.equal(turnSide({ turn: 0, near: 0, playing: null }), 'near');
  assert.equal(turnSide({ turn: 0, near: 0, quiet: true, playing: 1 }), null);
});

test('the pits that glow: every pit you may play, only on your move, none while a pit is picked or a turn plays', () => {
  assert.deepEqual(glowPits({ side: 'near', canPress: true, legal: [5, 0, 2, 3] }), [0, 2, 3, 5]);
  assert.deepEqual(glowPits({ side: 'near', canPress: true, legal: [7, 9] }), [7, 9], 'the far seat plays pits 6 to 11');
  assert.deepEqual(glowPits({ side: 'far', canPress: true, legal: [0, 1] }), [], 'their move');
  assert.deepEqual(glowPits({ side: 'near', canPress: false, legal: [0, 1] }), [], 'a turn still playing');
  assert.deepEqual(glowPits({ side: 'near', canPress: true, selected: 3, legal: [0, 3] }), [], 'a pit picked: its path shows instead');
  assert.deepEqual(glowPits({ side: 'near', canPress: true, legal: [1, 1, 12, -1, 2.5, 4] }), [1, 4], 'only real pits, once each');
  assert.deepEqual(glowPits({}), []);
});

test('they light along the row, the way the seeds go', () => {
  assert.deepEqual(glowOrder([0, 2, 5]), [0, 2, 5]);
  assert.deepEqual(glowOrder([11, 6, 8]), [6, 8, 11]);
  assert.ok(GLOW > 0.3 && GLOW < 0.6, 'softer than a picked pit, stronger than the last move\'s memory (0.2)');
  assert.ok(GLOW_IN_MS + 5 * GLOW_STAGGER_MS < 700, 'the whole row lit within a breath');
  assert.ok(GLOW_OUT_MS < GLOW_IN_MS);
});
