// The server, woken early (idea 7 Nov): the game's server is on Render's free plan, which goes to sleep after a quarter of
// an hour with nobody on it and takes up to a minute to wake. On the web link the page itself wakes it (the page comes from
// it), but the store apps carry every file inside them and the installed web app opens from the phone's own copy, so the
// first sign the server was asleep was With friends sitting on "opening a room…" for most of a minute with nothing to say
// why. Now Home quietly knocks on the server (GET /healthz, a few bytes) when it comes up — and again when a finger lands on
// With friends — at most once every 4 minutes and never with no signal, so by the time the Rooms screen asks for a room the
// server is usually up. And when it is not, the room card says what is happening instead of a bare "opening a room…":
// after 4 seconds "waking the game's server…", after 15 "still waking · up to a minute", straight away if
// the knock from Home is still waiting on an answer. Nothing is sent but the request itself (no name, nothing kept).
//
//   const warm = makeWarm({ url: healthUrl(publicBase()), fetch, now: Date.now, online: () => navigator.onLine !== false });
//   warm.ping('home') → true when a knock went out
//   warm.waking()      → true while a knock is out and has had no answer for SLOW_KNOCK_MS (the server is asleep)
//   openingWords(ms, warm.waking()) → the room card's words after ms of opening, or null for its usual ones

export const EVERY_MS = 4 * 60 * 1000; // one knock keeps it awake for ~15 minutes; every 4 is plenty
export const SLOW_KNOCK_MS = 2500; // an awake server answers in well under a second; this long means it is waking
export const WAKING_MS = 4000; // the room card's first change of words
export const LONG_MS = 15000; // and its second

export const WORDS = {
  waking: 'waking the game’s server…',
  long: 'still waking · up to a minute',
};

// Where to knock: /healthz next to the page's own address (the live server's, inside the apps).
export function healthUrl(base) {
  try { return new URL('healthz', base).href; } catch { return null; }
}

export function makeWarm({ url, fetch: fetchFn, now = Date.now, online = () => true, every = EVERY_MS } = {}) {
  const st = { last: -Infinity, out: null, ms: null, ok: null, knocks: 0 };
  function ping(why = 'home') {
    if (!url || typeof fetchFn !== 'function' || !online()) return false;
    const t = now();
    if (st.out !== null || t - st.last < every) return false;
    st.last = t; st.out = t; st.knocks++; st.why = why;
    let p;
    try { p = fetchFn(url, { cache: 'no-store', mode: 'no-cors', credentials: 'omit' }); } catch { p = Promise.reject(); }
    Promise.resolve(p).then(() => { st.ok = true; }, () => { st.ok = false; st.last = -Infinity; }) // a failed knock may try again
      .finally(() => { st.ms = now() - t; st.out = null; });
    return true;
  }
  const waking = () => st.out !== null && now() - st.out >= SLOW_KNOCK_MS;
  return { ping, waking, state: st };
}

// The room card while the room is still opening: null keeps its usual words ("opening a room…", "connecting…").
export function openingWords(ms, waking = false) {
  if (!(ms >= 0)) return null;
  if (ms >= LONG_MS) return WORDS.long;
  if (ms >= WAKING_MS || waking) return WORDS.waking;
  return null;
}
