// Your rating against the computer (Launch L8): an Elo-style number kept on this phone, starting at 1000 and moving after
// every finished game against a computer opponent — up more for beating a stronger one, down less for losing to one.
// Pure functions (no DOM) so it is tested in node (test/rating.test.js).
//
// Each opponent stands at a fixed rating, set from matches between the levels themselves (tools/ladder-match.js, 60 games
// a pair, Nchò): Auntie Bisi scores 0.93 against Adaeze (a gap of ~450) and Nnamdi 0.78 against her (~220), Nnamdi 0.96
// against Adaeze (~550), so Adaeze 600, Auntie Bisi 950, Nnamdi 1150; Mama Ngozi wins every game against Nnamdi (set well
// clear of him); Papa Ike scores ~0.73 against her (tools/master-match.js, ~170).
// The first 10 games move it faster (K 40, it is still finding you), then K 24. Never below 100.
// Storage shape: { r: 1000, n: <games counted>, last: <game id>, change: <the last game's change> | null }
// Not counted: games with a friend, two of us on one phone, the daily puzzle and the lesson (the record skips the same).

export const START = 1000;
export const FLOOR = 100;
export const SETTLING = 10;
export const OPPONENT = { easy: 600, steady: 950, medium: 1150, hard: 1600, master: 1800 };

export function kFor(n) { return n < SETTLING ? 40 : 24; }
export function expected(you, them) { return 1 / (1 + 10 ** ((them - you) / 400)); }

export function parse(raw) {
  const out = { r: START, n: 0, last: null, change: null };
  try {
    const s = JSON.parse(raw || 'null'); if (!s || typeof s !== 'object') return out;
    if (Number.isInteger(s.r) && s.r >= FLOOR && s.r < 5000) out.r = s.r;
    if (Number.isInteger(s.n) && s.n >= 0) out.n = s.n;
    if (s.last !== undefined && s.last !== null) out.last = s.last;
    if (Number.isInteger(s.change)) out.change = s.change;
  } catch {}
  return out;
}

// Count a finished game (your seeds `you`, theirs `them`) against `level`, once per game id.
// Returns { data, before, after, change, counted }.
export function rate(data, level, you, them, gameId = null) {
  const d = { ...data }; const before = d.r;
  if (gameId !== null && d.last === gameId) return { data: d, before, after: before, change: d.change ?? 0, counted: false };
  const opp = OPPONENT[level] ?? OPPONENT.medium;
  const score = you > them ? 1 : you < them ? 0 : 0.5;
  const after = Math.max(FLOOR, Math.round(before + kFor(d.n) * (score - expected(before, opp))));
  d.r = after; d.n += 1; d.last = gameId; d.change = after - before;
  return { data: d, before, after, change: after - before, counted: true };
}

const signed = (c) => (c > 0 ? `+${c}` : c < 0 ? `−${-c}` : '±0');

// Home: "Your rating 1042 · +18 last game"; while settling "… · 3 of 10 games to settle"; nothing before the first game.
export function homeLine(data) {
  if (!data.n) return '';
  const tail = data.n < SETTLING ? `${SETTLING - data.n} more ${SETTLING - data.n === 1 ? 'game' : 'games'} to settle` : data.change != null ? `${signed(data.change)} last game` : '';
  return `Your rating ${data.r}${tail ? ' · ' + tail : ''}`;
}

// The Game over card: the change in words, e.g. "+18 for beating Mama Ngozi (1600)".
export function cardWords(level, change, outcome, name) {
  const what = outcome === 'win' ? `beating ${name}` : outcome === 'loss' ? `losing to ${name}` : `a draw with ${name}`;
  return `${signed(change)} for ${what} (${OPPONENT[level] ?? OPPONENT.medium})`;
}

// What the number shows at each moment of the tick on the card, from `before` to `after` over `steps` frames (t 0…1).
export function tickAt(before, after, t) { return Math.round(before + (after - before) * Math.min(1, Math.max(0, t))); }

export { signed };
