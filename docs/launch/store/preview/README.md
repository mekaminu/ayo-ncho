# The store's preview video

Made by `python3 tools/store-preview.py` from the real game on the real board, with the board's own sounds (do not edit by hand;
run it again after the look changes). About 23 seconds: a game against Nnamdi, your first tap showing where every seed will go, the
turn sown (two relays, two captures), Nnamdi's answer explained under the board and watched again slowly, a hint sown, and the name. Each `-poster.jpg` is the frame at 5 seconds.

| Where it goes | File | Size |
|---|---|---|
| App Store Connect → the version → iPhone 6.9" Display → App Previews (the 6.5" is made from it) | `ios-6.9-preview.mp4` | 886 × 1920 |
| App Store Connect → the version → iPad 13" Display → App Previews | `ios-13-preview.mp4` | 1600 × 1200 |
| YouTube (public or unlisted, ads off, not made for kids), then its link in Play Console → Main store listing → Video | `play-youtube.mp4` | 1920 × 1080 |

Apple takes 15–30 seconds at up to 30 fps, H.264 with stereo AAC; all three are made that way (test/storepreview.test.js checks).
Apple shows the preview muted until it is tapped, so the captions carry it:

1. See where every seed will go
2. Sow every seed by hand
3. Opponents who answer back
4. Hints that show you why
5. Ayo & Nchò · Nigerian Mancala
