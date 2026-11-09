# The puzzle you were sent (idea 9 Nov)

The daily puzzle's Share used to end with the plain link `?puzzle=1`, which opens the puzzle of whatever game the friend's
own phone has chosen. An Ayo puzzle sent on WhatsApp opened as a different Nchò puzzle, with a different target from the
"captured 8/8" just above the link. And the day is each phone's own: from 23:00 in London it is already tomorrow in Lagos.

Now the link is `?puzzle=<game>&d=<day>` (web/sent.js):

- **The game** opens that game's puzzle for the visit only. The friend's chosen game is untouched; the result is kept
  under that game's day; Back to home is their own board and their own puzzle card. Midnight's "tomorrow's puzzle" keeps
  the sent game while they are still on the puzzle.
- **The day** is said, never played. Another day's puzzle is a past puzzle, and the archive of past puzzles is Gold's
  (L9, waiting on Meka's yes to its screen), so a link from another day opens today's puzzle with one line:
  "Sent on Sun 8 Nov · this is today's puzzle" (« Envoyée le dim. 8 nov. · voici l'énigme du jour »).
- Old `?puzzle=1` links and spoiled ones (an unknown game, a day that does not exist) open the phone's own game, today,
  with nothing said.

Checked: test/sent.test.js (node) and `python3 tools/sent.py` (headless Chromium as a phone; picture
docs/render-2026-11-09-sent.png).
