// Feed them: when the rules narrow your move, the board says so before you tap. Pure functions, no DOM; the rules still come
// from the engine (legalMoves), never from here.
//
//   their side is empty            a brass ring lands on each pit that reaches them, and the hint line says
//                                  "They have no seeds — you must feed them: pits 2 or 5"
//   a pit would take their last    "pit 3 would leave them nothing — play pits 2 or 5" (Nchò captures can empty their side)
//   only one move at all           it is picked for you, its path shows, and the line starts "only move · …" (or
//                                  "only pit 5 reaches them · …"), so one more tap sows it
//   the pits a rule bars           their count badges go dim
import { legalMoves, sideOf, opponent, seedsOnSide } from '../engine/ayo.js';
import { pitName } from './path.js';

// What narrows the move for the player in seat `you`, or null when every pit with seeds may be played (or it is not their move).
// { kind: 'feed' | 'only', legal, barred, hungry, only }: `barred` the pits with seeds the feed rule bars, `hungry` their side
// is empty, `only` the one legal pit when there is just one.
export function narrowOf(state, you = 0) {
  if (!state || state.over || state.turn !== you) return null;
  const mine = sideOf(you).filter((i) => state.pits[i] > 0); if (!mine.length) return null;
  const legal = legalMoves(state); const barred = mine.filter((i) => !legal.includes(i));
  if (!barred.length && legal.length > 1) return null;
  return { kind: barred.length ? 'feed' : 'only', legal, barred, hungry: seedsOnSide(state, opponent(you)) === 0, only: legal.length === 1 ? legal[0] : null };
}

const num = (pit, you) => pitName(pit, you).replace(/^your pit /, '');
// "pit 2" / "pits 2 or 5" / "pits 2, 4 or 5" (from your own seat: 1 is the pit nearest you, the same digit as its key)
export function pitList(pits, you = 0, join = 'or') {
  const n = [...pits].map((p) => num(p, you)).sort((a, b) => a - b);
  if (n.length === 1) return `pit ${n[0]}`;
  return `pits ${n.slice(0, -1).join(', ')} ${join} ${n[n.length - 1]}`;
}

// The hint line on your move with nothing picked, when the rules narrow it; '' when they don't (the usual line stays).
export function feedWords(n, { you = 0 } = {}) {
  if (!n) return '';
  if (n.kind === 'only') return `only ${pitList(n.legal, you)} has seeds`;
  if (n.hungry) return n.legal.length === 1 ? `They have no seeds — only ${pitList(n.legal, you)} reaches them` : `They have no seeds — you must feed them: ${pitList(n.legal, you)}`;
  return `${pitList(n.barred, you, 'and')} would leave them nothing — play ${pitList(n.legal, you)}`;
}

// With only one move, it is picked for you: the words that go before the usual path words.
export function onlyLead(n, { you = 0 } = {}) {
  if (!n || n.only === null) return '';
  if (n.kind === 'only') return 'only move';
  return n.hungry ? `only ${pitList([n.only], you)} reaches them` : 'the only pit that leaves them seeds';
}
