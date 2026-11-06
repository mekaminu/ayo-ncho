// The first game's lesson (Launch L2): a new phone's first Play opens a one-minute lesson on the live board before the
// game against Adaeze (Easy) — three moves of yours from a set position, each teaching one thing the engine does:
//   1. sowing     — the seeds go one per pit, anticlockwise, and the turn ends where the last seed lands in an empty pit
//   2. a capture  — your last seed makes their pit 4, so the 4 is yours
//   3. a relay    — your last seed lands on seeds, so the hand picks them up and sows on
// with Adaeze's own (scripted) move between them, and Skip at any time. Everything shown is the engine's events for
// these moves (test/lesson.test.js checks each step really does what its words say). Pure: no DOM, tested in node.
import { applyMove, RULES } from '../engine/ayo.js';

// A small board to learn on: 16 seeds, nothing in the troughs, so the capture of 4 is the first thing in your trough.
export const START = { pits: [0, 0, 3, 2, 2, 0, 1, 3, 2, 0, 2, 1], stores: [0, 0] };
export const STEPS = [
  { pit: 2, kind: 'sow', title: 'Sowing',
    ask: 'The lit pit is yours. Tap it: the hand picks up its seeds and drops one in each pit, anticlockwise — the brass marks show where.',
    after: 'One seed in each pit. The turn ends where the last seed lands in an empty pit.',
    reply: 10 },
  { pit: 4, kind: 'capture', title: 'A capture of 4',
    ask: 'Its last seed lands in their pit of 3 and makes it 4. Your last seed making a 4 on their side wins it. Tap the lit pit.',
    after: '+4 in your trough. Any pit that reaches 4 goes to the owner of that side — unless your last seed makes it, over there.',
    reply: 11 },
  { pit: 3, kind: 'relay', title: 'Relay',
    ask: 'This time the last seed lands on seeds already there: the hand picks them all up and sows on. Tap the lit pit.',
    after: 'Picked up again and on into their side, until a seed landed in an empty pit. First to 25 seeds wins. That is Nchò.',
    reply: null },
];
export const DONE = { title: "You're ready", words: (name) => `${name} plays you for real now. Tap a pit once to see where its seeds go, twice to sow.` };

// Ayo has its own lesson (idea 6 Nov): with Ayo chosen, Learn to play (and a new phone's first Play) teaches Ayo's rules
// instead — one lap and the turn ends where the last seed falls (no relay), a capture of 2 or 3 made by the last seed on
// their side, and the sweep back through their pits that are 2 or 3 too. 18 seeds, the troughs empty.
export const AYO_START = { pits: [2, 3, 3, 0, 2, 0, 3, 1, 1, 2, 0, 3], stores: [0, 0] };
export const AYO_STEPS = [
  { pit: 1, kind: 'sow', title: 'Sowing',
    ask: 'The lit pit is yours. Tap it: the hand drops one seed in each pit, anticlockwise — the brass marks show where.',
    after: 'One seed in each pit, and the turn ends where the last seed falls — even on seeds. In Ayo the hand never picks up again.',
    reply: 11 },
  { pit: 2, kind: 'capture', title: 'A capture of 2 or 3',
    ask: 'Its last seed lands in their pit of 1 and makes it 2. Your last seed making a 2 or a 3 on their side wins it. Tap the lit pit.',
    after: '+2 in your trough. Only your last seed takes, only on their side, and only when it makes 2 or 3.',
    reply: 6 },
  { pit: 4, kind: 'sweep', title: 'The sweep back',
    ask: 'Its last seed makes their pit a 3, and the pit behind it is a 2 now too: the hand sweeps back and takes both. Tap the lit pit.',
    after: '+5: both pits are yours. But a move that would take every seed they have takes nothing. First to 25 seeds wins. That is Ayo.',
    reply: null },
];
export const DONE_LINE = { ncho: 'Sowing, a capture of 4 and a relay: that is most of the game.', ayo: 'Sowing, a capture of 2 or 3 and the sweep back: that is most of the game.' };
export const ROW_LINE = { ncho: 'a one-minute lesson on the board: sowing, a capture of 4, a relay', ayo: 'a one-minute lesson on the board: sowing, a capture of 2 or 3, the sweep back' };
const LESSONS = { ncho: { start: START, steps: STEPS }, ayo: { start: AYO_START, steps: AYO_STEPS } };
// Which lesson a phone gets: the game it has chosen (anything else is Nchò, the family's game).
export const lessonGame = (variant) => (variant === 'ayo' ? 'ayo' : 'ncho');
export const stepsOf = (variant) => LESSONS[lessonGame(variant)].steps;

