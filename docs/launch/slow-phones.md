# Slow phones: the frame check and the testers' checklist (Launch L16)

Ayo & Nchò has two boards: the **full board** and the **lighter board** (half-size wood grain, a smaller shadow, fewer
polygons in the carved top and the seeds, pixel ratio 1, seeds that fly straight into their pit). Both are the same carved
board, seeds and lamp; the moves never change. Settings → Feel → Lighter board is Auto / On / Off.

**Auto** picks the lighter board on data saver, a slow connection (2G/3G), 2 GB of memory or less, or 2 cores or less — and now
also on a phone it has **seen** drawing the full board slowly: while seeds move, the game times every frame
(`web/frametime.js`), and if most frames over about 300 (5–10 seconds of sowing) come slower than 25 a second, it remembers
the phone as slow, says so once ("This phone draws the full board slowly — the lighter board comes in from the next time you
open the game") and opens on the lighter board from then on. Choosing anything under Lighter board (Auto included) starts the
judgement afresh. A phone set to Off (the full board) is never moved.

Settings → Feel → Lighter board says which board is on, why, and how the seeds have been moving lately, for example:

> now full (auto) · seeds lately 57 frames a second, smooth · full board

(smooth is 50 a second or more; a little uneven 30–49; slow 20–29; very slow under 20.) That line is what the testers read out.

## The frame check in the container

`python3 tools/frame-check.py [--judge]` (about 10 minutes) opens the game as a phone (390 × 844, 2×, touch) in headless
Chromium with the CPU slowed **4×** (Chrome's own CPU throttling, what Lighthouse uses for a mid-range phone), plays three of
your moves against Nnamdi on the lighter board and one on the full board, and writes `docs/launch/frames.json`:

- **logic** — the page's own work each frame before drawing (tweens, seed physics, the camera, the count badges and the hand's
  numbers). Judged: on the lighter board, median ≤ 2 ms and 95% of frames ≤ 4 ms at 4× slower, leaving the rest of a 16.7 ms
  frame for drawing.
- **the scene** — draw calls, triangles, textures and their memory, the pixel ratio. Judged: the lighter board ≤ 140 draw
  calls, ≤ 150,000 triangles, ≤ 8 MB of textures, pixel ratio 1, and at most 60% of the full board's triangles and 50% of its
  texture memory.
- **render** and **gap** — the time inside three.js's draw call and between frames. Here WebGL is drawn in software
  (SwiftShader), many times slower than any phone's GPU, so these are written down but not judged; only a real phone can say
  them, which is what the testers are for. (To get enough frames the check draws the canvas at a quarter of its pixels; the
  scene and the page's work are the same.)

`--judge` also checks Auto's own judgement end to end: the full board on Auto, frames reported 45 ms apart, is remembered as
slow and said once; the next open is the lighter board with the reason in Settings; choosing Auto again brings the full board
back. `test/frametime.test.js` checks the results file, the meter's maths and the wiring on every push.

## The testers' checklist (Google Play's closed test, 14 days)

Please do this once on your phone in the first days of the test, and tell Meka the answers (a screenshot of Settings is fine).
It takes about 25 minutes, most of it just playing.

1. **Which phone?** Make and model, and how old it is. (Settings → About phone.)
2. **First open, no signal.** Turn on airplane mode and open the game. Does it open and let you play the computer? About how
   many seconds from the tap on the icon to the board?
3. **Speed.** Play a whole game against **Nnamdi** (Medium). Then open Settings → Feel → Lighter board and read out the line
   under it ("now full (auto) · seeds lately … frames a second, …"). Did the seeds ever stutter or jump? Did a toast say
   the phone draws the full board slowly?
4. **The other board.** Set Lighter board to the one you were not on (On or Off), play a few moves, read the line again,
   and say which looked better and which felt smoother. Then set it back to Auto.
5. **Papa Ike's thinking** (only if you have Gold, or Meka opened him for you). Play five moves against **Papa Ike** (Master)
   and count the seconds from your last seed landing to his pit lighting up. More than 3 seconds is worth telling.
6. **Battery.** Note the battery % (screen at your usual brightness, not charging), play for 15 minutes, note it again.
   More than 5% in 15 minutes is worth telling.
7. **Heat.** After those 15 minutes, is the phone cool, warm, or too hot to hold comfortably? Warm is fine; too hot is not.
8. **With a friend.** If you can, play one game with someone in a room (With friends on Home). Did the moves arrive without
   long waits? (The first game of the day can take up to a minute to start while the server wakes.)
9. **Anything else** that looked wrong, was hard to read, or got in the way — a screenshot is best.

What we do with it: a phone that stutters on the full board but is not caught by Auto tells us to lower the bar; a phone
that stutters on the lighter board too tells us what to take out of it next (the shadows first, then the seed count of
polygons); slow thinking from Papa Ike on a phone lowers his search clock (`engine/ai.js` MASTER.ms, 1.4 s now); a big
battery drop or heat points at the render loop, which draws every frame while the game is on screen and stops only when
it is hidden (a board at rest could be drawn far less often — the next step if the testers find it warm or thirsty).
