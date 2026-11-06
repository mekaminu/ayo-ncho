// Play keeps your game (idea 6 Nov): Home's big Play button starts a new game, and there is only ever one game kept on
// the phone — so a Play tapped instead of Continue ended a game of forty moves without a word. Now, while a game worth
// keeping is under way, the first tap on Play asks ("New game? · Tap again — the game in progress ends") and Continue
// glows beside it; a second tap within three seconds starts the new game, otherwise Play goes back as it was. The
// two-tap guard is web/giveup.js's own; this file decides when Play asks and what it says (test/keepgame.test.js).

export { makeGuard, ARM_MS } from './giveup.js';

export const KEEP_MIN_MOVES = 4; // a game of a move or two is not worth a question: two of yours and two of theirs

// Whether a tap on Play should ask first. saved: the game kept on this phone (web/game.js savedGame(), null when none
// or when it is over); lessonDue: a new phone's first Play opens the lesson instead, which starts no game.
export function playAsks(saved, { lessonDue = false } = {}) {
  if (lessonDue || !saved || saved.over) return false;
  return Array.isArray(saved.moves) && saved.moves.length >= KEEP_MIN_MOVES;
}

// What the game in progress is, in a few words for the asking line: "you lead 12–8", "Player 2 leads 9–4", "level 6–6".
export function keptWords(saved, { local = false, names = ['Player 1', 'Player 2'] } = {}) {
  const [a, b] = saved.stores || [0, 0];
  if (local) return a === b ? `level ${a}–${b}` : a > b ? `${names[0]} leads ${a}–${b}` : `${names[1]} leads ${b}–${a}`;
  return a === b ? `level ${a}–${b}` : a > b ? `you lead ${a}–${b}` : `you trail ${a}–${b}`;
}

// The Play button's words while it asks. keys: a mouse or the keys are in use (the Mac), so "Click" rather than "Tap".
export function askWords(saved, { keys = false, local = false, names } = {}) {
  return {
    title: 'New game?',
    sub: `${keys ? 'Click' : 'Tap'} again — your game ends (${keptWords(saved, { local, names })})`,
    label: `Start a new game? Your game in progress ends — ${keys ? 'press' : 'tap'} again to start one, or Continue to keep it`,
  };
}
