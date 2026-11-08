# Accessibility check

Made by `python3 tools/a11y.py`: axe-core 4.10.2 over each screen in headless Chromium (WCAG 2.2 A and AA rules and axe's best practices: one main landmark, one title, everything inside a landmark, tap targets of 24 px or more and not covered), at the phone (390×844, touch), the Mac (1180×820) and the phone in French. Colour contrast is listed but not failed: the words sit over the 3D board and the carved wood, a picture axe cannot measure, so it was checked by eye in the renders.

| Screen | Result |
|---|---|
| Home · phone | passes |
| With friends, your name · phone | passes |
| Settings · phone | passes |
| Store · phone | passes |
| A game, after a move and the reply · phone | passes |
| How to play · phone | passes |
| Game over · phone | passes |
| Home · Mac | passes |
| With friends, your name · Mac | passes |
| Settings · Mac | passes |
| Store · Mac | passes |
| A game, after a move and the reply · Mac | passes |
| How to play · Mac | passes |
| Game over · Mac | passes |
| Home · phone · French | passes |
| With friends, your name · phone · French | passes |
| Settings · phone · French | passes |
| Store · phone · French | passes |
| A game, after a move and the reply · phone · French | passes |
| How to play · phone · French | passes |
| Game over · phone · French | passes |
