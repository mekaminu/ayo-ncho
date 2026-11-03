// How the game went: the lead move by move, for the line on the Game over card.
// Pure functions (no DOM), tested in node (test/story.test.js). Every number comes from replaying the moves through
// engine/ayo.js, so the line says only what the engine says happened (end-of-game sweeps included).
import { newGame, applyMove, firstMover } from '../engine/ayo.js';

// Replay `moves` and read the lead after every move, from `player`'s side (their store minus the other's).
// Returns { leads: [0, after move 1, …], turns: [{ index, mover, swing }], biggest, forGood, maxLead, minLead, final }.
//  - swing: how far the move moved the lead, from `player`'s side (+ toward them, − away)
//  - biggest: the move that moved the lead most (either player; the earlier one on a tie), or null if nothing was ever won
//  - forGood: the move after which the final leader was ahead and stayed ahead to the end (null for a draw)
export function gameStory(moves, variant = 'ncho', rules = {}, player = 0) {
  let s = newGame(variant, rules, firstMover(moves)); const leads = [0]; const turns = [];
  const lead = (st) => st.stores[player] - st.stores[1 - player];
  moves.forEach((pit, index) => {
    const mover = s.turn; const before = lead(s); s = applyMove(s, pit).state; const after = lead(s);
    leads.push(after); turns.push({ index, mover, swing: after - before });
  });
  let biggest = null;
  for (const t of turns) if (t.swing !== 0 && (!biggest || Math.abs(t.swing) > Math.abs(biggest.swing))) biggest = t;
  const final = leads[leads.length - 1]; let forGood = null;
  if (final !== 0) {
    const sign = Math.sign(final); let k = leads.length - 1;
    while (k > 0 && Math.sign(leads[k - 1]) === sign) k -= 1;
    forGood = k - 1; // leads[k] is the first of the final run of the same sign; move index k-1 put them there
  }
  return { leads, turns, biggest, forGood, maxLead: Math.max(...leads), minLead: Math.min(...leads), final, moves: moves.length };
}

// The words under the line, from the reader's side. names: { me, them } as the card shows them ("You" reads best for me).
// "You led for good from move 31 · biggest swing: move 24, 12 seeds your way" — move numbers count from 1, as people do.
export function storyWords(story, names = { me: 'You', them: 'They' }) {
  if (!story || !story.moves) return '';
  const parts = [];
  if (story.final === 0) parts.push(story.maxLead === 0 && story.minLead === 0 ? 'Level the whole way' : 'Level at the end');
  else {
    const who = story.final > 0 ? names.me : names.them; const from = story.forGood + 1;
    parts.push(from <= 1 ? `${who} led from the start` : `${who} led for good from move ${from}`);
  }
  const b = story.biggest;
  if (b) parts.push(`biggest swing: move ${b.index + 1}, ${Math.abs(b.swing)} seeds ${b.swing > 0 ? (names.me === 'You' ? 'your' : names.me + "'s") : names.them + "'s"} way`);
  return parts.join(' · ');
}

// The line itself, in a w×h box: x runs over the moves, y is the lead (up: the reader ahead). The scale is symmetric so
// the middle line is always "level". Returns { line, above, below, zero, mark: {x, y} | null, big: {x, y} | null } as
// SVG path data and points, rounded to tenths so the markup stays small.
export function storyPath(story, w = 300, h = 64, pad = 4) {
  const n = story.leads.length - 1 || 1; const top = Math.max(4, Math.abs(story.maxLead), Math.abs(story.minLead));
  const r = (v) => Math.round(v * 10) / 10;
  const X = (i) => r(pad + (i / n) * (w - pad * 2)); const zero = h / 2; const Y = (v) => r(zero - (v / top) * (h / 2 - pad));
  const pts = story.leads.map((v, i) => [X(i), Y(v)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  // the area between the line and the middle, clipped to each side by the caller (a clipPath above or below the middle)
  const area = `${line}L${pts[pts.length - 1][0]} ${zero}L${pts[0][0]} ${zero}Z`;
  const at = (k) => (k === null || k === undefined ? null : { x: X(k + 1), y: Y(story.leads[k + 1]) });
  return { line, area, zero, mark: at(story.forGood), big: story.biggest ? at(story.biggest.index) : null, w, h };
}
