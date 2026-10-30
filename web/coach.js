// Mama Ngozi's take: after your move, if a clearly better pit was there, a quiet line under the board says which one and what it
// was worth, and a tap plays it through slowly on the board. Pure functions, no DOM. The rating comes from the engine's own search
// (engine/ai.js rateMoves at the hard level) on the position you moved from, so her take is the same judgement the hint gives.
import { pitName } from './path.js';

export const NAME = 'Mama Ngozi';
export const TAKE_GAP = 3; // seeds: a better move is only worth a word when the search rates it this much higher than yours

// Her take on the move you played: null when yours was the move, or close enough; else the better pit and what it was worth.
//   kind  'win'    the better move wins the game by force and yours does not
//         'save'   yours loses by force and the better move does not
//         'better' the better move is worth TAKE_GAP seeds or more over the search
export function takeOn(rated, played) {
  if (!rated || rated.length < 2) return null;
  const best = rated[0]; const mine = rated.find((r) => r.pit === played);
  if (!mine || best.pit === played || best.value <= mine.value) return null;
  const gap = best.value - mine.value;
  const kind = best.value >= 500 && mine.value < 500 ? 'win' : mine.value <= -500 && best.value > -500 ? 'save' : gap >= TAKE_GAP ? 'better' : null;
  if (!kind) return null;
  return { pit: best.pit, played, gap: Math.round(Math.min(gap, 48)), kind };
}

// The words under the board, from your seat, short enough for a phone: "your pit 3 was the move · takes 8 · 6 seeds better".
// `path` is sowPath for the better move on the position you moved from (what it does at once); the gap is the search's view further on.
export function takeWords(take, path, { you = 0 } = {}) {
  if (!take) return '';
  const parts = [`${pitName(take.pit, you)} was the move`];
  if (path) {
    const r = path.relays.length; if (r) parts.push(r === 1 ? 'picks up again once' : `picks up again ×${r}`);
    if (path.got) parts.push(`takes ${path.got}`);
    if (path.lost) parts.push(`gives ${path.lost}`);
  }
  parts.push(take.kind === 'win' ? 'wins the game' : take.kind === 'save' ? 'keeps you in the game' : `${take.gap} seed${take.gap === 1 ? '' : 's'} better`);
  return parts.join(' · ');
}

// What she says over the chip the first time in a game (one dry line; after that the words alone).
export const LINES = {
  better: ['It was sitting right there.', 'Count again. Slowly.', 'The seeds were telling you.'],
  win: ['That one ended it. You walked past it.', 'The game was yours. Was.'],
  save: ['That pit was the way out.', 'Still breathing — only just.'],
};
export function takeLine(take, rng = Math.random) {
  if (!take) return '';
  const arr = LINES[take.kind] || LINES.better; return arr[Math.floor(rng() * arr.length)] || '';
}
