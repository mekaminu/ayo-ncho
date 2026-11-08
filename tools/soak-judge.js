// A long evening (idea 8 Nov): reads the rounds tools/soak.py measured and says whether anything builds up.
// Usage: node tools/soak-judge.js soak.json  -> prints {ok, grows:[...], series:{...}}
// Pure judge(rows) is exported for test/soak.test.js.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// What may not grow, and by how much over the warm rounds before it counts as building up. Counts of things the game makes
// (meshes on the graphics card, seeds, tweens) must come back exactly; the heap and the DOM may wander a little with what
// the last round left on screen (a toast, the Game over card's picture), but not climb.
export const LIMITS = { geometries: 0, textures: 0, seeds: 0, tweens: 0, timers: 6, listeners: 40, nodes: 300, heapMB: 4 };
export const WARM = 2; // the first rounds load the store's pictures, the rules card, the computer's worker

export function judge(rows, limits = LIMITS, warm = WARM) {
  const live = rows.filter((r) => r.round >= warm);
  const grows = [], series = {};
  if (live.length < 4) return { ok: false, grows: ['too few rounds to judge (' + live.length + ')'], series };
  for (const k of Object.keys(limits)) {
    const v = live.map((r) => r[k]); series[k] = v.join(' → ');
    const first = v[0], last = v[v.length - 1], low = Math.min(...v);
    // a leak climbs: the end is above the start by more than the limit, and the second half sits above the first half
    const half = Math.floor(v.length / 2), a = v.slice(0, half), b = v.slice(v.length - half);
    const mean = (x) => x.reduce((s, y) => s + y, 0) / x.length;
    const per = (last - first) / (v.length - 1);
    if (last - Math.max(first, low) > limits[k] && mean(b) > mean(a) + limits[k] / 2) grows.push(`${k} ${first} → ${last} (about ${+per.toFixed(2)} a round)`);
  }
  return { ok: grows.length === 0, grows, series };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  console.log(JSON.stringify(judge(rows)));
}
