// The rematch, remembered (idea 8 Nov): a game against the computer ended and the next one against the same opponent began
// with their usual "Sit well" or a greeting for the hour, as if the last game had never happened — at a real board the person
// across from you says something about the one you just played: the cousin wants his revenge, the child says it was practice.
// Now a game started within REMATCH_MIN minutes of the end of one against the same opponent opens with their word for how it
// went: you won (`againWon`), you won by WIDE seeds or more (`againWonBig`), they won (`againLost`), or a draw (`againDrew`).
// It takes the place of the greeting for the hour (a rematch is the more particular thing to say), never of the word for
// coming back after days away. Each finished game is answered once (its start time is its id), so a reload or a second
// new game says the usual line. Pure functions (no DOM) so they can be unit-tested in node.

export const REMATCH_MIN = 20; // minutes after the end of a game that the next one is still a rematch
export const WIDE = 10; // a win by this many seeds or more is a big one
export const MOMENTS = ['againWon', 'againWonBig', 'againLost', 'againDrew'];

// What to keep when a game against `level` ends: you `a`, them `b` (their troughs), `id` the game's start time, `at` now (ms).
export function keep(level, a, b, id, at) {
  return JSON.stringify({ level, a: +a || 0, b: +b || 0, id: id == null ? null : String(id), at: +at || 0 });
}

export function parse(raw) {
  try { const o = typeof raw === 'string' ? JSON.parse(raw) : raw; return o && typeof o === 'object' && typeof o.level === 'string' && Number.isFinite(o.at) ? o : null; }
  catch { return null; }
}

// The moment a game against `level` opens with, or null when it is not a rematch: `last` is what keep() stored, `now` ms,
// `answered` the id of the last game already answered.
export function rematchMoment(last, level, now, answered = null) {
  const l = parse(last); if (!l || l.level !== level) return null;
  const gap = (+now - l.at) / 60000; if (!(gap >= 0) || gap > REMATCH_MIN) return null;
  if (l.id != null && answered != null && String(answered) === l.id) return null;
  if (l.a > l.b) return l.a - l.b >= WIDE ? 'againWonBig' : 'againWon';
  if (l.a < l.b) return 'againLost';
  return 'againDrew';
}
