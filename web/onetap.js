// Sow on the first tap (Settings → Feel, off by default): for players who know the board, a tap on one of your pits sows it
// at once — no first tap to pick it and see where the seeds go. The store mancala apps all play on one tap; two taps stay the
// default because the path marks are how a learner sees a relay turn before it happens.
//
// Pure functions, no DOM. What a press does:
//   the pit already picked (Hint picked it, the one move left was picked for you, or it was picked before the switch)  → sow
//   a finger or a mouse on the board, the switch on                                                                   → sow
//   the lesson (it plays its own pit, picked for you), the keys (1–6 pick, Enter sows), a screen reader's pit button  → pick
// The rules are never decided here: the board asks the engine whether the pit may be played before it asks this.

export const oneTapOn = (prefs) => !!prefs && prefs.get('onetap', '0') === '1';

// `via`: 'tap' (a finger, a mouse or a pen on the board), 'key' (a digit or Enter) or 'button' (the hidden pit buttons that
// screen readers and Tab reach — their labels say "Enter to sow", so they keep the two steps).
export function pressAction({ pit, selected = null, via = 'tap', oneTap = false, lesson = false } = {}) {
  if (selected === pit) return 'sow';
  if (oneTap && via === 'tap' && !lesson) return 'sow';
  return 'pick';
}

