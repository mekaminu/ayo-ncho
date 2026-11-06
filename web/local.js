// Two of us on one phone (pass-and-play): both players share the phone, or the Fold lies flat between them. No computer plays.
// Nobody is "you" for long — the seat to move is always the near one; after every move the board swings round to face the
// next player (Settings → Feel → Pass the phone; off when the phone lies flat and each side already has its pits nearest it).
// Pure helpers, no DOM, tested in node (test/local.test.js). The rules stay in engine/ayo.js.

export const DEFAULT_NAMES = ['Player 1', 'Player 2'];
// the two names in use — Player 1 and Player 2 until the players type their own (Settings → Opponent → Two of us → Our names);
// one array, changed in place, so every module that imported it sees the names of the moment
export const NAMES = [...DEFAULT_NAMES];
export const NAME_MAX = 16;

// a typed name as it is kept and shown: no control characters or angle brackets, spaces closed up, at most NAME_MAX letters
// (counted as the eye counts them, so an accented letter or an emoji is one); empty → '' (the default name is used)
export function cleanName(v) {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  return [...s].slice(0, NAME_MAX).join('').trim();
}
// the two names from what was typed (or kept): an empty one is Player 1 / Player 2, and two the same (whatever the case)
// would leave nobody able to tell whose turn it is, so the second then keeps its default
export function namesFrom(a, b) {
  const x = cleanName(a) || DEFAULT_NAMES[0]; let y = cleanName(b) || DEFAULT_NAMES[1];
  if (y.toLowerCase() === x.toLowerCase()) y = x.toLowerCase() === DEFAULT_NAMES[1].toLowerCase() ? DEFAULT_NAMES[0] : DEFAULT_NAMES[1];
  return [x, y];
}
export function setNames(a, b) { const n = namesFrom(a, b); NAMES[0] = n[0]; NAMES[1] = n[1]; return [...NAMES]; }
// what is kept on the phone: the typed names only ('' for a default), as JSON; anything unreadable reads as no names
export function keepNames(a, b) { return JSON.stringify([cleanName(a), cleanName(b)]); }
export function readNames(raw) {
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? [cleanName(v[0]), cleanName(v[1])] : ['', '']; } catch { return ['', '']; }
}
export const named = (seat) => NAMES[seat] !== DEFAULT_NAMES[seat];
// the far card's face: the player's number on a brass ring, or the first letter of the name they typed
export const faceMark = (seat) => named(seat) ? NAMES[seat] : String(seat + 1);
// the small line under the Home pill: "on this phone", or the two names once typed ("Meka & Tete")
export const pillLine = () => named(0) || named(1) ? `${NAMES[0]} & ${NAMES[1]}` : 'on this phone';
export const TAU = Math.PI * 2;

// the seat whose pits should be nearest: the player to move (at the end of the game, whoever would have moved next)
export function seatOf(state) { return state.turn === 1 ? 1 : 0; }

// the camera angle that faces `seat`, reached by turning on in the same direction from `theta` (never back the way it came):
// seat 0 faces from 0 (plus whole turns), seat 1 from π; the nearest such angle at or beyond the angle we are at
export function swingTheta(theta, seat) {
  const base = seat === 1 ? Math.PI : 0;
  let to = base + Math.round((theta - base) / TAU) * TAU;
  if (to < theta - 1e-9) to += TAU; // always forward, like turning a real board round
  return to;
}

// which way a pit's count badge sits: at the outer, nearer corner as the camera sees it (the camera, not the seat, decides)
export function badgeFlip(theta) { return Math.cos(theta) < 0 ? -1 : 1; }

// the HUD words for the near seat, who is always the player to move
export function turnWords(state) { return state.over ? { turn: 'game over', sub: '' } : { turn: 'your move', sub: 'waiting' }; }

// the Game over card's title
export function overTitle(state) { return state.winner === 'draw' ? 'A draw' : `${NAMES[state.winner]} wins`; }

// Continue on Home: where the shared game stands, from the first player's side
export function continueLine(s) {
  const [a, b] = s.stores; const lead = a > b ? `${NAMES[0]} leads` : b > a ? `${NAMES[1]} leads` : 'level';
  return `Two of us · ${lead} ${a} – ${b} · ${s.moves.length} moves in`;
}

// Undo takes back one move: the player who just played has it again (against the computer two moves go, theirs and yours)
export function undoTo(moves) { return moves.slice(0, -1); }

// the words shared from the Game over card
export function shareText(state) {
  const [a, b] = state.stores; const n = state.moves.length;
  if (state.winner === 'draw') return `Ayo & Nchò — ${NAMES[0]} and ${NAMES[1]} drew ${a}–${b} in ${n} moves, both on one phone.`;
  const w = state.winner, l = 1 - w;
  return `Ayo & Nchò — ${NAMES[w]} beat ${NAMES[l]} ${state.stores[w]}–${state.stores[l]} in ${n} moves, both on one phone.`;
}

// the line under Play on Home, and the Settings row's words
export const PLAY_SUB = 'Two of us · pass the phone';

// Across the table (Pass the phone off: the phone or the Fold lies flat between the two players and the board never turns).
// Each name card stays with its player — the near card belongs to whoever's pits are nearest the near edge as the camera
// sees it, the far card (turned to face across the table) to the other — and "your move" goes to whichever card is to move.
// While the far player is to move, the hint line and the words under the board turn round to face them too (farTurn).
export function nearSeatAt(theta) { return Math.cos(theta) >= 0 ? 0 : 1; }
export function tableCards(state, near) {
  const far = 1 - near, mover = state.turn === 1 ? 1 : 0, over = !!state.over;
  const word = (s) => over ? (s === near ? 'game over' : '') : s === mover ? 'your move' : 'waiting';
  return { near: { seat: near, name: NAMES[near], turn: word(near) }, far: { seat: far, name: NAMES[far], sub: word(far) }, farTurn: !over && mover === far };
}
export const tableStart = () => `${NAMES[0]} this end · ${NAMES[1]} across the table`;
