# Tell us what went wrong (idea 9 Nov)

Settings → **Something wrong?** → **Tell us what went wrong** → Send.

It puts one block of plain text in the phone's share sheet (or copies it, where there is none), ready to paste into WhatsApp or an email under a line about what happened:

```
Ayo & Nchò — what went wrong
What happened (write it here):

Build: 3d85801 · the web link
Phone: (Linux; Android 14; SM-F946B) … Chrome/130 Mobile Safari/537.36
Screen: 390×844 at 2.63× · the game 390×760 · touch
Board: full (fast phone) · seeds bounce · Adreno (TM) 740
Language: en
Game: Nchò against Nnamdi · 14 moves
Open for: 12 min
Trouble (1):
- TypeError: a is null · game.js:912 · 3 min ago
```

- The game notes any trouble it meets while open: a page error, a promise that failed, a file that would not load. The row in Settings says how many ("the game has met 1 problem since it opened").
- Nothing is sent by itself; nothing is kept after the page closes.
- Never in it: a name, a move, a room code, anything typed. An address keeps only its file name (no `?room=…`, no `#carry=…`), long runs of letters (a code or token) are cut out, "room ABCD" becomes "room ····", and a friend in a room is "with a friend", never named.
- The block is English whatever the game's language (it is read by whoever fixes the game); the row, the button and the toasts are French with the rest of the game.
- Before the board starts, the page that says "The board couldn't start" still carries its own small print for Meka (index.html).

Code: `web/report.js` (pure, `test/report.test.js`), wired in `web/game.js`. Checked in headless Chromium as a phone by `tools/report.py` (picture: docs/render-2026-11-09-report.png).
