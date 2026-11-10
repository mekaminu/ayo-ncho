import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counts, tookBack, unratedWords, UNDO_NOTE } from '../web/rated.js';
import { rate, parse } from '../web/rating.js';
import { translate } from '../web/i18n.js';

test('a game without a take-back is rated, an old save too', () => {
  assert.equal(counts({ biggest: 0, captures: 0, started: 1 }), true);
  assert.equal(counts({ undos: 0 }), true);
  assert.equal(counts(null), true);
  assert.equal(counts({ undos: 1 }), false);
});

test('the note comes once, on the first take-back of a rated game', () => {
  let s = { biggest: 3, captures: 1, started: 7 };
  let r = tookBack(s); assert.equal(r.note, true); assert.equal(r.stats.undos, 1); assert.equal(r.stats.biggest, 3); assert.equal(s.undos, undefined);
  r = tookBack(r.stats); assert.equal(r.note, false); assert.equal(r.stats.undos, 2);
  assert.equal(tookBack({}, false).note, false); // two of us, a play-out: never said
  assert.equal(counts(r.stats), false);
});

test('the card line names how many', () => {
  assert.equal(unratedWords({ undos: 1 }), 'Not rated · you took back a move');
  assert.equal(unratedWords({ undos: 3 }), 'Not rated · you took back 3 moves');
});

test('an unrated game leaves the rating where it was', () => {
  const before = parse(JSON.stringify({ r: 1042, n: 12, last: 5, change: 8 }));
  const stats = tookBack({ started: 9 }).stats;
  const after = counts(stats) ? rate(before, 'hard', 25, 10, stats.started).data : before;
  assert.deepEqual(after, before);
});

test('French', () => {
  assert.equal(translate(UNDO_NOTE, 'fr'), 'Coup repris · une victoire ou une nulle ne comptera plus pour votre classement, une défaite si');
  assert.equal(translate(unratedWords({ undos: 1 }), 'fr'), 'Non classée · vous avez repris un coup');
  assert.equal(translate(unratedWords({ undos: 4 }), 'fr'), 'Non classée · vous avez repris 4 coups');
});
