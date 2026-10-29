// The three opponents: a face (simple vector portrait), a bio and lines for the moments that matter.
// Lines are short, warm and Nigerian in cadence without laying it on thick.
// Faces have moods (calm, think, happy, sulk, surprised, blink): the HUD swaps them as the game turns, so the
// opponent reacts with a face as well as a line. Pure strings, no DOM, so it is tested in node.

export const MOODS = ['calm', 'think', 'happy', 'sulk', 'surprised', 'blink'];
const INK = '#1a0f07';

// Eyes, brows and mouth for a mood. `g` is how big the character's grin gets (1 Adaeze … 0.45 Mama Ngozi);
// `calm` is the character's resting mouth and brows, so each face keeps its own personality between reactions.
function features(mood, g, calm) {
  const eyes = (r = 1.8, dx = 0, dy = 0) => `<circle cx="${27 + dx}" cy="${29 + dy}" r="${r}" fill="${INK}"/><circle cx="${37 + dx}" cy="${29 + dy}" r="${r}" fill="${INK}"/>`;
  const brows = (l, r) => `<path d="${l}" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="${r}" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  const mouth = (d, w = 1.6) => `<path d="${d}" stroke="${INK}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  switch (mood) {
    case 'think': // eyes up and away, one brow up, lips pressed: counting seeds
      return eyes(1.7, 1.4, -1.3) + brows('M23 24l7-1.5', 'M34 22.5l7 1') + mouth('M28 37h8');
    case 'happy': { // eyes crinkle shut, cheeks, a grin sized to the character
      const open = 5 + 6 * g, drop = 2 + 5 * g;
      return `<path d="M24 29q3-3 6 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M34 29q3-3 6 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
        + `<circle cx="22" cy="34" r="2.4" fill="#d9775a" opacity=".45"/><circle cx="42" cy="34" r="2.4" fill="#d9775a" opacity=".45"/>`
        + `<path d="M${32 - open} 35q${open} ${drop * 2} ${open * 2} 0z" fill="${INK}"/>`;
    }
    case 'sulk': // brows down, eyes narrowed, mouth turned down: that pit was theirs
      return eyes(1.5) + brows('M23 24l7 2', 'M41 24l-7 2') + mouth('M27 39q5-4 10 0');
    case 'surprised': // round eyes, brows high, a small o
      return `<circle cx="27" cy="29" r="3.2" fill="#fff"/><circle cx="37" cy="29" r="3.2" fill="#fff"/>` + eyes(2.1) + brows('M22 21q5-3 9 0', 'M33 21q5-3 9 0') + `<ellipse cx="32" cy="38" rx="2.6" ry="3.2" fill="${INK}"/>`;
    case 'blink':
      return `<path d="M24.5 29.5h5M34.5 29.5h5" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` + calm;
    default:
      return eyes() + calm;
  }
}

const portrait = (skin, hair, cloth, feats) => `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="${cloth}"/>
  <path d="M12 58c3-12 11-18 20-18s17 6 20 18" fill="${cloth === '#2d6a4f' ? '#40916c' : '#8a5a2b'}"/>
  <ellipse cx="32" cy="30" rx="13" ry="15" fill="${skin}"/>
  ${hair}
  ${feats}
</svg>`;

const LOOKS = {
  // `rest` is the resting mouth (and a brow) drawn only when calm; `always` stays through every mood (earrings)
  easy: { skin: '#9c6b3f', cloth: '#c9184a', grin: 1,
    hair: '<path d="M19 26c0-9 6-14 13-14s13 5 13 14" fill="#1a0f07"/><circle cx="19" cy="24" r="3.5" fill="#e6b76f"/><circle cx="45" cy="24" r="3.5" fill="#e6b76f"/>',
    rest: '<path d="M27 36q5 4 10 0" stroke="#1a0f07" stroke-width="1.6" fill="none" stroke-linecap="round"/>', always: '' },
  medium: { skin: '#7a4a24', cloth: '#1d3557', grin: 0.8,
    hair: '<path d="M19 24c1-9 7-12 13-12s12 3 13 12" fill="#1a0f07"/>',
    rest: '<path d="M26 37q6 3 12 0" stroke="#1a0f07" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M22 24l9-2" stroke="#1a0f07" stroke-width="1.4" stroke-linecap="round"/>', always: '' },
  hard: { skin: '#6b3d1e', cloth: '#2d6a4f', grin: 0.45,
    hair: '<path d="M17 22c3-10 10-12 15-12s12 2 15 12v4H17z" fill="#e6b76f"/><path d="M17 22h30" stroke="#b8862b" stroke-width="2"/>',
    rest: '<path d="M27 37q5 2 10 0" stroke="#1a0f07" stroke-width="1.6" fill="none" stroke-linecap="round"/>', always: '<circle cx="20" cy="33" r="2" fill="#e6b76f"/><circle cx="44" cy="33" r="2" fill="#e6b76f"/>' },
};

// The face of a character in a mood (calm when the mood is unknown).
export function faceFor(level, mood = 'calm') {
  const L = LOOKS[level] || LOOKS.medium; if (!MOODS.includes(mood)) mood = 'calm';
  return portrait(L.skin, L.hair, L.cloth, L.always + features(mood, L.grin, L.rest));
}

// Which face goes with each moment the opponent speaks at.
export const MOOD_FOR = { start: 'happy', capture: 'happy', lost: 'sulk', undo: 'surprised', win: 'happy', lose: 'sulk', firstWin: 'surprised' };

export const CHARACTERS = {
  easy: {
    name: 'Adaeze', level: 'Easy', bio: 'Nine years old and already sure she is winning.',
    lines: {
      start: ['Me first? No, you first. Go!', 'I will be gentle. Maybe.'],
      capture: ['Mine! All mine!', 'Did you see that? Four!', 'Hehe. Thank you.'],
      lost: ['Ah ah, that one was mine!', 'Not fair. OK, fair.', 'I was keeping those!'],
      undo: ['Heh, no take-backs… fine.', 'I saw that.'],
      win: ['I won! Can we play again?', 'Told you I was winning.'],
      lose: ['Again! One more!', 'You only won because I let you.'],
      firstWin: ['You beat me?! OK. Again, again!'],
    },
    // your record against them: what they say when you are on a run (yours: you keep winning; theirs: they do)
    runs: { yours: { 3: 'Three in a row? I\'m telling Mama.', 5: 'Five! Are you magic?', more: (n) => `${n} in a row. I give up. No I don't.` },
            theirs: { 3: 'Three for me! Hehe.', 5: 'Five! I\'m the champion of everything.', more: (n) => `${n}! Are you letting me win?` } },
  },
  medium: {
    name: 'Nnamdi', level: 'Medium', bio: 'Your quick cousin. Talks more than he plans, plans more than you think.',
    lines: {
      start: ['Relax, I\'ll go easy. Small small.', 'Loser carries the board.'],
      capture: ['Chop. That\'s how we do it.', 'Four seeds, no stress.', 'You left that one open, o.'],
      lost: ['Ehn? Who taught you that?', 'OK… OK. I see you.', 'That was my pit!'],
      undo: ['Undo? In Lagos we call that a loan.', 'I\'ll allow it. Once.'],
      win: ['Cousin, I warned you.', 'GG. Buy me suya.'],
      lose: ['Best of three. Obviously.', 'My phone was lagging.'],
      firstWin: ['Fine. That one counts. Barely.'],
    },
    runs: { yours: { 3: 'Three straight? Who have you been practising with?', 5: 'Five in a row. OK, I\'m actually trying now.', more: (n) => `${n} in a row. Cousin, leave something for me.` },
            theirs: { 3: 'Three–zero. Suya is on you.', 5: 'Five. I\'m not even looking at the board.', more: (n) => `${n} and counting. Buy a bigger board.` } },
  },
  hard: {
    name: 'Mama Ngozi', level: 'Hard', bio: 'Thirty years at the market, ten thousand games on the same board.',
    lines: {
      start: ['Sit well. This will take a while.', 'I have seen that opening before.'],
      capture: ['Patience is a seed too.', 'You counted. You just counted wrong.', 'Mm-hm.'],
      lost: ['Good. Now do it twice.', 'I gave you that one.', 'Noted.'],
      undo: ['Undo all you like, child.', 'The board remembers.'],
      win: ['Come back when you have practised.', 'The board does not lie.'],
      lose: ['Well played. I mean it.', 'Hm. I taught you too well.'],
      firstWin: ['So. You finally beat me. Once.'],
    },
    runs: { yours: { 3: 'Three in a row? Mama Ngozi is watching.', 5: 'Five. Now the market will talk.', more: (n) => `${n} in a row. The board is yours. For now.` },
            theirs: { 3: 'Three. Come back when the seeds listen to you.', 5: 'Five. Sit well; we are not finished.', more: (n) => `${n}. I am not counting. You are.` } },
  },
};
for (const k in CHARACTERS) CHARACTERS[k].face = faceFor(k, 'calm');

export function line(level, moment) {
  const c = CHARACTERS[level] || CHARACTERS.medium; const arr = c.lines[moment] || [];
  return arr[Math.floor(Math.random() * arr.length)] || '';
}

// What the opponent says about a run: `run` is yours against them (+3 three wins in a row, −3 three losses).
// Only runs worth a word get one (3, 5, then every fifth); anything else is ''.
export function runLine(level, run) {
  const c = CHARACTERS[level] || CHARACTERS.medium; const n = Math.abs(run); if (!n) return '';
  const side = run > 0 ? c.runs.yours : c.runs.theirs;
  if (side[n]) return side[n];
  return n >= 10 && n % 5 === 0 ? side.more(n) : '';
}
// The face that goes with a run line: a sulk when you are the one winning, a grin when they are.
export const RUN_MOOD = { yours: 'sulk', theirs: 'happy' };
