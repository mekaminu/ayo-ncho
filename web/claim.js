// A friend gone from the board (idea 9 Nov): a game with a friend whose phone was put away for good — the tab closed, the
// battery gone, the signal lost on the bus — sat there for ever: "away — their seat is held", the room kept six hours, and
// the one still at the board could only give the game up themselves (and lose it) or leave it. The chess apps let the
// player left at the board claim the game once the other has been gone a while. Now the line under their name says for how
// long ("away 3 min — their seat is held"), and once they have been gone CLAIM_MS the shout row offers "Take the game ·
// Tete away 5 min" (two taps, like Give up). The server is the referee (server/rooms.js `claim`): it ends the game as if the
// one away had given up, never while their line is open, never sooner; both boards then say why. Pure words and sums here,
// so node tests them (test/claim.test.js); game.js paints them.

export const CLAIM_MS = 5 * 60 * 1000; // gone this long, their line closed the whole time

// How long the friend has been away, on this board's clock: what the server said (awayMs) when the room arrived (at), plus
// the time since. Null while they are at the board (or no room yet).
export function awayFor(friend, at, now) {
  if (!friend || friend.online) return null;
  const base = Number.isFinite(friend.awayMs) && friend.awayMs >= 0 ? friend.awayMs : 0;
  return base + Math.max(0, (Number.isFinite(now) ? now : 0) - (Number.isFinite(at) ? at : 0));
}

// Whole minutes for the words (under a minute says nothing; an hour and more says hours).
export function awayTime(ms) {
  if (!Number.isFinite(ms) || ms < 60 * 1000) return '';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60); return h === 1 ? '1 hour' : `${h} hours`;
}

// The line under the friend's name while they are away.
export function awayLine(ms) { const t = awayTime(ms); return t ? `away ${t} — their seat is held` : 'away — their seat is held'; }

// Whether "Take the game" is offered right now: in a room, seated, the friend seated and gone CLAIM_MS, the game still in play.
export function mayClaim({ online, friend, seated, over, awayMs }) {
  return !!(online && friend && seated && !over && !friend.online && Number.isFinite(awayMs) && awayMs >= CLAIM_MS);
}

// What the button says, before and after the first tap.
export function claimButton(name = 'Your friend', ms = CLAIM_MS, armed = false, keys = false) {
  if (armed) return keys ? 'Click again to take the game' : 'Tap again to take the game';
  const t = awayTime(ms); return `Take the game · ${name} away${t ? ' ' + t : ''}`;
}

// Said once, the moment the claim becomes possible (a toast), so the player knows the shout chip holds it.
export function claimReady(name = 'Your friend') { return `${name} has been away a while — you can take the game (the speech chip)`; }

// The words once a game was taken from the seat that was away, from this board's side (same shape as giveup.js gaveUpWords).
// awaySeat: the seat that was away (and loses); you: this board's seat; name: the friend's name.
export function claimWords(awaySeat, you, name = 'Your friend') {
  const mine = awaySeat === you;
  return {
    who: mine ? 'You were away' : `${name} was away`,
    title: mine ? `${name} wins` : 'You win',
    toast: mine ? `${name} took the game while you were away` : `${name} was away — the game is yours`,
    story: mine ? 'you were away' : `${name} was away`,
  };
}
