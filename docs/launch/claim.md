# A friend gone from the board

A game with a friend whose phone has gone for good (the tab closed, the battery flat, the signal lost) used to wait for ever:
"away — their seat is held", and the one left at the board could only give the game up or leave it.

- The server notes when a seat's line closes (`awaySince`, in memory) and sends each board how long the friend has been away
  (`awayMs` in the room snapshot). A seat open in a second tab stays at the board when one tab closes.
- The line under the friend's name counts it: "away 3 min — their seat is held".
- After 5 minutes (`CLAIM_MS`, web/claim.js, shared with the server) the shout row offers "Take the game · Tete away 5 min",
  two taps like Give up, and a toast says once that it can be taken.
- `{t:"claim"}`: the server checks the friend is still gone (no open socket for that seat, away 5 minutes) and ends the game
  with the engine's `resign` for the seat away. It travels as `{t:"resign", seat, n, away: true, sig}`; the seal is the same as
  a game given up, so a room rebuilt after a restart agrees on the result (a rebuilt room counts the friend away from the rebuild).
- Both boards say why: "Tete was away — the game is yours", and to the one who comes back "Meka took the game while you were away";
  the Game over card's line ends "Tete was away after move 23". French throughout.
- Tests: test/claim.test.js (the referee with a fake clock, two tabs, the real server, the words in English and French).
