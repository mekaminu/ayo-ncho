// Your week of puzzles (idea 7 Nov): from Mon 9 Nov the daily puzzle gets harder through the week (engine/puzzle.js), but the
// result card only said today's best and the days solved in a row — nothing showed the week itself. Now the card carries the
// week, Monday to Sunday, as seven little pits: a brass seed in each day you solved (this game's puzzle, Nchò or Ayo apart),
// a hollow one for a day tried and not solved, a faint one for a day shown the move, an empty pit for a day gone by, today's
// pit lit, the days ahead dim; under each its letter and, from the weekly days, as many tiny seeds as the day asks (gentle 1 …
// hard 4). One line says where the week stands: "This week · 3 of 7 · Sunday's the hard one". Pure functions (no DOM), so
// test/week.test.js covers them in node; game.js paints the strip and drops today's seed in when you first solve it.
import { weekLevel } from '../engine/puzzle.js';
import { entry } from './daily.js';

const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOf = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export const LETTERS = { en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'] };
const NAMES = { en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] };
const STATE_WORDS = {
  en: { solved: 'solved', tried: 'tried, not solved', shown: 'shown the move', missed: 'not played', open: 'today, not played yet', ahead: 'to come' },
  fr: { solved: 'résolue', tried: 'tentée, pas résolue', shown: 'coup montré', missed: 'pas jouée', open: 'aujourd’hui, pas encore jouée', ahead: 'à venir' },
};

// The seven days (Monday first) of the week holding `key`.
export function weekKeys(key) {
  const d = dateOf(key); const back = (d.getDay() + 6) % 7; // Monday 0 … Sunday 6
  return Array.from({ length: 7 }, (_, i) => keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back + i)));
}

// The week as the card shows it: [{ key, i (0 Mon … 6 Sun), state, today, level }].
//   state: solved · shown (Mama Ngozi showed it, never solved) · tried · missed (a day gone, not played) · open (today, not
//   played) · ahead (a day still to come). level: what the week asks of that day (1–4), or null before the weekly puzzles.
export function weekStrip(data, key, variant) {
  return weekKeys(key).map((k, i) => {
    const e = entry(data, k, variant); const today = k === key;
    let state;
    if (e && e.solved) state = 'solved';
    else if (e && e.shown) state = 'shown';
    else if (e && e.tries > 0) state = 'tried';
    else state = k < key ? 'missed' : today ? 'open' : 'ahead';
    return { key: k, i, state, today, level: weekLevel(k) };
  });
}

export const solvedIn = (strip) => strip.filter((d) => d.state === 'solved').length;

// The line under the strip: "This week · 3 of 7 · Sunday's the hard one", "Every day this week ✓", "This week · none yet".
export function weekLine(strip) {
  const n = solvedIn(strip); if (n === 7) return 'Every day this week ✓';
  const base = n ? `This week · ${n} of 7` : 'This week · none yet';
  const sun = strip[6]; const today = strip.find((d) => d.today);
  if (!sun || sun.level === null || !today) return base;
  if (today.i < 6) return `${base} · Sunday's the hard one`;
  return sun.state === 'solved' ? base : `${base} · today's the hard one`;
}

// What a screen reader hears for the whole strip, in the page's language.
export function weekLabel(strip, lang = 'en') {
  const L = NAMES[lang] ? lang : 'en'; const W = STATE_WORDS[L];
  const head = L === 'fr' ? `Cette semaine, ${solvedIn(strip)} sur 7 résolues` : `This week, ${solvedIn(strip)} of 7 solved`;
  return `${head}: ${strip.map((d) => `${NAMES[L][d.i]} ${W[d.state]}`).join(', ')}`;
}

// The letter under each pit, in the page's language.
export const letterOf = (i, lang = 'en') => (LETTERS[lang] || LETTERS.en)[i];
