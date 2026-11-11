import test from 'node:test';
import assert from 'node:assert/strict';
import { yourMoveCue, CUE_TAPS, CUE_BUZZ, turnSide } from '../web/turncue.js';

const theirs = { from: 'far', to: 'near', lastBy: 1, you: 0, played: true };

test('your move, felt: their seeds settle and the move comes over to you', () => {
  assert.equal(yourMoveCue(theirs), true);
  assert.equal(yourMoveCue({ ...theirs, you: 1, lastBy: 0 }), true, 'the far seat of a room');
});

test('never without their move: a game opening on yours, a saved game, an Undo while they think', () => {
  assert.equal(yourMoveCue({ ...theirs, from: null }), false, 'a game opens, or comes back, on your move');
  assert.equal(yourMoveCue({ ...theirs, played: false }), false, 'Undo while they think');
  assert.equal(yourMoveCue({ ...theirs, lastBy: 0 }), false, 'the last move was yours');
  assert.equal(yourMoveCue({ ...theirs, lastBy: null }), false, 'no move at all');
  assert.equal(yourMoveCue({ ...theirs, from: 'near', to: 'far' }), false, 'the move going over to them');
  assert.equal(yourMoveCue({ ...theirs, to: null }), false, 'a puzzle, the lesson, the game over');
});

test('never on a shared phone, for a watcher, at the game over or out of sight', () => {
  for (const k of ['shared', 'watching', 'over', 'hidden']) assert.equal(yourMoveCue({ ...theirs, [k]: true }), false, k);
  assert.equal(yourMoveCue(), false);
});

test('the cue follows the lit card: not while their seeds still fly', () => {
  const during = turnSide({ turn: 0, near: 0, playing: 1 }), after = turnSide({ turn: 0, near: 0 });
  assert.equal(during, 'far'); assert.equal(after, 'near');
  assert.equal(yourMoveCue({ ...theirs, from: during, to: during }), false);
  assert.equal(yourMoveCue({ ...theirs, from: during, to: after }), true);
});

test('quieter than a seed: two light knocks rising, one light buzz', () => {
  assert.equal(CUE_TAPS.length, 2);
  assert.ok(CUE_TAPS[1][0] > CUE_TAPS[0][0], 'rising');
  for (const [p, g, ms] of CUE_TAPS) { assert.ok(p > 0 && g > 0 && g < 0.12, 'under a seed'); assert.ok(ms >= 0 && ms < 200); }
  assert.ok(CUE_BUZZ > 0 && CUE_BUZZ <= 20);
});
