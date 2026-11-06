// Their hand over the board (idea 6 Nov): against the computer a faint light drifts over the pits it weighs (web/ponder.js),
// but in a room with a friend nothing showed until their move landed — at a real board you watch the other person's hand
// hover over a pit, come back, and settle on another, and half of the game is reading them. Now, when the friend picks a
// pit (their first tap, before the second sows), a faint brass light lands on that pit on your board and follows their
// finger from pit to pit, the line under their name says "weighing their pit 3", and it goes when they put it back or sow.
// Only the pit they picked travels (a few bytes: {t:"peek", pit, n}), only to the other seat, only on their own move and
// only a pit the engine lets them play — the server checks it and keeps none of it. Pure functions, used by the server
// (the referee) and the board, tested in node.

import { legalMoves } from '../engine/ayo.js';
import { pitName } from './path.js';

export const OPACITY = 0.3;     // fainter than the computer's weighing light (0.34): a friend's finger, not a hand in the room
export const GLIDE = 9;         // how quickly the light follows their finger from pit to pit (per second, eased)
export const SEND_GAP_MS = 140; // a board sends at most one pick this often; the latest waits and goes after
export const GATE_GAP_MS = 60;  // the server lets one through this often per seat (a little under the board's own pace)
export const STALE_MS = 45_000; // a pick nobody has moved for this long fades (a friend who wandered off mid-think)

// A pick as it travels: a pit 0–11, or -1 for "put it back".
export function isPeek(pit) { return Number.isInteger(pit) && pit >= -1 && pit <= 11; }

// May `seat` show this pick to the other side now? Their move, the game in play, and a pit the engine lets them play (or -1).
export function mayPeek(state, seat, pit) {
  if (!state || state.over || state.turn !== seat || !isPeek(pit)) return false;
  return pit === -1 || legalMoves(state).includes(pit);
}

// The server's gate for one seat: one pick every GATE_GAP_MS; "put it back" always passes, so a light is never left behind.
export function passPeek(gate, pit, t) {
  if (pit === -1) { gate.at = t; return true; }
  if (gate.at !== undefined && t - gate.at < GATE_GAP_MS) return false;
  gate.at = t; return true;
}

// The board's side of sending: picks come as fast as a finger taps, but only the last one matters. `send(pit)` goes out at
// once when the line is quiet, else the newest waits SEND_GAP_MS and the ones in between are dropped; the same pit twice is
// sent once. `later(fn, ms)` is the timer (setTimeout in the page, a fake in node). `reset()` forgets (a move went, a new game).
export function makeSender(send, { now = () => Date.now(), later = (fn, ms) => setTimeout(fn, ms), cancel = (h) => clearTimeout(h) } = {}) {
  let last = -1, at = -Infinity, wanted = -1, timer = null;
  const flush = () => { timer = null; if (wanted === last) return; if (send(wanted) !== false) { last = wanted; at = now(); } };
  return {
    pick(pit) {
      wanted = pit;
      if (timer !== null) return;
      if (wanted === last) return;
      const wait = SEND_GAP_MS - (now() - at);
      if (wait <= 0 || pit === -1) flush(); else timer = later(flush, wait);
    },
    reset() { if (timer !== null) cancel(timer); timer = null; last = -1; wanted = -1; },
    get last() { return last; },
    get pending() { return timer !== null; },
  };
}

// Should this board show the friend's pick now? `o`: online, seat (who picked), you, n (the move count it was picked on),
// state, playing (the board is on screen, not Home or a card), replaying, clip, age (ms since it came).
export function peekShown(o) {
  if (!o || !o.online || o.seat === o.you || !o.state || o.state.over) return false;
  if (o.state.turn !== o.seat || o.n !== o.state.moves.length) return false; // a pick from a move ago: their move has landed
  if (!o.playing || o.replaying || o.clip) return false;
  if (!isPeek(o.pit) || o.pit < 0 || !legalMoves(o.state).includes(o.pit)) return false;
  return !(o.age > STALE_MS);
}

// The line under their name while their finger is on a pit, from your seat: "weighing their pit 3".
export function peekWords(pit, you = 0) { return `weighing ${pitName(pit, you)}`; }
