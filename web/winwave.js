// The win, on the board: when a game is played to its end the Game over card used to rise at once over a board that did
// nothing. At a real board the winner scoops up their seeds and lets them rattle. Now, before the card, the winner's
// trough answers: its seeds jump in a wave from one end of the trough to the other, each with its own little hop, a rising
// run of notes on the wood (a falling one when the near player has lost), the lamp warming for a moment and the winner's
// score glinting; on a draw both troughs answer, more gently, one after the other. About a second and a half, hurried by a
// tap like any turn; nothing under reduced motion. Not after someone gave up (that has its own push), and never in the
// puzzle or a replay. Pure helpers here (tested in test/winwave.test.js); game.js moves the seeds.

export const WAVE_MS = 900; // the wave runs from the first seed's hop to the last one's start
export const HOP_MS = 300; // each seed's own hop, up and down
export const HOP = 0.026; // how high a winner's seed jumps (metres; a pit is 0.054 deep)
export const DRAW_HOP = 0.014; // a draw: both troughs, a smaller hop
export const SETTLE_MS = 350; // a beat after the last seed is down before the card rises
export const LAMP = 0.16; // how much warmer the lamp gets at the top of the wave (a fraction of its strength)

// a rising major-pentatonic run for a win, a falling one when the near player has lost, two level notes for a draw
const RUN = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
export function notes(kind) {
  if (kind === 'draw') return [1.2, 1.2];
  const up = RUN.map((r) => +(1.1 * r).toFixed(3));
  return kind === 'lose' ? up.slice(0, 4).reverse().map((p) => +(p * 0.8).toFixed(3)) : up;
}

// who answers when the game is over: `state` is the engine's state, `near` the seat nearest the camera (you, or the
// near player in two of us). Returns null when nothing should happen.
export function winWave(state, near = 0, { puzzle = false, replaying = false, local = false } = {}) {
  if (!state || !state.over || puzzle || replaying) return null;
  if (state.resigned != null || state.agreed) return null; // a game given up has its own push across the board, an agreed draw its handshake
  if (state.winner === 'draw') return { troughs: [near, 1 - near], kind: 'draw', hop: DRAW_HOP, notes: notes('draw') };
  const w = state.winner; if (w !== 0 && w !== 1) return null;
  if (!state.stores[w]) return null; // nothing in the trough to jump
  const kind = local || w === near ? 'win' : 'lose'; // two of us: whoever won, it is a win at this board
  return { troughs: [w], kind, hop: HOP, notes: notes(kind) };
}

// the order the seeds of one trough jump in, and when: along the trough's length (x), from the end nearer the winner's
// own first pit, so the wave runs the way they sow. `xs` the seeds' x positions; `fromLeft` which end starts.
// Returns [{ i, at }] — the seed's index in `xs` and its start in ms, spread over WAVE_MS (quicker for a small trough).
export function waveOrder(xs, fromLeft = true, ms = WAVE_MS) {
  const idx = xs.map((x, i) => ({ i, x })).sort((a, b) => (fromLeft ? a.x - b.x : b.x - a.x) || a.i - b.i);
  const n = idx.length; if (!n) return [];
  const span = Math.min(ms, n * 45); // a handful of seeds does not spread out over the whole time
  return idx.map((o, k) => ({ i: o.i, at: n === 1 ? 0 : Math.round((k / (n - 1)) * span) }));
}

// how high a seed is k ms into its hop: up and down once, a touch of bounce at the end
export function hopAt(t, hop = HOP, ms = HOP_MS) {
  if (t <= 0 || t >= ms) return 0;
  const u = t / ms;
  return u < 0.8 ? Math.sin((u / 0.8) * Math.PI) * hop : Math.sin(((u - 0.8) / 0.2) * Math.PI) * hop * 0.12;
}

// how long the whole moment takes for troughs holding `counts` seeds (one after the other on a draw)
export function waveLength(counts, ms = WAVE_MS) {
  let total = 0;
  for (const n of counts) { if (!n) continue; total += Math.min(ms, n * 45) + HOP_MS; }
  return total ? total + SETTLE_MS : 0;
}

// the lamp's strength t ms in, as a factor of its own (1 = as it was): up to 1 + LAMP at the middle, back by the end
export function lampAt(t, total) {
  if (!total || t <= 0 || t >= total) return 1;
  return 1 + Math.sin((t / total) * Math.PI) * LAMP;
}
