// A game one move from a loss, for the render (tools/render.py --retry): random play (seeded, so the picture is the same
// each time) until a game ends on the player's own move with the other side winning, and the Game over card would offer
// "Try again from move N" (web/retry.js turnPoint). Prints JSON {moves, pit, scores, at}: `moves` is the saved game to put
// on the phone (your move next), `pit` the move that ends it, `scores` the final result, `at` where the retry goes back to.
// Usage: node tools/retrypos.js [seed] [variant]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { turnPoint } from '../web/retry.js';

let seed = +(process.argv[2] || 7); const variant = process.argv[3] || 'ncho';
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
for (let g = 0; g < 5000; g++) {
  let s = newGame(variant); const moves = [];
  while (!s.over && moves.length < 300) {
    const legal = legalMoves(s); const m = legal[Math.floor(rnd() * legal.length)];
    const r = applyMove(s, m); moves.push(m);
    if (r.state.over && s.turn === 0 && r.state.winner === 1 && moves.length >= 20) {
      const tp = turnPoint(moves, variant, {}, 0);
      if (tp && moves.length - tp.at >= 6) { console.log(JSON.stringify({ moves: moves.slice(0, -1), pit: m, scores: r.state.stores, at: tp.at, variant })); process.exit(0); }
    }
    s = r.state;
  }
}
console.error('no such game found'); process.exit(1);
