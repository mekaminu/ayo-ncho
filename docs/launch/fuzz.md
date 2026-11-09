# Only real games over the line (9 Nov)

The game's server is public, and the board is not the only thing that can talk to it: anyone can write a message by hand.
`tools/fuzz-protocol.js` throws odd and hostile messages at a real server — wrong types, objects with their own `toString`,
`__proto__` and `constructor` as names, huge numbers, broken JSON, every field of every message type set to fifty odd values
one at a time — at every stage of a room: no room yet, at the door, the host alone, mid-game, after the game, family watching.
After each burst it checks that the server still answers, that no message hit an unexpected error ("something went wrong"),
and that every room still holds a real game (48 seeds, Nchò or Ayo, only the three real rule switches, short names). Then a
real game is played to the end.

Run by hand: `node tools/fuzz-protocol.js [rounds] [seed]` (about 6,000 messages for 36 rounds, plus a 31,000-message sweep);
`FUZZ_DEBUG=1` prints the message and the line for any unexpected error. `test/fuzz.test.js` runs a short version on every push.

What it found, all fixed:

- A room could be opened as the game "constructor", "toString", "__proto__" or "hasOwnProperty" (names every JavaScript
  object carries), so a friend's board and the invite link's preview were asked to show a game that does not exist. Now only
  Nchò and Ayo open (`isVariant` in engine/ayo.js), on a new room and on a ticket brought back after a restart.
- A room kept whatever rule switches were sent — extra ones, and values like `relay: "yes"` — and passed them to the friend's
  board and every watcher. Now `cleanRules` keeps capture (4 or 23), relay and last 8 (yes or no) and gives anything else the
  game's own rule; a custom game from Settings is kept exactly, so rooms and their seals are as before.
- A name, a code, a door answer, a call or a pit sent as an object with its own `toString` reached an unexpected error
  instead of a plain "no" (`lineText` in server/rooms.js; a pit that is not a number or figures is "that pit cannot be played").

Nothing changes for a player: the board only ever sends real games and real switches.
