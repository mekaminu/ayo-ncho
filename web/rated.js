// A fair rating (idea 7 Nov): your rating against the computer (web/rating.js) moved after every finished game, and Undo against
// the computer is free and unlimited — so a game won by taking back every bad move counted the same as one won straight, and
// the number crept up past what you can really do. Now a game in which you took a move back is left out of the rating: the
// first Undo of a game says so once ("Taken back · this game won't count for your rating"), and the Game over card shows your
// rating as it stands with "Not rated · you took back 2 moves" instead of a change. Hints still count (one a turn, they teach).
// Undo in two of us, a play-out and a room never touched the rating, so nothing changes there. Pure functions, no DOM
// (test/rated.test.js); web/game.js keeps the count in the game's stats, so it survives a reload.

export const UNDO_NOTE = "Taken back · this game won't count for your rating";

// Does this game move the rating? (stats as web/game.js keeps them; an old save without the count is a rated game)
export function counts(stats) { return !(stats && Number.isInteger(stats.undos) && stats.undos > 0); }

// One more Undo in this game; returns the new stats and whether to say the note (only on the game's first one, when rated).
export function tookBack(stats, ratedGame = true) {
  const n = (stats && Number.isInteger(stats.undos) ? stats.undos : 0) + 1;
  return { stats: { ...stats, undos: n }, note: ratedGame && n === 1 };
}

// The Game over card's line in place of the change.
export function unratedWords(stats) {
  const n = stats && Number.isInteger(stats.undos) ? stats.undos : 0;
  return `Not rated · you took back ${n === 1 ? 'a move' : `${n} moves`}`;
}
