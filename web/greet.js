// Good morning, at the right time (idea 6 Nov): the opponent's first word of a game knew nothing of the clock — Auntie
// Bisi said "Good afternoon" at breakfast and at midnight, and nobody noticed you had been away a week. At a real board the
// person across from you greets you for the hour and says something when you come back. Now the first game in each part
// of the day (morning 5–12, afternoon 12–17, evening 17–22, night 22–5, on the phone's own clock) opens with that
// opponent's word for it — Adaeze's breakfast, Auntie Bisi's Ẹ káàárọ̀, Nnamdi's and Mama Ngozi's Ụtụtụ ọma, Papa Ike's
// games till dawn; the first game after 3 or more days without a move opens with their word for coming back instead; any
// other game keeps their usual start line. Pure functions (no DOM) so they can be unit-tested in node.

export const PARTS = ['morning', 'afternoon', 'evening', 'night'];
export const AWAY_DAYS = 3; // this many days or more since the last day with a move: they say they missed you

export function partOfDay(hour) {
  const h = ((Math.floor(+hour) % 24) + 24) % 24;
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const dayNum = (key) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; };

// Days since the last day with a move before today (`days` are the calm streak's "YYYY-MM-DD" keys). 0 when you have
// played today or never played (a first game is greeted by the lesson, not missed).
export function daysAway(days, today) {
  const t = dayNum(today); if (!Array.isArray(days) || !days.length || Number.isNaN(t)) return 0;
  if (days.includes(today)) return 0;
  let last = -Infinity; for (const d of days) { const n = dayNum(d); if (n < t && n > last) last = n; }
  return Number.isFinite(last) ? Math.round(t - last) : 0;
}

// The moment the opponent opens a game with: { moment, key } — `key` ("YYYY-MM-DD:part") is kept once the greeting is
// said, so each part of the day greets once; the usual start line ('start') otherwise.
//   days — the calm streak's days; today — today's key; hour — the phone's hour; last — the key kept last time
export function greetMoment({ days = [], today, hour, last = '' } = {}) {
  const part = partOfDay(hour); const key = `${today}:${part}`;
  if (daysAway(days, today) >= AWAY_DAYS && !String(last).startsWith(`${today}:`)) return { moment: 'back', key };
  if (last === key) return { moment: 'start', key };
  return { moment: part, key };
}

// The weekend (idea 10 Nov): Adaeze said "After school is the best time for seeds" on a Sunday afternoon, Auntie Bisi
// "Good morning, class" on a Saturday, Nnamdi that he was supposed to be working. On a Saturday or Sunday (the phone's own
// date, `today` as "YYYY-MM-DD") the hour's greeting comes from the character's weekend words where they have one
// (web/characters.js `weekend`); every other word is the same any day.
export function isWeekend(today) {
  const n = dayNum(today); if (Number.isNaN(n)) return false;
  const wd = new Date(n * 864e5).getUTCDay(); return wd === 0 || wd === 6;
}
