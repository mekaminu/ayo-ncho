// The daily puzzle's record on this phone: your best for each day, and how many days in a row you have solved it.
// Pure functions (no DOM) so they can be unit-tested in node. Storage shape:
//   { days: { "2026-10-29:ncho": { got, target, tries, solved } }, solved: ["2026-10-29", ...] }
//   days   — every day you tried, by date and game, with your best capture and how many goes it took
//   solved — every date solved (whichever game), oldest first, for the run on the result card
import { todayKey } from '../engine/puzzle.js';

export function parse(raw) {
  try {
    const s = JSON.parse(raw || 'null');
    if (s && s.days && typeof s.days === 'object') return { days: { ...s.days }, solved: Array.isArray(s.solved) ? s.solved.slice() : [] };
  } catch {}
  return { days: {}, solved: [] };
}

export const entryKey = (key, variant) => `${key}:${variant}`;
export function entry(data, key, variant) { return data.days[entryKey(key, variant)] || null; }

// One attempt played: keeps the best. Returns { data, improved, firstSolve, entry }.
export function record(data, key, variant, got, target) {
  const d = { days: { ...data.days }, solved: data.solved.slice() };
  const k = entryKey(key, variant); const was = d.days[k];
  const e = { got: Math.max(got, was ? was.got : 0), target, tries: (was ? was.tries : 0) + 1, solved: !!(was && was.solved) || got >= target };
  d.days[k] = e;
  const firstSolve = e.solved && !d.solved.includes(key);
  if (firstSolve) { d.solved.push(key); d.solved.sort(); }
  return { data: d, improved: !was || got > was.got, firstSolve, entry: e };
}

function shift(key, days) { const [y, m, d] = key.split('-').map(Number); const t = new Date(y, m - 1, d + days); return todayKey(t); }

// Days solved in a row, counting back from `key` — or from the day before, when today is still open.
export function solvedRun(data, key = todayKey()) {
  let k = data.solved.includes(key) ? key : shift(key, -1); let n = 0;
  while (data.solved.includes(k)) { n++; k = shift(k, -1); }
  return n;
}

// Words for the Home card's right-hand side.
export function cardLine(e) {
  if (!e) return 'not yet played';
  if (e.solved) return 'solved ✓';
  return `best ${e.got} of ${e.target}`;
}

// The badge on the result card.
export function resultLabel(got, target) {
  if (got >= target) return 'Solved';
  if (got === 0) return 'Nothing captured';
  const short = target - got; return `${short} short`;
}

// The run, in plain words: "5 in a row", "1 day", "none yet".
export function runLine(n) { return n === 0 ? 'none yet' : n === 1 ? '1 day' : `${n} in a row`; }

// "Thu 29 Oct" for a key.
export function dayLabel(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
