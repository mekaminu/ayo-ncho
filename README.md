# Ayo & Nchò: Nigerian Mancala

The Nigerian seed-and-board game (Ayo among the Yoruba, Nchò/Okwe among the Igbo) in real 3D, for phone and computer.

- `engine/` — rules and the computer opponent (shared by browser and server)
- `web/` — the game (Three.js board; physics and screens arrive per `docs/build-plan.md`; `online.js` is the board's end of a room: open `/?room=new` on one phone, the invite link `/?room=CODE` on the other; `shouts.js` is the fixed phrases friends shout across the board)
- `server/` — Express plus the online rooms (`rooms.js`: a four-letter code, two seats, every move checked by the engine, reconnect by token; WebSockets at `/ws`, protocol in `index.js`)
- `npm test` — engine, rooms, server and online-client tests · `npm start` — serve locally on :3000 · `python3 tools/render.py out.png --online` — two headless phones play a move each through the real server
