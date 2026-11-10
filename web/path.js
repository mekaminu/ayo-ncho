// Where the seeds will go: on the first tap, the board shows the hand's path before the second tap sows.
// Pure functions, no DOM. The path is read from the engine's own events for the move on a copy of the position,
// so what is shown can never disagree with what applyMove will do; nothing about the rules lives here.
import { applyMove, legalMoves, sideOf, opponent } from '../engine/ayo.js';
import { sweepOf, sweepWords } from './last8.js';
import { endedCircling, calledWords } from './circling.js';
import { slamOf, slamWords } from './slam.js';
import { roundOf, roundWords } from './round.js';

// The path of a move for the player to move, or null when the pit cannot be played:
//   order     the pits the hand sows into, in the order they are first reached
//   visits    how many seeds land in each pit (12 entries; a relay turn can pass a pit more than once)
//   end       the pit the last seed lands in — where the turn ends (captured or not)
//   relays    the pits picked up again along the way (relay sowing), in order
//   captures  every pit the move empties into a store, in order, whoever gets the seeds (the last-8 sweep included)
//   takes     those of them whose seeds go to the mover's own trough (copper rings)
//   gives     those whose seeds go to the other side's trough — in Nchò a pit on their side that makes 4 before the last seed
//             goes to its owner (pale rings: "whose 4 is it"); read from each capture event's `by`, never worked out here
//   got/lost  seeds the mover's store gains, and the other side's
//   sweep     the Nchò last-8 sweep, if the move makes one: { by, n, pits } (the engine marks it)
//   slam      an Ayo grand slam the move makes, if any: { pit, pits, n, by } — every seed of theirs, so nothing taken (the engine marks it)
//   round     relay sowing that comes back to the same seeds and stops the third time, if so: see web/round.js (the engine marks it)
//   over      whether the move ends the game, and who wins then
export function sowPath(state, pit) {
  if (!state || state.over || !legalMoves(state).includes(pit)) return null;
  const { state: next, events } = applyMove(state, pit);
  const me = state.turn, visits = Array(12).fill(0), order = [], relays = [], captures = [], takes = [], gives = []; let end = null, drops = 0;
  for (const e of events) {
    if (e.type === 'drop') { if (!visits[e.pit]) order.push(e.pit); visits[e.pit]++; end = e.pit; drops++; }
    else if (e.type === 'pickup' && e.relay) relays.push(e.pit);
    else if (e.type === 'capture') for (const p of e.pits) {
      if (!captures.includes(p)) captures.push(p);
      const mine = e.by === me, list = mine ? takes : gives; // a pit can be emptied twice in one relay turn: it goes to whoever got it last
      if (!list.includes(p)) list.push(p); const other = mine ? gives : takes, k = other.indexOf(p); if (k >= 0) other.splice(k, 1);
    }
  }
  return {
    pit, order, visits, end, relays, captures, takes, gives, drops, sweep: sweepOf(events), slam: slamOf(events), round: roundOf(events),
    got: next.stores[me] - state.stores[me], lost: next.stores[opponent(me)] - state.stores[opponent(me)],
    over: next.over, winner: next.over ? next.winner : null,
    called: endedCircling(next), // the game is called on this move: no capture for 60 moves, each keeps their side (web/circling.js)
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
  if (path.got && !path.called) parts.push(`takes ${path.got}`); // a called game hands each side its own seeds: not a capture
  if (path.lost && !path.called) parts.push(`gives ${path.lost}`);
  if (path.sweep) parts.push(sweepWords(path.sweep, { you }));
  if (path.slam) parts.push(slamWords(path.slam, { you }));
  if (path.round && path.round.stop !== null) parts.push(roundWords(path.round));
  if (path.called) parts.push(calledWords());
  if (path.over) parts.push(path.winner === 'draw' ? 'ends the game level' : path.winner === you ? 'wins the game' : 'ends the game');
  return parts.join(' · ');
}

// Their move, explained: the words for a turn already played, from your seat — "picked up again twice · took 4 · gave 4";
// a plain turn says where it ended ("ended in your pit 2"); a turn that ended the game says so. Short enough for a phone.
export function playedWords(path, { you = 0 } = {}) {
  if (!path) return '';
  const parts = [];
  const r = path.relays.length; if (r) parts.push(r === 1 ? 'picked up again once' : r === 2 ? 'picked up again twice' : `picked up again ×${r}`);
  if (path.got && !path.called) parts.push(`took ${path.got}`);
  if (path.lost && !path.called) parts.push(`gave ${path.lost}`);
  if (path.sweep) parts.push(sweepWords(path.sweep, { you, played: true }));
  if (path.slam) parts.push(slamWords(path.slam, { you, played: true }));
  const round = path.round && path.round.stop !== null;
  if (!parts.length || path.over || round) parts.push(path.end === null ? 'sowed nothing' : `ended in ${pitName(path.end, you)}`);
  if (round) parts.push(roundWords(path.round, { played: true }));
  if (path.called) parts.push(calledWords());
  if (path.over) parts.push(path.winner === 'draw' ? 'the game ends level' : path.winner === you ? 'you win' : 'they win');
  return parts.join(' · ');
}

// What it leaves open: after this move, the best the other side could take with their very next move. Read from the engine
// on copies of the position (this move, then each of their replies), so it can never disagree with the game. null when the
// move cannot be played or ends the game; otherwise { pit, got, captures, wins } for their richest reply (more seeds, then
// a reply that wins the game), got 0 when nothing of theirs takes anything. Only one move ahead: a warning, not a search.
export function answerOf(state, pit) {
  if (!state || state.over || !legalMoves(state).includes(pit)) return null;
  const { state: next } = applyMove(state, pit);
  if (next.over || next.turn === state.turn) return null;
  let best = { pit: null, got: 0, captures: [], wins: false };
  for (const m of legalMoves(next)) {
    const p = sowPath(next, m); if (!p) continue;
    const wins = p.over && p.winner === next.turn; if (p.called) { p.got = 0; p.captures = []; } // a called game takes nothing: each keeps their side
    if (wins && !best.wins || wins === best.wins && p.got > best.got) best = { pit: m, got: p.got, captures: p.captures, wins };
  }
  return best;
}
// The answer in words, for the end of the hint line: "then they can take 8" / "then they can win"; '' when they take nothing.
export function answerWords(ans) {
  if (!ans) return '';
  if (ans.wins) return 'then they can win';
  return ans.got ? `then they can take ${ans.got}` : '';
}

// A hint that teaches: Hint picks Mama Ngozi's pit for you, so the line says whose move it is before the usual path words:
// "Mama Ngozi would play this one · picks up again ×2 · takes 8 — tap again to sow"; on the keys "Mama Ngozi would play pit 3 · … — Enter to sow".
// `line` is what pickedHint said for that pit; a line it does not recognise is left as it is.
export function hintedHint(line, name, { keys = false, key = null } = {}) {
  if (!line || !name) return line;
  if (keys) {
    const lead = `pit ${key || '?'} · `; if (!line.startsWith(lead)) return line;
    return `${name} would play ${lead}${line.slice(lead.length)}`.replace(/, or pick another$/, '');
  }
  if (line === 'tap again to sow, or pick another') return `${name} would play this one — tap again to sow`;
  return `${name} would play this one · ${line}`;
}
// The whole hint while a pit is picked: the path, then how to sow it (a finger, or the keys).
export function pickedHint(path, { you = 0, keys = false, key = null, seeds = 0, answer = null } = {}) {
  const words = [pathWords(path, { you }), answerWords(answer)].filter(Boolean).join(' · ');
  if (!keys) return words ? `${words} — tap again to sow` : 'tap again to sow, or pick another';
  const lead = `pit ${key || '?'} · ${seeds === 1 ? '1 seed' : `${seeds} seeds`}`;
  return words ? `pit ${key || '?'} · ${words} — Enter to sow` : `${lead} — Enter to sow, or pick another`; // with the path shown the count badge says the seeds
}

// Whose 4 is it — said once on a phone, the first time a picked move would hand seeds to the other side (a pale ring):
export function giftNoteWords(rules = {}) {
  return rules.capture === 4
    ? 'A pale ring: those seeds go to their trough, not yours — a pit on their side that makes 4 before your last seed is theirs. Only your last seed takes a 4 over there.'
    : 'A pale ring: those seeds go to their trough, not yours.';
}
