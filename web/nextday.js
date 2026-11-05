// The next puzzle (idea 5 Nov): the daily puzzle changes at midnight on the phone's own clock, but nothing said when — the
// result card said "Solved" and stopped, and a page left open on Home past midnight kept showing yesterday's ask until it was
// reloaded. Wordle, the NYT games and Lichess's daily puzzle all show how long until the next one. Now the result card carries
// a quiet line under your best and your run: once today's is solved (or shown) "Next puzzle in 5 h 12 min"; while it is still
// open "5 h 12 min left to solve today's"; it ticks on the minute while the card is up, and when midnight comes with the card
// still up it turns brass and glints, "Tomorrow's puzzle is here · tap to play it", and a tap sets up the new day's position.
// The Home card paints itself afresh at midnight too (the new day's ask, "not yet played"). Pure functions, tested in node.

import { todayKey } from '../engine/puzzle.js';

// The next local midnight after `now` (a Date or ms): the day the puzzle key changes. new Date(y, m, d + 1) keeps to the
// phone's calendar, so a clock change (a 23- or 25-hour day) still lands on midnight.
export function nextMidnight(now = Date.now()) {
  const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}
export function msToNext(now = Date.now()) { return Math.max(0, nextMidnight(now) - now); }

// "5 h 12 min", "42 min", "under a minute": whole minutes left (the last one is "under a minute", never "0 min"), so the
// words change exactly on the clock's minute, as midnight is on one.
export function spanWords(ms) {
  if (ms < 60000) return 'under a minute';
  const mins = Math.floor(ms / 60000); const h = Math.floor(mins / 60), m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// The line on the result card. `e`: today's entry on this phone (daily.js), `key`: the puzzle on the card, `now`.
// Returns { text, ready } — ready once the day has turned and the card's puzzle is no longer today's.
export function nextLine(e, key, now = Date.now()) {
  if (key && key !== todayKey(new Date(now))) return { text: "Tomorrow's puzzle is here · tap to play it", ready: true };
  const span = spanWords(msToNext(now));
  if (e && (e.solved || e.shown)) return { text: span === 'under a minute' ? 'Next puzzle in under a minute' : `Next puzzle in ${span}`, ready: false };
  return { text: span === 'under a minute' ? "Under a minute left to solve today's" : `${span} left to solve today's`, ready: false };
}

// When to look again: just after the next minute boundary (so "12 min" becomes "11 min" on the minute), and never past
// midnight (so the turn of the day is seen the moment it comes). In ms from `now`.
export function nextTick(now = Date.now()) {
  const toMinute = 60000 - (now % 60000) + 50;
  return Math.max(250, Math.min(toMinute, msToNext(now) + 50));
}

// Whether the Home card's puzzle is yesterday's: the key it was painted for against today's.
export function dayTurned(paintedKey, now = Date.now()) { return !!paintedKey && paintedKey !== todayKey(new Date(now)); }
