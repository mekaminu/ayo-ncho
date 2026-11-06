// A game near the finish, for the render of the race to 25 (web/race.js): random play (seeded) until it is the player's move
// (seat 0) with 4–8 seeds still to win and a move that captures, brings them within 3 and does not end the game. Prints JSON
// {moves, pit, before, after}: the saved game to put on the phone, the move, and the player's need before and after it.
// Usage: node tools/racepos.js [seed]
import { newGame, applyMove, legalMoves, totalSeeds } from '../engine/ayo.js';
import { raceOf } from '../web/race.js';

let seed = +(process.argv[2] || 3);
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
for (let g = 0; g < 4000; g++) {
  let s = newGame('ncho');
  while (!s.over && s.moves.length < 300) {
    const legal = legalMoves(s);
    const r = raceOf(s.stores[0], s.stores[1], totalSeeds(s)), o = raceOf(s.stores[1], s.stores[0], totalSeeds(s));
    if (s.turn === 0 && r && r.need >= 4 && o) {
      for (const p of legal) {
        const n = applyMove(s, p).state, a = raceOf(n.stores[0], n.stores[1], totalSeeds(n));
        if (!n.over && a && a.close && n.stores[1] === s.stores[1]) { console.log(JSON.stringify({ moves: s.moves, pit: p, before: r.need, after: a.need, theirs: o.need })); process.exit(0); }
      }
    }
    s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no such game found'); process.exit(1);
