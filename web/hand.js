// Left hand (idea 7 Nov): on a wide screen (the Fold open, a phone on its side, the Mac) the game put the scores down the
// left and the buttons down the right, where a right thumb rests. A left-handed player holding the open Fold reached across
// the board for Undo and Hint. Settings → Feel → Hand: Right (as it was) or Left, which mirrors that layout — buttons down
// the left, scores and faces down the right — and the board moves to sit in the middle of the room left between them.
// The tall phone (buttons along the bottom) and the Fold half folded (buttons across the crease) need no mirror.

export const HANDS = ['right', 'left'];
export const handPref = (v) => (v === 'left' ? 'left' : 'right');
// what the page uses: ?hand=left|right (for the renders) wins over the saved choice
export const handNow = (saved, param) => handPref(param === 'left' || param === 'right' ? param : saved);
// mirrored only where the side layout is in use
export const mirrored = (hand, { wide, table }) => hand === 'left' && !!wide && !table;

// the room the bars leave for the board on a wide screen: between the cards and the buttons, whichever side each is on
export function wideRoom(hand, { cards, bar, w, top }) {
  if (hand === 'left') return { l: Math.max(0, bar.right) + 16, r: Math.min(w, cards.left) - 16, t: top + 40 };
  return { l: cards.right + 16, r: Math.min(w, bar.left) - 16, t: top + 40 };
}

export const handNote = (hand) => (hand === 'left' ? 'buttons down the left, scores down the right' : 'buttons down the right, scores down the left');
export const handToast = (hand) => (hand === 'left' ? 'Buttons down the left' : 'Buttons down the right');
