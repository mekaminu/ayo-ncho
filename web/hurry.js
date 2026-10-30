// Tap to hurry: while a turn is playing on the board, a tap on the board (or Space / Enter on the Mac) plays the rest of
// that turn several times faster — every seed still moves and every score still ticks, just quicker — and the next turn
// is back at your sowing speed. Pure helpers here (tested in test/hurry.test.js); game.js does the tapping and the seeds.

export const HURRY = 5; // how much faster the rest of the turn goes
export const HURRY_FLY_MS = 70; // a hurried seed flies pit to pit in a quick arc instead of the full drop-and-bounce

// a wait or a tween's length, hurried or not (never below a frame's worth so the order of events is kept)
export function hurried(ms, on, factor = HURRY) {
  if (!on) return ms;
  return Math.max(ms > 0 ? 8 : 0, Math.round(ms / factor));
}

// a tween already in flight when the tap comes: what is left of it runs `factor` times faster.
// Returns the new total length to give it, so that (now - t0) / ms carries on smoothly from where it was.
export function squeeze({ t0, ms }, now, factor = HURRY) {
  const done = Math.max(0, now - t0); if (done >= ms) return ms;
  return done + (ms - done) / factor;
}

// is this turn long enough to offer the hurry in words? (a relay, or a hand that sows a dozen seeds or more, or a capture
// carried to the trough on a turn of 8+ seeds). Short turns can still be hurried with a tap; the line just is not shown.
export function longTurn(events) {
  let drops = 0, relays = 0, caps = 0;
  for (const e of events || []) { if (e.type === 'drop') drops++; else if (e.type === 'pickup' && e.relay) relays++; else if (e.type === 'capture') caps++; }
  return relays > 0 || drops >= 12 || (caps > 0 && drops >= 8);
}

// may this tap hurry? only while a turn is playing on the board, never while a clip is recorded (it has its own timing),
// never twice for one turn, and not while a screen covers the board
export function canHurry({ animating = false, clipping = false, screen = false, already = false } = {}) {
  return animating && !clipping && !screen && !already;
}

// the words under the board while a long turn plays: the line the turn already had (if any), and how to hurry it
export function hurryWords(base = '', { keys = false, on = false } = {}) {
  const ask = on ? 'hurrying…' : keys ? 'click the board or press Space to hurry' : 'tap the board to hurry';
  return base ? `${base} · ${ask}` : ask;
}
