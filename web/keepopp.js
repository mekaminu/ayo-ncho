// Who you play, you finish with (idea 10 Nov, night): picking an opponent — a pill on Home, or Choose under Settings →
// Opponent — changed who was playing the game already on the board. Opened from the board, Settings → Back went straight
// back to that game (same rules, same players: web/settingsback.js), and the next move came from the new choice: a game
// half lost to Mama Ngozi could be handed to Adaeze and won, and the record and the rating counted it against whoever sat
// there at the end — a win over Mama Ngozi for a game Adaeze lost to you, or none of the loss she had earned. It was the
// one hole left beside "Walking away counts" (web/walkaway.js) and "A rating you can trust" (web/rated.js). From Home,
// Continue put the old opponent back without a word, and the choice made there was lost.
//
// Now a game against the computer already begun keeps its opponent to the end, as at a real board you do not swap the
// person across from you mid-game: the choice waits for the next game (Play, New game, Play again), the way a changed rule
// does ("Rules changed: next game uses them"), and it says so: "Adaeze next game · Mama Ngozi finishes this one". A game
// not yet begun (nothing sown) takes the new opponent at once. Two of us, a game with a friend, the puzzle and the lesson
// have no computer opponent to keep. Pure functions, no DOM (test/keepopp.test.js).

// kept: the game kept on this phone as web/game.js saves it ({ moves, level, local }) when it is still in play, else null.
// Is it a game against the computer already begun?
export function underWay(kept) {
  return !!kept && !kept.local && Array.isArray(kept.moves) && kept.moves.length > 0;
}

// A pick of opponent `pick` while `level` plays the board. Returns { level, next }: who plays the game now and who is
// waiting for the next one (null when nobody is).
export function choose({ kept, level, pick }) {
  if (!underWay(kept)) return { level: pick, next: null };
  const now = kept.level || level;
  return { level: now, next: pick === now ? null : pick };
}

// After the kept game is brought back (a reload, Continue): the opponent last chosen waits if it is not the game's own.
export function waiting({ kept, chosen }) {
  if (!underWay(kept) || !chosen) return null;
  return chosen === (kept.level || chosen) ? null : chosen;
}

// A new game: whoever was waiting sits down now.
export function seated(level, next) { return next || level; }

// The word when a pick waits: "Adaeze next game · Mama Ngozi finishes this one"; when the pick is the game's own again: null.
export function nextWords(next, nowName, nextName) {
  return next ? `${nextName} next game · ${nowName} finishes this one` : null;
}
// Continue's line on Home says who the kept game is with, while someone else is waiting: "… · with Mama Ngozi"
export function withWords(next, nowName) { return next ? `with ${nowName}` : ''; }
