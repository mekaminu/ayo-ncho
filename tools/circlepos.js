// A game one move from the circling line, for the render: random play (seeded) until it is the player's move (seat 0) with 47 moves
// gone by since the last capture and a move that captures nothing, so playing it brings up the line (12 moves to the call).
// Prints JSON {moves, pit, left, keeps}: `moves` is the saved game to put on the phone, `pit` the move that starts it.
// `call` instead: a game one move from the call itself (59 quiet moves, your move, a pit that captures nothing and ends it).
// Usage: node tools/circlepos.js [seed] [call]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { began, circling, endedCircling } from '../web/circling.js';
const call = process.argv[3] === 'call';

let seed = +(process.argv[2] || 5);
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
for (let g = 0; g < 4000; g++) {
  let s = newGame('ncho');
  while (!s.over && s.moves.length < 400) {
    const legal = legalMoves(s);
    if (s.turn === 0) {
      const hits = legal.map((p) => ({ p, next: applyMove(s, p).state })).filter(({ next }) => call ? endedCircling(next) : began(s, next) && !next.over && next.pits.filter((n) => n).length >= 4);
      if (hits.length) { const h = hits[0]; const c = circling(call ? s : h.next); console.log(JSON.stringify({ moves: s.moves, pit: h.p, left: c.left, keeps: c.keeps, final: h.next.stores, winner: h.next.winner })); process.exit(0); }
    }
    s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no such game found'); process.exit(1);
