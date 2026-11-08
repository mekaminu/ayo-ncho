// Their talk (idea 7 Nov): the computer opponent speaks in a bubble over the board at a dozen moments — hello, every
// capture, every pit of 4+ you take, every Undo, the last 8, a game going round in circles, a long wait, the end. In a
// long session, on a train, or for a player who wants to think, that is a lot of words. Settings → Opponent → Their talk:
//   all  — every line, as before (the default)
//   few  — hello and goodbye only: the greeting that opens a game and their word at the end
//   off  — no bubble at all
// Either way the face still reacts (a grin at a capture, a sulk when you take 4) and the Game over card keeps its words;
// a friend in a room and two of us on one phone never had the bubble. ?talk=all|few|off for a visit.

export const TALKS = ['all', 'few', 'off'];
export const talkPref = (v) => (TALKS.includes(v) ? v : 'all');
export const talkNow = (saved, param) => talkPref(TALKS.includes(param) ? param : saved);

// the moments a game opens with (web/greet.js) and closes with (game over: their usual line, a first win, a run)
export const OPENING = ['start', 'morning', 'afternoon', 'evening', 'night', 'back', 'againWon', 'againWonBig', 'againLost', 'againDrew'];
export const CLOSING = ['win', 'lose', 'firstWin', 'run', 'end'];

// does the bubble show for this moment? (anything not named — a capture, an undo, Mama Ngozi's take — is mid-game chat)
export function speaks(talk, moment) {
  const t = talkPref(talk);
  if (t === 'all') return true;
  if (t === 'off') return false;
  return OPENING.includes(moment) || CLOSING.includes(moment);
}

export const talkNote = (talk) => ({ all: 'every line, as they play', few: 'hello and goodbye only', off: 'no words; the face still shows it' })[talkPref(talk)];
export const talkToast = (talk) => ({ all: 'They say what they think again', few: 'Just hello and goodbye from now', off: 'They keep their words to themselves' })[talkPref(talk)];
