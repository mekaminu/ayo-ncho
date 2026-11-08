# One bad visitor can't spoil the evening

The game's server is public, on Render's free plan, and every family's games with friends share it. Before the stores it now holds
against a script (or a stuck phone) that floods it. All in `server/guard.js`, wired in `server/index.js`, tested in `test/guard.test.js`.

| What | Cap | What happens past it |
|---|---|---|
| Messages on one connection | a burst of 60, then 20 a second | dropped with "Slow down a moment" (told at most once a second); after 200 dropped the connection is closed |
| Connections from one address at once | 40 | "Too many rooms open right now — try again in a minute", and that connection is closed |
| Rooms opened from one address | 20 in ten minutes | the same words; the room is not opened |
| Doors one address is knocking at, at once | 6 | "Too many people at the door — try again in a minute" |
| Rooms on the server (already there) | 2000 | the same as above |

Why these numbers: a real phone never comes near them. A whole game with a friend played as fast as the server answers, both taps
of every move at once, is never slowed (the test plays one); setting up a video call sends a dozen or two messages in a burst. A family
round one board behind one home router is ten connections (two players, eight watchers). Many phones in Nigeria share one address
behind the mobile network, so the per-address caps are generous on purpose: turning away a real family would be worse than the flood.

The address is the first entry of X-Forwarded-For (Render's proxy puts the client there). A script can write its own, so a determined
one can dodge the per-address caps; the per-connection pace and the 2000-room cap hold whatever it says. Nothing is kept but counts,
and they go when a connection closes or its ten minutes pass. No change to the game's look or to anything a player sees in normal play.
