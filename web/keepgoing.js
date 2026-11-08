// Never stuck on "thinking…" (found 8 Nov by the long-evening check): every seed's flight, every scoop and every tick of
// a score is a tween run from the frame loop, and the move waits for all of them. Before this, one step that threw (any
// bug in any of the dozens of things a frame moves) ended the frame loop for good — the next frame was never asked for —
// so every tween froze where it was, the move never finished and the board stayed busy with the opponent "thinking…" and
// seeds in mid-air or half-way into a trough, until the page was reloaded. Now a tween whose step throws is finished on
// the spot (it lands where it was going: its promise resolves, so the move goes on and the board is laid out from the
// engine afterwards as always), and the frame loop asks for its next frame whatever happened inside it. The error is still
// thrown afterwards, outside the frame, so the checks in tools/ (which fail on any page error) still see it.

// run every tween one frame on; a step that throws drops its tween and resolves it, so nothing waits on it for ever
export function runTweens(tweens, now, onError = rethrow) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; if (!tw) continue;
    let t = 1;
    try { t = Math.min(1, (now - tw.t0) / tw.ms); if (!(t >= 0)) t = 1; tw.step(tw.ease(t)); } // a NaN time (ms 0/0) ends it too
    catch (e) { t = 1; onError(e); }
    if (t >= 1) { const k = tweens.indexOf(tw); if (k >= 0) tweens.splice(k, 1); tw.res(); }
  }
}

// a frame loop that always asks for its next frame unless its body says to stop (returns false)
export function frameLoop(body, schedule, onError = rethrow) {
  const loop = (now) => {
    let again = true;
    try { again = body(now) !== false; } catch (e) { onError(e); }
    if (again) schedule(loop);
  };
  return loop;
}

export const caught = { n: 0, last: null };
// the error goes on to the page, after the frame, as an uncaught error (the browser's console and window.onerror see it)
export function rethrow(e) {
  caught.n++; caught.last = String(e && e.stack || e).slice(0, 400);
  setTimeout(() => { throw e; }, 0);
}
