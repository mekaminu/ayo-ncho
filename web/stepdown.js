// A gentler game, and the way back up (idea 7 Nov). The Game over card already offers the next opponent up after your
// first win over one (web/lesson.js nextUp), but nothing ever offered the other way: a learner who lost to Mama Ngozi five
// times running could only keep losing, or find the pills on Home. Now three losses in a row to one opponent (and again at
// six, nine…) offer the one a step down "for a while"; once you beat that one, the card offers the way back up to the
// opponent you stepped down from. Pure functions (no DOM) so they are tested in node.
// Kept on the phone as `stepped` = { from, to }: the step down that was taken, until a step back up (or a step down again).

export const DOWN = { steady: 'easy', medium: 'steady', hard: 'medium', master: 'hard' };
export const LABEL = { easy: 'Easy', steady: 'Steady', medium: 'Medium', hard: 'Hard', master: 'Master' };
const HIM = new Set(['medium', 'master']); // Nnamdi and Papa Ike
export const pronoun = (lv) => (HIM.has(lv) ? 'him' : 'her');
const LEVELS = ['easy', 'steady', 'medium', 'hard', 'master'];
const COUNT = { 3: 'Three', 6: 'Six', 9: 'Nine' };

// A losing run worth the offer: 3, 6, 9… (a run of −3 is three losses in a row; a draw or a win ends a run).
export function lowRun(run) { return Number.isInteger(run) && run <= -3 && (-run) % 3 === 0; }

// The step down after this game, or null. `entry` is the record against `level` after the game (web/record.js).
export function stepDown(level, entry, counted, names) {
  const to = DOWN[level]; if (!counted || !to || !entry || !lowRun(entry.run)) return null;
  const n = -entry.run, count = COUNT[n] || String(n);
  return { kind: 'down', from: level, level: to, text: `${count} in a row to ${names[level]} — try ${names[to]} for a while? · ${LABEL[to]}` };
}

// The way back up: you stepped down from `stepped.from` to this opponent and just beat them. `open(level)` says whether that
// opponent can be played on this phone (Papa Ike is Gold).
export function backUp(level, outcome, stepped, names, open = () => true) {
  if (!stepped || stepped.to !== level || outcome !== 'win' || !open(stepped.from)) return null;
  const from = stepped.from;
  return { kind: 'up', from: level, level: from, text: `Back to ${names[from]}? Try ${pronoun(from)} again · ${LABEL[from]}` };
}

// What the card offers after a counted game: the way back up first, then the first-win offer (`next`, from nextUp), then a
// step down. Only one button: never two offers at once.
export function offerAfter({ level, outcome, entry, counted, stepped, names, next = null, open = () => true }) {
  if (!counted) return null;
  return backUp(level, outcome, stepped, names, open) || (next ? { kind: 'next', ...next } : null) || stepDown(level, entry, counted, names);
}

// The kept step after the player takes an offer: a step down remembers where it came from; going up (either way) clears it.
export function afterTake(stepped, offer) {
  if (!offer) return stepped || null;
  if (offer.kind === 'down') return { from: offer.from, to: offer.level };
  return null;
}

export function parseStepped(raw) {
  try {
    const s = JSON.parse(raw || 'null');
    if (s && LEVELS.includes(s.from) && LEVELS.includes(s.to) && DOWN[s.from] === s.to) return { from: s.from, to: s.to };
  } catch {}
  return null;
}
