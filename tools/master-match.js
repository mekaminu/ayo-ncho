// Master (Papa Ike) against Hard (Mama Ngozi): `node tools/master-match.js [games=50] [variant=ncho] [from=0]`.
// Game g: opening o = g/2 — the first mover plays pit o%6 (and from o=6 the far side answers with pit 6+(o/6)%6), then the
// two take over; Master takes seat 0 in even games and seat 1 in odd ones, so every opening is played from both sides.
// The clock backstop is off (Master's node budget only), so the result is the same on any machine.
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { chooseMove, masterSearch } from '../engine/ai.js';

export function opening(g, variant = 'ncho') {
  const o = Math.floor(g / 2); let s = newGame(variant, {}, 0);
  for (const m of [o % 6, o >= 6 ? 6 + Math.floor(o / 6) % 6 : null]) if (m !== null && legalMoves(s).includes(m)) s = applyMove(s, m).state;
  return { s, master: g % 2 };
}
export function playGame(g, variant = 'ncho', opts = {}) {
  let { s, master } = opening(g, variant);
  while (!s.over) { const m = s.turn === master ? masterSearch(s, { ms: Infinity, ...opts }).pit : chooseMove(s, 'hard'); s = applyMove(s, m).state; }
  return s.winner === master ? 'W' : s.winner === 'draw' ? 'D' : 'L';
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const N = +(process.argv[2] || 50), variant = process.argv[3] || 'ncho', from = +(process.argv[4] || 0);
  let line = ''; for (let g = from; g < from + N; g++) { line += playGame(g, variant); process.stdout.write(line.slice(-1)); }
  const c = (k) => [...line].filter((x) => x === k).length;
  console.log(`\n${variant}: Master won ${c('W')}, lost ${c('L')}, drew ${c('D')} of ${N} (${Math.round(100 * c('W') / N)}%)`);
}
