// The daily-puzzle reminder (Launch L14): at most one notification a day, only if the player switches it on, only in the
// store apps. It is a local notification — the phone itself raises it at the time chosen; no server, no account, nothing sent.
//
// Each time the app opens (and whenever the switch, the time, the game or today's puzzle changes) the next week of reminders is
// planned from the date alone, with the same engine/puzzle.js the board uses, so the words name that day's real ask:
//   "Daily puzzle · Thu 5 Nov" — "Capture 8 in one turn · Nchò rules. A new position is waiting."
// Ids are the day as a number (20261105), one per day, so there can never be two on one day. Today's goes once today's puzzle
// has been played (or its time has passed). Everything already planned by us is cancelled before the new plan is made, so a
// change of time or game never leaves a stale one behind; switched off, every one is cancelled.
//
// The plugin is @capacitor/local-notifications (Capacitor's own, MIT, free): Android's alarm manager — inexact (no exact-alarm
// permission is asked for; a reminder a few minutes late is fine) — and iOS's UNUserNotificationCenter. Android 13+ and iOS
// ask the player once for permission, when the switch is first turned on (never at start). A tap on the reminder opens the
// puzzle. On the web link nothing can be scheduled with the page closed, so the switch there says "in the apps".
// Pure, no DOM: tested in node (test/remind.test.js).

import { dailyPuzzle, todayKey } from '../engine/puzzle.js';

export const DAYS_AHEAD = 7;
export const HOURS = [9, 13, 19];          // the three times offered in Settings: morning, lunchtime, evening
export const DEFAULT_HOUR = 19;
export const ANDROID_ICON = 'ic_stat_ayo'; // a white seed in a pit, android/app/src/main/res/drawable/ic_stat_ayo.xml
export const ICON_COLOR = '#C9A15A';       // brass, the game's own accent

export const idOf = (key) => Number(key.replace(/-/g, ''));
export const isOurs = (id) => Number.isInteger(id) && id >= 20200101 && id <= 20991231;
export function hourOf(v) { const h = Number(v); return HOURS.includes(h) ? h : DEFAULT_HOUR; }
export function hourLabel(h) { return `${String(h).padStart(2, '0')}:00`; }

const shortDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const keyOf = (d) => todayKey(d);

// The words of one day's reminder.
export function reminderWords(key, variant = 'ncho', puzzleFor = dailyPuzzle) {
  const p = puzzleFor(key, variant); const [y, m, d] = key.split('-').map(Number);
  return { title: `Daily puzzle · ${shortDay(new Date(y, m - 1, d))}`, body: `Capture ${p.target} in one turn · ${variant === 'ayo' ? 'Ayo' : 'Nchò'} rules. A new position is waiting.` };
}

// The plan: up to DAYS_AHEAD reminders, one a day at `hour` (the phone's own clock and time zone), none in the past or within
// the next minute, and none today once today's puzzle has been played.
//   { now: Date, hour, variant, playedToday: bool } → [{ id, key, at: Date, title, body }]
export function planReminders({ now = new Date(), hour = DEFAULT_HOUR, variant = 'ncho', playedToday = false, days = DAYS_AHEAD, puzzleFor = dailyPuzzle } = {}) {
  const out = []; const h = hourOf(hour);
  for (let i = 0; i < days + 1 && out.length < days; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, 0, 0, 0);
    if (at.getTime() < now.getTime() + 60 * 1000) continue;
    const key = keyOf(at); if (i === 0 && playedToday) continue;
    out.push({ id: idOf(key), key, at, ...reminderWords(key, variant, puzzleFor) });
  }
  return out;
}

// What the plugin is handed for one reminder.
export function toNotification(r) {
  return { id: r.id, title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true }, smallIcon: ANDROID_ICON, iconColor: ICON_COLOR, extra: { puzzle: r.key }, isExactNotification: false, autoCancel: true };
}

// The note beside the switch.
export function remindNote(app, on, perm) {
  if (!app) return 'in the apps — a web page cannot remind you once it is closed';
  if (perm === 'denied') return on ? 'notifications are off for the app in the phone\'s settings' : 'notifications are off for the app in the phone\'s settings — turn them on there first';
  return on ? 'on' : 'off — nothing is sent, ever; it is the phone that reminds you';
}

