// A game one move from the end, for the render: random play (seeded, so the picture is the same each time) until a game
// ends on the player's own move with the player winning. Prints JSON {moves, pit, scores}: `moves` is the saved game to
// put on the phone (your move next), `pit` the move that ends it, `scores` the final result.
// Usage: node tools/endgame.js [seed] [variant]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';

let seed = +(process.argv[2] || 7); const variant = process.argv[3] || 'ncho';
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
for (let g = 0; g < 2000; g++) {
  let s = newGame(variant); const moves = [];
  while (!s.over && moves.length < 300) {
    const legal = legalMoves(s); const m = legal[Math.floor(rnd() * legal.length)];
    const r = applyMove(s, m); moves.push(m);
    if (r.state.over) {
      if (s.turn === 0 && r.state.winner === 0 && moves.length >= 4) {
        console.log(JSON.stringify({ moves: moves.slice(0, -1), pit: m, scores: r.state.stores, variant }));
        process.exit(0);
      }
    }
    s = r.state;
  }
}
console.error('no such game found'); process.exit(1);
