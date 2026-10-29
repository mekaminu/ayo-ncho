# Ayo & Nchò: Nigerian Mancala — build plan

Ayo & Nchò (Meka's family calls it akase / aro) is the Nigerian seed-and-board game, built in real 3D for phone and computer. Repo: github.com/mekaminu/ayo-ncho.
This file is the board every build run follows. Meka is the sponsor; he reads the Build Tracker, not this file.

Status key: `[ ]` open · `[~]` started, what remains noted · `[x]` done · `[!]` blocked (waiting on Meka or a check on his devices)

## Rules every build run follows

1. **Lock first.** One run at a time, via the `build-lock` branch (see the scheduled task's prompt). Never force-push.
2. **One item per run** (or one coherent slice of a large item). Finish it: code, tests, docs, push, CI green.
3. **The engine is the law.** `engine/ayo.js` is shared by browser and server; every move the UI shows comes from `applyMove`'s events. Never duplicate rules in UI code. `npm test` must pass before every push.
4. **Real, not drawn.** The look is the 3D board in `web/index.html` (approved by Meka 28 Oct): carved hardwood, Job's-tear seeds, warm lamp light. Keep that look; improve it, never flatten it. Three.js from cdnjs (pinned version), physics via Rapier (compat build) when it lands.
5. **Mock-first for new screens.** Any new screen that is not the board (home, game over, settings, store) gets a mockup on Meka's Design canvas and a `[!]` "Needs Meka" line before it is built. The board itself is approved.
6. **Animations everywhere they make sense** (Meka's standing preference): every seed moves, every capture is a scoop, every score change ticks. Respect `prefers-reduced-motion`. Haptics on phone via `navigator.vibrate`.
7. **Phone first.** Samsung Galaxy Fold (folded ~390px and open ~800px) and a Mac browser. 60fps target; lighter textures on slow connections. Test in the container with Playwright + SwiftShader (`python3 tools/render.py out.png --smoke` plays a real move and fails on any page error; run it before every push that touches web/) and commit a render to `docs/` when the look changes.
8. **No money, no accounts yet.** Nothing is sold in v1. Later store items are looks only, never wins (same ground rules as Whot).
9. **Plain English to Meka.** Tracker items say what he can now do, never code names.
10. **Private details stay out of the repo**: no keys, addresses, numbers.

## Needs Meka

- [!] Confirm the family rules: capture on 2 or 3 (Ayo, the default) or the Okwe way? Skip the start pit on a lap? Game ends when one side is empty? (engine has Ayo + an Okwe placeholder)
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
- [ ] Rapier physics (compat build from cdnjs): seeds are rigid bodies with the carved bowl as a trimesh collider; dropped seeds bounce, roll and settle; full pits pile up; seeds never clip through wood
- [ ] Rest states cached so a settled board costs no physics time; physics only during a move
- [ ] Sound: seed-on-wood click (pitch varies with pit fullness), cluster rattle on pick-up, capture scoop, soft win chord; haptic tap per seed on phone
- [ ] Fold open layout (two-column: board left, opponent card right) and Mac window layout; pinch to zoom, drag to tilt, never lose the board

### Sat 31 Oct — screens around the board
- [ ] Mockups on Meka's Design canvas: Home, Game over, Settings (boxed, segmented, minimal); `[!]` until his yes
- [ ] Home: one-tap Play vs computer, level picker, continue last game, Play with friends (coming)
- [ ] First-game tutorial: three prompts in the first game, then never again
- [ ] Settings: wood finish (mahogany / iroko / ebony), seed set, sound, haptics, count badges on/off, rules variant
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
