// Offer a draw in a game with a friend: a button in the shout row beside "Give up this game". One tap offers; the friend's
// board shows a card ("Meka offers a draw") with Play on / Agree a draw, and playing a move is a no. A yes ends the game level
// on both boards whatever the seeds say. The engine ends it (engine/ayo.js `agreeDraw`), the server is the referee
// (Rooms.offerDraw / answerDraw); this file holds when the button is offered and the words, so it is tested in node
// (test/draw.test.js).

// Whether the button may offer right now: in a room with the friend seated, the game in play, no offer out either way, and
// not offered already at this move (once a move, so a no is not asked again straight away).
export function mayOfferDraw({ online, friend, seated, over, pending, theirs, offeredN, moves }) {
  return !!(online && friend && seated && !over && !pending && !theirs && offeredN !== moves);
}

// What the button says: offering, waiting for an answer, or already offered at this move.
export function drawButton({ pending, theirs, offeredN, moves }) {
  if (pending) return 'Draw offered — waiting';
  if (theirs) return 'They offered a draw';
  if (offeredN === moves) return 'Draw offered at this move';
  return 'Offer a draw';
}

// The words, from this board's side. name: the friend's name.
export function drawWords(name = 'Your friend') {
  return {
    offered: `Offered ${name} a draw — waiting`,                     // toast and hint line on the offerer's board
    title: `${name} offers a draw`,                                    // the card on the friend's board
    sub: 'The game ends level, whatever the seeds say. Or play on — your move is a no.',
    yes: 'Agree a draw', no: 'Play on',
    yesToast: 'A draw — agreed',                                       // both boards, as the game ends
    noMine: `${name} says play on`,                                    // the offerer's board
    noTheirs: 'Play on — no draw',                                     // the friend's board
    goneMine: `${name} played on — no draw`,                           // the offerer's board when the friend just moved
    who: 'Agreed a draw',                                              // the Game over card's eyebrow, after the move count
    title2: 'A draw',                                                  // the Game over card's title
    story: 'agreed a draw',                                            // the end of the line of how the game went
    away: `${name} offers a draw`,                                     // the tab's title while out of sight
    overAway: 'A draw · agreed',
  };
}
