// A game for the store's preview video (Launch L15, slice 3): seeded random Nchò play until it is the player's (seat 0) move,
// mid-game, with a pit whose turn shows the game off — at least two relays and two captures of 4 or more for you, nothing handed
// over, not the end of the game, and a sowing short enough to fit the video. Prints JSON {moves, pit, relays, takes, drops}:
// `moves` is the saved game to put on the phone (your move next), `pit` the move the video plays.
// Usage: node tools/previewpos.js [seed]
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { sowPath } from '../web/path.js';

let seed = +(process.argv[2] || 3);
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
export function showsOff(s, pit) {
  const { events, state } = applyMove(s, pit); const p = sowPath(s, pit);
  const relays = events.filter((e) => e.type === 'pickup' && e.relay).length, drops = events.filter((e) => e.type === 'drop').length;
  const mine = events.filter((e) => e.type === 'capture' && e.by === 0);
  const ok = relays >= 2 && relays <= 4 && mine.length >= 2 && !p.gives.length && !p.sweep && !state.over && drops <= 26 && state.turn === 1;
  return ok ? { relays, takes: mine.reduce((a, e) => a + e.n, 0), drops } : null;
}
if (process.argv[1] && process.argv[1].endsWith('previewpos.js')) {
  for (let g = 0; g < 5000; g++) {
    let s = newGame('ncho');
    while (!s.over && s.moves.length < 40) {
      if (s.turn === 0 && s.moves.length >= 10 && s.stores[0] + s.stores[1] <= 16) {
        for (const m of legalMoves(s)) { const r = showsOff(s, m); if (r) { console.log(JSON.stringify({ moves: s.moves, pit: m, ...r })); process.exit(0); } }
      }
      const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
    }
  }
  console.error('no such game found'); process.exit(1);
}
