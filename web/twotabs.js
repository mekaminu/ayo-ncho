// Two tabs, one game (idea 9 Nov): the game against the computer is kept in the browser's storage ("ayo.game"), and every tab
// of the game on the same phone or Mac shares it. The game opened again from a WhatsApp link opens a second tab while the first
// lingers (Chrome on the Fold does this), and on the Mac the game is often open in two windows. Before this, each tab played
// its own copy: play on in the new tab, go back to the old one, and its stale board was still there — one move there and the
// moves played in the other tab were written over and gone for good.
// Now each tab remembers the save it last wrote or read (watch.mark). When another tab writes a different one (the browser's
// "storage" event), or this tab comes back into view or focus, the tab follows it: the board is laid out from the newer game
// (on Home quietly, on the board with a word), as soon as nothing is moving on it. A tab out of sight never writes over a game
// another tab saved (mayWrite). Games with a friend live on the server and are not touched; nor are the puzzle, the lesson,
// Mama Ngozi's review or a play-out, which keep the player's own game as it was saved (they wait, and follow when they end).

export const GAME_KEY = 'ayo.game';

// What this tab last wrote or read, against what is in storage now.
export function tabWatch(read) {
  let mine = safe(read);
  return {
    mark(v) { mine = v === undefined ? safe(read) : v; },
    stale() { return safe(read) !== mine; },
    get mine() { return mine; },
  };
}
function safe(read) { try { const v = read(); return v === undefined ? null : v; } catch { return null; } }

// A tab out of sight never writes over a game another tab saved since this one last looked.
export function mayWrite({ stale, hidden }) { return !(stale && hidden); }

// Whether to follow the other tab's game now: 'follow', 'wait' (later, once what is on now ends) or 'none'.
export function followNow(c) {
  if (!c.stale) return 'none';
  if (c.online) return 'none'; // a game with a friend is the server's
  if (c.busy || c.deal || c.playout || c.review || c.lesson || c.puzzle || c.over) return 'wait';
  if (c.screen !== 'play' && c.screen !== 'home') return 'wait';
  return 'follow';
}

// The word on the board when it follows (Home changes quietly: its Continue line already reads the save).
export function followWords(resumed, screen) {
  if (screen !== 'play') return null;
  return resumed ? 'Picked up from your other tab' : 'That game ended in your other tab';
}
