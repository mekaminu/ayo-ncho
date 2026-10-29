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

## Needs Meka

- [x] Family rules confirmed 29 Oct: Nchò (capture on 4, see engine/ayo.js header) is the default; Ayo stays as the second game, chosen in the Rules card. Meka may send more rules: fold them in when they arrive.
- [!] Create the GitHub repo github.com/mekaminu/ayo-ncho (private) so the runs can push
- [!] Home / game-over / settings mockups: his yes before they are built (runs make the mockups first)

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
- [~] HUD: both scores, whose turn, undo (via engine replay), rules card, sound toggle — done; remains: polish pass once seen on the Fold
- [x] Game over state on the board (final position, who won by how many, rematch); game resumes after a reload

### Fri 30 Oct — seeds that behave like seeds
- [x] Seed physics (purpose-built in web/physics.js rather than Rapier: smaller, no wasm download, full control): dropped seeds fall, bounce off the carved bowl, roll down its slope, get shoved aside by seeds already there, settle; never below the wood; snap to a slot after 1.1 s whatever happens
- [x] Physics only runs for seeds in flight; a settled board costs nothing
- [x] Sound, synthesised on the device (no audio files): seed-on-wood knock with a noise burst, pitch rising with pit fullness, bounce ticks, cluster rattle on pick-up, capture scoop sweep, win chime; haptic tap per seed on phone
- [x] Fold-open and Mac layout (board fills the height, player cards down the left, toolbar down the right); pinch to zoom on the phone, wheel on the Mac, drag to tilt, clamped so the board never leaves the frame; `tools/render.py --wide` renders it

### Sat 31 Oct — screens around the board
- [ ] Mockups on Meka's Design canvas: Home, Game over, Settings (boxed, segmented, minimal); `[!]` until his yes
- [ ] Home: one-tap Play vs computer, level picker, continue last game, Play with friends (coming)
- [ ] First-game tutorial: three prompts in the first game, then never again
- [ ] Settings: wood finish (mahogany / iroko / ebony), seed set, sound, haptics, count badges on/off (the Nchò/Ayo picker already lives in the Rules card)
- [ ] Installable (manifest + service worker): offline play vs computer with no signal

### Sun 1 Nov — opponents with character, polish, deploy
- [ ] Three named opponents with a face and a line or two (an elder who takes his time, a quick cousin, a market champion); reactions when captured from
- [ ] Performance pass: 60fps on the Fold, battery-friendly idle, textures cached, lighter textures on slow connections
- [ ] Deployed on Render from mekaminu/ayo-ncho; health check; Meka's test link on the tracker
- [ ] Hint: the Hard opponent's best move, lit on the board

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
