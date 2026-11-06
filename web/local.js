// Two of us on one phone (pass-and-play): both players share the phone, or the Fold lies flat between them. No computer plays.
// Nobody is "you" for long — the seat to move is always the near one; after every move the board swings round to face the
// next player (Settings → Feel → Pass the phone; off when the phone lies flat and each side already has its pits nearest it).
// Pure helpers, no DOM, tested in node (test/local.test.js). The rules stay in engine/ayo.js.

export const NAMES = ['Player 1', 'Player 2'];
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

// Continue on Home: where the shared game stands, from Player 1's side
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
export const TABLE_START = 'Player 1 this end · Player 2 across the table';
