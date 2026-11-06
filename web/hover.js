// The mouse on the Mac (or a Fold with a mouse or trackpad): what the pit under the pointer says before you click.
// Pure functions, no DOM: the board asks what to show for the pit (or the empty board) under the mouse; the rules still come
// from the engine (legalMoves), never from here. A finger never hovers, so phones see none of this.
//
//   your pit you can play        a hand cursor and a faint brass ring on its rim; with nothing picked yet the hint line says
//                                "pit 3 · 5 seeds — click to see where they go" (with Sow on the first tap: "— click to sow it")
//   your pit the feed rule bars  a not-allowed cursor: "pit 3 would leave them nothing — you must give the other side seeds"
//                                (their side empty: "pit 2 doesn't reach them — they have no seeds: play pit 6")
//   your empty pit               "pit 3 is empty"
//   their pit                    "their pit 2 · 6 seeds" (handy with the count badges off), no ring, an ordinary cursor
//   the wood around the pits     a grab hand: drag to turn the board (grabbing while you drag)
//   a turn playing               a hand cursor while a click would hurry it, otherwise the wait cursor
import { legalMoves, owner, seedsOnSide } from '../engine/ayo.js';
import { pitList } from './feed.js';
import { pitName } from './path.js';
import { seedsWord } from './keys.js';

// `pit`: the pit under the mouse, or null for the board around them. `press`: may a pit be pressed now (your move, nothing in
// flight). `hurry`: would a click hurry a turn now playing. `selected`: the pit already picked (its path is showing).
export function hoverAt({ state, pit = null, you = 0, press = false, hurry = false, busy = false, selected = null, dragging = false, oneTap = false } = {}) {
  if (dragging) return { cursor: 'grabbing', ring: false, words: null };
  if (hurry) return { cursor: 'pointer', ring: false, words: null };
  if (busy) return { cursor: 'progress', ring: false, words: null };
  if (pit === null || pit === undefined || !state) return { cursor: 'grab', ring: false, words: null };
  const n = state.pits[pit]; const name = pitName(pit, you); const short = name.replace(/^your /, '');
  const talk = selected === null; // with a pit picked, the hint line keeps its path words
  if (owner(pit) !== you) return { cursor: 'default', ring: false, words: talk && !state.over ? `${name} · ${seedsWord(n)}` : null };
  if (!press) return { cursor: 'default', ring: false, words: null };
  if (n === 0) return { cursor: 'not-allowed', ring: false, words: talk ? `${short} is empty` : null };
  const legal = legalMoves(state);
  if (!legal.includes(pit)) return { cursor: 'not-allowed', ring: false, words: seedsOnSide(state, 1 - you) === 0 // their side empty (web/feed.js says the same on the board)
    ? `${short} doesn't reach them — they have no seeds: play ${pitList(legal, you)}` : `${short} would leave them nothing — you must give the other side seeds` };
  if (pit === selected) return { cursor: 'pointer', ring: false, words: null };
  return { cursor: 'pointer', ring: true, words: talk ? `${short} · ${seedsWord(n)} — ${oneTap ? 'click to sow it' : 'click to see where they go'}` : null }; // Sow on the first tap: one click plays it
}
