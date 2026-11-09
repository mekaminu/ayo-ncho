// Tell us what went wrong (idea 9 Nov): until the store apps are out, every fix comes from Meka or a friend saying what they
// saw ("the board went black on my cousin's iPhone"), and the fix waits on the questions that follow — which phone, which
// browser, what the game said. The page that shows when the board cannot start already carries small print for Meka, but
// once the game is up nothing did: an error in the middle of a game left no trace anyone could send. Now the game keeps a
// short note of any trouble it meets while it is open (a page error, a promise that failed, the phone taking the board's
// graphics away), and Settings → Something wrong? → Send puts one plain block of text in the share sheet (or the
// clipboard): the build, what the phone and browser are, the screen, how the board is drawn, and that trouble — ready to
// paste into WhatsApp under "this is what happened". Nothing is sent by itself, and the block never holds a name, a move, a
// room code or anything typed: an address keeps only its file name, and a long run of letters (a link's code) is cut out.
// The block is in English whatever the game's language (it is read by whoever fixes the game); the row, the button and the
// toasts are French with the rest. Pure functions, tested in node (test/report.test.js).

export const MAX_TROUBLE = 6;    // kept at most this many different notes (the first ones matter most), each counted
export const MAX_LEN = 160;      // characters of one note

export const ROW_NONE = 'nothing has gone wrong since the game opened';
export const SHARED = 'Shared — add a line about what happened';
export const COPIED = 'Copied — paste it into your message, with a line about what happened';
export const FAILED = 'Could not copy it here';

// A note made safe to send: addresses down to their file name (no query, no #, so no room code or progress link), long
// runs of letters and digits (a code, a token) cut out, room codes in words cut out, one line, not too long.
export function clean(msg) {
  let s = String(msg == null ? '' : msg);
  s = s.replace(/\b(?:https?|wss?|blob|file|capacitor):\/\/[^\s'")]+/gi, (u) => {
    const path = u.split(/[?#]/)[0]; const name = path.replace(/\/+$/, '').split('/').pop();
    return /^(?:https?|wss?|blob|file|capacitor):$/i.test(name) || !name || name.includes(':') ? '(address)' : name;
  });
  s = s.replace(/[?#][^\s'")]*/g, '');
  s = s.replace(/[A-Za-z0-9_\-+/=]{32,}/g, '…');
  s = s.replace(/\b(room|code)\s+[A-Z0-9]{4,6}\b/gi, '$1 ····');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN - 1) + '…';
  return s || 'error';
}

// The words for an error event's parts.
export function errorNote(kind, err, file, line) {
  const m = err && (err.message || (typeof err === 'string' ? err : '')) || '';
  const n = err && err.name && err.name !== 'Error' && !String(m).startsWith(err.name) ? err.name + ': ' : '';
  const where = file ? ` · ${String(file).split(/[?#]/)[0].split('/').pop()}${line ? ':' + line : ''}` : '';
  return `${kind === 'rejection' ? 'promise: ' : ''}${n}${m || String(err || 'error')}${where}`;
}

// The book of trouble since the game opened. `now()` the clock (ms); `opened` when the page opened.
export function makeTrouble(now = () => Date.now(), opened = now()) {
  const t = { notes: [], dropped: 0, opened };
  t.add = (msg) => {
    const m = clean(msg); const at = now();
    const had = t.notes.find((n) => n.m === m);
    if (had) { had.n++; had.last = at; return had; }
    if (t.notes.length >= MAX_TROUBLE) { t.dropped++; return null; }
    const n = { m, n: 1, first: at, last: at }; t.notes.push(n); return n;
  };
  t.count = () => t.notes.reduce((s, n) => s + n.n, 0) + t.dropped;
  return t;
}

// The row's own line in Settings.
export function rowWords(count) {
  if (!count) return ROW_NONE;
  return count === 1 ? 'the game has met 1 problem since it opened' : `the game has met ${count} problems since it opened`;
}

const ago = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 90 ? `${s} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`; };

// What the phone is, short: the browser's own description without its oldest word.
export const shortAgent = (ua) => String(ua || 'unknown').replace(/^Mozilla\/5\.0 /, '').slice(0, 240);

// The block of text. `o`: build, where ('web'|'android'|'ios'), ua, screen {w,h,dpr}, view {w,h}, touch, installed,
// lang, words (word size), gpu (the renderer's name, or null), lite, why (why that board), physics, losses (graphics taken
// away), game {name, against, moves, over, room (a bool)}, trouble (makeTrouble), now.
export function reportText(o = {}) {
  const now = o.now || Date.now();
  const sc = o.screen || {}, vw = o.view || {}, g = o.game || {}, t = o.trouble || makeTrouble(() => now, now);
  const where = o.where === 'android' ? 'the Android app' : o.where === 'ios' ? 'the iPhone app' : (o.installed ? 'the web link, on the home screen' : 'the web link');
  const lines = [
    'Ayo & Nchò — what went wrong',
    'What happened (write it here): ',
    '',
    `Build: ${o.build || 'unknown'} · ${where}`,
    `Phone: ${shortAgent(o.ua)}`,
    `Screen: ${sc.w || '?'}×${sc.h || '?'} at ${sc.dpr ? Math.round(sc.dpr * 100) / 100 : '?'}× · the game ${vw.w || '?'}×${vw.h || '?'}${o.touch ? ' · touch' : ''}`,
    `Board: ${o.lite ? 'lighter' : 'full'}${o.why ? ` (${o.why})` : ''} · seeds ${o.physics ? 'bounce' : 'fly straight'}${o.gpu ? ` · ${clean(o.gpu)}` : ''}${o.losses ? ` · graphics taken away ${o.losses}×` : ''}`,
    `Language: ${o.lang || 'en'}${o.words && o.words !== 'normal' ? ` · words ${o.words}` : ''}`,
    `Game: ${g.name || '?'}${g.room ? ' with a friend' : g.against ? ` against ${g.against}` : ''} · ${g.moves || 0} moves${g.over ? ' · over' : ''}`,
    `Open for: ${ago(now - t.opened)}`,
  ];
  if (!t.notes.length) lines.push('Trouble: none seen since the game opened');
  else {
    lines.push(`Trouble (${t.count()}):`);
    for (const n of t.notes) lines.push(`- ${n.m}${n.n > 1 ? ` (×${n.n})` : ''} · ${ago(now - n.first)} ago`);
    if (t.dropped) lines.push(`- and ${t.dropped} more`);
  }
  return lines.join('\n');
}
