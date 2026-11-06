// Set the board straight (idea 6 Nov): a drag turns and tilts the board, a pinch or the wheel brings it nearer or farther,
// and nothing put it back — a board left at an odd angle stayed that way until the phone was turned or the page reloaded.
// Now a double-tap on the wood (a double-click on the Mac, or the 0 key) glides it back to where it stands at the start
// of a game: facing whoever holds the near seat, the tilt and distance the screen's own framing chose. The first time a
// drag or a pinch leaves it well off, a toast says how to put it back, once on a phone.
// Pure helpers, no DOM, tested in node (test/view.test.js). The board's framing itself stays in web/game.js.

export const TAU = Math.PI * 2;
export const DOUBLE = { ms: 340, px: 30 }; // two taps this close in time and place are a double-tap
export const OFF = { turn: 0.2, tilt: 0.1, zoom: 0.1 }; // how far from rest the board must be before it counts as moved

// the facing nearest the angle the board is at: the seat's angle (0, or π for the far seat) plus whole turns, the shortest way
export function restTheta(theta, base = 0) { return base + Math.round((theta - base) / TAU) * TAU; }

// the view the board rests at, for the angle it is at now
export function restOf(v, fit) { return { theta: restTheta(v.theta, fit.base || 0), phi: fit.phi, dist: fit.dist }; }

// how far the view is from rest: the turn and the tilt in radians, the zoom as a ratio (log, so nearer and farther weigh the same)
export function offBy(v, fit) {
  const r = restOf(v, fit);
  return { turn: Math.abs(v.theta - r.theta), tilt: Math.abs(v.phi - r.phi), zoom: Math.abs(Math.log(Math.max(1e-6, v.dist) / Math.max(1e-6, r.dist))) };
}
export function isOff(v, fit) { const o = offBy(v, fit); return o.turn > OFF.turn || o.tilt > OFF.tilt || o.zoom > OFF.zoom; }

// how long the glide back takes: longer the farther it has to go, never a jump and never a wait (380–900 ms)
export function glideMs(v, fit) {
  const o = offBy(v, fit); const far = Math.max(o.turn / Math.PI, o.tilt / 0.6, o.zoom / 0.7);
  return Math.round(380 + 520 * Math.min(1, far));
}

// the view part-way along the glide (t from 0 to 1, already eased): each of the three moves on its own line
export function glideAt(from, to, t) {
  return { theta: from.theta + (to.theta - from.theta) * t, phi: from.phi + (to.phi - from.phi) * t, dist: from.dist * Math.pow(to.dist / from.dist, t) };
}

// whether a tap on the wood is the second of a double-tap: {t, x, y} of the last tap on the wood (or null) and of this one
export function isDoubleTap(prev, now) {
  if (!prev || !now) return false;
  const dt = now.t - prev.t; return dt >= 0 && dt <= DOUBLE.ms && Math.hypot(now.x - prev.x, now.y - prev.y) <= DOUBLE.px;
}

// may the board be set straight now: on the board (not a screen, not the clip, which keeps its own camera), and not while
// a tap would hurry a turn instead (that tap is the turn's)
export function mayStraighten({ screen = false, clipping = false, hurrying = false, idle = false } = {}) { return !screen && !clipping && !hurrying && !idle; }

// the toast that says how, once on a phone: a finger, the mouse (and the keys) on the Mac
export function tipWords({ mouse = false } = {}) {
  return mouse ? 'Double-click the wood, or press 0, to set the board straight' : 'Double-tap the wood to set the board straight';
}
