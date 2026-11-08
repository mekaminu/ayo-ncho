# Never stuck on "thinking…"

Found 8 Nov by the long-evening check (`tools/soak.py`, docs/launch/soak.md): once in three runs a new game stopped after the first move, the opponent "thinking…", the board busy for four minutes and seeds left lying in a trough the score said was empty. Run again on the code of that day (two soaks side by side on a loaded machine), it came back in both: one stopped the same way (round 6: your move played, the board busy, the opponent "thinking…", nothing moving), the other waited for a move whose second tap the board was not ready for.

## Why a game could stop for good

Three ways, each found by breaking a game on purpose (`python3 tools/nostuck.py`), and on the code before this fix each one left the game exactly as the soak found it:

| Broken on purpose | Before | Now |
|---|---|---|
| **then** — one step of your move's animation throws (a pit's number refuses to be written, once) | the move never ended: busy for ever, opponent "thinking…", seeds where they were | the seeds in the air are put down, the board is laid out from the engine, the opponent replies |
| **frame** — something inside one frame throws | the frame loop never asked for its next frame: every seed froze in mid-air, busy for ever | that frame is dropped, the next one comes, the move finishes |
| **hang** — the opponent's worker never answers | "thinking…" for ever (not busy, nothing to tap but Home) | after 15 s the worker is replaced and the move is chosen on the main thread by the same engine |

The fix:

- `web/keepgoing.js` — the frame loop always asks for its next frame, whatever throws inside it; a tween whose step throws is finished on the spot, so a move waiting on it goes on; the physics, if it throws, puts its seeds down. The error is still thrown afterwards, outside the frame, so every check that fails on a page error still sees it (the smoke check, the soak).
- `web/game.js` — a turn's animation that throws ends anyway, and a live move (yours, the computer's, a friend's, one you are watching) then checks the board against the engine and lays it out afresh if they differ (as a new game's deal already did). A game's end is left to its own sweep.
- `web/asker.js` — every question to the opponent's worker gets an answer: an error in the search comes back as an error and is answered on the main thread; a worker that dies, fails to load or takes longer than 15 s (any search is held to about 2 s) is replaced and the waiting questions are answered on the main thread; if that throws too, a legal move, so the game always goes on. `web/ai-worker.js` sends its errors back.
- `tools/soak.py` — taps again when the board was not ready for a tap (counted in the report), and when a round sticks prints any page errors and `__ayo.caught` (frame errors, boards laid out afresh, the worker's questions).

What this does not do: hide a bug. Each of these errors still reaches the page; the game just no longer stops on one. `__ayo.caught` keeps the count for the checks.

## Run it

`python3 tools/nostuck.py` (about three minutes; `then`, `frame` or `hang` for one) — fails unless the game reaches your next turn each time.
