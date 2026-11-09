// A new game, mid-game (idea 9 Nov): every push to main redeploys the server, and Render stops the old one with SIGTERM once the
// new one is up. Without a word from the server, every board in a room lost its line at once (close 1006) and showed
// "reconnecting…", then waited out its backoff before finding the new server. Now the old server says so first: every board,
// watcher and knocker hears {t:"restart"} and its socket is closed with 1012 (the WebSocket code for "service restart"); the
// board comes straight back (web/online.js, a short wait spread over a second or two), rebuilding the room from its ticket
// as after any restart, and says "updating the game…" meanwhile. A connection that arrives while the old server is
// stopping is told the same and closed. The HTTP side stops taking new requests and the process ends once every socket has
// gone, or after GRACE_MS whatever happens (Render waits longer than that before it kills the process).

export const RESTART_CODE = 1012;
export const GRACE_MS = 5000;
export const RESTART_MSG = { t: "restart", msg: "the game is being updated — back in a moment" };

// Tell one socket and close it. Safe on a socket that is already closing.
export function sendOff(ws) {
  try { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(RESTART_MSG)); } catch {}
  try { ws.close(RESTART_CODE, "restarting"); } catch {}
}

// Send every socket off, stop the HTTP server, and resolve once all are gone (or after graceMs, terminating what is left).
export function drainAll({ wss, server, graceMs = GRACE_MS, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout }) {
  return new Promise((resolve) => {
    let done = false, timer = null;
    const finish = () => {
      if (done) return; done = true; if (timer) clearTimeoutFn(timer);
      for (const ws of wss.clients) { try { ws.terminate(); } catch {} }
      try { server.close(() => {}); } catch {}
      resolve();
    };
    const check = () => { if (!done && wss.clients.size === 0) finish(); };
    for (const ws of wss.clients) { ws.once("close", check); sendOff(ws); }
    try { server.close(() => {}); } catch {}
    if (server.closeIdleConnections) { try { server.closeIdleConnections(); } catch {} }
    timer = setTimeoutFn(finish, graceMs);
    if (timer && timer.unref) timer.unref();
    check();
  });
}

// Wire the stop signals to drain, then exit. Called once, from the server's own start.
export function onStopSignals(drain, { proc = process, exit = (c) => proc.exit(c), graceMs = GRACE_MS } = {}) {
  let stopping = false;
  const stop = (sig) => {
    if (stopping) return; stopping = true;
    console.log(`${sig}: sending every board to the new server`);
    const hard = setTimeout(() => exit(0), graceMs + 1000); if (hard.unref) hard.unref();
    Promise.resolve(drain()).catch(() => {}).then(() => exit(0));
  };
  proc.once("SIGTERM", () => stop("SIGTERM"));
  proc.once("SIGINT", () => stop("SIGINT"));
  return stop;
}
