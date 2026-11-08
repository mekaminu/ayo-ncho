// Who is ahead (idea 8 Nov): the scores only count the seeds already won, but a learner cannot tell who the seeds still on the
// board favour — a side can be 6 behind in its trough and winning. The store chess apps show it with an evaluation bar; here it
// is a brass bead on a thin brass inlay down the middle of the board, between the two rows of pits, that slides after every
// move towards the trough of whoever is ahead by Mama Ngozi's count (engine/ai.js leanOf), and a small brass word over it for a
// moment when the count changes ("You +4", "Nnamdi +6", "Even", "You can win from here"). Off until turned on (Settings →
// Feel → Who's ahead). Never in a game with a friend (it would be the computer helping one side), the daily puzzle, the lesson,
// Mama Ngozi's review or a game being watched; against the computer and two of us on one phone, a play-out and a retry too.

export const LEAN_KEY = 'lean';
export const REACH = 0.36;   // metres from the centre to the end of the inlay, each way (the troughs begin at 0.44)
export const SPAN = 10;      // seeds ahead for the bead to go about three quarters of the way
export const SAY_MS = 2600;  // the word over the bead after a change

export const leanOn = (prefs) => prefs.get(LEAN_KEY, '0') === '1';

// c: { on, playing, online, puzzle, lesson, review, watch, spect, clip }
export function leanShows(c = {}) {
  return !!(c.on && c.playing && !c.online && !c.puzzle && !c.lesson && !c.review && !c.watch && !c.spect && !c.clip);
}

// Where the bead sits, -1 (seat 1's trough, the far end) … +1 (seat 0's, the near end): a forced win goes all the way.
export function leanAt(l) {
  if (!l) return 0;
  if (l.decided) return Math.sign(l.decided);
  return Math.tanh((+l.v || 0) / SPAN) * 0.9;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// The word over the bead. you: the seat at the near end; local: two of us (both by name); names: [seat 0's, seat 1's].
export function leanWords(l, { you = 0, local = false, names = ['You', 'Them'] } = {}) {
  if (!l || l.over) return '';
  const who = (seat) => (!local && seat === you ? 'you' : names[seat]);
  if (l.decided) return cap(`${who(l.decided > 0 ? 0 : 1)} can win from here`);
  const n = Math.round(Math.abs(+l.v || 0));
  if (n < 1) return 'Even';
  return cap(`${who(l.v > 0 ? 0 : 1)} +${n}`);
}

// Settings' own line: what the bead says now, when there is a game to say it of.
export function leanNote(words) { return words ? ` · now ${words}` : ''; }

// Does the change deserve the word? Only when what it would say changes (a count that stays at "You +4" moves the bead quietly).
export function leanSays(before, after) { return !!after && before !== after; }
