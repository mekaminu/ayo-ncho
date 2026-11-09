# A spoiled save never stops the board

Made by `python3 tools/spoiled.py` in headless Chromium as a phone (390×844, touch). Every one of the game's 68 saved keys (`ayo.*` in the browser's storage: 7 written by a short real visit, the rest named in web/) is set to each bad value at once; the plain link must then open with the board drawn and no page error, Play must start a game where a move is sown and answered, and after a reload it must open and play again. 18 bad values, 726 s.

| Bad value | What it stands for | Result |
|---|---|---|
| `(empty)` | empty | opens and plays |
| `{"moves":[3,8,` | cut off | opens and plays |
| `null` | null | opens and plays |
| `[]` | an empty list | opens and plays |
| `{}` | an empty object | opens and plays |
| `-1` | minus one | opens and plays |
| `NaN` | NaN | opens and plays |
| `1e999` | too big | opens and plays |
| `true` | true | opens and plays |
| `"x"` | a quoted word | opens and plays |
| `[object Object]` | [object Object] | opens and plays |
| `__proto__` | __proto__ | opens and plays |
| `constructor` | constructor | opens and plays |
| `[1,"a",null,{},[],true]` | a list of odd things | opens and plays |
| `{"days":"x","seen":3,"at":"soon","id":{}… (82 characters)` | odd fields | opens and plays |
| `{"moves": [0, 1, 99, -3, "x"], "variant"… (145 characters)` | a game that cannot be | opens and plays |
| `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx… (20000 characters)` | a huge string | opens and plays |
| `9999-99-99` | a far-off date | opens and plays |

**Every spoiled save opens and plays.**

Keys: `answer`, `ayo.fresh.tried`, `badges`, `battery`, `bests`, `carried`, `clear`, `count`, `daily`, `finish`, `frames.last`, `full`, `game`, `game.variant`, `gives.told`, `glback`, `greet.last`, `hand`, `haptics`, `keysViewTip`, `lang`, `lean`, `lesson`, `level`, `localNames`, `look`, `mode`, `music`, `name`, `onetap`, `owned`, `pairs`, `path`, `physics`, `quality`, `quality.measured`, `rate.asked`, `rating`, `record`, `rematch`, `rematch.said`, `remind`, `remind.offered`, `remindAt`, `room`, `rules.capture`, `rules.last8`, `rules.relay`, `seeds`, `slam.told`, `sound`, `speed`, `starts`, `starts.pref`, `stepped`, `straightTip`, `streak`, `swing`, `tag`, `take`, `talk`, `tally`, `tele`, `tele.first`, `textsize`, `tutorial`, `volume`, `wake`
