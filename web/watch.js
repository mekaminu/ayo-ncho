// Watch the whole game (idea 6 Nov, afternoon): sharing a game sent the score and a picture of the board, never the game —
// the friend who reads "I beat Mama Ngozi 27–21" cannot see how. Lichess and chess.com share a game as a link that plays it
// back; here the share now carries the moves in its link (?watch=…), and opening it plays the whole game move by move on the
// friend's own 3D board, every seed flying, then puts them on Home to play their own. Nothing is stored on any server: the
// game is in the link. Pure functions (no DOM), tested in test/watch.test.js; web/game.js plays it on the board.
//
// The code: "<v><c><r><l><f>.<moves>" — v: n (Nchò) | a (Ayo); c: capture rule 4 | 3 (on 2 or 3); r: relay 1|0; l: last 8 1|0;
// f: the seat that moved first 0|1; moves: one character a move, the pit 0–11 as 0-9 a b. The names ride in a= (seat 0, the
// near side) and b= (seat 1). Anything that does not replay as a legal game through the engine is refused, never guessed.
import { newGame, applyMove, legalMoves, owner } from '../engine/ayo.js';

export const MAX_MOVES = 400;
export const MAX_NAME = 20;
const PIT = '0123456789ab';

export function encodeGame({ variant, rules = {}, first = 0, moves = [] }) {
  if (!moves.length || moves.length > MAX_MOVES) return null;
  const v = variant === 'ayo' ? 'a' : 'n';
  const c = rules.capture === 23 ? '3' : '4';
  return `${v}${c}${rules.relay ? 1 : 0}${rules.last8 ? 1 : 0}${first ? 1 : 0}.${moves.map((m) => PIT[m]).join('')}`;
}

// a name from the link, made safe to show: no control characters, no markup, at most MAX_NAME characters
export function cleanName(s, fallback) {
  if (typeof s !== 'string') return fallback;
  const n = s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
  return n || fallback;
}

// the code back into a game the engine agrees with: { variant, rules, first, moves, states, names } or null
export function decodeGame(code, a, b) {
  const m = /^([na])([43])([01])([01])([01])\.([0-9ab]{1,400})$/.exec(typeof code === 'string' ? code : '');
  if (!m) return null;
  const variant = m[1] === 'a' ? 'ayo' : 'ncho';
  const rules = { capture: m[2] === '3' ? 23 : 4, relay: m[3] === '1', last8: m[4] === '1' };
  const first = +m[5]; const moves = [...m[6]].map((ch) => PIT.indexOf(ch));
  if (owner(moves[0]) !== first) return null; // the first move must be the first mover's
  let s = newGame(variant, rules, first); const states = [s];
  for (const pit of moves) {
    if (s.over || !legalMoves(s).includes(pit)) return null;
    s = applyMove(s, pit).state; states.push(s);
  }
  return { variant, rules, first, moves, states, names: [cleanName(a, 'Player 1'), cleanName(b, 'Player 2')] };
}

// the link's query: ?watch=<code>&a=<seat 0's name>&b=<seat 1's name>
export function watchQuery(game, names) {
  const code = encodeGame(game); if (!code) return null;
  const q = new URLSearchParams({ watch: code, a: cleanName(names[0], 'Player 1'), b: cleanName(names[1], 'Player 2') });
  return '?' + q.toString();
}

// the words, all from the game itself
const gameName = (v) => (v === 'ayo' ? 'Ayo' : 'Nchò');
export function titleWords(w) { return `${w.names[0]} vs ${w.names[1]} · ${gameName(w.variant)} · ${w.moves.length} moves`; }
export function moveWords(w, i) { // before move i (0-based) plays
  return `Move ${i + 1} of ${w.moves.length} · ${w.names[owner(w.moves[i])]} plays`;
}
export function endWords(w) {
  const s = w.states[w.states.length - 1]; const [p, q] = s.stores; const [a, b] = w.names;
  if (!s.over) return `${a} and ${b} stopped at ${p}–${q} after ${w.moves.length} moves`;
  if (s.winner === 'draw') return `${a} and ${b} drew ${p}–${q}`;
  return s.winner === 0 ? `${a} beat ${b} ${p}–${q}` : `${b} beat ${a} ${q}–${p}`;
}
// the words that go with the link when a game is shared
export function linkWords() { return 'Watch the whole game:'; }
