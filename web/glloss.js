// The board comes back (idea 6 Nov). Pure logic, no DOM and no three.js, so node can test it.
//
// A phone can take the GPU away from a page at any time: switching to WhatsApp and back on an iPhone, the Fold folding or
// unfolding, a call coming in, a phone short of memory with the camera open. The browser then tells the page its WebGL
// "context" is lost, and everything the board had drawn is gone — on Chrome a blank white canvas with the count badges
// floating over it, on Safari a black one. Three.js asks the browser for it back and rebuilds the board when it comes, but
// nothing in the game said what was happening, and the board rests when nothing moves (web/rest.js), so even once the
// picture was back it could wait for the next heartbeat. And when the browser never gives it back (Safari sometimes doesn't),
// the screen just stayed blank until the player thought to reload.
//
// Now, while the board is away, the canvas steps aside so the dark wood colour of the page shows (never a white or black
// flash), the count badges and the pit lights go with it, and after a blink (WAIT_MS — a tab switch the phone restores at
// once says nothing) three seeds and "The board is coming back…" sit where the board was. When the browser gives the board
// back it is drawn at once (three frames forced, whatever the rest check says) and, if the line was showing, a toast says
// "The board is back". If it has not come back after STUCK_MS of the page being looked at (time in another app does not
// count), the line says so and offers "Bring the board back": the game is saved and the page reloads it where it was (a game
// with a friend rejoins its room, as after any reload). Taps on the board do nothing while it is away, so no move is played
// blind. `window.__ayo.gl` reports it; tools/render.py --glloss takes the board away with WEBGL_lose_context.

export const WAIT_MS = 600;    // away for less than this: nothing said
export const STUCK_MS = 6000;  // not back after this much looking at it: offer to bring it back
export const STEP_CAP_MS = 250; // the most one tick may count (a page hidden in between never runs the clock)

export const WORDS = {
  back: 'The board is coming back…',
  backSmall: 'The phone took the board away for a moment',
  stuck: "The board didn't come back by itself",
  stuckSmall: 'Your game is kept — this opens it again where you left it',
  button: 'Bring the board back',
  again: 'The board is back',
};

// makeGlWatch(): lost(now) / restored(now) from the canvas's events, tick(now, hidden) every frame → what to show
export function makeGlWatch({ wait = WAIT_MS, stuck = STUCK_MS, cap = STEP_CAP_MS } = {}) {
  const w = {
    phase: 'ok', out: 0, at: null, losses: 0, restores: 0, shown: null, log: [],
    lost(now) {
      if (w.phase === 'lost') return false; // the browser says it twice sometimes
      w.phase = 'lost'; w.out = 0; w.at = now; w.losses++; w.shown = null; w.log.push({ t: 'lost', at: now });
      return true;
    },
    // → { said: true } when the line was up (so the game says "The board is back"), else { said: false }
    restored(now) {
      if (w.phase !== 'lost') return { said: false };
      const said = w.shown != null;
      w.phase = 'ok'; w.restores++; w.log.push({ t: 'restored', away: Math.round(w.out), said }); w.out = 0; w.at = null; w.shown = null;
      return { said };
    },
    // the clock runs only while the page is looked at, and one slow frame (or a page coming back from the background) counts
    // at most `cap`: a phone that took the board away while it sat in a pocket never comes back to "didn't come back"
    tick(now, hidden = false) {
      if (w.phase !== 'lost') return null;
      const dt = w.at == null ? 0 : Math.min(cap, Math.max(0, now - w.at)); w.at = now;
      if (!hidden) w.out += dt;
      w.shown = lineFor(w.out, { wait, stuck });
      return w.shown;
    },
  };
  return w;
}

// lineFor(ms away, looked at) → null | 'back' | 'stuck'
export function lineFor(out, { wait = WAIT_MS, stuck = STUCK_MS } = {}) {
  if (!(out >= wait)) return null;
  return out >= stuck ? 'stuck' : 'back';
}

// the words for each line
export function lineWords(kind) {
  if (kind === 'back') return { title: WORDS.back, small: WORDS.backSmall, button: null };
  if (kind === 'stuck') return { title: WORDS.stuck, small: WORDS.stuckSmall, button: WORDS.button };
  return null;
}
