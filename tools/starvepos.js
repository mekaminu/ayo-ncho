// A game for the "nothing they can play" render: random Ayo play (seeded) until it is the player's (seat 0) move, the other side
// has no seeds, the feed rule does not narrow the move and every pit leaves them none (web/feed.js starveOf), with at least three
// pits to choose from. Prints JSON {moves, pits}: `moves` the saved game to put on the phone (your move next), `pits` the pits.
// Usage: node tools/starvepos.js [seed]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { starveOf } from '../web/feed.js';

let seed = +(process.argv[2] || 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
for (let g = 0; g < 50000; g++) {
  let s = newGame('ayo');
  while (!s.over) {
    if (s.turn === 0 && s.moves.length >= 6) {
      const st = starveOf(s, 0);
      if (st && st.all && st.pits.length >= 3) { console.log(JSON.stringify({ moves: s.moves, pits: st.pits, stores: s.stores })); process.exit(0); }
    }
    const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no position found'); process.exit(1);
