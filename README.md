# Ayo & Nchò: Nigerian Mancala

The Nigerian seed-and-board game (Ayo among the Yoruba, Nchò/Okwe among the Igbo) in real 3D, for phone and computer.

- `engine/` — rules and the computer opponent (shared by browser and server)
- `web/` — the game (Three.js board; physics and screens arrive per `docs/build-plan.md`)
- `server/` — Express plus the online rooms (`rooms.js`: a four-letter code, two seats, every move checked by the engine, reconnect by token; WebSockets at `/ws`, protocol in `index.js`)
- `npm test` — engine, rooms and server tests · `npm start` — serve locally on :3000
