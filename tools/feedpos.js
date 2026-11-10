// A game where the rules narrow your move, for the render: random play (seeded) until it is the player's (seat 0) move and
// `mode` holds — "feed": their side is empty and two or more of your pits can feed them while another cannot; "only": exactly one
// move. Prints JSON {moves, legal, barred, only}: `moves` is the saved game to put on the phone (your move next).
// "relay": as "feed", with a barred pit whose relay would reach them (render.py --relayfeed).
// Usage: node tools/feedpos.js [feed|only|relay] [seed]
import { newGame, applyMove, legalMoves, reachesByRelay } from '../engine/ayo.js';
import { narrowOf } from '../web/feed.js';

const mode = process.argv[2] || 'feed'; let seed = +(process.argv[3] || 3);
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const want = (n, s) => n && (mode === 'only' ? n.only !== null && n.kind === 'feed' : n.hungry && n.legal.length >= 2 && n.barred.length >= 1 && (mode !== 'relay' || n.barred.some((p) => reachesByRelay(s, p))));
for (let g = 0; g < 5000; g++) {
  let s = newGame('ncho');
  while (!s.over && s.moves.length < 300) {
    if (s.turn === 0 && s.moves.length >= 10) { const n = narrowOf(s, 0); if (want(n, s)) { console.log(JSON.stringify({ moves: s.moves, legal: n.legal, barred: n.barred, only: n.only, relay: n.barred.filter((p) => reachesByRelay(s, p)) })); process.exit(0); } }
    const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
  }
}
console.error('no such game found'); process.exit(1);
