// Beat my turn (idea 8 Nov): the clip shares your best turn of a game as a video and the words "8 seeds captured", but the
// friend who sees it can only watch — the chess apps turn a brilliant move into a puzzle the friend can try. Now the clip's
// words and the Game over share carry one more link, "Can you beat my best turn?": opening it puts that exact position on
// the friend's own 3D board, their pits nearest them, and asks "Meka took 8 in one turn here · can you?" — one move, the
// engine's events, and a result card that says if they beat it, matched it or fell short, with Show Meka's move after a miss.
//
// The position travels as the game's own moves up to and including that turn (the same code as Watch the whole game,
// web/watch.js), so nothing is stored on a server and nothing can be made up: the link is replayed through the engine, the
// last move is the turn to beat and what it took is worked out again here, never read from the link. A turn played from the
// far seat (a friend's game, the second of two of us) is turned round so the friend always plays from the near side (the
// engine is the same under a half turn of the board: pit i becomes pit i ± 6 and the troughs swap). Pure functions, no DOM.
import { applyMove } from '../engine/ayo.js';
import { encodeGame, decodeGame, cleanName } from './watch.js';
import { rate } from '../engine/puzzle.js';

export const MIN_SEEDS = 2; // a turn that took fewer is no challenge

// The board turned round so `player` sits on the near side (pits 0–5): a state the engine plays exactly the same way.
export function turnRound(s, player) {
  if (!player) return { ...s, pits: s.pits.slice(), stores: s.stores.slice(), moves: [], first: 0, winner: null, over: false };
  return { ...s, pits: [...s.pits.slice(6), ...s.pits.slice(0, 6)], stores: [s.stores[1], s.stores[0]], turn: 1 - s.turn, moves: [], first: 0, winner: null, over: false };
}

// The link's query for a best turn (web/clip.js bestTurn: {index, pit, seeds, …}) of the game `moves`, or null.
export function beatQuery({ variant, rules = {}, first = 0, moves = [] }, turn, name) {
  if (!turn || !(turn.seeds >= MIN_SEEDS) || !(turn.index >= 0) || turn.index >= moves.length) return null;
  const code = encodeGame({ variant, rules, first, moves: moves.slice(0, turn.index + 1) }); if (!code) return null;
  return '?' + new URLSearchParams({ beat: code, n: cleanName(name, 'A friend') }).toString();
}

// What a link says, checked through the engine: a puzzle the board can play like the daily one, or null for anything else.
// { key: 'beat', variant, rules, state (player 0 to move), target, answer, level, weekly: false, name }
export function parseBeat(code, n) {
  const g = decodeGame(code, n, ''); if (!g) return null;
  const k = g.moves.length - 1; const before = g.states[k]; const pit = g.moves[k];
  const { state: after } = applyMove(before, pit); const mover = before.turn;
  const target = after.stores[mover] - before.stores[mover]; if (target < MIN_SEEDS) return null;
  const state = turnRound(before, mover); const answer = mover ? pit - 6 : pit;
  const name = g.names[0] === 'Player 1' ? 'A friend' : g.names[0];
  return { key: 'beat', variant: g.variant, rules: g.rules, state, target, answer, level: rate(state).level, weekly: false, name, query: '?' + new URLSearchParams({ beat: code, n: name }).toString() };
}

// The words. `name` is whoever sent it.
const gameName = (v) => (v === 'ayo' ? 'Ayo' : 'Nchò');
export const beatDay = (p) => `From ${p.name}'s game · ${gameName(p.variant)}`;
export const beatAsk = (p) => `${p.name} took ${p.target} in one turn. Can you?`;
export function beatResult(got, p) {
  if (got > p.target) return { badge: `You beat ${p.name}`, hit: true, line: `${got} where ${p.name} took ${p.target}` };
  if (got === p.target) return { badge: `Level with ${p.name}`, hit: true, line: `${got}, the same as ${p.name}` };
  return { badge: `Short of ${p.name}`, hit: false, line: `${got} of ${p.name}'s ${p.target}` };
}
export const beatShowWords = (p) => `Show ${p.name}'s move`;
export const beatWatchWords = (p) => `${p.name}: watch this one…`;
export const beatShownEyebrow = (p) => `${p.name}'s move captures`;
// The line the sender's share ends with, before the link.
export const beatLinkWords = (seeds) => `Can you beat my best turn? I took ${seeds} in one:`;
// The friend's own share, after their go: the same link, so it travels on.
export function beatShare(got, p) {
  const how = got > p.target ? `I took ${got} where ${p.name} took ${p.target}` : got === p.target ? `I matched ${p.name}'s ${p.target}` : `I took ${got} of ${p.name}'s ${p.target}`;
  return `Ayo & Nchò — ${p.name}'s best turn, one move: ${how}. Your go:`;
}
