// Game numbers and crash reports (Launch L13), behind one small module and one switch in Settings → Privacy.
//
// What it may ever say is fixed here: eight moments of the game and a crash, each with a few words chosen from short lists
// (which game, which opponent, won or lost, how an invite went out, which product). There is no field for a name, a room
// code, the moves, a shout or anything typed, so none can be sent — `clean` drops whatever is not on the lists.
//
// Today it records nothing: there is no sink until Meka makes the free Firebase project (docs/launch/firebase.md), and then
// only inside the apps (web/app.js hands Firebase Analytics / Crashlytics in as the sink). Nothing is kept on the phone by
// this module, nothing is sent from the web link, and with the switch off nothing is passed on at all.
// `?telemetry=test` gives a sink that keeps what would be sent in memory for that visit (tools/render.py checks it).
// Pure, no DOM: tested in node (test/telemetry.test.js).

const LEVELS = ['easy', 'steady', 'medium', 'hard', 'master'];
const ONE_OF = {
  game: ['ncho', 'ayo'],
  vs: [...LEVELS, 'local', 'friend'],
  result: ['win', 'loss', 'draw'],
  ended: ['played', 'gave_up', 'draw_agreed', 'circling'],
  how: ['done', 'skipped', 'whatsapp', 'copy', 'share', 'qr'],
  as: ['host', 'friend'],
  from: ['home', 'settings'],
  product: ['gold', 'board_benin_bronze', 'board_grandpa', 'seeds_cowries', 'seeds_palm_kernels', 'bundle_all'],
  platform: ['web', 'android', 'ios'],
  kind: ['error', 'rejection'],
  type: ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'DOMException', 'other'],
};
const FLAGS = ['first', 'solved', 'shown'];
const BUCKETS = { moves: [10, 20, 40, 60, 100], step: [1, 2, 3] }; // numbers go out as a band, never exactly

// the moments, and which words each may carry
export const EVENTS = {
  game_start: ['game', 'vs', 'first'], // a game's first move (yours or theirs), not the puzzle or the lesson
  game_end: ['game', 'vs', 'result', 'ended', 'moves', 'first'],
  lesson_end: ['how', 'step'], // finished, or skipped at step 1–3
  puzzle_play: ['game', 'solved', 'shown'],
  invite_sent: ['how'],
  invite_joined: ['as'], // the friend let in (host) / let in (friend)
  store_open: ['from'],
  purchase: ['product'],
  crash: ['kind', 'type', 'file', 'line'],
};
const FILE = /^[a-z0-9-]{1,24}\.js$/; // only our own module names, e.g. "game.js"

function band(n, cuts) { const v = Math.max(0, Math.floor(Number(n) || 0)); for (const c of cuts) if (v <= c) return `≤${c}`; return `>${cuts[cuts.length - 1]}`; }

// keep only what the event may carry, each value from its list; anything else is dropped (never sent, never guessed)
export function clean(name, params = {}) {
  const keys = EVENTS[name]; if (!keys) return null;
  const out = {};
  for (const k of keys) {
    const v = params[k]; if (v === undefined || v === null) continue;
    if (ONE_OF[k]) { if (ONE_OF[k].includes(v)) out[k] = v; else if (k === 'type') out[k] = 'other'; }
    else if (FLAGS.includes(k)) out[k] = !!v;
    else if (BUCKETS[k]) out[k] = band(v, BUCKETS[k]);
    else if (k === 'file') { if (FILE.test(String(v))) out[k] = String(v); }
    else if (k === 'line') { const n = Math.floor(Number(v)); if (n > 0 && n < 1e5) out[k] = Math.ceil(n / 10) * 10; } // to the nearest ten lines above
  }
  return out;
}

// what a crash may say: the kind, the error's class and where in our code — never its message (it could hold anything)
export function crashOf(kind, err, file, line) {
  const at = String(file || (err && err.stack && (err.stack.match(/\/([a-z0-9-]+\.js):(\d+)/) || [])[0]) || '');
  const m = at.match(/([a-z0-9-]+\.js)(?::(\d+))?/) || [];
  const ctor = err && err.name ? String(err.name) : 'other';
  return { kind, type: ctor, file: m[1], line: line || m[2] };
}

// the result words of a finished game, from the near seat
export function resultOf(state, you) { return state.winner === 'draw' ? 'draw' : state.winner === you ? 'win' : 'loss'; }

// makeTelemetry({ on, sink, platform }): on() says whether the switch is on; sink(name, params) is Firebase in the apps, or
// nothing. track() returns what was passed on (or null). once(key) keeps a game shown twice (a reload, a resync) to one count.
export function makeTelemetry({ on = () => true, sink = null, platform = 'web' } = {}) {
  const seen = new Set();
  const self = {
    get recording() { return !!sink && on(); },
    get hasSink() { return !!sink; },
    track(name, params = {}, onceKey = null) {
      if (onceKey != null) { if (seen.has(onceKey)) return null; seen.add(onceKey); if (seen.size > 200) seen.delete(seen.values().next().value); }
      if (!sink || !on()) return null;
      const p = clean(name, params); if (!p) return null;
      p.platform = ONE_OF.platform.includes(platform) ? platform : 'web';
      try { sink(name, p); } catch {} // a sink that fails never troubles the game
      return p;
    },
    crash(kind, err, file, line) { return self.track('crash', crashOf(kind, err, file, line)); },
  };
  return self;
}

// the test sink for ?telemetry=test: what would be sent, kept in memory for the visit
export function memorySink() { const log = []; const sink = (name, params) => { log.push({ name, params }); if (log.length > 300) log.shift(); }; sink.log = log; return sink; }

// the line under the switch: honest about what happens today
export function teleNote(t, isApp) {
  if (!t.hasSink) return isApp ? 'nothing is recorded yet' : 'nothing is recorded on the web link';
  return t.recording ? 'on' : 'off';
}
