// Weighing it up (idea 5 Nov): against the computer the opponent's pit lit up out of nowhere — the face said "thinking…" and
// then a pit was chosen. At a real board you watch the other player's hand hover over a pit or two of theirs before it comes
// down on one. Now, while the computer thinks, a faint brass light drifts over its own pits, pausing on each it weighs —
// Adaeze glances at one, the elders at three — and glides onto the pit it plays a moment before the usual light picks it.
// The glances are chosen at random among the moves the engine allows it (legalMoves), so they give nothing away the move
// itself won't show; with only one move there is nothing to weigh and no glance. Never for two of us, a room, the puzzle's
// one move, the lesson, a replay, the clip, or under reduced motion. Pure functions, tested in node.

import { legalMoves } from '../engine/ayo.js';

export const GLANCE_MS = 300;   // a hand pausing over a pit
export const SETTLE_MS = 170;   // the last glide onto the pit it plays, before the usual light takes over
export const OPACITY = 0.34;    // fainter than the mouse's ring (0.45): it is their hand, not your pointer
export const GLIDE = 10;        // how quickly the light follows the hand from pit to pit (per second, eased)
// how many pits each opponent weighs before choosing: the child barely looks, the elders count
export const GLANCES = { easy: 1, steady: 2, medium: 2, hard: 3, master: 3 };

// Whether the hand should hover now. `o`: computer (against the computer, not two of us or a room), puzzle (the puzzle's own
// one move — a play-out from it is a game and counts), lesson, replay, clip, reduced (prefers-reduced-motion), state.
export function ponderOn(o) {
  if (!o || !o.computer || o.puzzle || o.lesson || o.replay || o.clip || o.reduced) return false;
  const s = o.state; if (!s || s.over) return false;
  return legalMoves(s).length >= 2;
}

// A small seeded random, so the same position always glances the same way (and node can check it).
function rand(n) { let x = (n >>> 0) || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
export function seedOf(s) { let h = 17 + s.moves.length * 131; for (let i = 0; i < s.pits.length; i++) h = (h * 31 + s.pits[i] * (i + 3)) >>> 0; return h; }

// The pits the hand passes over, in order: distinct pits among the moves the engine allows, as many as the opponent weighs
// (never more than there are moves). An empty list when there is nothing to weigh.
export function ponderPlan(s, level = 'medium') {
  if (!s || s.over) return [];
  const legal = legalMoves(s); if (legal.length < 2) return [];
  const n = Math.min(GLANCES[level] || 2, legal.length), r = rand(seedOf(s)), pool = legal.slice(), out = [];
  while (out.length < n) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

// How long the glances take before the chosen pit can be lit (the search runs alongside, so this is the most it adds).
export function ponderLength(plan) { return plan.length ? plan.length * GLANCE_MS + SETTLE_MS : 0; }

// Where the light should be `t` ms into the plan, and how bright: fading in on the first pit, holding as it glides between
// them; `pick` (once the move is known, -1 before) is where it settles after the last glance.
export function ponderAt(plan, t, pick = -1) {
  if (!plan.length || t < 0) return { pit: -1, op: 0 };
  const k = Math.floor(t / GLANCE_MS);
  if (k < plan.length) return { pit: plan[k], op: OPACITY * Math.min(1, t / 90) };
  return { pit: pick >= 0 ? pick : plan[plan.length - 1], op: OPACITY };
}
