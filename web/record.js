// Your record against each opponent: wins, losses, draws and your best win, kept on this phone per opponent
// (Adaeze, Nnamdi, Mama Ngozi). Pure functions (no DOM) so they are tested in node.
// Storage shape: { easy: {w, l, d, best: [you, them] | null, run}, medium: {…}, hard: {…}, last: <game id> }
//   run  — your current run against them: +3 is three wins in a row, −2 two losses; a draw ends a run
//   best — the win with the widest margin (the higher score of yours breaks a tie)
//   last — the id of the last game counted, so one game is never counted twice (a reload, a replay)
// Online games and the daily puzzle are not counted: a friend is not an opponent with a record, and a puzzle is one move.

export const LEVELS = ['easy', 'medium', 'hard'];

const fresh = () => ({ w: 0, l: 0, d: 0, best: null, run: 0 });

export function parse(raw) {
  const out = { last: null }; for (const k of LEVELS) out[k] = fresh();
  try {
    const s = JSON.parse(raw || 'null'); if (!s || typeof s !== 'object') return out;
    for (const k of LEVELS) {
      const e = s[k]; if (!e || typeof e !== 'object') continue;
      const n = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
      out[k] = { w: n(e.w), l: n(e.l), d: n(e.d), best: Array.isArray(e.best) && e.best.length === 2 && e.best.every(Number.isInteger) ? [e.best[0], e.best[1]] : null, run: Number.isInteger(e.run) ? e.run : 0 };
    }
    if (s.last !== undefined && s.last !== null) out.last = s.last;
  } catch {}
  return out;
}

export function outcome(you, them) { return you > them ? 'win' : you < them ? 'loss' : 'draw'; }

// Count a finished game against `level`, once per game id. Returns { data, entry, outcome, newBest, moment, counted }:
//   moment — what this result is worth a word about: 'firstWin' (your first ever win against them), 'run' (a run worth
//            remarking on: 3, 5, then every 5), or null
export function record(data, level, you, them, gameId = null) {
  const d = { last: data.last }; for (const k of LEVELS) d[k] = { ...data[k], best: data[k].best ? data[k].best.slice() : null };
  if (!LEVELS.includes(level)) level = 'medium';
  const o = outcome(you, them); const e = d[level];
  if (gameId !== null && d.last === gameId) return { data: d, entry: e, outcome: o, newBest: false, moment: null, counted: false };
  d.last = gameId;
  let newBest = false;
  if (o === 'win') {
    e.w += 1; e.run = e.run > 0 ? e.run + 1 : 1;
    const margin = you - them, old = e.best ? e.best[0] - e.best[1] : -1;
    if (margin > old || (margin === old && you > e.best[0])) { e.best = [you, them]; newBest = true; }
  } else if (o === 'loss') { e.l += 1; e.run = e.run < 0 ? e.run - 1 : -1; }
  else { e.d += 1; e.run = 0; }
  const moment = o === 'win' && e.w === 1 ? 'firstWin' : remarkable(e.run) ? 'run' : null;
  return { data: d, entry: e, outcome: o, newBest, moment, counted: true };
}

// Runs worth a word: three, five, then every fifth.
export function remarkable(run) { const n = Math.abs(run); return n === 3 || n === 5 || (n >= 10 && n % 5 === 0); }

export function played(entry) { return entry.w + entry.l + entry.d; }

// "you lead 4–2" / "you trail 1–4" / "level 3–3" — the short line for the Home pill; nothing before the first game.
export function standing(entry) {
  if (!played(entry)) return '';
  const wl = `${entry.w}–${entry.l}`;
  return entry.w > entry.l ? `you lead ${wl}` : entry.w < entry.l ? `you trail ${wl}` : `level ${wl}`;
}

// The Game over card's line: the standing, the best win, draws if any. `newBest` says this game set it.
export function cardLine(entry, newBest = false) {
  if (!played(entry)) return '';
  const parts = [standing(entry)];
  if (entry.best) parts.push(`${newBest ? 'new ' : ''}best win ${entry.best[0]}–${entry.best[1]}`);
  if (entry.d) parts.push(`${entry.d} ${entry.d === 1 ? 'draw' : 'draws'}`);
  return parts.join(' · ');
}
