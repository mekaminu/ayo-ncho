# Quick on a slow line

The game link opened as a phone (390x844) on an emulated slow line (300 ms round trip, 1.6 Mbit/s down) with the processor slowed 4x, timed until the board has drawn (tools/firstopen.py). Budget for the first open: 900 KB and 25 s.

| Open | Time to the board | Downloaded | Requests |
|---|---|---|---|
| First (cold cache) | 12.5 s | 523 KB | 114 |
| Again (cache warm) | 10.2 s | 29 KB | 113 |

Before the game's server squeezed its files (8 Nov, the same test): the first open downloaded 1909 KB in 113 requests and took 15.6 s. On the real link the 3D library comes from
cdnjs, which already squeezed it, so the saving there is the game's own files: about 1.2 MB down to about 0.4 MB.
Now the page, the game's scripts and the 3D library go out with Brotli (gzip for a browser without it), squeezed once per file
and kept in the server's memory (server/compress.js); a second open sends only "not changed" answers (about 30 KB).

What is left of the wait: about a hundred small files asked for one after another, six at a time, over a 300 ms line. The test's
server speaks HTTP/1.1; a phone that reaches the game link over HTTP/2 (as Render's edge normally serves it) asks for them all at
once, so the real wait should be shorter than this test's. Opening again still asks after every file (the service worker goes to the network first so a new build
arrives at once); keeping files between builds without asking is the next step if the wait on a revisit matters.
