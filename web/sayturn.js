// The turn, read out (idea 6 Nov, night): for a player who cannot see the board — VoiceOver on an iPhone or the Mac,
// TalkBack on the Fold — the twelve hidden pit buttons said what each pit holds, but nothing said what a turn did once it
// was played, or what the score was. Now, when a turn has played on the board, a hidden live line says it in full
// ("Mama Ngozi played their pit 3 · picked up again twice · took 4 · You 12, Mama Ngozi 8 · your move"), and S on the
// keys says where the game stands at any time. Pure functions, no DOM: the words come from the engine's own path of the
// move (web/path.js sowPath / playedWords), so they can never disagree with what the board did.
import { sideOf, opponent, seedsOnSide } from '../engine/ayo.js';
import { sowPath, playedWords } from './path.js';

// a seat's name as the line says it: "You" for the reader's own seat (unless two share the phone, when names are kept)
function label(seat, { you = 0, names = ['You', 'Them'], local = false } = {}) {
  return !local && seat === you ? 'You' : (names[seat] || (seat === you ? 'You' : 'Them'));
}

// whose move it is now, from the reader's seat: "your move" / "Mama Ngozi's move" / two of us "Tete, your move"; '' once it is over
export function whoseWords(state, opts = {}) {
  if (!state || state.over) return '';
  const { you = 0, local = false } = opts;
  if (state.turn === you) return local ? `${label(you, opts)}, your move` : 'your move';
  return `${label(state.turn, opts)}'s move`;
}

// the score, the reader first: "You 12, Mama Ngozi 8" (two of us: "Tete 12, Meka 8", the player to move first)
export function scoreWords(state, opts = {}) {
  const { you = 0 } = opts; const them = opponent(you);
  return `${label(you, opts)} ${state.stores[you]}, ${label(them, opts)} ${state.stores[them]}`;
}

// who played which pit: "You played pit 3" / "Mama Ngozi played their pit 3" (two of us: "Tete played pit 3", their own pit)
export function playedPit(pit, mover, opts = {}) {
  const { you = 0, local = false } = opts; const k = sideOf(mover).indexOf(pit) + 1;
  if (local || mover === you) return `${label(mover, opts)} played pit ${k}`;
  return `${label(mover, opts)} played their pit ${k}`;
}

// The whole turn, once played: `before` is the position it was played from, `after` the position now on the board.
// opts: { you, names: [seat 0's name, seat 1's], local }. '' when the move cannot be read from `before`.
export function turnSaid(before, pit, after, opts = {}) {
  const path = sowPath(before, pit); if (!path || !after) return '';
  const { you = 0 } = opts;
  const parts = [playedPit(pit, before.turn, opts), playedWords(path, { you }), scoreWords(after, opts), whoseWords(after, opts)];
  return parts.filter(Boolean).join(' · ');
}

// S on the keys: where the game stands — "You 12, Mama Ngozi 8 · on the board: 14 on your side, 10 on theirs · your move"
export function standWords(state, opts = {}) {
  if (!state) return '';
  const { you = 0 } = opts; const mine = seedsOnSide(state, you), theirs = seedsOnSide(state, opponent(you));
  const parts = [scoreWords(state, opts), `on the board: ${mine} on your side, ${theirs} on theirs`];
  if (state.over) parts.push(state.winner === 'draw' ? 'the game ends level' : state.winner === you ? (opts.local ? `${label(you, opts)} wins` : 'you win') : `${label(state.winner, opts)} wins`);
  else parts.push(whoseWords(state, opts));
  return parts.join(' · ');
}