// The reminder's end of the plugin. `L` is LocalNotifications (or a stand-in in the tests); everything fails soft.
//   sync({ on, hour, variant, playedToday }) → { scheduled: n } | { off } | { denied } | { error }
export function makeReminders(L, { now = () => new Date(), puzzleFor = dailyPuzzle } = {}) {
  const st = { supported: !!L, perm: null, log: [], busy: Promise.resolve() };
  async function perm(ask) {
    if (!L) return 'denied';
    try {
      let r = await L.checkPermissions(); let p = r && r.display;
      if (p !== 'granted' && ask && p !== 'denied') { r = await L.requestPermissions(); p = r && r.display; }
      st.perm = p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'; return st.perm;
    } catch { st.perm = 'denied'; return 'denied'; }
  }
  async function cancelOurs() {
    const r = await L.getPending(); const ids = ((r && r.notifications) || []).map((n) => Number(n.id)).filter(isOurs);
    if (ids.length) await L.cancel({ notifications: ids.map((id) => ({ id })) });
    return ids.length;
  }
  async function run(o) {
    if (!L) return { off: true };
    try {
      if (!o.on) { const n = await cancelOurs(); st.log.push({ off: true, cancelled: n }); return { off: true, cancelled: n }; }
      if (await perm(!!o.ask) !== 'granted') { await cancelOurs().catch(() => {}); st.log.push({ denied: true }); return { denied: true }; }
      await cancelOurs();
      const plan = planReminders({ now: now(), hour: o.hour, variant: o.variant, playedToday: o.playedToday, puzzleFor });
      if (plan.length) await L.schedule({ notifications: plan.map(toNotification) });
      st.log.push({ scheduled: plan.length, first: plan[0] ? plan[0].key : null, hour: hourOf(o.hour) });
      return { scheduled: plan.length, plan };
    } catch (e) { st.log.push({ error: String(e && e.message || e) }); return { error: true }; }
  }
  // one at a time: a quick change of time then game must not interleave two plans
  const sync = (o = {}) => (st.busy = st.busy.then(() => run(o), () => run(o)));
  // a tap on a reminder: hand the day to `open` (the game opens the puzzle)
  function onTap(open) {
    if (!L || !L.addListener) return false;
    L.addListener('localNotificationActionPerformed', (a) => { const n = a && a.notification; const key = n && n.extra && n.extra.puzzle; if (key || (n && isOurs(Number(n.id)))) open(key || null); });
    return true;
  }
  return { sync, perm, onTap, get supported() { return st.supported; }, get permission() { return st.perm; }, get log() { return st.log; } };
}

// The offer on the puzzle's result card, in the apps only: shown while the reminder is off and the phone has not refused
// notifications, on the first OFFERS days the puzzle is played (once a day), then never again.
export const OFFERS = 3;
export function offerShown({ app, on, perm, offered = 0 }) { return !!app && !on && perm !== 'denied' && offered < OFFERS; }
export function offerWords(hour) { return `Remind me each day at ${hourLabel(hourOf(hour))}`; }

// A stand-in for the plugin (node tests, and ?remind=test in a browser for tools/render.py): keeps what would be scheduled.
//   answer: what the permission ask returns ('granted' | 'denied')
export function testNotifications({ answer = 'granted' } = {}) {
  let display = 'prompt'; const pending = new Map(); const listeners = []; const asked = [];
  return {
    pending, asked,
    async checkPermissions() { return { display }; },
    async requestPermissions() { asked.push(answer); display = answer; return { display }; },
    async getPending() { return { notifications: [...pending.values()].map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: n.schedule, extra: n.extra })) }; },
    async schedule({ notifications }) { for (const n of notifications) pending.set(n.id, n); return { notifications: notifications.map((n) => ({ id: n.id })) }; },
    async cancel({ notifications }) { for (const n of notifications) pending.delete(n.id); },
    addListener(ev, f) { listeners.push([ev, f]); return { remove() {} }; },
    tap(id) { const n = pending.get(id); for (const [ev, f] of listeners) if (ev === 'localNotificationActionPerformed') f({ actionId: 'tap', notification: n || { id, extra: {} } }); },
  };
}
