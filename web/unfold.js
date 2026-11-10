// The Fold opens, the board glides (idea 10 Nov): opening the Fold mid-game (folded ~390px wide, open ~800px), turning a phone
// on its side or half folding it, or dragging a Mac window from narrow to wide changes the screen's shape, and the board was
// framed afresh in one jump — a new tilt, a new distance, sometimes a quarter turn (on its side) or back to facing you (wide),
// all in a single frame, so a player lost sight of the seeds they were counting. Now a change of shape glides the board from
// where it was to where the new screen wants it, about half a second, the way Look from above and Left hand already do.
// Small changes (the browser's bar sliding away, the keyboard) still reframe at once: only a real change of shape glides.
// Pure helpers, no DOM, tested in node (test/unfold.test.js). The framing itself stays in web/game.js (frame / resize).

export const UNFOLD_MS = 520;
export const WIDER = 0.15; // the width must change by more than this share before a resize counts as a new shape

const TAU = Math.PI * 2;

// what a resize is judged on: the canvas's size and the three layouts the game frames for
export function shapeOf(w, h, { wide = false, side = 0, table = null } = {}) { return { w, h, wide: !!wide, side: side || 0, table: !!table }; }

// glide only between two real shapes: never on the first framing, never with Reduce motion, never for a height-only change
export function shouldGlide(prev, next, { reduce = false } = {}) {
  if (!prev || !next || reduce) return false;
  if (!(prev.w > 0 && prev.h > 0 && next.w > 0 && next.h > 0)) return false;
  if (prev.wide !== next.wide || prev.side !== next.side || prev.table !== next.table) return true;
  return Math.abs(next.w - prev.w) / prev.w > WIDER;
}

// where the glide starts: the board seen exactly as it was (the old quarter turn folded into the turn), turned the shortest way
// round to where it ends, so it never spins more than half a turn
export function glideStart(from, to) {
  let theta = from.theta + (from.side || 0) - (to.side || 0);
  theta -= Math.round((theta - to.theta) / TAU) * TAU;
  return { theta, phi: from.phi, dist: from.dist, x: from.x || 0, y: from.y || 0 };
}

// the glide's own clock: a slow frame (the first one after the screen changes size is the heaviest — a new picture to draw at
// the new size) counts for at most STEP_MAX ms, so it can never eat the glide and leave it a jump after all
export const STEP_MAX = 50;
export function glideClock(ms, t0) {
  let last = t0, done = 0;
  return { tick(now) { const dt = Math.max(0, Math.min(STEP_MAX, now - last)); last = Math.max(last, now); done += dt; return ms > 0 ? Math.min(1, done / ms) : 1; } };
}

// the view at t (0..1, already eased): turn, tilt and the picture's place in a straight line, the distance as a ratio
export function unfoldAt(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return {
    theta: a.theta + (b.theta - a.theta) * k,
    phi: a.phi + (b.phi - a.phi) * k,
    dist: a.dist * Math.pow(b.dist / a.dist, k),
    x: a.x + ((b.x || 0) - a.x) * k,
    y: a.y + ((b.y || 0) - a.y) * k,
  };
}
