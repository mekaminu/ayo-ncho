// A game for the "whose 4 is it" render: random Nchò play (seeded) until it is the player's (seat 0) move and one legal pit's
// first capture goes to the OTHER side (a pit on their side making 4 before the last seed) while the move also takes some
// for you. Prints JSON {moves, pit, takes, gives}: `moves` is the saved game to put on the phone (your move next).
// Usage: node tools/givespos.js [seed]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { sowPath } from '../web/path.js';

let seed = +(process.argv[2] || 5);
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
for (let g = 0; g < 5000; g++) {
  let s = newGame('ncho');
  while (!s.over && s.moves.length < 300) {
    if (s.turn === 0 && s.moves.length >= 8) {
      for (const m of legalMoves(s)) {
        const p = sowPath(s, m); const first = applyMove(s, m).events.find((e) => e.type === 'capture');
        if (p.gives.length && p.takes.length && !p.over && !p.sweep && first && first.by === 1) { console.log(JSON.stringify({ moves: s.moves, pit: m, takes: p.takes, gives: p.gives })); process.exit(0); }
      }
    }
    const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no such game found'); process.exit(1);
