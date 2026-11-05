// Master (Papa Ike) against Hard (Mama Ngozi): `node tools/master-match.js [games=50] [variant=ncho] [from=0] [--proven]`.
// Game g: opening o = g/2 — the first mover plays pit o%6 (and from o=6 the far side answers with pit 6+(o/6)%6), then the
// two take over; Master takes seat 0 in even games and seat 1 in odd ones, so every opening is played from both sides.
// The clock backstop is off (Master's node budget only), so the result is the same on any machine.
// MASTER_OPTS='{"hope":8}' tries other settings for one match (experiments only; the game always plays MASTER).
// --proven also asks, for every game, what the scripted opening left Master with best play on both sides (a search of
// 2 million positions at his first move, no traps), and tallies the result by that: a game that is lost with best play
// cannot be won against a player who never errs, and a draw with best play is won only by a trap she walks into.
import { newGame, applyMove, legalMoves } from '../engine/ayo.js';
import { chooseMove, masterSearch, MASTER } from '../engine/ai.js';

export function opening(g, variant = 'ncho') {
  const o = Math.floor(g / 2); let s = newGame(variant, {}, 0);
  for (const m of [o % 6, o >= 6 ? 6 + Math.floor(o / 6) % 6 : null]) if (m !== null && legalMoves(s).includes(m)) s = applyMove(s, m).state;
  return { s, master: g % 2 };
}
const env = () => (typeof process !== 'undefined' && process.env.MASTER_OPTS ? JSON.parse(process.env.MASTER_OPTS) : {});
export function playGame(g, variant = 'ncho', opts = {}) {
  let { s, master } = opening(g, variant);
  while (!s.over) { const m = s.turn === master ? masterSearch(s, { ms: Infinity, ...env(), ...opts }).pit : chooseMove(s, 'hard'); s = applyMove(s, m).state; }
  return s.winner === master ? 'W' : s.winner === 'draw' ? 'D' : 'L';
}

// What the opening leaves Master with best play: 'won' / 'lost' (a forced result found), 'ahead' (better than level),
// 'level' (a draw with best play — a draw is worth -contempt to him — or near it) or 'behind' (7 seeds or so down, not
// yet a forced loss). `nodes` is the search's size.
export function provenOf(g, variant = 'ncho', nodes = 2e6) {
  let { s, master } = opening(g, variant);
  if (s.turn !== master && !s.over) s = applyMove(s, chooseMove(s, 'hard')).state; // her scripted-side reply, as in the game
  if (s.over) return s.winner === master ? 'won' : s.winner === 'draw' ? 'level' : 'lost';
  const v = masterSearch(s, { ms: Infinity, nodes, traps: 0 }).value;
  return v >= 900 ? 'won' : v <= -900 ? 'lost' : v > 0 ? 'ahead' : v >= -MASTER.contempt - 0.5 ? 'level' : 'behind';
}
// The tally: for each class, how many games and how Master did in them.
export function tally(results, proven) {
  const out = {};
  results.forEach((r, i) => { const k = proven[i]; out[k] ??= { games: 0, W: 0, D: 0, L: 0 }; out[k].games++; out[k][r]++; });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--')), withProven = process.argv.includes('--proven');
  const N = +(args[0] || 50), variant = args[1] || 'ncho', from = +(args[2] || 0);
  let line = ''; for (let g = from; g < from + N; g++) { line += playGame(g, variant); process.stdout.write(line.slice(-1)); }
  const c = (k) => [...line].filter((x) => x === k).length;
  console.log(`\n${variant}: Master won ${c('W')}, lost ${c('L')}, drew ${c('D')} of ${N} (${Math.round(100 * c('W') / N)}%)`);
  if (withProven) {
    const proven = []; for (let g = from; g < from + N; g++) proven.push(provenOf(g, variant));
    const t = tally([...line], proven);
    for (const k of ['won', 'ahead', 'level', 'behind', 'lost']) if (t[k]) console.log(`  ${k.padEnd(6)} with best play after the opening: ${t[k].games} games — Master won ${t[k].W}, drew ${t[k].D}, lost ${t[k].L}`);
  }
}
