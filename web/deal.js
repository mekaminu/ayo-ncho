// Setting up the board: a new game used to put every seed back in its pit in one jump — the troughs full of the last
// game's winnings one frame, four in every pit the next — though every seed moves is Meka's standing rule. At a real
// board each player scoops up their trough and counts four seeds into each of their own pits, both at once. Now a new
// game does the same: each side's hand deals from its own trough (then from any of its own pits holding too many) into
// its own pits, near to far in the order it sows, four counted into each; if one side's trough had fewer than it needs,
// the other side's seeds come across to finish it. Seeds already lying where they belong stay put. Pure helpers here
// (tested in test/deal.test.js); game.js flies the seeds.

export const GAP_MS = 48; // between one seed and the next from the same hand
export const PIT_GAP_MS = 70; // a beat more when the hand moves on to the next pit
export const FLY_MS = 280; // each seed's flight from where it lay to its spot
export const LIFT = 0.07; // how high it arcs (metres)

const sideOfPit = (i) => (i < 6 ? 0 : 1);
const homeSide = (h) => (typeof h === 'string' ? +h[1] : sideOfPit(h));

// `from` and `to` are { pits: [12], stores: [2] }: how many seeds lie in each home now, and how many the new game wants.
// Returns null when they do not hold the same number of seeds (the lesson's smaller board: lay it out instead), else
// { moves: [{ from, to, hand, at }], length } — every seed that has to move, the hand that deals it (the side of the
// home it goes to) and when it leaves, in ms from the start; `length` is when the last one lands.
export function dealPlan(from, to, { gap = GAP_MS, pitGap = PIT_GAP_MS, fly = FLY_MS } = {}) {
  if (!from || !to) return null;
  const sum = (c) => c.pits.reduce((a, b) => a + b, 0) + c.stores[0] + c.stores[1];
  if (sum(from) !== sum(to)) return null;
  const homes = [...Array(12).keys(), 'S0', 'S1'];
  const count = (c, h) => (typeof h === 'string' ? c.stores[+h[1]] : c.pits[h]);
  const spare = new Map(), short = new Map();
  for (const h of homes) { const d = count(to, h) - count(from, h); if (d < 0) spare.set(h, -d); else if (d > 0) short.set(h, d); }
  // where each hand deals to (its own pits in sowing order, then its own trough) and takes from (its trough first)
  const wants = (s) => [...Array(6).keys()].map((k) => s * 6 + k).concat(['S' + s]).filter((h) => short.get(h));
  const gives = (s) => ['S' + s].concat([...Array(6).keys()].map((k) => s * 6 + k)).filter((h) => spare.get(h));
  const lists = [[], []];
  const fill = (s, sources) => {
    for (const h of wants(s)) {
      while (short.get(h) > 0) {
        const src = sources.find((x) => spare.get(x) > 0); if (src === undefined) return;
        spare.set(src, spare.get(src) - 1); short.set(h, short.get(h) - 1); lists[s].push({ from: src, to: h, hand: s });
      }
    }
  };
  fill(0, gives(0)); fill(1, gives(1)); // each side from its own seeds
  fill(0, gives(1)); fill(1, gives(0)); // then what is left comes across
  let length = 0; const moves = [];
  for (const list of lists) {
    let t = 0;
    list.forEach((m, k) => { if (k) t += gap + (m.to !== list[k - 1].to ? pitGap : 0); moves.push({ ...m, at: t }); length = Math.max(length, t + fly); });
  }
  moves.sort((a, b) => a.at - b.at || a.hand - b.hand);
  return { moves, length };
}

// Should a new game be dealt rather than laid out? Not under reduced motion, while the clip records, or with nothing to move.
export function dealsIn(plan, { reduceMotion = false, clipping = false } = {}) {
  return !!(plan && plan.moves.length && !reduceMotion && !clipping);
}

// apply a plan to counts (for tests and the page's own check that the seeds ended where the engine says)
export function afterPlan(from, plan) {
  const c = { pits: from.pits.slice(), stores: from.stores.slice() };
  const add = (h, n) => { if (typeof h === 'string') c.stores[+h[1]] += n; else c.pits[h] += n; };
  for (const m of plan.moves) { add(m.from, -1); add(m.to, 1); }
  return c;
}

export { homeSide };
