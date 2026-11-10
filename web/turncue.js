// Whose move (10 Nov, Meka: "it's hard to know whose turn it is — most times I'm not sure whether it's mine or the opponent's").
// The only signs were two small grey words in the cards' corners ("your move", "waiting") and the line of hints. Now the card of
// the player to move lights up — its line becomes a brass badge, a face gets a brass ring — and the other card steps back; and on
// your move every pit you may play glows softly round its rim, so the board itself says it is yours to play. When you pick a
// pit the glow gives way to its path; when the turn passes, the glow goes and the other card lights.
// Pure helpers, no DOM, tested in node (test/turncue.test.js); the cards' look is in index.html, the glow's rings in board.js.

// which card is lit: 'near' (the bottom card: you, or on a shared phone whoever sits nearest), 'far' (the top one), or null when
// nobody's (the game over; a puzzle, the lesson, a game being watched or reviewed, a room still waiting for a friend). While a
// turn plays on the board (`playing`: the seat whose seeds are moving) its player's card stays lit until the seeds settle, so
// "your move" never lights while their seeds are still flying.
export function turnSide({ over = false, turn, near = 0, quiet = false, playing = null } = {}) {
  if (quiet) return null;
  const who = playing === 0 || playing === 1 ? playing : over ? null : turn;
  if (who !== 0 && who !== 1) return null;
  return who === near ? 'near' : 'far';
}

// which pits glow: on your move every pit you may play, lowest first; none while a pit is picked (its path is showing) or while
// a turn is playing, and none on the other player's move
export function glowPits({ side = null, canPress = false, selected = null, legal = [] } = {}) {
  if (side !== 'near' || !canPress || selected !== null) return [];
  return [...new Set(legal)].filter((i) => Number.isInteger(i) && i >= 0 && i < 12).sort((a, b) => a - b);
}

// the order the rings light in: along your row the way the seeds go, so it reads as one sweep, not twelve blinks
export function glowOrder(pits) { return pits.slice().sort((a, b) => (a % 6) - (b % 6)); }

export const GLOW = 0.42;           // the rings' strength: a soft light round each rim, under the picked pit's ring (0.6)
export const GLOW_IN_MS = 300;      // each ring fading in …
export const GLOW_STAGGER_MS = 55;  // … one after the next along the row
export const GLOW_OUT_MS = 160;     // and out, quicker, as the turn passes or a pit is picked

// A tap that says whose move (idea 10 Nov, night, after Meka's "not sure whether it's mine or the opponent's turn"): the cards and
// the glow say it, but only to an eye already on them. A tap is the moment someone asks, and it got a shake of the ring and
// nothing more: a tap on their pit on your move, or any pit while they think, looked like the board not listening. Now the tap
// answers. On your move, a pit on their side: the ring still shakes, your pits' glow sweeps along your row again and the line
// says "that's their side · your pits are the lit ones". On their move: their card's ring pulses once more and the line says
// "Nnamdi's move · your pits light up when it's yours". Nothing on a pit you may play (it plays), nor in a puzzle, the lesson, a
// game watched, a turn still playing (a tap there hurries it) or the game over. And a game come back to after a while on your
// move (another app, the phone put down, the Mac's window behind another) sweeps the glow once, so the board says it again.
// kind: 'theirs' (your move, their pit) | 'wait' (their move) | null; sweep: your glow runs along the row again; pulse: their card.
export function tapCue({ side = null, mine = false, name = '' } = {}) {
  if (side === 'near' && !mine) return { kind: 'theirs', words: `that's their side · ${LIT_WORDS}`, sweep: true, pulse: false };
  if (side === 'far') return { kind: 'wait', words: `${name ? `${name}'s move` : 'their move'} · ${WAIT_WORDS}`, sweep: false, pulse: true };
  return { kind: null, words: '', sweep: false, pulse: false };
}
export const LIT_WORDS = 'your pits are the lit ones';
export const WAIT_WORDS = "your pits light up when it's yours";

// coming back to the game: sweep the glow again when it is your move, nothing is picked, and you were away long enough to have lost the thread
export const BACK_MS = 15000;
export function backSweep({ side = null, canPress = false, selected = null, awayMs = 0 } = {}) {
  return side === 'near' && canPress && selected === null && awayMs >= BACK_MS;
}
