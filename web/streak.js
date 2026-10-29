// The calm streak: a count of the days you have played. Missing a day costs nothing — the count never goes down.
// Pure functions (no DOM) so they can be unit-tested in node. Storage shape: { days: ["YYYY-MM-DD", ...], seen: ["stones"] }
//   days — every distinct day with at least one move played, oldest first
//   seen — unlocks already announced, so the toast shows once

// Seed sets you earn by turning up. Looks only, never wins.
export const MILESTONES = [
  { days: 7, id: 'stones', name: 'River stones', what: 'a second seed set' },
];

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parse(raw) {
  try { const s = JSON.parse(raw || 'null'); if (s && Array.isArray(s.days)) return { days: s.days.slice(), seen: Array.isArray(s.seen) ? s.seen.slice() : [] }; } catch {}
  return { days: [], seen: [] };
}

// Count today, once. Returns { data, newDay, unlocked } — `unlocked` is the milestone this day crossed, if any.
export function recordDay(data, key = dayKey()) {
  const d = { days: data.days.slice(), seen: data.seen.slice() };
  if (d.days.includes(key)) return { data: d, newDay: false, unlocked: null };
  d.days.push(key); d.days.sort();
  const unlocked = MILESTONES.find((m) => m.days === d.days.length) || null;
  return { data: d, newDay: true, unlocked };
}

export function daysPlayed(data) { return data.days.length; }
export function playedToday(data, key = dayKey()) { return data.days.includes(key); }
export function unlocked(data, id) { const m = MILESTONES.find((x) => x.id === id); return !!m && data.days.length >= m.days; }
export function nextMilestone(data) { return MILESTONES.find((m) => m.days > data.days.length) || null; }

// The line on Home, in plain words.
export function homeLine(data, key = dayKey()) {
  const n = data.days.length, today = data.days.includes(key), next = nextMilestone(data);
  if (n === 0) return `Play today and start your calm streak · 7 days unlocks ${MILESTONES[0].name.toLowerCase()}`;
  const head = `${n} ${n === 1 ? 'day' : 'days'} played${today ? ' · today ✓' : ''}`;
  if (!next) return `${head} · every seed set unlocked`;
  const left = next.days - n;
  return `${head} · ${left} more ${left === 1 ? 'day' : 'days'} for ${next.name.toLowerCase()}`;
}
