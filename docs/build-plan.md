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
- [ ] Replay clip: a 10-second recording of a brilliant relay turn to share
- [ ] Calm streak: days played unlocks a seed set, no punishment for missing a day
- [ ] Opponent reactions: a line and a face when they lose a big pit, when they win, when you undo

## Needs Meka

- [!] Daily puzzle card on Home and the puzzle screen: mockups on the Design canvas (https://claude.ai/artifact/H75vS5iCT5X2Fmft4oYMXP, second row) — awaiting Meka's yes
- [!] Make the repo public so the scheduled cloud runs can push (github.com/mekaminu/ayo-ncho/settings → Danger Zone → Change visibility)

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
- [~] Performance pass: pixel ratio capped at 1.5 on phones, 1024 shadow map on phones and high-dpr screens, render loop paused when the tab is hidden; remains: measure on the real Fold, lighter textures on slow connections
- [ ] Deployed on Render from mekaminu/ayo-ncho; health check; Meka's test link on the tracker
- [x] Hint: Mama Ngozi's best move lit on the board for 1.5 s, one hint per turn

### Mon 2 Nov — Meka's test and the fixes from it
- [ ] Every fix Meka reports from the Fold and the Mac
- [ ] Rules check against how his family plays, with corrections
- [ ] Decision for next week: online play with friends first, or the store look first

### w/c 3 Nov — play with friends online
- [ ] Rooms with a code and WhatsApp invite (Tete's pattern): moves played on the server with the same engine; reconnect; the members gate (Meka lets people in)
- [ ] Voice at the board (Tete's WebRTC), chat, shouts
- [ ] Low-bandwidth mode for family in Nigeria: low-texture board, no physics, moves still shown
- [ ] Later: ranked ladder; board finishes and seed sets in a store (looks only, never wins)

## Milestones

- M1 Playable v1 vs computer — target Sun 1 Nov
- M2 Online with friends — target w/c 3 Nov
- M3 Store look (finishes, seed sets) — after Meka's call
