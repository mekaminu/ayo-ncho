// Sound level (idea 7 Nov): Settings → Feel → Sound level, Quiet / Normal / Loud.
// The phone's own volume moves everything at once — the game, WhatsApp, a call — and on the Fold or a Mac with the
// volume already set, the wood was either too loud for a sleeping house or too soft on a small speaker. Now the game
// has its own level: it scales the board's sounds (the knocks, the rattle, the scoop, the taps) and the music together,
// live, with no new game. Loud goes over the board's gentle limiter, so a capture of a dozen seeds never clips.
// This module says what each level is, how far it moves each sound, and words the row and the toast.

export const LEVELS = ['quiet', 'normal', 'loud'];
// how far each level moves the board's bus (its own level is 0.75 at Normal) and the music's (0.2 at Normal)
export const GAIN = { quiet: 0.35, normal: 1, loud: 1.6 };
// the music never goes louder than this whatever the level (it sits under the board's sounds)
export const MUSIC_CAP = 0.3;

export function levelPref(v) { return LEVELS.includes(v) ? v : 'normal'; }
export function levelGain(pref) { return GAIN[levelPref(pref)]; }
// the board's bus at a level (Normal = the 0.75 it always had)
export function boardGain(pref) { return 0.75 * levelGain(pref); }
// the music's own level under a sound level (Normal = the 0.2 it always had)
export function musicGain(pref, base = 0.2) { return Math.min(MUSIC_CAP, base * levelGain(pref)); }

// the row's small print under "Sound level"
export function levelNote(pref, soundOn = true) {
  if (!soundOn) return 'the knocks and the music · the sound is off (the speaker on the board)';
  const p = levelPref(pref);
  return p === 'quiet' ? 'the knocks and the music · soft, for a quiet room'
    : p === 'loud' ? 'the knocks and the music · louder, for a small speaker'
    : 'the knocks and the music · as made';
}
export function levelToast(pref) {
  const p = levelPref(pref);
  return p === 'quiet' ? 'Quieter' : p === 'loud' ? 'Louder' : 'Sound as made';
}
