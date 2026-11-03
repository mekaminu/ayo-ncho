// The hand counts — a small brass number rides over the hand while it sows: the seeds still in it, ticking down as
// each one leaves, starting again (with a glint) when a relay picks a pit up; and a copper "+8" over the hand that
// sweeps up a capture, climbing as each pit is scooped, then counting down into the trough as the seeds go in.
// Pure: read from the engine's own events, so the number can never disagree with the move. No DOM.

// For each event, what the two hands hold just after it:
//   sow  — seeds in the sowing hand (null once it is empty and no pit is in hand)
//   haul — seeds in the capture hand, as it would read after sweeping that capture's pits (0 when none)
//   again — true on a relay pickup (the number glints)
export function handSteps(events) {
  let sow = null; const out = [];
  for (const e of events) {
    if (e.type === 'pickup') { sow = e.n; out.push({ sow, haul: 0, again: !!e.relay }); }
    else if (e.type === 'drop') { sow = sow > 1 ? sow - 1 : null; out.push({ sow, haul: 0, again: false }); }
    else if (e.type === 'capture') out.push({ sow, haul: e.n, again: false });
    else out.push({ sow, haul: 0, again: false });
  }
  return out;
}

// what the number says: the sowing hand plain, the capture hand with a plus (it is coming to you or to them)
export function handText(n, kind = 'sow') { return n > 0 ? (kind === 'haul' ? `+${n}` : String(n)) : ''; }

// it rides with the seed counts on the pits (Settings → Board → Seed counts on pits), and never in the clip (the
// clip records the canvas only, so the number is never in the video anyway)
export function handShown(badgesOn, clipping) { return !!badgesOn && !clipping; }

// whose seeds the capture hand carries: 'gift' when they go to the other side's trough (Nchò: a pit on their side that
// makes 4 before the sower's last seed goes to its owner), so the "+4" is drawn pale rather than copper; the mover is
// whoever's pit the turn was picked up from (the first event)
export function haulKind(events, capture) {
  const first = events && events.find((e) => e.type === 'pickup');
  return first && capture && capture.by !== (first.pit < 6 ? 0 : 1) ? 'gift' : 'mine';
}
