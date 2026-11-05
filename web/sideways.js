// A phone held sideways (idea 5 Nov). Held upright the board stands up the screen, seen from its end, as approved. Turned on
// its side, a phone (the Fold folded, ~844 × 390) left the board standing up a screen only 390 px tall: a narrow strip in the
// middle, pits ~35 px apart. Now a short, wide screen sees the board from its long side, lying across the screen with your
// row of six nearest you — how two people sit at a real Ayo board — and the board comes out about twice the size.
// Pure, no DOM; tested in test/sideways.test.js. The camera adds the angle to the seat's own (game.js placeCam).

export const SIDE_MAX_H = 520;   // a screen this short or shorter (CSS px) …
export const SIDE_MIN_RATIO = 1.5; // … and at least this much wider than tall: a phone on its side, a short laptop window
export const SIDE_PHI = 0.5;     // the same look down onto the board as the Mac's

// the quarter turn the camera adds to the seat's angle: π/2 sideways (the camera then stands at +x, the side of seat 0's
// pits, so your row is nearest you; the seat's own half turn still swings it round to the far side), else 0.
// `force` is ?sideways= on the page: '1' always (to compare), '0' never.
export function sidewaysAngle(w, h, force = null) {
  if (force === '0') return 0;
  if (force === '1') return Math.PI / 2;
  return isSideways(w, h) ? Math.PI / 2 : 0;
}
export function isSideways(w, h) { return w > 0 && h > 0 && h <= SIDE_MAX_H && w >= h * SIDE_MIN_RATIO; }