export function startState(variant = 'ncho') {
  const v = lessonGame(variant), L = LESSONS[v];
  return { variant: v, rules: { ...RULES[v] }, pits: L.start.pits.slice(), stores: L.start.stores.slice(), turn: 0, first: 0, moves: [], quiet: 0, over: false, winner: null };
}

// The position before step k (0-based): the start, then each of your moves and Adaeze's replies in turn.
export function stateAt(k, variant = 'ncho') {
  const steps = stepsOf(variant); let s = startState(variant);
  for (let j = 0; j < k; j++) { s = applyMove(s, steps[j].pit).state; if (steps[j].reply !== null) s = applyMove(s, steps[j].reply).state; }
  return s;
}

// What a move's events did, for the tests and the words: drops, relays, captures by whom.
export function shape(events) {
  const caps = events.filter((e) => e.type === 'capture');
  return { drops: events.filter((e) => e.type === 'drop').length, relays: events.filter((e) => e.type === 'pickup' && e.relay).length, caps };
}

const gameName = (variant) => (lessonGame(variant) === 'ayo' ? 'Ayo' : 'Nchò');
export function eyebrow(k, variant = 'ncho') { return `Learn ${gameName(variant)} · ${k + 1} of ${stepsOf(variant).length}`; }
export const doneEyebrow = (variant = 'ncho') => `Learn ${gameName(variant)} · done`;
export const SKIP = 'Skip the lesson';
export const replyWords = (name) => `${name} sows one of hers…`;
export const wrongPit = 'In the lesson, play the lit pit';

// A new phone: nothing of the game kept on it yet (no game, record, puzzle, streak, tips seen, lesson).
// `get(key)` reads a saved setting (null when unset). The scripted renders (?capture) are never a new phone unless they ask.
export const KEPT = ['game', 'record', 'daily', 'streak', 'lesson', 'starts', 'name']; // (a level picked on Home before the first game is a choice, not a history)
export function isNewPhone(get) {
  if (KEPT.some((k) => { const v = get(k); return v !== null && v !== undefined && v !== 'null'; })) return false;
  const t = get('tutorial'); return t === null || t === undefined || t === '0';
}
// Whether Home's Play should open the lesson first: a new phone, playing the computer, the lesson never played or skipped.
export function lessonDue({ newPhone, mode, lesson }) { return !!newPhone && mode !== 'local' && !lesson; }
// The level a phone starts at when it has never chosen one: Easy (Adaeze) for a new phone, Medium as before otherwise.
export function firstLevel(newPhone) { return newPhone ? 'easy' : 'medium'; }

// After your first ever win over an opponent, the Game over card offers the next one up (never past Mama Ngozi).
export const LADDER = ['easy', 'steady', 'medium', 'hard'];
export function nextUp(level, moment, names) {
  const i = LADDER.indexOf(level); if (moment !== 'firstWin' || i < 0 || i >= LADDER.length - 1) return null;
  const to = LADDER[i + 1], label = { steady: 'Steady', medium: 'Medium', hard: 'Hard' }[to];
  return { level: to, text: `Ready for ${names[to]}? Play ${to === 'medium' ? 'him' : 'her'} next · ${label}` };
}
