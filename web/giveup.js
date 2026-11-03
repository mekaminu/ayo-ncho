// Giving up a game with a friend: the last button in the shout row ("Give up this game"), which asks once more before
// it goes ("Tap again to give up"), and the words both boards say once someone has. The engine ends the game
// (engine/ayo.js `resign`), the server is the referee (Rooms.resign); this file only holds the words and the
// two-tap guard, so it is tested in node (test/giveup.test.js).

export const ARM_MS = 3000; // the second tap must come within three seconds, or the button goes back to asking

// The two-tap guard: tap() returns 'armed' on the first tap, 'go' on a second tap in time, and arms again after ARM_MS.
export function makeGuard(ms = ARM_MS) {
  let armedAt = null;
  return {
    get armed() { return armedAt !== null; },
    tap(now) { if (armedAt !== null && now - armedAt <= ms) { armedAt = null; return 'go'; } armedAt = now; return 'armed'; },
    expired(now) { return armedAt !== null && now - armedAt > ms; },
    reset() { armedAt = null; },
  };
}

// What the button says, before and after the first tap.
export const BUTTON = { idle: 'Give up this game', armed: 'Tap again to give up' };
export const BUTTON_KEYS = { idle: 'Give up this game', armed: 'Click again to give up' };

// The words once a seat has given up, from this board's side. you: this board's seat; name: the friend's name.
export function gaveUpWords(resigned, you, name = 'Your friend') {
  const mine = resigned === you;
  return {
    who: mine ? 'You gave up' : `${name} gave up`,                       // the Game over card's eyebrow, after the move count
    title: mine ? `${name} wins` : 'You win',                             // the Game over card's title
    toast: mine ? `You gave up — ${name} wins` : `${name} gave up — you win`,
    story: mine ? 'you gave up' : `${name} gave up`,                      // the end of the line's words on the card
  };
}

// Whether the button is offered right now: in a room, with the friend seated, while the game is still in play.
export function mayGiveUp({ online, friend, over, seated }) { return !!(online && friend && seated && !over); }
