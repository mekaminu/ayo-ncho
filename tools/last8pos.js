// A game one move from the last 8, for the render: random play (seeded) until the player (seat 0) has a move that brings the board
// down to 8 seeds or fewer without ending the game. Prints JSON {moves, pit, left}: `moves` is the saved game to put on the phone
// (your move next), `pit` the move that crosses, `left` the seeds left on the board after it.
// Usage: node tools/last8pos.js [seed]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { crossed, seedsLeft } from '../web/last8.js';

let seed = +(process.argv[2] || 5);
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
for (let g = 0; g < 2000; g++) {
  let s = newGame('ncho');
  while (!s.over && s.moves.length < 300) {
    const legal = legalMoves(s);
    if (s.turn === 0 && s.moves.length >= 10) {
      // prefer a crossing that leaves more pits holding seeds (a better picture), and a reply that keeps the last 8 going
      const hits = legal.map((p) => ({ p, next: applyMove(s, p).state })).filter(({ next }) => crossed(s, next) && !next.over && next.pits.filter((n) => n).length >= 3);
      if (hits.length) { const h = hits[0]; console.log(JSON.stringify({ moves: s.moves, pit: h.p, left: seedsLeft(h.next) })); process.exit(0); }
    }
    s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no such game found'); process.exit(1);
