// The puzzle you were sent (idea 9 Nov, morning): the daily puzzle's Share ended with the plain link `?puzzle=1`, which
// opens the puzzle of whatever game the friend's own phone has chosen — so Meka's Ayo puzzle, sent on WhatsApp, opened as a
// different Nchò puzzle on a cousin's phone, with a different target from the "captured 8/8" just above the link. And the
// day is each phone's own: from 23:00 in London it is already tomorrow in Lagos, and a link opened the next morning is
// today's puzzle, not the one in the message. Now the link carries both — `?puzzle=ayo&d=2026-11-09` — and opens that
// game's puzzle for this visit (the friend's chosen game is untouched; Back to home is their own board). The day is only
// said, never played: the puzzle of another day is a past puzzle (the archive is Gold's), so a link from another day opens
// today's with "Sent on Sun 8 Nov · this is today's puzzle". Old `?puzzle=1` links open as they always did.
// Pure functions, tested in node (test/sent.test.js).

const VARIANTS = ['ncho', 'ayo'];

// The link's query for a day's puzzle: its game and its day.
export function puzzleQuery(p) { return `?puzzle=${encodeURIComponent(p.variant)}&d=${encodeURIComponent(p.key)}`; }

// A real calendar day written YYYY-MM-DD, or null (a cut-off link, a hand-typed one, 2026-02-30).
export function realDay(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d ? s : null;
}

// What a link says: the game to open (null: the phone's own) and, when it names a day other than today, that day.
export function readSent(puzzleParam, dayParam, today) {
  const variant = VARIANTS.includes(puzzleParam) ? puzzleParam : null;
  const day = realDay(dayParam);
  return { variant, otherDay: day && day !== today ? day : null };
}

// The line said once as the puzzle opens, when the link came from another day; `label` writes a day as the card does.
export function sentLine(otherDay, label) { return otherDay ? `Sent on ${label(otherDay)} · this is today's puzzle` : null; }
