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

// ---------- Play on from here (idea 7 Nov): a friend watching a shared game sees the moment it turned and wants to try it
// themselves — "what if I'd played pit 3 there?" Lichess's "continue from here" on a shared game. While it plays back, a chip
// under the board offers it; one tap stops after the turn in hand and the watcher plays on from exactly that position, as the
// side to move, against the opponent they chose on Home. The side to move always becomes the near seat (0): when it is the
// far side's move the game is mirrored — every move turned to the pit opposite, the other seat first — which the rules
// cannot tell apart (they are the same for both seats), and the board turns half round to face them as it happens.
// Practice, like a play-out from the daily puzzle (web/playout.js reads `from` / `prefix`): never saved or counted.
export const mirrorPit = (pit) => (pit + 6) % 12;

// May the chip offer it for the position after `k` moves? Only while the game plays back, after a move, with the game going.
export function canTakeOver({ watching = false, done = false, k = 0, state = null } = {}) {
  return !!(watching && !done && k >= 1 && state && !state.over);
}

// The game after `k` moves of the watched game `w`, ready to be played on by the side to move from the near seat:
// { state, flip, side, other, n, po } or null. `po` is the play-out the board keeps while it is played.
export function takeoverOf(w, k) {
  const s = w && w.states ? w.states[k] : null;
  if (!canTakeOver({ watching: true, k, state: s })) return null;
  const flip = s.turn === 1; const kept = w.moves.slice(0, k).map((m) => (flip ? mirrorPit(m) : m));
  let t = newGame(w.variant, w.rules, flip ? 1 - w.first : w.first);
  for (const pit of kept) { if (t.over || !legalMoves(t).includes(pit)) return null; t = applyMove(t, pit).state; }
  if (t.turn !== 0 || t.over) return null;
  const side = w.names[flip ? 1 : 0], other = w.names[flip ? 0 : 1];
  return { state: t, flip, side, other, n: k, po: { kind: 'watch', from: kept.length, prefix: kept.join(','), n: k, side, other } };
}
export const isTakeover = (po) => !!po && po.kind === 'watch';

// The words.
export const TAKE_TITLE = 'Play on from here';
export const takeoverChip = (side, opp) => `you take ${side}'s side · vs ${opp}`;
export const takeoverLabel = (side, opp) => `Play on from here: you take ${side}'s side against ${opp}`;
export const takeoverToast = (n, side) => `From move ${n}, you play on as ${side} — your move`;
export const takeoverTag = (n) => `from move ${n} of a shared game`;
export const takeoverEyebrow = (variant, n, played) => `${gameName(variant)} · ${takeoverTag(n)} · ${played} move${played === 1 ? '' : 's'}`;
export function takeoverShare(state, you, name, po) {
  const a = state.stores[you], b = state.stores[1 - you];
  const how = state.winner === 'draw' ? 'drew with' : state.winner === you ? 'beat' : 'lost to';
  return `Ayo & Nchò — I played on as ${po.side} from move ${po.n} of a shared game and ${how} ${name} ${a}–${b}.`;
}
