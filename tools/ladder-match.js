// The ladder between the computer's levels: `node tools/ladder-match.js [games=60] [variant=ncho]`.
// Plays each neighbouring pair (and Medium against Easy) for N games, seats alternating, each game with its own seeded noise,
// and prints the score and the rating gap it implies — where web/rating.js sets each opponent's rating from.
import { newGame, applyMove } from '../engine/ayo.js';
import { chooseMove } from '../engine/ai.js';

export function seeded(seed) { let x = (seed >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
export function match(a, b, N, variant = 'ncho', from = 0) {
  let W = 0, L = 0, D = 0;
  for (let g = from; g < from + N; g++) {
    const rng = seeded(g * 7919 + 1); let s = newGame(variant, {}, 0); const A = g % 2;
    while (!s.over) s = applyMove(s, chooseMove(s, s.turn === A ? a : b, rng)).state;
    if (s.winner === A) W++; else if (s.winner === 'draw') D++; else L++;
  }
  const score = (W + D / 2) / N;
  return { W, L, D, score, gap: Math.round(-400 * Math.log10(1 / Math.min(Math.max(score, 0.01), 0.99) - 1)) };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const N = +(process.argv[2] || 60), variant = process.argv[3] || 'ncho';
  for (const [a, b] of [['steady', 'easy'], ['medium', 'steady'], ['medium', 'easy'], ['hard', 'medium']]) {
    const r = match(a, b, a === 'hard' ? Math.min(N, 20) : N, variant);
    console.log(`${a} vs ${b}: won ${r.W}, lost ${r.L}, drew ${r.D} · score ${r.score.toFixed(2)} · gap ${r.gap}`);
  }
}
