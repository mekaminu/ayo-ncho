// A game for the "every seed they have" render: random Ayo play (seeded) until it is the player's (seat 0) move and one legal
// pit makes a grand slam (its last seed would capture every seed on their side, so it captures nothing) without ending the game.
// Prints JSON {moves, pit, pits, n, end}: `moves` is the saved game to put on the phone (your move next), `pits` / `n` what the
// slam would have taken, `end` where the last seed lands. Usage: node tools/slampos.js [seed]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { sowPath } from '../web/path.js';

let seed = +(process.argv[2] || 7);
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
for (let g = 0; g < 20000; g++) {
  let s = newGame('ayo');
  while (!s.over && s.moves.length < 300) {
    if (s.turn === 0 && s.moves.length >= 6) {
      for (const m of legalMoves(s)) {
        const p = sowPath(s, m);
        if (p.slam && !p.over && legalMoves(s).length > 1) { console.log(JSON.stringify({ moves: s.moves, pit: m, pits: p.slam.pits, n: p.slam.n, end: p.end })); process.exit(0); }
      }
    }
    const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no such game found'); process.exit(1);
