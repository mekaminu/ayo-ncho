// Ask for a rating, at the right moment (idea 7 Nov): a new game in the stores lives or dies by its first reviews, and the
// people who leave one unasked are mostly the cross ones. The store apps' own way to ask is the stores' review sheet — Apple's
// SKStoreReviewController / AppStore.requestReview and Google Play's In-App Review — five stars and a line, without leaving the
// game. We never draw a "Do you like us?" box of our own (Apple's rules forbid sending only happy players to the store anyway);
// we only choose a kind moment to let the phone show its sheet:
//   - only in the store apps (the web link has no store to rate in);
//   - only on the Game over card of a game you WON, against the computer or a friend in a room (never after a loss or a draw,
//     never in two of us, the lesson, the daily puzzle or a play-out from it);
//   - only once you have won RULES.wins games against the computer and played on RULES.days different days (never on the
//     first evening, never a first game);
//   - at most RULES.most times on this phone, at least RULES.gapDays days apart.
// The phone itself has the last word: Apple shows its sheet at most three times a year and Google rations its own, so a
// request may show nothing — which is why it is never tied to a button. Nothing is sent anywhere by us; the stars and the words
// go to the store. The sheet comes RULES.delayMs after the card, once the card's own word has landed, and only if the card is
// still open and the app on screen.
//
// The plugin is @capacitor-community/in-app-review 8 (MIT, free, Capacitor 8; Google's Play Core review library on Android,
// StoreKit on iOS). Pure, no DOM: tested in node (test/askrate.test.js).

import { LEVELS } from './record.js';

export const RULES = { wins: 3, days: 3, most: 3, gapDays: 120, delayMs: 1800 };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function parseAsked(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!s || typeof s !== 'object') return { n: 0, last: null };
    const n = Number.isInteger(s.n) && s.n >= 0 ? s.n : 0;
    return { n, last: typeof s.last === 'string' && DAY.test(s.last) ? s.last : null };
  } catch { return { n: 0, last: null }; }
}

// whole days from one 'YYYY-MM-DD' to another (the phone's own calendar days)
export function daysBetween(a, b) {
  const t = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

// every win against the computer on this phone (web/record.js)
export function winsOf(records) { return LEVELS.reduce((n, k) => n + ((records && records[k] && records[k].w) || 0), 0); }

// Is this Game over card the moment to ask? Returns { ask, why } — why names the first rule that said no (for the tests and
// the render check), or 'ask'.
//   app      the review plugin is there (the store apps)
//   result   'win' | 'loss' | 'draw' for this phone's player
//   kind     'computer' | 'room' | 'local' | 'puzzle' | 'playout' | 'lesson'
//   wins     wins against the computer so far, this game counted
//   days     days played on this phone (web/streak.js)
//   asked    parseAsked(...) of what was asked before;  today  'YYYY-MM-DD'
export function shouldAsk({ app, result, kind, wins = 0, days = 0, asked = { n: 0, last: null }, today }) {
  if (!app) return { ask: false, why: 'web' };
  if (kind !== 'computer' && kind !== 'room') return { ask: false, why: 'kind' };
  if (result !== 'win') return { ask: false, why: 'result' };
  if (wins < RULES.wins) return { ask: false, why: 'wins' };
  if (days < RULES.days) return { ask: false, why: 'days' };
  if (asked.n >= RULES.most) return { ask: false, why: 'most' };
  if (asked.last && today && daysBetween(asked.last, today) < RULES.gapDays) return { ask: false, why: 'gap' };
  return { ask: true, why: 'ask' };
}

export function markAsked(asked, today) { return { n: (asked.n || 0) + 1, last: today }; }

// The asker the game holds: `plugin` is the InAppReview plugin (or the test stand-in), absent on the web link.
// request() is counted before the phone answers: whether a sheet showed is the phone's to know, never ours.
export function makeAsker(plugin) {
  return {
    supported: !!(plugin && typeof plugin.requestReview === 'function'),
    async request() {
      if (!this.supported) return false;
      try { await plugin.requestReview(); return true; } catch { return false; }
    },
  };
}

// The stand-in for the render check (?rate=test): records each request, shows nothing.
export function testReview() {
  const calls = [];
  return { calls, async requestReview() { calls.push(Date.now()); } };
}
