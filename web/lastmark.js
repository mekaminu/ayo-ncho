// Which pit they played (idea 5 Nov): after the other side's turn the marks of their move land faint and fade by themselves
// after ~3 s, and the chip under the board says what the move did ("Nnamdi · picked up again twice · took 4") — but not which
// pit it came from, so once the marks had faded a learner looking back at the board could not tell where the hand went in.
// Chess boards keep the last move's squares lit until the reply; at a real Ayo board you watched the hand come down and you
// remember the pit. Now the faint brass light their hand settled on (the same ring as the computer weighing its move) stays,
// fainter still, on the pit they played, until your own move: it rides with the chip (their move explained), so it shows for
// the computer, a friend in a room and two of us alike, goes with your move, Undo, a new game, Home or the Game over card, and
// steps aside while that move (or her take) is watched again. Still, no breathing, so the resting board stays at rest. The
// screen reader's label on that pit and the mouse's words over it say "played last" too. Pure functions, tested in node.

import { owner } from '../engine/ayo.js';

export const OPACITY = 0.2;    // fainter than the hand weighing its move (0.34) and the mouse's ring (0.45): a memory, not a pointer
export const FADE_IN_MS = 420; // it settles in as the ghost of their path lands, then holds still
export const WORDS = 'played last';

// Whether the mark shows now, and on which pit. `o`: theirs (the move explained: {pit, before}, or null), state (the game now),
// you (the seat at the near side), playing (the board is in front, no screen or card over it), replaying (a turn watched again),
// clip (the clip recording). A pit of yours being picked never hides it. Returns the pit, or -1 for none.
export function lastMarkPit(o) {
  if (!o || !o.theirs || !o.state || o.state.over || !o.playing || o.replaying || o.clip) return -1;
  const { pit, before } = o.theirs;
  if (!Number.isInteger(pit) || pit < 0 || pit > 11) return -1;
  if (before && before.turn === o.state.turn) return -1;          // a turn that kept the move (never in these games) shows nothing
  if (o.state.turn !== (o.you ?? 0)) return -1;                   // only while the move is yours (two of us: `you` is whoever is to move)
  if (owner(pit) === o.state.turn) return -1;                      // it is always a pit of the side that just played
  return pit;
}

// How bright the mark is `t` ms after the move was explained: fading in, then holding; under reduced motion straight to it.
export function lastMarkOp(t, { reduced = false } = {}) {
  if (t < 0) return 0;
  if (reduced) return OPACITY;
  return OPACITY * Math.min(1, t / FADE_IN_MS);
}

// The screen reader's label and the mouse's words for a pit, with "played last" added on the pit the mark is on.
export function withLast(words, pit, last) {
  if (!words || last < 0 || pit !== last) return words;
  return `${words} · ${WORDS}`;
}
