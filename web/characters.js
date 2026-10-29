// The three opponents: a face (simple vector portrait), a bio and lines for the moments that matter.
// Lines are short, warm and Nigerian in cadence without laying it on thick.
const face = (skin, hair, cloth, extra = '') => `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="${cloth}"/>
  <path d="M12 58c3-12 11-18 20-18s17 6 20 18" fill="${cloth === '#2d6a4f' ? '#40916c' : '#8a5a2b'}"/>
  <ellipse cx="32" cy="30" rx="13" ry="15" fill="${skin}"/>
  ${hair}
  <circle cx="27" cy="29" r="1.8" fill="#1a0f07"/><circle cx="37" cy="29" r="1.8" fill="#1a0f07"/>
  ${extra}
</svg>`;

export const CHARACTERS = {
  easy: {
    name: 'Adaeze', level: 'Easy', bio: 'Nine years old and already sure she is winning.',
    face: face('#9c6b3f', '<path d="M19 26c0-9 6-14 13-14s13 5 13 14" fill="#1a0f07"/><circle cx="19" cy="24" r="3.5" fill="#e6b76f"/><circle cx="45" cy="24" r="3.5" fill="#e6b76f"/>', '#c9184a', '<path d="M27 36q5 4 10 0" stroke="#1a0f07" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
    lines: {
      start: ['Me first? No, you first. Go!', 'I will be gentle. Maybe.'],
      capture: ['Mine! All mine!', 'Did you see that? Four!', 'Hehe. Thank you.'],
      lost: ['Ah ah, that one was mine!', 'Not fair. OK, fair.', 'I was keeping those!'],
      undo: ['Heh, no take-backs… fine.', 'I saw that.'],
      win: ['I won! Can we play again?', 'Told you I was winning.'],
      lose: ['Again! One more!', 'You only won because I let you.'],
    },
  },
  medium: {
    name: 'Nnamdi', level: 'Medium', bio: 'Your quick cousin. Talks more than he plans, plans more than you think.',
    face: face('#7a4a24', '<path d="M19 24c1-9 7-12 13-12s12 3 13 12" fill="#1a0f07"/>', '#1d3557', '<path d="M26 37q6 3 12 0" stroke="#1a0f07" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M22 24l9-2" stroke="#1a0f07" stroke-width="1.4" stroke-linecap="round"/>'),
    lines: {
      start: ['Relax, I\'ll go easy. Small small.', 'Loser carries the board.'],
      capture: ['Chop. That\'s how we do it.', 'Four seeds, no stress.', 'You left that one open, o.'],
      lost: ['Ehn? Who taught you that?', 'OK… OK. I see you.', 'That was my pit!'],
      undo: ['Undo? In Lagos we call that a loan.', 'I\'ll allow it. Once.'],
      win: ['Cousin, I warned you.', 'GG. Buy me suya.'],
      lose: ['Best of three. Obviously.', 'My phone was lagging.'],
    },
  },
  hard: {
    name: 'Mama Ngozi', level: 'Hard', bio: 'Thirty years at the market, ten thousand games on the same board.',
    face: face('#6b3d1e', '<path d="M17 22c3-10 10-12 15-12s12 2 15 12v4H17z" fill="#e6b76f"/><path d="M17 22h30" stroke="#b8862b" stroke-width="2"/>', '#2d6a4f', '<path d="M27 37q5 2 10 0" stroke="#1a0f07" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="20" cy="33" r="2" fill="#e6b76f"/><circle cx="44" cy="33" r="2" fill="#e6b76f"/>'),
    lines: {
      start: ['Sit well. This will take a while.', 'I have seen that opening before.'],
      capture: ['Patience is a seed too.', 'You counted. You just counted wrong.', 'Mm-hm.'],
      lost: ['Good. Now do it twice.', 'I gave you that one.', 'Noted.'],
      undo: ['Undo all you like, child.', 'The board remembers.'],
      win: ['Come back when you have practised.', 'The board does not lie.'],
      lose: ['Well played. I mean it.', 'Hm. I taught you too well.'],
    },
  },
};

export function line(level, moment) {
  const c = CHARACTERS[level] || CHARACTERS.medium; const arr = c.lines[moment] || [];
  return arr[Math.floor(Math.random() * arr.length)] || '';
}
