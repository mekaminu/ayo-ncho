// Put it back (idea 8 Nov): Undo against the computer (and two of us) takes moves back, but nothing put them back — a
// learner who stepped back to look at a position ("what did the board look like before I played that?") could only
// play on from there, and the computer's reply might not be the same again. The chess apps all pair Undo with a forward
// arrow. Now, after an Undo, a brass chip under the board says "Put it back · 2 moves" (and R on the Mac's keys): each tap
// plays your move again, and the computer answers with exactly the reply it gave before, every seed animated as it was.
// Undo twice and it puts back four moves, two at a time. Playing a different pit drops it: that is a new game from there.
// A game you took back still doesn't count for your rating (web/rated.js) — putting it back doesn't undo the take-back.
// Pure functions, no DOM: game.js keeps one `line` and asks these what it may do.
//
// A line is { base, rest, key }: `base` the moves the game has now (the kept part), `rest` the moves taken back, in the
// order they were played, and `key` what the game is (variant, rules, who opened) so it never runs into another game.

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export function gameKey(s) { return s ? JSON.stringify([s.variant, s.first, s.rules || null]) : ''; }

// After an Undo from `before` (the moves as they were) to `keep` (the moves left). Undoing again on top of a line keeps it:
// the moves just taken back go in front of the ones already waiting.
export function afterUndo(line, before, keep, key) {
  if (!Array.isArray(before) || !Array.isArray(keep) || keep.length >= before.length || !same(before.slice(0, keep.length), keep)) return line || null;
  const gone = before.slice(keep.length);
  const rest = line && line.key === key && same(line.base, before) ? gone.concat(line.rest) : gone;
  return { base: keep.slice(), rest, key };
}

// Whether the chip shows: the game is still the one the line came from, with nothing played since.
export function ready(line, moves, key) { return !!(line && line.rest.length && line.key === key && Array.isArray(moves) && same(line.base, moves)); }

// What one press puts back: your move, and (against the computer) the reply it gave, if it gave one before you undid.
// Two of us puts back one move a press, as Undo took one.
export function step(line, { local = false } = {}) {
  if (!line || !line.rest.length) return null;
  return { mine: line.rest[0], reply: local ? null : line.rest.length > 1 ? line.rest[1] : null };
}

// After any move lands: a move that is the next one waiting walks the line on; any other move ends it.
export function afterMove(line, moves, key) {
  if (!line || line.key !== key || !Array.isArray(moves)) return null;
  if (moves.length !== line.base.length + 1 || !same(moves.slice(0, line.base.length), line.base) || moves[moves.length - 1] !== line.rest[0]) return null;
  const rest = line.rest.slice(1);
  return rest.length ? { base: moves.slice(), rest, key } : null;
}

// The chip's words. `n`: moves waiting.
export function chipWords(n) { return n === 1 ? '1 move' : `${n} moves`; }
export const CHIP = 'Put it back';
export const TITLE = 'Play the moves you took back again · R';
export const HINT = 'Putting it back';
