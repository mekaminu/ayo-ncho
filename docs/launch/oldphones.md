# Older phones (idea 9 Nov)

The iPhone app opens from iOS 15.0 (`IPHONEOS_DEPLOYMENT_TARGET = 15.0` in ios/), and the web link reaches whatever
Chrome, Samsung Internet or Safari the family's phones have. Nothing checked that the game's own code kept to that floor,
and it did not:

- **The rules engine used `Object.hasOwn`** (engine/ayo.js `cleanRules`), which only came with Safari 15.4 and Chrome 93.
  On an iPhone on iOS 15.0–15.3, or an older Chrome, it throws the moment the game reads its rules, and the board never
  starts. Now `Object.prototype.hasOwnProperty.call`, which every browser has.
- **Seven CSS rules used `:has()`** (Safari 15.4, Chrome 105, Samsung Internet 20). A browser without it drops the whole
  rule, and one of them (`.lesson #puzzle.open ~ #hint, .lesson:has(…)`) took a plain rule down with it. Without them,
  Settings' button rows did not wrap under their words, the first-game tip sat over the words under the board, a big
  puzzle target ran onto two rows and the lesson's hint line stayed under its card. Now each `:has` rule has a twin on a
  class, and web/oldcss.js keeps those classes true to the page on a browser without `:has` (a MutationObserver, at most
  once a frame; nothing at all on a browser that has it). Rules that mix a newer selector with plain ones are split.
- **The Igbo / Yoruba / Hausa count word was centred with the `translate` property** (Chrome 104, Samsung Internet 20),
  so on older phones it sat half its width to the right of the number. Now the centring is part of its transform.

The floor, held by test/oldphones.test.js on every push: Safari 15.0 / iOS 15.0, Chrome 90, Samsung Internet 15.

- every script the page runs (web/, engine/, the inline scripts in index.html, the service worker) is parsed as ES2022
  and walked: no class static blocks, regex lookbehind or `v` flag; no `Object.hasOwn`, array `.at()`, `findLast`,
  `toSorted`, `structuredClone`, `crypto.randomUUID`, `BroadcastChannel`, `OffscreenCanvas`, `requestIdleCallback`, … —
  unless the line asks first (`typeof`, `globalThis.X`, `'X' in`, `&&`);
- no newer selector (`:has`, `:focus-visible`) shares a rule with plain selectors;
- every `:has` rule has its class twin with the same declarations, and every mark in web/oldcss.js its rule;
- no individual `translate` / `scale` / `rotate` outside an animation (animations simply don't play on older phones).

`python3 tools/oldphones.py` plays it in headless Chromium made old: index.html served with every `:has` rule taken out,
`CSS.supports` saying no to `:has`, and `Object.hasOwn`, `.at()`, `structuredClone`, `findLast` and the rest removed
before the page runs. The board starts, a real move is played and answered (docs/render-2026-11-09-oldphones.png),
Settings' 17 button rows wrap with nothing wider than the phone in English and in French with the largest words, and the
first-game tip steps up above one and two lines under the board and back down. No page error.

three.js 0.170.0 itself keeps to the floor (its `.at(` is its own `Ray.at`); WebGL 2, which it needs, is in Safari 15.
