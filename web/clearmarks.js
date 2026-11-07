// Clear marks (idea 7 Nov): the board's marks told apart by colour alone in places — the brass rings where the seeds go, the
// copper ring round a pit you would take, the ember ring of what it leaves open — and brass, copper and ember are the colours a
// red–green colour-blind eye (about 1 man in 12) sees as one muddy yellow. Settings → Board → Clear marks (off by default, so the
// approved warm look stays) swaps them for colours every eye can part (the Okabe–Ito set made for colour-blind readers): the path
// stays a pale yellow, a pit you take goes sky blue with a second ring inside it (a shape too, so it never rests on colour alone),
// what it leaves open goes deep vermilion (already dashed), a 4 that goes to them stays bone white (already beaded), the struck
// grand slam a cool grey. The rules never change; only how the marks are painted.
//
// The colours are checked, not guessed (test/clearmarks.test.js): every pair of marks that can meet on one pit is simulated as
// seen with each of the three full colour blindnesses (Machado, Oliveira & Fernandes 2009, severity 1) and must stay apart in
// CIELAB, and every mark must stand off the darkest and the lightest board.

// The marks, by the name board.js gives them. `steps` are the brass rings where the hand sows, `dots` the brass dot in each such
// pit, `caps` a pit you would take, `gifts` a 4 that goes to the other side, `slams` the grand slam that takes nothing, `risk`
// what the move leaves open, `may` the feed rings, `hover` the mouse's ring, `ring` the picked pit's ring.
export const WARM = { steps: 0xe6b76f, dots: 0xf2c57c, caps: 0xff6e3a, gifts: 0xf3e6c8, slams: 0xc9bfae, risk: 0xff3b2b, may: 0xf0c27a, hover: 0xe6b76f, ring: 0xe6b76f };
export const CLEAR = { steps: 0xf0e442, dots: 0xf0e442, caps: 0x56b4e9, gifts: 0xffffff, slams: 0x8c8c8c, risk: 0xd55e00, may: 0xf0e442, hover: 0xf0e442, ring: 0xf0e442 };

// Marks that can sit on the same pit at once (or side by side in one path), so must never be mistaken for each other.
export const MEET = [['steps', 'caps'], ['steps', 'risk'], ['caps', 'risk'], ['caps', 'gifts'], ['caps', 'slams'], ['gifts', 'risk'], ['steps', 'gifts'], ['slams', 'risk'], ['may', 'caps'], ['dots', 'caps']];

export const clearOn = (prefs) => !!prefs && prefs.get('clear', '0') === '1';
export const marksPalette = (on) => (on ? CLEAR : WARM);
// Does the capture ring carry its inner second ring? Only with clear marks: the warm look is the approved one.
export const doubleCaps = (on) => !!on;

// Settings' own line under the switch.
export function clearNote(on) {
  return on ? 'on · blue rings for what you take, yellow for where seeds go' : 'colours every eye can tell apart, for colour-blind players';
}

// ---- seeing as a colour-blind eye does (for the tests, and for anyone checking a new mark's colour) ----
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
export const VISIONS = ['normal', 'protan', 'deutan', 'tritan'];
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
// The colour as linear RGB seen with `vision` (clamped to what a screen can show).
export function seen(hex, vision = 'normal') {
  const c = rgb(hex).map(lin); const M = MACHADO[vision]; if (!M) return c;
  return M.map((row) => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2])));
}
// CIELAB (D65) from linear RGB.
export function lab([r, g, b]) {
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X), fy = f(Y), fz = f(Z); return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
// How far apart two colours look with `vision` (CIE76 ΔE: ~2 is just noticeable, 20+ is plainly a different colour).
export function apart(a, b, vision = 'normal') {
  const A = lab(seen(a, vision)), B = lab(seen(b, vision));
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}
// The closest any two meeting marks of a palette come, over every vision: [ΔE, pair, vision].
export function closest(pal) {
  let best = [Infinity, null, null];
  for (const v of VISIONS) for (const [x, y] of MEET) { const d = apart(pal[x], pal[y], v); if (d < best[0]) best = [d, [x, y], v]; }
  return best;
}
