// "Take it back?" in a game with a friend: the Undo chip, which has no place online as a plain undo, asks the friend to
// take back the move you just played. They say yes (the seeds fly back to where they were and it is your move again)
// or "Play on" (the move stands); playing their own move says no too. Once per move. The engine undoes it
// (engine/ayo.js takeBack), the server is the referee (Rooms.askBack / answerBack); this file holds the words, when the
// ask is offered and which seeds fly where, so it is tested in node (test/takeback.test.js).

// May this board ask right now? Seated in a room with the friend there, the game in play, no turn on the board, the last
// move yours (so it is their move), nothing already asked, and not asked once already for this very move.
export function mayAsk({ online, friend, seated, over, busy, moves = [], turn, you, pending, askedN }) {
  if (!online || !friend || !seated || over || busy || pending) return false;
  if (!moves.length || turn === you) return false;
  const last = moves[moves.length - 1]; if ((last < 6 ? 0 : 1) !== you) return false;
  return askedN !== moves.length;
}

// What the chip and the card say. name: the friend's name.
export function backWords(name = 'Your friend') {
  return {
    chip: 'Ask to take back your move',                                     // the Undo chip's label in a room
    asked: `Asked ${name} to take back your move — waiting`,                // the hint line while the ask is out
    title: `${name} asks to take back their move`,                          // the card on the friend's board
    sub: 'Their seeds go back where they were and it is their move again. Or play on and the move stands.',
    yes: 'Let them', no: 'Play on',
    yesMine: `${name} said yes — your move again`,                          // toasts: the asker's board
    noMine: `${name} says play on — the move stands`,
    yesTheirs: `Taken back — ${name}'s move again`,                         // the friend's board
    noTheirs: 'Play on — the move stands',
    gone: `${name} played on — the move stands`,                            // the asker's board when the friend just moved
  };
}

// Which seeds fly where when a move is taken back. before/after: {pits:[12], stores:[2]}. Every home (pit 0..11, 'S0',
// 'S1') keeps the seeds it still holds at the bottom; the ones it has too many of leave from the top and land in the
// homes that are short, in the order the seeds will land (the troughs give theirs back first, then the pits nearest the
// pit that was played, going back round the board). Returns [{from, fromSlot, to, toSlot}], one per seed that moves.
export function planReturn(before, after, played = 0) {
  const count = (s) => { const c = {}; s.pits.forEach((n, i) => { c[i] = n; }); c.S0 = s.stores[0]; c.S1 = s.stores[1]; return c; };
  const a = count(before), b = count(after);
  const back = (i) => (((played - i) % 12) + 12) % 12; // how far back round the board from the pit played: its last seeds left first
  const homes = ['S0', 'S1', ...[...Array(12).keys()].sort((x, y) => back(y) - back(x))];
  const leaving = [];
  for (const h of homes) for (let k = a[h] - 1; k >= b[h]; k--) leaving.push({ from: isNaN(+h) ? h : +h, fromSlot: k });
  const landing = [];
  const into = [played, ...[...Array(12).keys()].filter((i) => i !== played), 'S0', 'S1'];
  for (const h of into) for (let k = a[h]; k < b[h]; k++) landing.push({ to: h, toSlot: k });
  if (leaving.length !== landing.length) throw new Error('the seeds do not add up');
  return leaving.map((l, i) => ({ ...l, ...landing[i] }));
}
