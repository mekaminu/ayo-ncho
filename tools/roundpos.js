// A game for the "round and round" render: random Nchò play (seeded) until it is the player's (seat 0) move and one legal pit
// sends the hand round the same seeds until the turn stops the third time (the engine marks it), without ending the game.
// Prints JSON {moves, pit, end, drops, after}: `moves` is the saved game to put on the phone (your move next), `end` the pit
// the turn stops in, `drops` the seeds it sows, `after` those still to come once it comes round again. Usage: node tools/roundpos.js [seed]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { sowPath } from '../web/path.js';

let seed = +(process.argv[2] || 5);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
for (let g = 0; g < 50000; g++) {
  let s = newGame('ncho');
  while (!s.over) {
    if (s.turn === 0 && s.moves.length >= 6) {
      for (const m of legalMoves(s)) {
        const p = sowPath(s, m);
        if (p.round && p.round.stop !== null && !p.over) { console.log(JSON.stringify({ moves: s.moves, pit: m, end: p.end, drops: p.drops, after: p.round.after })); process.exit(0); }
      }
    }
    const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no position found'); process.exit(1);
