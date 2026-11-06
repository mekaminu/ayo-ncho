// A move kept for the line (idea 6 Nov, night): family in Nigeria play on 3G that drops for a few seconds at a time, and a
// move played with a friend in that gap went nowhere — the second tap said "No connection right now — reconnecting" and
// the pit had to be found and played again once the room came back. Now, while the room is reconnecting and it is your
// move, the second tap keeps the move: the pit stays lit with its marks, the line says it goes when the line is back, and
// the moment the room is back (the seat rejoined, the board as the server has it) it is sent by itself — but only if the
// game is exactly where it was when you played it (same move count, still your move, the pit still allowed). Anything else
// (the game ended, a take-back, a draw agreed, the pit barred now) drops it and says so; nothing is ever played that the
// board did not show you. The same pit again (or Esc) keeps it back; another pit picks that one instead.
// Pure functions, no DOM; the engine decides what is allowed.
import { sideOf } from '../engine/ayo.js';

// may the second tap keep a move rather than send it? only seated in a room, the line down, a friend across, your move
export function mayHold({ online = false, seated = false, status = 'open', friend = false, over = false, turn, you } = {}) {
  return !!(online && seated && friend && !over && turn === you && status !== 'open');
}

// the move kept: the pit and the position it was played on (its move count)
export function holdMove(state, pit, you) { return { pit, n: state.moves.length, seat: you }; }

// the room is back: what to do with the kept move. `legal` is the engine's legalMoves on the board now.
// → null (nothing kept) · { act: 'send', pit } · { act: 'drop', pit, why: 'over' | 'moved' | 'barred' }
export function releaseOf(held, state, you, legal = []) {
  if (!held) return null;
  const { pit } = held;
  if (!state || state.over) return { act: 'drop', pit, why: 'over' };
  if (held.seat !== you || state.moves.length !== held.n || state.turn !== you) return { act: 'drop', pit, why: 'moved' };
  if (!legal.includes(pit)) return { act: 'drop', pit, why: 'barred' };
  return { act: 'send', pit };
}

const num = (pit, you) => sideOf(you).indexOf(pit) + 1;

// the words: the hint line while kept, the toasts as it is kept, sent, dropped or kept back
export function heldWords(kind, pit, you = 0, { keys = false } = {}) {
  const k = num(pit, you);
  switch (kind) {
    case 'hint': return `No signal · pit ${k} goes as soon as the line is back — ${keys ? 'Esc' : `tap pit ${k} again`} to keep it back`;
    case 'kept': return 'No signal — your move is kept and goes when the line is back';
    case 'sent': return `Back online — your pit ${k} went`;
    case 'over': return `Back online — the game ended meanwhile; pit ${k} was not played`;
    case 'moved': return `Back online — the board moved on; pit ${k} was not played`;
    case 'barred': return `Back online — pit ${k} can't be played now`;
    case 'cancel': return 'Kept back — pick a pit when you are ready';
    default: return '';
  }
}
