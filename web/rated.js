// A fair rating (idea 7 Nov): your rating against the computer (web/rating.js) moved after every finished game, and Undo against
// the computer is free and unlimited — so a game won by taking back every bad move counted the same as one won straight, and
// the number crept up past what you can really do. Now a game in which you took a move back is left out of the rating: the
// first Undo of a game says so once (now "Taken back · a win or draw won't count for your rating now, a loss still will", see below), and the Game over card shows your
// rating as it stands with "Not rated · you took back 2 moves" instead of a change. Hints still count (one a turn, they teach).
// Undo in two of us, a play-out and a room never touched the rating, so nothing changes there. Pure functions, no DOM
// (test/rated.test.js); web/game.js keeps the count in the game's stats, so it survives a reload.

// A take-back hides no loss (idea 10 Nov, night): left at that, one Undo in a game you were losing took the coming loss out
// of the rating too — trailing 6–20 to Mama Ngozi, tap Undo once and the defeat never touched the number, the same dodge
// "Walking away counts" closed for Play → New game. Now a game with a take-back still leaves out a win or a draw (the move
// you took back might have been the one that won it), but a loss counts as it would have without the Undo: taking a move
// back can only ever help you, so it cannot be a way to keep a loss off the rating. The note says both halves; the card's
// line on a loss says the take-back did not hide it.
export const UNDO_NOTE = "Taken back · a win or draw won't count for your rating now, a loss still will";

// Does this game move the rating? (stats as web/game.js keeps them; an old save without the count is a rated game)
export function counts(stats) { return !(stats && Number.isInteger(stats.undos) && stats.undos > 0); }

// One more Undo in this game; returns the new stats and whether to say the note (only on the game's first one, when rated).
export function tookBack(stats, ratedGame = true) {
  const n = (stats && Number.isInteger(stats.undos) ? stats.undos : 0) + 1;
  return { stats: { ...stats, undos: n }, note: ratedGame && n === 1 };
}

// Does this game, ending this way ('win' | 'loss' | 'draw', from your side), move the rating? A loss always does.
export function countsFor(stats, outcome) { return outcome === 'loss' || counts(stats); }

// What a game with a take-back adds to the card's line when it was lost and still counted; '' otherwise.
export function lossKeptWords(stats, outcome) {
  const n = stats && Number.isInteger(stats.undos) ? stats.undos : 0;
  if (outcome !== 'loss' || n < 1) return '';
  return `you took back ${n === 1 ? 'a move' : `${n} moves`}, the loss still counts`;
}

// The Game over card's line in place of the change.
export function unratedWords(stats) {
  const n = stats && Number.isInteger(stats.undos) ? stats.undos : 0;
  return `Not rated · you took back ${n === 1 ? 'a move' : `${n} moves`}`;
}
