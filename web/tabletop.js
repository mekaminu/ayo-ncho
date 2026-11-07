// The Fold as a little table (idea 7 Nov). Opened out on its side and half folded — Samsung's Flex mode, the way it stands
// on a table like a small laptop — the game used to draw one picture straight across the crease: half the board on the
// half lying flat, half on the half standing up, bent in the middle. Now the board lies on the flat half, seen from above
// as a board lying on a table is, your row nearest you; the faces, the scores, the words and the buttons stand up on the
// upper half, where you look across to the other player. The browser says where the crease is (the Viewport Segments
// API: window.viewport.segments, two screens one above the other); ?table=1 makes a crease across the middle of any
// screen (to compare, and for tools/render.py --table), ?table=0 never.
// Pure, no DOM; tested in test/tabletop.test.js. game.js frames the board in tableRoom and stands the camera at TABLE_PHI.

export const TABLE_MIN = 150; // each half at least this tall (CSS px): smaller than this, the old one picture is better
export const TABLE_PHI = 0.3; // nearly straight down onto the board: it lies on the table
export const TABLE_GAP = 12; // the board keeps this far from the crease

// where the crease is, as { top, bottom } in CSS px from the top of the page (the end of the upper half, the start of
// the lower), or null when the page is one flat screen (or the halves stand side by side, a book: the board stays whole)
export function tableFold(segments, w, h, force = null) {
  if (force === '0') return null;
  if (Array.isArray(segments) && segments.length === 2 && w > 0 && h > 0) {
    const [a, b] = [...segments].sort((p, q) => p.y - q.y);
    const across = (s) => Math.abs(s.x) <= 2 && s.width >= w - 2; // each half the whole width of the page
    const top = a.y + a.height, bottom = b.y;
    if (across(a) && across(b) && bottom >= top && a.height >= TABLE_MIN && b.height >= TABLE_MIN) return { top: Math.round(top), bottom: Math.round(bottom) };
  }
  if (force === '1' && w > 0 && h >= 2 * TABLE_MIN) { const m = Math.round(h / 2); return { top: m, bottom: m }; }
  return null;
}

// the room the board is framed in: the whole lower half, clear of the crease and the screen's edge
export function tableRoom(fold, w, h) {
  return { l: 14, r: w - 14, t: fold.bottom + TABLE_GAP, b: h - 14 };
}

// the CSS the page needs: the end of the upper half from the top, and the room under it (for things placed from the bottom)
export function tableVars(fold, h) {
  return { '--fold-top': fold.top + 'px', '--fold-up': Math.max(0, h - fold.top) + 'px' };
}
