# A new game, mid-game (9 Nov)

Every push to main redeploys the server on Render. Render starts the new server, then stops the old one with SIGTERM.

Before: the old process died at once. Every board in a room lost its line together (WebSocket close 1006), said
"reconnecting…" as if the signal had gone, and waited out its backoff before finding the new server.

Now (server/drain.js, web/online.js):

- On SIGTERM or SIGINT the old server sends every socket (players, watchers, people at the door) `{t:"restart"}` and
  closes it with 1012, the WebSocket code for "service restart". A socket that arrives while it stops is sent off the same
  way, and /healthz answers 503 `{draining:true}`. The process ends once every socket has gone, or after 5 s.
- The board comes straight back: after 0.4 s plus a random part of 1.2 s (so not every phone at once), without growing its
  backoff. The new server rebuilds the room from the boards' tickets (as after any restart, L1), and the game goes on.
  A move tapped meanwhile is held and goes when the line is back (A move kept for the line).
- Meanwhile the line under the friend's name (and the watcher's line) says "updating the game…" ("mise à jour du jeu…"),
  not "reconnecting…".
- At most three quick returns in a row; a server that keeps saying restart falls back to the ordinary backoff.

Checked: test/drain.test.js plays a game with a friend on one server, switches the address to a second server with the
same secret, drains the first, and checks both boards are back on the second with the same moves within two seconds and
play on. Run by hand: SIGTERM to `node server/index.js` with a socket open sends restart, closes 1012 and exits in ~2 s.
