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

// Whose move, for the family watching (idea 10 Nov, late night): Mum, following a game from the watch link, had none of it — no
// card lit, the line under the board the only sign, and a tap on a pit did nothing at all (it is not her game), which on a phone
// reads as a board that has frozen. Now the card of the player to move lights for her as it does for them (seat 0, the host,
// at the bottom; their friend at the top), the mover's card stays lit while their seeds fly, and a tap or a key on any pit pulses
// that card and says whose move it is and that she is watching. No pit ever glows on her board: there is nothing for her to play.
// side: the lit card ('near' | 'far' | null, from turnSide); name: the player to move. pulse: which card pulses.
export const WATCH_WORDS = "it's their game, you're watching";
export function watchTap({ side = null, name = '' } = {}) {
  if (side !== 'near' && side !== 'far') return { kind: null, words: '', pulse: null };
  return { kind: 'watching', words: `${name ? `${name}'s move` : 'their move'} · ${WATCH_WORDS}`, pulse: side };
}

// Your move, felt (idea 11 Nov, early morning, after Meka's "most times am not sure whether its mine or the opponents turn"): the
// cards and the glow say it to an eye on the board, and a tap answers when asked, but a player looking away while the computer or
// a friend thinks (at the room, at the phone's other half, at a cousin) had no sign at all the moment it came back to them. Now,
// as their seeds settle and the bottom card lights, the wood gives one soft double tap — two light knocks rising, quieter than a
// seed — and the phone a single light buzz, as a hand sliding the board back across the table would. Only when the turn has come
// over from their side by their own move: never when a game opens on your move or a saved game comes back, never after an Undo (the
// turn comes back without them playing), never on a shared phone (the board turns to whoever holds it), never for a watcher, in a
// puzzle, the lesson, a replay or a review, never at the game over, and never with the page out of sight (a room's own away taps
// say it there). It follows Sound and Haptics as every other sound does.
// from/to: the lit card before and after (turnSide); lastBy: the seat whose move was played last, you: your seat; played: the game
// has more moves now than when their card lit (an Undo while they think has fewer).
export function yourMoveCue({ from = null, to = null, lastBy = null, you = 0, played = false, shared = false, watching = false, hidden = false, over = false } = {}) {
  if (from !== 'far' || to !== 'near' || !played || over || shared || watching || hidden) return false;
  return (lastBy === 0 || lastBy === 1) && lastBy !== you;
}
export const CUE_TAPS = [[1.55, 0.045, 0], [1.95, 0.04, 95]]; // [pitch, gain, ms after]: two knocks rising, under a seed's (0.12)
export const CUE_BUZZ = 12; // ms: one light buzz, lighter than a seed landing in your hand
