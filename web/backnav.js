// Back goes back (idea 6 Nov, night): inside the Android app the phone's back button already steps back the way the
// screens' own Back buttons do (web/app.js backStep), but on the web link — the Fold's browser, the game installed from
// it, Safari's edge swipe — the back gesture left the game altogether: from Settings, from the store, from a rules card
// or mid-game, one swipe and the page was gone. Now, while anything but Home is on screen, the page keeps one entry of
// its own in the browser's history (same address, nothing new in the bar); a back gesture takes that entry and the game
// takes the step the Back button would (Settings → where you came from, the store → Home, a card closes, a game → Home),
// and on Home the next back leaves as before. Back to Home by its own button gives the entry back quietly, so Home's
// back never needs two swipes. A game with a friend never walks out of the room on a swipe: it stays and says how to
// leave. One entry at most, whatever happens; a reload that lands on the entry gives it back at once.

export const BACK_MARK = 'ayoBack';
export const IGNORE_MS = 1000; // the pop our own history.back() causes arrives within this

// The Android app's step (web/app.js backStep) for the web link: 'minimize' there means put the app away, which a page
// cannot do — on Home that is leaving the page, in a room it is staying put and saying so.
export function webStep(step, ui = {}) {
  if (step !== 'minimize') return step;
  return ui.screen === 'home' ? 'leave' : 'room';
}

// Whether the page wants its entry: anywhere but Home (and anywhere a back would otherwise leave mid-game).
export const wantsGuard = (step) => step !== 'leave';

// The page's one history entry. hist: window.history (pushState, back, state); now: a clock in ms.
export function makeBackNav(hist, { now = () => Date.now() } = {}) {
  const st = hist && hist.state;
  const nav = {
    guarded: !!(st && st[BACK_MARK]), // a reload on our entry: it is there, and the first sync gives it back if Home is up
    ignoreUntil: 0, pushes: 0, backs: 0,
    // Bring the history in line with what is on screen; returns 'pushed' | 'gave' | null.
    sync(step) {
      const want = wantsGuard(step);
      if (want && !nav.guarded) {
        try { hist.pushState({ ...(hist.state || {}), [BACK_MARK]: 1 }, ''); } catch { return null; }
        nav.guarded = true; nav.pushes++; return 'pushed';
      }
      if (!want && nav.guarded) {
        nav.guarded = false; nav.ignoreUntil = now() + IGNORE_MS; nav.backs++;
        try { hist.back(); } catch { nav.ignoreUntil = 0; }
        return 'gave';
      }
      return null;
    },
    // A popstate: our entry has gone. 'ignored' when it was our own giving back, 'back' when the player went back.
    pop(state) {
      if (state && state[BACK_MARK]) { nav.guarded = true; return 'forward'; } // a forward swipe onto our entry: keep it
      nav.guarded = false;
      if (nav.ignoreUntil && now() < nav.ignoreUntil) { nav.ignoreUntil = 0; return 'ignored'; }
      nav.ignoreUntil = 0;
      return 'back';
    },
  };
  return nav;
}

// What a back in a room says (the Home button leaves it).
export const ROOM_WORDS = 'Back keeps you in the room — Home leaves it';
