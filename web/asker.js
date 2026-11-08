// Never stuck on "thinking…" (8 Nov): the opponent thinks in a worker (web/ai-worker.js), off the main thread. Before this,
// a question the worker never answered — a search that threw, a worker the phone's browser stopped to save memory, a
// worker that failed to load — left the opponent "thinking…" for ever, with nothing to tap but Home. Now every question has
// an answer: an error in the worker comes back as an error and is answered here instead; a worker that dies, or takes
// longer than `ms` (far longer than any search is allowed to run, Papa Ike's included), is replaced by a fresh one and the
// question, and any others waiting, are answered on the main thread by the same engine (`local`), or, if that throws too,
// by `fallback` (a legal move, so the game always goes on). Each question still carries its id, so answers never cross.
export const ASK_MS = 15000;

export function makeAsker({ make, local, fallback = () => null, ms = ASK_MS, timers = globalThis }) {
  const asks = new Map(); let id = 0, worker = null;
  const stats = { asked: 0, answered: 0, local: 0, restarts: 0, errors: 0, last: null };
  const answer = (k, result) => { const a = asks.get(k); if (!a) return; asks.delete(k); timers.clearTimeout(a.timer); stats.answered++; a.res(result); };
  const here = (k, why) => { // answered on the main thread: the same engine, or a legal move
    const a = asks.get(k); if (!a) return; stats.local++; stats.last = why;
    let r; try { r = local(a.msg); } catch (e) { stats.errors++; try { r = fallback(a.msg); } catch { r = null; } }
    answer(k, r);
  };
  const restart = (why) => { // the worker is gone or stuck: a fresh one for the next question, these answered here
    stats.restarts++; stats.last = why; const old = worker; worker = null;
    try { old && old.terminate && old.terminate(); } catch {}
    for (const k of [...asks.keys()]) here(k, why);
  };
  const ensure = () => {
    if (worker) return worker;
    try { worker = make(); } catch { worker = null; return null; }
    const w = worker;
    w.onmessage = (e) => { const d = e.data || {}; if (d.error !== undefined) { stats.errors++; here(d.id, 'error'); } else answer(d.id, d.result); };
    w.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); if (worker === w) restart('worker error'); };
    w.onmessageerror = () => { if (worker === w) restart('message error'); };
    return w;
  };
  function ask(msg) {
    return new Promise((res) => {
      const k = ++id; stats.asked++;
      const timer = timers.setTimeout(() => { if (asks.has(k)) restart('too slow'); }, ms);
      asks.set(k, { res, msg, timer });
      const w = ensure();
      if (!w) return here(k, 'no worker');
      try { w.postMessage({ id: k, ...msg }); } catch { here(k, 'post failed'); }
    });
  }
  return { ask, stats, get waiting() { return asks.size; } };
}
