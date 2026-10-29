# Ayo & Nchò: Nigerian Mancala — build plan

Ayo & Nchò (Meka's family calls it akase / aro) is the Nigerian seed-and-board game, built in real 3D for phone and computer. Repo: github.com/mekaminu/ayo-ncho.
This file is the board every build run follows. Meka is the sponsor; he reads the Build Tracker, not this file.

Status key: `[ ]` open · `[~]` started, what remains noted · `[x]` done · `[!]` blocked (waiting on Meka or a check on his devices)

## Rules every build run follows

1. **Lock first.** One run at a time, via the `build-lock` branch (see the scheduled task's prompt). Never force-push.
2. **One item per run** (or one coherent slice of a large item). Finish it: code, tests, docs, push, CI green.
3. **The engine is the law.** `engine/ayo.js` is shared by browser and server; every move the UI shows comes from `applyMove`'s events. Never duplicate rules in UI code. `npm test` must pass before every push.
4. **Real, not drawn.** The look is the 3D board in `web/board.js` (approved by Meka 28 Oct): carved hardwood, Job's-tear seeds, warm lamp light. Keep that look; improve it, never flatten it. Three.js from cdnjs (pinned version); seed physics is our own `web/physics.js`.
5. **Mock-first for new screens.** Any new screen that is not the board (home, game over, settings, store) gets a mockup on Meka's Design canvas and a `[!]` "Needs Meka" line before it is built. The board itself is approved.
6. **Animations everywhere they make sense** (Meka's standing preference): every seed moves, every capture is a scoop, every score change ticks. Respect `prefers-reduced-motion`. Haptics on phone via `navigator.vibrate`.
7. **Phone first.** Samsung Galaxy Fold (folded ~390px and open ~800px) and a Mac browser. 60fps target; lighter textures on slow connections. Test in the container with Playwright + SwiftShader (`python3 tools/render.py out.png --smoke` plays a real move and fails on any page error; run it before every push that touches web/) and commit a render to `docs/` when the look changes.
8. **No money, no accounts yet.** Nothing is sold in v1. Later store items are looks only, never wins (same ground rules as Whot).
9. **Plain English to Meka.** Tracker items say what he can now do, never code names.
10. **Private details stay out of the repo**: no keys, addresses, numbers.
11. **Ideas are welcome.** Meka (29 Oct) wants the game to stand up to the best mancala apps on the stores and asked for more ideas as they come: a run may add an idea to the board under "Ideas (Meka said yes to ideas, mock-first still applies)" with one line of why, and build it once the day's planned items are done. Screens still get a mockup first.

## Ideas (Meka said yes to ideas, mock-first still applies)

- [~] Daily puzzle: engine done (engine/puzzle.js: date-seeded, same for everyone, 60 days tested solvable, targets 4–20; share text with a seed row). Remains: the Home card and the puzzle screen — mockups added to the Design canvas 29 Oct ("Home — with the daily puzzle card", "Daily puzzle — played and solved"), [!] awaiting Meka's yes
- [x] Replay clip (29 Oct): the game remembers your best turn (web/clip.js, tested: seeds won ×2 + relays ×3 − seeds handed over; ties go to the busier turn); Game over → Clip replays it on the board from the position before the move, pit lit first, camera drifting slowly, at a seed pace sized so the turn fits ~10 s (monster turns of 6+ relays run longer rather than being cut), while MediaRecorder records the canvas (mp4 or webm, whichever the browser has); then Web Share with the video and a caption (WhatsApp on the phone), or a download on the Mac; browsers that cannot record still play the turn and share the words. `tools/render.py --smoke --clip` records one in headless Chromium and checks a video came out. Picture: docs/render-2026-10-29-clip.png
- [x] Calm streak (29 Oct): web/streak.js counts distinct days with a move, never resets; a quiet line on Home ("6 days played · 1 more day for river stones"); 7 days played unlocks the River stones seed set (grey pebbles, docs/render-2026-10-29-stones.png), announced with a toast on the move that crosses it and chosen in Settings → Board → Seeds (swaps in place, no new game). Cowries stay for the store later
- [x] Opponent reactions (29 Oct): the lines were there; now the face reacts too. web/characters.js draws every opponent in six moods (calm, thinking, grin, sulk, surprised, blink — each keeps their own hair, beads, earrings; Adaeze grins widest, Mama Ngozi barely) and the HUD face pops with a brass ring: thinking while their move is searched, a grin when they capture or win or the game starts, a sulk when you take a pit of theirs or beat them, surprise on undo, and a blink every few seconds while waiting (none under reduced motion). `tools/render.py --smoke --page=<mood>` screenshots it; picture: docs/render-2026-10-29-faces.png

## Needs Meka

- [!] Daily puzzle card on Home and the puzzle screen: mockups on the Design canvas (https://claude.ai/artifact/H75vS5iCT5X2Fmft4oYMXP, second row) — awaiting Meka's yes
- [!] Rooms screen ("With friends — your room and its code": big four-letter code, Invite on WhatsApp, copy link, join by code, the seat held 10 minutes): mockup on the Design canvas (https://claude.ai/artifact/H75vS5iCT5X2Fmft4oYMXP, second row, third board) — awaiting Meka's yes; the server side and the board's end are built: two phones already play each other through `/?room=new` and the invite link `/?room=CODE` (docs/render-2026-10-29-online.png shows the friend's view from the far seat)
- [x] Make the repo public so the scheduled cloud runs can push — done 29 Oct; runs push from 12:07
- [!] Render: create the Web Service from mekaminu/ayo-ncho (Free plan, no environment variables) and send the address, so the deploy item can be closed and the tracker gets the test link
- [!] Clip button on the Game over card (docs/render-2026-10-29-clip.png): the clip records the board only, not the scores or names. Say if you want a name/score strip drawn into the video, or a sound track (the knocks) — both are possible
- [!] Shouts across the board (docs/render-2026-10-29-shouts.png): eight fixed phrases for now (Oya, your move! · Chai! · Ha ha! · Well played · Not so fast · Ewo! · Good game · One minute…). Say if you want different words, Igbo or Yoruba ones, or typed chat / voice next
- [!] The door (docs/render-2026-10-29-door.png): a friend who opens your link knocks with their name and you tap Let in or Not now before they take the seat; a card asks each phone its name once. Say if you would rather the link let the first person straight in (no door), or if the Not now message should say something else
- [!] On the Fold: open Settings → Feel → Lighter board and say whether the full board runs smoothly (then Auto is right) or the lighter one looks good enough to keep (docs/render-2026-10-29-lite.png); while there, try Seed physics → Off and say whether seeds flying straight to their pit still feel right for the weakest phones

- [x] Family rules confirmed 29 Oct: Nchò (relay sowing, capture on 4, last 8, bankruptcy, loop stop — see engine/ayo.js header) is the default; Ayo stays as the second game, chosen in the Rules card. Meka sent a rules write-up at 03:12: relay sowing taken as yes unless he says otherwise.
- [!] Settings screen toggles Meka asked for from that write-up: capture on 2&3 vs 4 only, relay vs single lap. Mock them on the Settings mockup; build after his yes.
- [!] Create the GitHub repo github.com/mekaminu/ayo-ncho (private) so the runs can push
- [x] Home / Game over / Settings mockups made 29 Oct on the Design canvas "Ayo & Nchò — screens" (https://claude.ai/artifact/H75vS5iCT5X2Fmft4oYMXP): Meka said yes at 03:32 on 29 Oct. Build them as drawn.

## Daily plan

### Tonight, Wed 28 Oct — rules engine and the opponent's brain
- [x] Rules engine: 12 pits, 48 seeds, anticlockwise sowing, lap skips the start pit, captures on 2 or 3 sweeping back, grand slam, feed rule, end at 25, stalemate rule; Okwe placeholder
- [x] 300 random games conserve seeds and replay exactly; hard beats easy 9+/12
- [x] Opponent: minimax with alpha-beta, 3 levels
- [x] 3D board scene rendered and approved (docs/render-2026-10-28-mahogany.png)
- [x] Server stub serves the web app; `npm start` works; Render blueprint (render.yaml)
- [x] GitHub Actions: `npm test` on every push
- [x] Name decided by Meka: "Ayo & Nchò: Nigerian Mancala" (29 Oct)

### Thu 29 Oct — the board becomes the game
- [x] Tap-to-pick: raycast from a tap/click to a pit; only your pits with seeds are selectable; selected pit ring and glow as in the render
- [x] Sowing animation driven by engine events: seeds lift as a cluster, then drop one per pit anticlockwise at a hand's pace (~140 ms per seed); count badge per pit ticks as seeds land
- [x] Capture animation: captured seeds scoop out of the opponent's pits and travel into your trough; store count climbs seed by seed
- [x] Opponent's move plays at the same pace, its pit glowing first; "thinking…" while the search runs in a Web Worker so the frame never stalls
- [x] HUD: both scores, whose turn, undo, rules card, sound toggle, home and settings buttons
- [x] Game over state on the board (final position, who won by how many, rematch); game resumes after a reload

### Fri 30 Oct — seeds that behave like seeds
- [x] Seed physics (purpose-built in web/physics.js rather than Rapier: smaller, no wasm download, full control): dropped seeds fall, bounce off the carved bowl, roll down its slope, get shoved aside by seeds already there, settle; never below the wood; snap to a slot after 1.1 s whatever happens
- [x] Physics only runs for seeds in flight; a settled board costs nothing
- [x] Sound, synthesised on the device (no audio files): seed-on-wood knock with a noise burst, pitch rising with pit fullness, bounce ticks, cluster rattle on pick-up, capture scoop sweep, win chime; haptic tap per seed on phone
- [x] Fold-open and Mac layout (board fills the height, player cards down the left, toolbar down the right); pinch to zoom on the phone, wheel on the Mac, drag to tilt, clamped so the board never leaves the frame; `tools/render.py --wide` renders it

### Sat 31 Oct — screens around the board
- [x] Mockups on Meka's Design canvas: Home, Game over, Settings — approved 29 Oct 03:32
- [x] Home, as approved: the LIVE board slowly turning behind it, Nchò/Ayo switch, big Play with the chosen opponent, Continue with the live score, With friends (coming), opponent pills (docs/render-2026-10-29-home.png)
- [x] First-game tutorial: three prompts in the first game, then never again
- [x] Settings, as approved: Rules (game, capture on 4 vs 2&3, relay vs single lap, last-8 switch — engine rule switches with tests), Board (wood swatches, seed set, pit counts), Feel (sound, haptics, sowing speed), Opponent; changing rules starts a new game
- [x] Game over, as approved: one card with both scores, biggest turn / captures / time, Play again, Replay (the whole game replayed fast on the board), Share (the board picture via Web Share where available, else the result text copied)
- [x] Installable (manifest, icons, service worker caching the shell, engine and three.js): offline play vs computer with no signal

### Sun 1 Nov — opponents with character, polish, deploy
- [x] Three opponents with a vector face, a bio and lines (Adaeze the playful child, Nnamdi the cheeky cousin, Mama Ngozi the dry market champion): they speak at game start, when they capture, when they lose a pit of 4+, when you undo, and when the game ends; faces on the HUD, Home pills and Settings
- [x] Performance pass: pixel ratio capped at 1.5 on phones, 1024 shadow map on phones and high-dpr screens, render loop paused when the tab is hidden (and only ever one loop: a leak that re-added a listener every frame is fixed); lighter board on slow connections and slow phones (web/quality.js: data saver, 2g/3g, ≤2 GB memory or ≤2 cores → half-size wood grain, 512 shadow map, fewer polygons, pixel ratio 1 — same carved look, docs/render-2026-10-29-lite.png; Settings → Feel → Lighter board: Auto / On / Off; `tools/render.py --lite/--full`); the offline cache now includes characters.js and quality.js. Measuring on the real Fold is part of Meka's test on Mon 2 Nov
- [!] Deployed on Render from mekaminu/ayo-ncho; health check; Meka's test link on the tracker — waits for Meka to create the Render service (render.yaml is ready; see Needs Meka)
- [x] Hint: Mama Ngozi's best move lit on the board for 1.5 s, one hint per turn

### Mon 2 Nov — Meka's test and the fixes from it
- [ ] Every fix Meka reports from the Fold and the Mac
- [ ] Rules check against how his family plays, with corrections
- [ ] Decision for next week: online play with friends first, or the store look first

### w/c 3 Nov — play with friends online
- [~] Rooms with a code and WhatsApp invite (Tete's pattern): moves played on the server with the same engine; reconnect; the members gate (Meka lets people in) — started early, 29 Oct: the server side is built and tested (server/rooms.js + WebSockets at /ws in server/index.js, protocol in its header): a room with a four-letter code (no I/O), two seats with secret tokens, every move checked by engine/ayo.js and broadcast with its events, a dropped phone rejoins with its token and gets the whole game, presence, rematch when both ask (loser starts), rooms swept after 10 min unjoined / 6 h idle, GET /api/rooms/:code for the invite link; test/server.test.js plays a whole game over two sockets. The board plays a room's moves (29 Oct, second slice): web/online.js is the board's end of the room (one WebSocket, reconnects by itself with the seat token, refusals in plain words; tested in Node against the real server in test/online.test.js); open the invite link `/?room=CODE` and the 3D board joins that room — the friend's seat is the far end, so the camera turns round and your pits are still nearest you; every tap is sent to the server and both boards animate the events it sends back (the engine on the server is the referee); the HUD shows the friend's name and initial, "their move", "away — their seat is held", "reconnecting…"; a dropped phone rejoins with its token and is back at the board; rematch when both tap Play again; Home leaves the room. Until the Rooms screen is approved, a room is opened with `/?room=new` (the address then becomes the invite link to share). The door (29 Oct, third slice — the members gate): opening an invite link no longer takes the seat; the friend KNOCKS with their name (`{t:"join"}` now knocks: Rooms.knock / admit / refuse / withdraw, the door list in the snapshot's `knocks`), the host's board hears three knocks and a buzz and shows a card "Tete wants to play — Not now / Let in" (docs/render-2026-10-29-door.png); Let in seats them and turns anyone else at the door away (room full), Not now tells them plainly; the knocker's HUD says "at the door · Knocked — waiting for Meka to let you in" and whether the host is at the board or away (a knock held while the host is away is shown when he is back: the list rides the room snapshot); a knocker who closes the page vanishes from the door; a dropped line knocks again by itself; a member who already holds a seat token never knocks again. Names: a card asks "What do we call you?" once, before a room is opened or knocked on (saved on the phone; shown on the HUD and the Game over card; the Rooms screen will ask it its own way once approved). `tools/render.py --online` runs the real server, fills both name cards, knocks, checks the host's door card, lets the friend in and plays a move from each of two phones (docs/render-2026-10-29-online.png is the friend's view from an earlier run). Remains: the Rooms screen (mockup awaiting Meka's yes — see Needs Meka: open a room, the big code, Invite on WhatsApp, join by code)
- [~] Voice at the board (Tete's WebRTC), chat, shouts — shouts built 29 Oct: a speech chip on the toolbar (shown only in a room; undo and hint, which have no place online, step aside) opens a row of eight fixed phrases (Oya, your move! · Chai! · Ha ha! · Well played · Not so fast · Ewo! · Good game · One minute…) in web/shouts.js; only the phrase's id travels, so nothing rude can be typed at a child; the server (Rooms.shout) checks the seat and the id, allows one shout per 1.5 s per seat ("Easy — one shout at a time") and sends it to both boards; on the friend's phone it pops beside your face with a little knock pattern and a buzz, on yours it sits by your name; `tools/render.py --online` now shouts both ways (docs/render-2026-10-29-shouts.png). Remains: voice (WebRTC) and typed chat, if Meka wants either after trying shouts
- [x] Low-bandwidth mode for family in Nigeria: low-texture board, no physics, moves still shown — the lighter board (quality.js) switches on by itself on 2g/3g and data saver; the no-physics option (29 Oct): Settings → Feel → Seed physics, Auto / On / Off — Auto follows the lighter board, so the weakest phones get it without touching anything; with it off every seed still flies pit to pit in a small arc and lands in its slot (the move is shown in full, the knocks still sound), nothing bounces or rolls, and the physics never runs; it switches on the next seed, no new game (`decidePhysics` in web/quality.js, tested; `tools/render.py --nophysics` plays a move that way, docs/render-2026-10-29-nophysics.png). Lighter online traffic (29 Oct, evening): a move now travels as about 53 bytes (seat, pit, move count, both scores) instead of ~480 on average and up to 1.8 KB for a relay turn — 9× less over a game, measured in test/traffic.test.js over 2,474 moves; web/online.js rebuilds the seeds' whole path and the position with the same engine the server uses, checks the count and scores agree, and if a board has somehow fallen behind it asks for the whole room ({t:"sync"}) and is caught up with a toast rather than guessing; the quiet-move count travels with the position so a stalemate ends on the same move on both boards. Done: nothing remains on this line
- [ ] Later: ranked ladder; board finishes and seed sets in a store (looks only, never wins)

## Milestones

- M1 Playable v1 vs computer — target Sun 1 Nov
- M2 Online with friends — target w/c 3 Nov
- M3 Store look (finishes, seed sets) — after Meka's call
