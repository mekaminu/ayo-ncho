// Count in Igbo (idea 8 Nov): Nchò is the Igbo game, and at a real board the family counts a pit out loud in Igbo — otu,
// abụọ, atọ… — but the phone only ever counted in figures. Now Settings → Language → Count in: Figures · Igbo (figures until
// chosen). With Igbo, pressing and holding a pit or a trough counts its seeds with the Igbo word riding under the brass number
// as each seed is touched, and the hint line ends with the whole count in Igbo ("your pit 3 · 5 seeds · ise"). The words are
// the modern decimal ones taught in school (iri abụọ for twenty, not the older ọgụ); the figures stay, so nothing is lost
// for a player who does not speak it. Pure: no DOM.

export const COUNT_KEY = 'count';
export const COUNT_PREFS = ['figures', 'igbo', 'yoruba'];
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

// Count in Yoruba (idea 8 Nov): Ayo is the Yoruba game, so the same count can be said in Yoruba. Yoruba counts by twenties and
// counts back from the next five: 15 is ẹ̀ẹ́dógún (twenty less five), 16 ẹ̀rìndínlógún (twenty less four), 25 ẹ̀ẹ́dọ́gbọ̀n, 35
// àrúndínlógójì (forty less five), 48 èjìdínláàádọ́ta (fifty less two). The words are written out whole for 0–50 (a board
// holds 48) from the standard tables, tone marks and all, rather than built from parts, so nothing is half right.
const YORUBA = ['òdo', 'ọ̀kan', 'èjì', 'ẹ̀ta', 'ẹ̀rin', 'àrún', 'ẹ̀fà', 'èje', 'ẹ̀jọ', 'ẹ̀sán', 'ẹ̀wá',
  'ọ̀kanlá', 'èjìlá', 'ẹ̀tàlá', 'ẹ̀rìnlá', 'ẹ̀ẹ́dógún', 'ẹ̀rìndínlógún', 'ẹ̀tàdínlógún', 'èjìdínlógún', 'ọ̀kàndínlógún', 'ogún',
  'ọ̀kànlélógún', 'èjìlélógún', 'ẹ̀tàlélógún', 'ẹ̀rìnlélógún', 'ẹ̀ẹ́dọ́gbọ̀n', 'ẹ̀rìndínlọ́gbọ̀n', 'ẹ̀tàdínlọ́gbọ̀n', 'èjìdínlọ́gbọ̀n', 'ọ̀kàndínlọ́gbọ̀n', 'ọgbọ̀n',
  'ọ̀kànlélọ́gbọ̀n', 'èjìlélọ́gbọ̀n', 'ẹ̀tàlélọ́gbọ̀n', 'ẹ̀rìnlélọ́gbọ̀n', 'àrúndínlógójì', 'ẹ̀rìndínlógójì', 'ẹ̀tàdínlógójì', 'èjìdínlógójì', 'ọ̀kàndínlógójì', 'ogójì',
  'ọ̀kànlélógójì', 'èjìlélógójì', 'ẹ̀tàlélógójì', 'ẹ̀rìnlélógójì', 'àrúndínláàádọ́ta', 'ẹ̀rìndínláàádọ́ta', 'ẹ̀tàdínláàádọ́ta', 'èjìdínláàádọ́ta', 'ọ̀kàndínláàádọ́ta', 'àádọ́ta'];

// n in Yoruba, 0–50; null outside that
export function yoruba(n) { return Number.isInteger(n) && n >= 0 && n < YORUBA.length ? YORUBA[n] : null; }

// which tongue a count is said in: 'igbo', 'yoruba' or null (figures). `on` true (the first build's form) means Igbo.
const tongue = (on) => (on === true ? 'igbo' : on === 'igbo' || on === 'yoruba' ? on : null);
// the HTML lang of the word under the number
export const countLang = (on) => ({ igbo: 'ig', yoruba: 'yo' })[tongue(on)] || '';
// n said in the chosen tongue, or null
export function said(n, on) { const t = tongue(on); return t === 'igbo' ? igbo(n) : t === 'yoruba' ? yoruba(n) : null; }

// every word igbo() and yoruba() can say, so the French page keeps them as they are (web/i18n.js)
export const IGBO_WORDS = new Set(Array.from({ length: 100 }, (_, n) => igbo(n)));
export const YORUBA_WORDS = new Set(YORUBA);
export const COUNT_WORDS = new Set([...IGBO_WORDS, ...YORUBA_WORDS]);

// the word under the brass number while a count runs ('' when counting in figures, or before the first seed)
export function countWord(n, on) { return n >= 0 ? said(n, on) || '' : ''; }

// the hint line's words with the count said on the end: "your pit 3 · 5 seeds" → "your pit 3 · 5 seeds · ise" (· àrún)
export function withIgbo(words, n, on) { const w = said(n, on); return w && words ? `${words} · ${w}` : words; }

// Settings' own line under Count in
export function countNote(pref) {
  const p = countPref(pref);
  return p === 'igbo' ? 'hold a pit or a trough to count it · otu, abụọ, atọ, anọ…'
    : p === 'yoruba' ? 'hold a pit or a trough to count it · ọ̀kan, èjì, ẹ̀ta, ẹ̀rin…' : 'hold a pit or a trough to count it · in figures';
}
export function countToast(pref) {
  const p = countPref(pref);
  return p === 'igbo' ? 'Counting in Igbo · otu, abụọ, atọ…' : p === 'yoruba' ? 'Counting in Yoruba · ọ̀kan, èjì, ẹ̀ta…' : 'Counting in figures';
}
