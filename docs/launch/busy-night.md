# A busy Sunday night — how many games with friends the server holds

Every game with a friend is played on the one game server (Render's free plan: a tenth of a CPU, 512 MB of memory). Before the
stores, `tools/busy-night.js` puts a busy night on it: the real server in its own process, and hundreds of rooms at once, each a
family of two from two different addresses — the host opens the room, the friend knocks and is let in, and they play whole games
(the first tap and the second for every turn), each side checking every move the server sends against its own engine. Then a
rematch in every room, played at a person's pace, with the time from a move sent to the other phone hearing it measured.

    node tools/busy-night.js --rooms 300 --pace 1500     # add --json for the numbers

`npm test` runs a small night (12 families, two games each) on every push (test/busy.test.js).

## 9 Nov, 300 families at once (in the build container)

| | |
|---|---|
| Games | 300 at once, then 300 rematches — 21,123 moves, every one agreed by both boards, 0 refused |
| Brisk (a move every 0.15 s in every room, 840 moves a second) | the other phone heard a move in 0.6 ms (p50), 10 ms (p95) |
| At a person's pace | 0.4 ms (p50), 0.8 ms (p95), 23 ms at worst |
| Server CPU | 0.1–0.3 ms a move, with its first tap and both boards told (the dearer figure is used below) |
| Memory | 67 MB at start, 85 MB with 300 rooms open — about 60 KB a room, kept until the room is swept (6 hours idle) |

**What it means for the free plan.** With half of its tenth of a CPU kept spare and a move every 4 seconds in each room, the
server holds about **640 games with friends at once** by CPU; memory would hold about 3,000 rooms, and the server opens at most
2,000 (`maxRooms` in server/rooms.js) whatever happens. Render's CPU may be slower than the build container's, so read it as
"hundreds of families at once", not an exact figure. The free plan's real limit stays what it was: it sleeps after 15 minutes with
nobody playing, so the first friend of the evening waits for it to wake (the $7-a-month always-on server is Meka's call).

Nothing in the run broke or slowed: no change to the server was needed.
