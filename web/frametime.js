// How smoothly this phone draws the board (Launch L16, slow phones). Pure logic, no DOM and no three.js, so node can test it.
//
// The render loop hands every frame to a meter while something on the board moves (a seed in the air, a tween): the gap since
// the last frame (what the eye sees: 16.7 ms is 60 frames a second) and the work the page itself did for it (tweens, physics,
// placing the badges and handing the scene to WebGL). Frames while nothing moves are not counted — a settled board is not drawn
// any faster and should not dilute a slow sowing.
//
// Two uses:
//  - Settings → Feel → Lighter board says how the seeds have been moving lately ("seeds lately 58 frames a second, smooth"), the line the closed
//    test's testers read out (docs/launch/slow-phones.md).
//  - Auto: when the full board is drawn slowly here (most frames late while seeds fly), the phone is remembered as slow and the
//    lighter board is used from the next time the game opens — said once in a toast. Choosing in Settings starts it afresh.

export const GAP_CAP = 500; // a gap longer than this is a stall (a tab switch, the phone waking), not a slow frame
export const SLOW_GAP = 40; // 25 frames a second: below it seeds visibly stutter
export const MIN_FRAMES = 300; // about 5–10 s of sowing before a verdict

const sorted = (a) => a.slice().sort((x, y) => x - y);
export function quantile(a, q) { // a sorted list's q-quantile (nearest rank); 0 for an empty one
  if (!a.length) return 0;
  const i = Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1));
  return a[i];
}
const r1 = (x) => Math.round(x * 10) / 10;

// frameStats(gaps, works): gaps and work in ms, one each a frame
export function frameStats(gaps, works = []) {
  const g = sorted(gaps.filter((x) => x > 0 && x <= GAP_CAP)), w = sorted(works.filter((x) => x >= 0));
  const mean = g.length ? g.reduce((s, x) => s + x, 0) / g.length : 0;
  return {
    frames: g.length, // frames with a gap that counts (stalls left out)
    worked: w.length, // frames whose work was measured
    fps: mean ? Math.round(1000 / mean) : 0,
    gap: { p50: r1(quantile(g, 0.5)), p75: r1(quantile(g, 0.75)), p95: r1(quantile(g, 0.95)), max: r1(g.length ? g[g.length - 1] : 0) },
    work: { p50: r1(quantile(w, 0.5)), p95: r1(quantile(w, 0.95)), max: r1(w.length ? w[w.length - 1] : 0) },
    late: g.filter((x) => x > SLOW_GAP).length, // frames slower than 25 a second
    dropped: g.reduce((s, x) => s + Math.max(0, Math.round(x / 16.7) - 1), 0), // 60 Hz frames missed
  };
}

// makeFrameMeter({ keep }): add(gap, work) for each moving frame; stats() over the last `keep` frames
export function makeFrameMeter({ keep = 1200 } = {}) {
  const gaps = [], works = [];
  return {
    add(gap, work) { // the work always counts; a gap past GAP_CAP is a stall, so only the work of that frame is kept
      if (work >= 0) { works.push(work); if (works.length > keep) works.shift(); }
      if (gap > 0 && gap <= GAP_CAP) { gaps.push(gap); if (gaps.length > keep) gaps.shift(); }
    },
    stats: () => frameStats(gaps, works),
    get count() { return works.length; },
    reset() { gaps.length = 0; works.length = 0; },
  };
}

// slowVerdict(stats): 'slow' once enough frames say the board stutters (the median and three in four frames past 25 a second),
// 'ok' once enough frames say it does not, null while there are too few to tell
export function slowVerdict(s, { min = MIN_FRAMES } = {}) {
  if (!s || s.frames < min) return null;
  return s.gap.p50 > SLOW_GAP && s.gap.p75 > SLOW_GAP ? 'slow' : 'ok';
}

// mayJudge: only the full board on Auto is ever judged — never one chosen in Settings, forced in the address, or the scripted renders
export function mayJudge({ pref = 'auto', lite = false, param = null, scripted = false, measured = null } = {}) {
  return pref === 'auto' && !lite && param == null && !scripted && measured !== 'slow';
}

// smoothWords(fps): a frame rate in plain words
export function smoothWords(fps) {
  if (!fps) return '';
  return fps >= 50 ? 'smooth' : fps >= 30 ? 'a little uneven' : fps >= 20 ? 'slow' : 'very slow';
}

// lastGameWords(rec): the Settings line ("seeds lately 58 frames a second, smooth · full board"), or '' before anything was measured
export function lastGameWords(rec) {
  if (!rec || !rec.fps) return '';
  return `seeds lately ${rec.fps} frames a second, ${smoothWords(rec.fps)} · ${rec.lite ? 'lighter' : 'full'} board`;
}

// what is kept on the phone (the last ~1200 moving frames: {fps, p95, work, lite}), from its stats; null when too little moved to say
export function lastGameRecord(s, lite) {
  if (!s || s.frames < 60) return null;
  return { fps: s.fps, p95: s.gap.p95, work: s.work.p95, lite: !!lite };
}
export function parseRecord(raw) { try { const r = JSON.parse(raw); return r && typeof r.fps === 'number' ? r : null; } catch { return null; } }

export const SLOW_TOAST = 'This phone draws the full board slowly — the lighter board comes in from the next time you open the game (Settings → Feel → Lighter board)';
