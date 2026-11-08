// Count in Igbo (idea 8 Nov): Nchò is the Igbo game, and at a real board the family counts a pit out loud in Igbo — otu,
// abụọ, atọ… — but the phone only ever counted in figures. Now Settings → Language → Count in: Figures · Igbo (figures until
// chosen). With Igbo, pressing and holding a pit or a trough counts its seeds with the Igbo word riding under the brass number
// as each seed is touched, and the hint line ends with the whole count in Igbo ("your pit 3 · 5 seeds · ise"). The words are
// the modern decimal ones taught in school (iri abụọ for twenty, not the older ọgụ); the figures stay, so nothing is lost
// for a player who does not speak it. Pure: no DOM.

export const COUNT_KEY = 'count';
export const COUNT_PREFS = ['figures', 'igbo'];
export const countPref = (v) => (COUNT_PREFS.includes(v) ? v : 'figures');

const ONES = ['efu', 'otu', 'abụọ', 'atọ', 'anọ', 'ise', 'isii', 'asaa', 'asatọ', 'itoolu'];

// n in Igbo, 0–99 (a board holds 48): 10 iri, 13 iri na atọ, 20 iri abụọ, 48 iri anọ na asatọ; null outside that
export function igbo(n) {
  if (!Number.isInteger(n) || n < 0 || n > 99) return null;
  if (n < 10) return ONES[n];
  const tens = Math.floor(n / 10), ones = n % 10;
  const t = tens === 1 ? 'iri' : `iri ${ONES[tens]}`;
  return ones ? `${t} na ${ONES[ones]}` : t;
}

// every word igbo() can say, so the French page keeps them as they are (web/i18n.js)
export const IGBO_WORDS = new Set(Array.from({ length: 100 }, (_, n) => igbo(n)));

// the word under the brass number while a count runs ('' when counting in figures, or before the first seed)
export function countWord(n, on) { return on && n >= 0 ? igbo(n) || '' : ''; }

// the hint line's words with the count in Igbo on the end: "your pit 3 · 5 seeds" → "your pit 3 · 5 seeds · ise"
export function withIgbo(words, n, on) { const w = on ? igbo(n) : null; return w && words ? `${words} · ${w}` : words; }

// Settings' own line under Count in
export function countNote(pref) {
  return countPref(pref) === 'igbo' ? 'hold a pit or a trough to count it · otu, abụọ, atọ, anọ…' : 'hold a pit or a trough to count it · in figures';
}
export function countToast(pref) { return countPref(pref) === 'igbo' ? 'Counting in Igbo · otu, abụọ, atọ…' : 'Counting in figures'; }
