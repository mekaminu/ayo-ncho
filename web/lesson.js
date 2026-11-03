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

export function startState() {
  return { variant: 'ncho', rules: { ...RULES.ncho }, pits: START.pits.slice(), stores: START.stores.slice(), turn: 0, first: 0, moves: [], quiet: 0, over: false, winner: null };
}

// The position before step k (0-based): the start, then each of your moves and Adaeze's replies in turn.
export function stateAt(k) {
  let s = startState();
  for (let j = 0; j < k; j++) { s = applyMove(s, STEPS[j].pit).state; if (STEPS[j].reply !== null) s = applyMove(s, STEPS[j].reply).state; }
  return s;
}

// What a move's events did, for the tests and the words: drops, relays, captures by whom.
export function shape(events) {
  const caps = events.filter((e) => e.type === 'capture');
  return { drops: events.filter((e) => e.type === 'drop').length, relays: events.filter((e) => e.type === 'pickup' && e.relay).length, caps };
}

export function eyebrow(k) { return `Learn Nchò · ${k + 1} of ${STEPS.length}`; }
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
export const LADDER = ['easy', 'medium', 'hard'];
export function nextUp(level, moment, names) {
  const i = LADDER.indexOf(level); if (moment !== 'firstWin' || i < 0 || i >= LADDER.length - 1) return null;
  const to = LADDER[i + 1], label = { medium: 'Medium', hard: 'Hard' }[to];
  return { level: to, text: `Ready for ${names[to]}? Play ${to === 'hard' ? 'her' : 'him'} next · ${label}` };
}
