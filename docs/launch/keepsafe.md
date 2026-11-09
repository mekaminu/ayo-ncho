# Kept safe (idea 9 Nov)

Everything the game keeps on the web link (days played and the river stones, the record against each opponent, the rating,
the bests, the puzzle days, the game under way) lives in the browser's storage, which a browser does not promise to keep:

- Chrome and Samsung Internet may clear a site's storage when the phone is short of space.
- Safari on an iPhone or iPad clears what a site wrote after seven days of use without a visit, unless it is on the home screen.

What the game does now (web/keepsafe.js, wired in web/game.js):

1. Once there is something worth keeping — a game finished, or a second day played — it asks the browser to keep the
   storage for good (`navigator.storage.persist()`). Chrome and Samsung Internet answer by themselves (yes for a game
   played often or installed), Safari likewise for one on the home screen, Firefox asks the player. Asked once; a no is
   asked again a month later. Never in the store apps, whose storage is the app's own.
2. A save the phone refuses (storage full, or turned off) used to be swallowed without a word. Now the first refused save of
   a visit says "This phone is full — your game is not being kept. Free some space to keep it" (or that the browser's
   storage is turned off), once a visit for each reason.
3. Settings → New phone → Kept on this phone says where the game stands: the browser has promised not to clear it · in the
   game on your home screen · inside the app · a browser may clear it (keep it on your home screen, or Send it to yourself) ·
   not being kept, this phone is full.

Checks: test/keepsafe.test.js on every push; `python3 tools/keepsafe.py` in headless Chromium as a phone (a stand-in for the
browser's answer, and a phone made full by refusing the game's save). Picture: docs/render-2026-11-09-keepsafe.png.
