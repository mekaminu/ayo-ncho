// The mouse on the Mac (or a Fold with a mouse or trackpad): what the pit under the pointer says before you click.
// Pure functions, no DOM: the board asks what to show for the pit (or the empty board) under the mouse; the rules still come
// from the engine (legalMoves), never from here. A finger never hovers, so phones see none of this.
//
//   your pit you can play        a hand cursor and a faint brass ring on its rim; with nothing picked yet the hint line says
//                                "pit 3 · 5 seeds — click to see where they go"
//   your pit the feed rule bars  a not-allowed cursor: "pit 3 would leave them nothing — you must give the other side seeds"
//   your empty pit               "pit 3 is empty"
//   their pit                    "their pit 2 · 6 seeds" (handy with the count badges off), no ring, an ordinary cursor
//   the wood around the pits     a grab hand: drag to turn the board (grabbing while you drag)
//   a turn playing               a hand cursor while a click would hurry it, otherwise the wait cursor
import { legalMoves, owner } from '../engine/ayo.js';
import { pitName } from './path.js';
import { seedsWord } from './keys.js';

// `pit`: the pit under the mouse, or null for the board around them. `press`: may a pit be pressed now (your move, nothing in
// flight). `hurry`: would a click hurry a turn now playing. `selected`: the pit already picked (its path is showing).
export function hoverAt({ state, pit = null, you = 0, press = false, hurry = false, busy = false, selected = null, dragging = false } = {}) {
  if (dragging) return { cursor: 'grabbing', ring: false, words: null };
  if (hurry) return { cursor: 'pointer', ring: false, words: null };
  if (busy) return { cursor: 'progress', ring: false, words: null };
  if (pit === null || pit === undefined || !state) return { cursor: 'grab', ring: false, words: null };
  const n = state.pits[pit]; const name = pitName(pit, you); const short = name.replace(/^your /, '');
  const talk = selected === null; // with a pit picked, the hint line keeps its path words
  if (owner(pit) !== you) return { cursor: 'default', ring: false, words: talk && !state.over ? `${name} · ${seedsWord(n)}` : null };
  if (!press) return { cursor: 'default', ring: false, words: null };
  if (n === 0) return { cursor: 'not-allowed', ring: false, words: talk ? `${short} is empty` : null };
  if (!legalMoves(state).includes(pit)) return { cursor: 'not-allowed', ring: false, words: `${short} would leave them nothing — you must give the other side seeds` };
  if (pit === selected) return { cursor: 'pointer', ring: false, words: null };
  return { cursor: 'pointer', ring: true, words: talk ? `${short} · ${seedsWord(n)} — click to see where they go` : null };
}
