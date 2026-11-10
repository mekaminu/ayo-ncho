// Time at the board (idea 10 Nov, morning): the Game over card's Time was the clock on the wall since the game began, so a
// game against the computer kept overnight (the phone locked, the game kept, finished at breakfast) said "Time 611:42",
// and a game finished after a reload counted from whatever the phone had kept. Now Time is the time the game was played:
// the gaps between moves while the game is on screen, each counted at most GAP (a phone put down mid-game for a call
// counts three minutes, not the call), nothing while the page is hidden (another app, the phone locked), and the clock
// stops for good at the end, so the card says the same thing however often it is opened. Pure numbers, kept in the game's
// own stats (`played` ms so far, `at` = when the clock last read, or null while it is stopped), so a kept game keeps its
// time. A game kept by the build before (no `played`) counts from when it is opened again.
export const GAP = 3 * 60 * 1000;

const ok = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

// The clock read now: what has passed since it last read (at most GAP) joins `played`; `stop` leaves it stopped.
export function tick(stats, now, { stop = false } = {}) {
  const played = ok(stats && stats.played) ? stats.played : 0, at = stats && ok(stats.at) ? stats.at : null;
  const add = at === null ? 0 : Math.min(GAP, Math.max(0, now - at));
  return { played: played + add, at: stop ? null : (at === null ? null : now) };
}
// The page hidden: the clock reads once and stops. Shown again (or a kept game opened): it starts from now — unless the
// game is over (`over`), when it stays stopped.
export const pause = (stats, now) => tick(stats, now, { stop: true });
export function resume(stats, now, over = false) {
  const played = ok(stats && stats.played) ? stats.played : 0;
  return { played, at: over ? null : now };
}
// A new game's clock: nothing played, running from now.
export const fresh = (now) => ({ played: 0, at: now });

// The card's words: 0:42, 14:05, 1:02:09.
export function timeWords(ms) {
  const s = Math.max(0, Math.round((ok(ms) ? ms : 0) / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
}
