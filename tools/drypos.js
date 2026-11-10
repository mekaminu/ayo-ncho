// A game for the "side run dry" render: random Ayo play (seeded) until it is the player's (seat 0) move and one legal pit leaves
// the other side nothing to play, so the game ends and you keep the seeds on your side (web/dry.js reads it from the engine) —
// one where those seeds decide the game (behind or level on the board, ahead once they are kept). Prints JSON
// {moves, pit, n, stores, after}: `moves` the saved game to put on the phone (your move next), `n` the seeds you keep,
// `stores` before the move and `after` at the end. Usage: node tools/drypos.js [seed]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { sowPath } from '../web/path.js';

let seed = +(process.argv[2] || 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
for (let g = 0; g < 50000; g++) {
  let s = newGame('ayo');
  while (!s.over) {
    if (s.turn === 0 && s.moves.length >= 6) {
      for (const m of legalMoves(s)) {
        const p = sowPath(s, m); if (!p.dry || p.dry.keeper !== 0 || p.dry.n < 3) continue;
        const end = applyMove(s, m).state;
        if (s.stores[0] + p.got <= s.stores[1] && end.winner === 0) { console.log(JSON.stringify({ moves: s.moves, pit: m, n: p.dry.n, stores: s.stores, after: end.stores })); process.exit(0); }
      }
    }
    const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no position found'); process.exit(1);
