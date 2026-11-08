// Ayo next (idea 8 Nov): at a real board, after a game of Nchò someone says "now let's play Ayo" — the same two
// people, the same board, the other game. In a room with a friend the Game over card offers both: Play again (the
// same game) and Play Ayo next / Play Nchò next. Each side asks for one; a new game starts only when both have asked
// for the same one, so nobody is switched to a game they did not choose. Asking for the other game clears the
// friend's ask for the old one: their card then says "Play Ayo next — Tete is ready".
// Pure, no DOM: server/rooms.js checks the ask with it, web/game.js words the two buttons with it.
//
// A switch starts the other game with its own rules as they come (no custom switches carried over from the last
// game: those belonged to that game); asking for the same game again keeps the room's rules exactly as they were.

export const GAMES = ['ncho', 'ayo'];
export const GAME_NAME = { ncho: 'Nchò', ayo: 'Ayo' };

export const otherGame = (v) => (v === 'ayo' ? 'ncho' : 'ayo');
// What a seat asked for: a known game, or the room's own when nothing (or nonsense) was sent — an older board
// sends no game with its ask, and that has always meant "the same again".
export function askedGame(game, current) { return GAMES.includes(game) ? game : current; }

// A seat's ask as the room keeps it; false when the seat has not asked.
export function wishOf(seat, current) { return seat && seat.wantsRematch ? askedGame(seat.wantsGame, current) : false; }

// The room after one seat asks: { wishes: [w0, w1], start: game | null }. A different ask from the other seat is
// cleared (they are asked again, for this game); when both ask for the same game it starts.
export function afterAsk(wishes, seat, game, current) {
  const want = askedGame(game, current);
  const next = wishes.slice(); next[seat] = want;
  const o = 1 - seat;
  if (next[o] && next[o] !== want) next[o] = false;
  return { wishes: next, start: next[o] === want ? want : null };
}

// The two buttons on a room's Game over card.
//   current: the game just played · mine: what this phone asked for (or false) · theirs: what the friend asked for (or false)
//   name: the friend's name
// → { main: { game, text, disabled }, alt: { game, text } } — main is the big button, alt the quiet one under it.
export function rematchButtons({ current, mine = false, theirs = false, name = 'your friend' }) {
  const G = (v) => GAME_NAME[v] || GAME_NAME.ncho;
  if (mine) {
    const o = otherGame(mine);
    return {
      main: { game: mine, text: mine === current ? `Waiting for ${name}…` : `Waiting for ${name}… · ${G(mine)} next`, disabled: true },
      alt: { game: o, text: o === current ? `${G(o)} again instead` : `${G(o)} next instead` },
    };
  }
  if (theirs) {
    const o = otherGame(theirs);
    return {
      main: { game: theirs, text: theirs === current ? `Play again — ${name} is ready` : `Play ${G(theirs)} next — ${name} is ready`, disabled: false },
      alt: { game: o, text: o === current ? `${G(o)} again instead` : `Play ${G(o)} next` },
    };
  }
  const o = otherGame(current);
  return { main: { game: current, text: 'Play again', disabled: false }, alt: { game: o, text: `Play ${G(o)} next` } };
}

// The toast when the friend asks: "Tete wants to play again" or "Tete wants to play Ayo next".
export function askWords(name, game, current) {
  return game === current ? `${name} wants to play again` : `${name} wants to play ${GAME_NAME[game]} next`;
}
// The start of the new game's toast when the game changed: "Now Ayo" (the rest — who starts — follows as before).
export function switchedWords(game) { return `Now ${GAME_NAME[game]}`; }
