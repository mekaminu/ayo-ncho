// Keyboard play, for the Mac and for anyone without a mouse or a finger on the board. Pure functions, no DOM: the board asks
// what a key means and what to say about a pit; the rules still come from the engine (legalMoves), never from here.
//
//   1–6     pick your pits, near to far (from your own seat: online at the far end, your pits are still 1–6)
//   Enter   sow the picked pit (Space too); the same digit twice sows as well, like tapping a pit twice
//   U       undo        R   put back what Undo took (web/redo.js)        H   hint        Esc   put the pit back        0   set the board straight (web/view.js)
//   ← →     turn the board   ↑ ↓   look from higher / lower   + −   nearer / farther (web/view.js nudgeView)
//   S       say where the game stands: the score, the seeds on each side, whose move (web/sayturn.js)
//   F       full screen on the web link, and F again to leave it (web/fullscreen.js)
//   ?       How to play, opened at its list of these keys (web/keyhelp.js)
//
// Screen readers get a hidden button per pit with a label like "Your pit 3 (key 3) · 5 seeds · picked — Enter to sow".
import { sideOf, PER_SIDE } from '../engine/ayo.js';

export const KEYS = { pits: ['1', '2', '3', '4', '5', '6'], sow: ['Enter', ' '], undo: ['u', 'U'], redo: ['r', 'R'], hint: ['h', 'H'], deselect: ['Escape', 'Esc'], straight: ['0'], say: ['s', 'S'], full: ['f', 'F'], help: ['?'],
  turn: { ArrowLeft: 1, ArrowRight: -1 }, tilt: { ArrowUp: 1, ArrowDown: -1 }, zoom: { '+': 1, '=': 1, '-': -1, '_': -1, '−': -1 } };

// The engine pit a digit means for the player in seat `you`: 1 is the pit nearest you, 6 the farthest.
export function keyToPit(key, you = 0) { const k = KEYS.pits.indexOf(String(key)); return k < 0 ? null : sideOf(you)[k]; }
// …and back: the digit that picks a pit, or null for the other side's pits.
export function pitKey(pit, you = 0) { const k = sideOf(you).indexOf(pit); return k < 0 ? null : KEYS.pits[k]; }

// What a key press asks of the board, or null when the page should keep the key to itself:
// a modifier held (browser shortcuts), typing in a field, or Enter/Space on a focused button (which clicks it by itself).
export function keyAction(e, { tag = '', editable = false, you = 0 } = {}) {
  if (!e || !e.key || e.ctrlKey || e.metaKey || e.altKey) return null;
  const t = String(tag || '').toUpperCase();
  if (editable || t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return null;
  const pit = keyToPit(e.key, you); if (pit !== null) return { type: 'pit', pit };
  if (KEYS.sow.includes(e.key)) return t === 'BUTTON' || t === 'A' ? null : { type: 'sow' };
  if (KEYS.undo.includes(e.key)) return { type: 'undo' };
  if (KEYS.redo.includes(e.key)) return { type: 'redo' };
  if (KEYS.hint.includes(e.key)) return { type: 'hint' };
  if (KEYS.deselect.includes(e.key)) return { type: 'deselect' };
  if (KEYS.straight.includes(e.key)) return { type: 'straight' };
  if (KEYS.say.includes(e.key)) return { type: 'say' };
  if (KEYS.full.includes(e.key)) return { type: 'full' };
  if (KEYS.help.includes(e.key)) return { type: 'help' };
  for (const kind of ['turn', 'tilt', 'zoom']) if (Object.prototype.hasOwnProperty.call(KEYS[kind], e.key)) return { type: 'view', kind, dir: KEYS[kind][e.key] };
  return null;
}

export const seedsWord = (n) => (n === 0 ? 'empty' : n === 1 ? '1 seed' : `${n} seeds`);

// The screen-reader label of a pit: whose it is, its key, how many seeds, and whether it is picked or barred by the feed rule.
export function pitLabel(pit, n, { you = 0, selected = null, legal = null } = {}) {
  const mine = sideOf(you).includes(pit);
  const k = (mine ? sideOf(you) : sideOf(1 - you)).indexOf(pit) + 1;
  let s = `${mine ? 'Your' : 'Their'} pit ${k}${mine ? ` (key ${k})` : ''} · ${seedsWord(n)}`;
  if (selected === pit) s += ' · picked — Enter to sow';
  else if (mine && n > 0 && Array.isArray(legal) && !legal.includes(pit)) s += ' · must feed the other side';
  return s;
}

// Whether a pit's hidden button can be reached: only your own pits with seeds, and only while the move is yours.
export function pitEnabled(pit, n, { you = 0, mine = true } = {}) { return mine && sideOf(you).includes(pit) && n > 0; }

// The line under the board while the move is yours — for a finger, or for a keyboard once one is likely (a mouse, or a key already pressed).
// phase: 'pick' (nothing picked), 'picked' (a pit is lit), 'puzzle' (the puzzle's shorter ask)
export function hintText(phase, { keys = false, key = null, seeds = 0 } = {}) {
  if (!keys) return phase === 'picked' ? 'tap again to sow, or pick another' : phase === 'puzzle' ? 'tap a pit on your side' : 'tap a pit on your side to sow';
  if (phase === 'picked') return `pit ${key || '?'} · ${seedsWord(seeds)} — Enter to sow, or pick another`;
  return 'click a pit on your side, or press 1–6';
}

export { PER_SIDE };
