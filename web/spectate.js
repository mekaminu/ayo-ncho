// Family round the board, slice 2: the board for whoever opens a watch link (?watch=CODE-KEY, web/online.js watchLink),
// and the players' side of it. A watcher has no seat: seat 0 (who opened the room) sits near, seat 1 far, both cards carry
// their names, nothing on the board can be pressed, Home leaves, and the Game over card has no Play again. No DOM here,
// so test/spectate.test.js checks every line.

const nameOf = (room, seat) => (room && Array.isArray(room.players) && room.players[seat] ? room.players[seat].name : null);

// The two cards: near is seat 0, far is seat 1; a seat nobody has taken yet waits for its player.
export function spectateCards(room) {
  return [0, 1].map((seat) => ({ seat, name: nameOf(room, seat) || (seat === 1 ? 'Waiting for a player' : 'Someone') }));
}

// What each card says under its name, and the line under the board. link: the watcher's connection ('open' | 'reconnecting' | …).
export function spectateWords(state, room, link = 'open') {
  const [a, b] = [nameOf(room, 0), nameOf(room, 1)];
  const sub = (seat) => {
    const p = room && room.players && room.players[seat];
    if (!p) return seat === 1 ? 'not here yet' : '';
    if (!p.online) return 'away — their seat is held';
    if (state.over) return '';
    return state.turn === seat ? 'to move' : '';
  };
  let hint;
  if (link !== 'open') hint = link === 'reconnecting' ? 'Watching · reconnecting…' : 'Watching · no connection';
  else if (!b) hint = `Watching · waiting for ${a || 'the host'}'s friend`;
  else if (state.over) hint = 'Watching · the game is over';
  else { const who = nameOf(room, state.turn); hint = who ? `Watching · ${who}'s move` : 'Watching'; }
  return { near: sub(0), far: sub(1), hint };
}

// The Game over card's title for a watcher: whose game it was, never "You win".
export function spectateTitle(state, room) {
  if (!state || !state.over) return '';
  const w = state.winner;
  if (state.agreed || w === 'draw' || w === null || w === undefined) return 'A draw';
  const winner = nameOf(room, w) || (w === 0 ? 'Player 1' : 'Player 2');
  if (state.resigned != null) { const giver = nameOf(room, state.resigned); return giver ? `${giver} gave up · ${winner} wins` : `${winner} wins`; }
  return `${winner} wins`;
}

// The players' side: the watch link may be sent once this board holds a seat and the room gave the key.
export function mayShareWatch({ online, seated, key } = {}) { return !!(online && seated && typeof key === 'string' && key.length >= 16); }

// What the watch link says when it is sent (WhatsApp, the share sheet), in the sender's voice.
export function watchText() { return 'Come and watch our game of Ayo & Nchò live — open the link and follow every move, no seat needed.'; }

// Who came to watch since the last room: names newly in the list (by id), oldest first, so the boards can say "Mum came to watch".
export function newWatchers(before, after) {
  const had = new Set((before || []).map((w) => w.id));
  return (after || []).filter((w) => !had.has(w.id)).map((w) => w.name);
}
export function cameWords(name) { return `${name} came to watch`; }
