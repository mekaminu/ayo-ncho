# Two tabs, one game

The game against the computer is kept in the browser's storage (`ayo.game`), which every tab of the game on one phone or Mac shares. Opening the WhatsApp link again opens a second tab while the first lingers (Chrome on the Fold), and on the Mac the game is often open in two windows. Before this, each tab played its own copy: go back to the old tab and one move there wrote over every move played in the other.

Now (web/twotabs.js, wired in web/game.js):

- each tab remembers the save it last wrote or read;
- when another tab writes a different one (the browser's `storage` event), or this tab comes back into view or focus, it follows: the board is laid out from the newer game — on Home quietly, on the board with "Picked up from your other tab" (said when the tab is looked at, not while it is hidden); a game finished in the other tab brings this one back to Home with "That game ended in your other tab";
- it waits while something is under way (seeds moving, a new game being dealt, the puzzle, the lesson, Mama Ngozi's review, a play-out, the Game over card, Settings or the Store) and follows when that ends;
- a tab out of sight never writes over a game another tab saved since it last looked (its save is held back and it follows instead), and the computer's reply worked out for the old copy is dropped, never played on the newer game;
- games with a friend live on the server and are not touched.

Checked by `python3 tools/twotabs.py` (two tabs of one headless Chromium as a phone): tab B continues tab A's game, A follows with its word; a move in A is followed by B with the reply neither doubled nor lost; A out of sight and deaf to the other tab holds back its stale save and follows when back in view; a game ended in B takes A to Home; no page error. Picture: docs/render-2026-11-09-twotabs.png. Unit and wiring checks: test/twotabs.test.js.
