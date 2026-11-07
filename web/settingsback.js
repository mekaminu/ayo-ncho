// Back from Settings goes back where you were (fix 7 Nov). Pure logic, no DOM, so node can test it (test/settingsback.test.js).
//
// Settings → Back used to decide by one thing: was a game with the same rules under way? If not, Back went to Home. So a player
// who opened Settings from the board of a game not yet begun (the board just dealt, nothing sown) and came straight back was
// put on Home without asking, and the next tap where a pit had been landed on Play instead (the "first tap only wakes the board"
// seen on the phone test). And Settings opened from Home went back to the board whenever a game was under way.
//
// Now Back goes to where Settings was opened from:
//   'play'  — the board, as it was;
//   'new'   — the board, with a fresh game dealt in place: you came from a game not yet begun and changed its rules or who plays,
//             so nothing is lost by starting it again with what you chose (the
//             seeds are dealt again from the troughs, which is the sign it is a new game);
//   'home'  — Home: you came from Home, or you changed the rules of a game already under way (the toast said the next game
//             uses them, and Play there starts it).
// In a room with a friend it is always the board (the room's rules are the room's).

export const SETTINGS_FROM = ['home', 'play'];

// settingsBackTo({ online, from, sameRules, sameMode, moves, special }): where Settings → Back goes
//   from      — the screen Settings was opened from ('home' | 'play'); anything else counts as Home
//   sameRules — the game on the board has the variant and rules Settings now says
//   sameMode  — and the same players (against the computer, or two of us on this phone)
//   moves     — how many moves that game has had
//   special   — the board is showing something that is not a plain game (a game being watched, a puzzle played out, a retry):
//               never dealt over; a changed rule there goes Home as before
export function settingsBackTo({ online = false, from = 'home', sameRules = true, sameMode = true, moves = 0, special = false } = {}) {
  if (online) return 'play';
  if (from !== 'play') return 'home';
  if (sameRules && sameMode) return 'play';
  if (!special && !(moves > 0)) return 'new';
  return 'home';
}


// the word when a rule is changed in Settings: a game not yet begun is dealt again on Back, so it says so
export const RULES_NEXT = 'Rules changed: next game uses them';
export const RULES_FRESH = 'Rules changed: a fresh board when you go back';
export function rulesWords({ online = false, from = 'home', moves = 0, special = false } = {}) {
  return !online && from === 'play' && !special && !(moves > 0) ? RULES_FRESH : RULES_NEXT;
}
