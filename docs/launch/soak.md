# A long evening

Made by `python3 tools/soak.py` in headless Chromium as a phone (390×844): 8 rounds on one page, each a new game from Home (two moves and the computer's replies, Undo and Put it back, How to play, Settings and the Store), every fourth one played to its end and its Game over card. After each round the page settles, the browser collects its garbage and the counters are read. `tools/soak-judge.js` fails on anything that grows round after round once the first two rounds have warmed up.

| Round | Heap (MB) | DOM nodes | Listeners | Geometries | Textures | Seeds | Tweens | Timers |
|---|---|---|---|---|---|---|---|---|
| 0 | 6.16 | 2410 | 267 | 16 | 5 | 48 | 0 | 5 |
| 1 | 8.22 | 2586 | 280 | 21 | 6 | 48 | 0 | 5 |
| 2 | 8.49 | 2586 | 280 | 21 | 6 | 48 | 0 | 5 |
| 3 | 8.75 | 2616 | 280 | 21 | 6 | 48 | 0 | 5 |
| 4 | 8.83 | 2618 | 280 | 21 | 6 | 48 | 0 | 5 |
| 5 | 8.89 | 2618 | 280 | 21 | 6 | 48 | 0 | 5 |
| 6 | 8.94 | 2618 | 280 | 21 | 6 | 48 | 0 | 5 |
| 7 | 9.04 | 2617 | 280 | 21 | 6 | 48 | 0 | 5 |
| 8 | 9.05 | 2619 | 280 | 21 | 6 | 48 | 0 | 5 |

**Nothing builds up.**
- geometries: 21 → 21 → 21 → 21 → 21 → 21 → 21
- textures: 6 → 6 → 6 → 6 → 6 → 6 → 6
- seeds: 48 → 48 → 48 → 48 → 48 → 48 → 48
- tweens: 0 → 0 → 0 → 0 → 0 → 0 → 0
- timers: 5 → 5 → 5 → 5 → 5 → 5 → 5
- listeners: 280 → 280 → 280 → 280 → 280 → 280 → 280
- nodes: 2586 → 2616 → 2618 → 2618 → 2618 → 2617 → 2619
- heapMB: 8.49 → 8.75 → 8.83 → 8.89 → 8.94 → 9.04 → 9.05

What it found (8 Nov): the graphics card, the seeds, the listeners, the timers and the page's DOM come back exactly after every game. The page's own small records (of looks, full screen, calls and their line readings, a watched game's moves, back steps, the battery saver, the wake lock, update checks, reminders) grew with no end; each is now kept to its last entries (`web/bounded.js`, held by `test/soak.test.js`). The heap still rises by about 0.05–0.1 MB a game after the warm-up (a finished game adds its record and stats), so an evening of fifty games costs a few MB, well inside what a phone gives a tab.

Open: in one of three earlier runs (before the records were capped, the same code otherwise) a new game's fifth round stopped with Adaeze "thinking…" after the first move and the board busy for four minutes, with seeds still lying in a trough the scores said was empty. It did not come back in the run above; the check now prints the deal, the tweens, the hurry and a frame's time when a round sticks, so it names the cause if it happens again.
