// The keys, on How to play (idea 7 Nov): the board answers to a dozen keys on the Mac (web/keys.js) — 1–6, Enter, U, H, Esc,
// the arrows, + −, 0, S, F — but nothing on the screen ever listed them, so a player found them only by being told. Now the
// How to play card ends with a Keys list wherever a keyboard is likely (a mouse or trackpad, or once any key has been
// pressed), and ? opens the card at that list from the board. While the card is open each key still works, and its line
// glints as it is pressed, so the list teaches by doing. Pure functions, no DOM: game.js draws the rows and says when.
//
// A row is { id, keys, what }: `keys` the caps drawn (a dash between two caps means a range, e.g. 1 – 6), `what` its words.
// The rows follow where you play: against a friend U asks to take your move back and there is no hint; F shows only where
// full screen works (web/fullscreen.js fullSupport).

export const HELP = ['?'];

export function keyRows({ online = false, full = false } = {}) {
  const rows = [
    { id: 'pit', keys: ['1', '–', '6'], what: 'pick your pit, nearest first' },
    { id: 'sow', keys: ['Enter'], what: 'sow the pit you picked (Space too)' },
    { id: 'deselect', keys: ['Esc'], what: 'put the pit back, or close a card' },
    { id: 'undo', keys: ['U'], what: online ? 'ask to take your move back' : 'undo your move' },
  ];
  if (!online) rows.push({ id: 'hint', keys: ['H'], what: 'a hint' });
  rows.push(
    { id: 'turn', keys: ['←', '→'], what: 'turn the board' },
    { id: 'tilt', keys: ['↑', '↓'], what: 'look from higher or lower' },
    { id: 'zoom', keys: ['+', '−'], what: 'nearer or farther' },
    { id: 'straight', keys: ['0'], what: 'set the board straight' },
    { id: 'say', keys: ['S'], what: 'say the score and whose move' },
  );
  if (full) rows.push({ id: 'full', keys: ['F'], what: 'full screen, and back' });
  rows.push({ id: 'help', keys: ['?'], what: 'this list' });
  return rows;
}

// Should the card carry the list? Where a keyboard is likely: a fine pointer that can hover (a Mac, a Fold with a mouse), or
// any key already pressed on this visit. A phone held in the hand never sees it.
export function showKeys({ mouse = false, keysUsed = false } = {}) { return !!(mouse || keysUsed); }

// The row a key press belongs to (web/keys.js keyAction's answer), so its line can glint; null when none is shown for it.
export function rowOf(action, rows) {
  if (!action || !action.type) return null;
  const id = action.type === 'view' ? action.kind : action.type;
  return rows.some((r) => r.id === id) ? id : null;
}

// The card's line under the heading.
export const KEYS_NOTE = 'Press ? on the board any time for this list.';
