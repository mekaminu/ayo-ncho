// Where the seeds will go: on the first tap, the board shows the hand's path before the second tap sows.
// Pure functions, no DOM. The path is read from the engine's own events for the move on a copy of the position,
// so what is shown can never disagree with what applyMove will do; nothing about the rules lives here.
import { applyMove, legalMoves, sideOf, opponent } from '../engine/ayo.js';

// The path of a move for the player to move, or null when the pit cannot be played:
//   order     the pits the hand sows into, in the order they are first reached
//   visits    how many seeds land in each pit (12 entries; a relay turn can pass a pit more than once)
//   end       the pit the last seed lands in — where the turn ends (captured or not)
//   relays    the pits picked up again along the way (relay sowing), in order
//   captures  every pit the move empties into a store, in order, whoever gets the seeds (the last-8 sweep included)
//   got/lost  seeds the mover's store gains, and the other side's
//   over      whether the move ends the game, and who wins then
export function sowPath(state, pit) {
  if (!state || state.over || !legalMoves(state).includes(pit)) return null;
  const { state: next, events } = applyMove(state, pit);
  const me = state.turn, visits = Array(12).fill(0), order = [], relays = [], captures = []; let end = null, drops = 0;
  for (const e of events) {
    if (e.type === 'drop') { if (!visits[e.pit]) order.push(e.pit); visits[e.pit]++; end = e.pit; drops++; }
    else if (e.type === 'pickup' && e.relay) relays.push(e.pit);
    else if (e.type === 'capture') for (const p of e.pits) if (!captures.includes(p)) captures.push(p);
  }
  return {
    pit, order, visits, end, relays, captures, drops,
    got: next.stores[me] - state.stores[me], lost: next.stores[opponent(me)] - state.stores[opponent(me)],
    over: next.over, winner: next.over ? next.winner : null,
  };
}

// A pit named from the seat looking at it: "your pit 3" / "their pit 1" (1 is nearest its owner, as the keys count).
export function pitName(pit, you = 0) {
  const mine = sideOf(you).includes(pit);
  return `${mine ? 'your' : 'their'} pit ${(mine ? sideOf(you) : sideOf(1 - you)).indexOf(pit) + 1}`;
}

// The hint line's words for a path, short enough for a phone: "ends in their pit 3 · takes 4"; a relay turn says how
// many times the hand picks up again; a move that ends the game says so.
export function pathWords(path, { you = 0 } = {}) {
  if (!path) return '';
  const parts = [];
  if (path.relays.length) parts.push(path.relays.length === 1 ? 'picks up again once' : `picks up again ×${path.relays.length}`);
  parts.push(path.end === null ? 'nothing to sow' : `ends in ${pitName(path.end, you)}`);
  if (path.got) parts.push(`takes ${path.got}`);
  if (path.lost) parts.push(`gives ${path.lost}`);
  if (path.over) parts.push(path.winner === 'draw' ? 'ends the game level' : path.winner === you ? 'wins the game' : 'ends the game');
  return parts.join(' · ');
}

// Their move, explained: the words for a turn already played, from your seat — "picked up again twice · took 4 · gave 4";
// a plain turn says where it ended ("ended in your pit 2"); a turn that ended the game says so. Short enough for a phone.
export function playedWords(path, { you = 0 } = {}) {
  if (!path) return '';
  const parts = [];
  const r = path.relays.length; if (r) parts.push(r === 1 ? 'picked up again once' : r === 2 ? 'picked up again twice' : `picked up again ×${r}`);
  if (path.got) parts.push(`took ${path.got}`);
  if (path.lost) parts.push(`gave ${path.lost}`);
  if (!parts.length || path.over) parts.push(path.end === null ? 'sowed nothing' : `ended in ${pitName(path.end, you)}`);
  if (path.over) parts.push(path.winner === 'draw' ? 'the game ends level' : path.winner === you ? 'you win' : 'they win');
  return parts.join(' · ');
}

// The whole hint while a pit is picked: the path, then how to sow it (a finger, or the keys).
export function pickedHint(path, { you = 0, keys = false, key = null, seeds = 0 } = {}) {
  const words = pathWords(path, { you });
  if (!keys) return words ? `${words} — tap again to sow` : 'tap again to sow, or pick another';
  const lead = `pit ${key || '?'} · ${seeds === 1 ? '1 seed' : `${seeds} seeds`}`;
  return words ? `pit ${key || '?'} · ${words} — Enter to sow` : `${lead} — Enter to sow, or pick another`; // with the path shown the count badge says the seeds
}
