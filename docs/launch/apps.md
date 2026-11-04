# The store apps

The Android and iPhone apps are the same game as the web link, wrapped with Capacitor 8. The web files go inside the app
(three.js and the two fonts too), so it opens and plays against the computer with no signal; games with friends talk to
the live server at https://ayo-ncho.onrender.com.

App id: `com.mekaminu.ayoncho` · name "Ayo & Nchò" · Android target: Android 16 (API 36), minimum Android 7 (API 24).

## What is where

- `capacitor.config.json` — the app's id, name, where its web files are (`app/www`), the dark splash, edge-to-edge bars.
- `tools/build-app.js` — makes `app/www` from `web/` and `engine/`: three.js from `node_modules` (0.170.0) instead of the CDN,
  Fraunces and Inter from `@fontsource` instead of Google Fonts, and no service worker. Not committed; built each time.
- `web/app.js` — what changes inside the app (nothing on the web link): rooms and invite links go to the live server,
  the phone's own haptics, share sheet and keep-awake stand in for the browser's, the Android back button steps back
  like each screen's Back (from Home it puts the app away; in a game with a friend it never leaves the room), the splash goes.
- `android/` — the Android project (Capacitor's, with our icon, splash and dark theme). The icons and splash come from
  `web/icon.svg` by `python3 tools/app-icons.py` (run it again when the icon changes, L6).
- `tools/render-app.py out.png` — opens `app/www` in headless Chromium the way the app does, with every outside address
  blocked and the app's plugins faked: no page errors, the fonts and three.js load from inside, a move is played, the
  haptics, keep-awake and the back button go to the app.

## Every push

GitHub Actions (`.github/workflows/ci.yml`, job `android`) builds the app's web files, syncs them into `android/` and
builds a **debug APK**, kept for 30 days as the run's artifact `ayo-ncho-android-debug`.

To try it on the Fold: open the latest green run under the repo's Actions tab, download `ayo-ncho-android-debug`, unzip it,
send `app-debug.apk` to the phone and open it (Android asks once to allow installs from that app). A debug build is for
trying only — it cannot go on the Play Store.

## Building it on a computer

    npm install
    node tools/build-app.js
    npx cap sync android
    cd android && ./gradlew assembleDebug      # needs Java 21 and the Android SDK (Android Studio installs both)

or `npx cap open android` to open it in Android Studio and press Run with the phone plugged in.

## The signed release (once the Google Play developer account exists)

1. Make an upload key once, on your own computer, and keep it and its passwords safe (never in the repo):
   `keytool -genkeypair -v -keystore ayo-upload.jks -alias ayo -keyalg RSA -keysize 2048 -validity 10000`
2. In the repo on GitHub → Settings → Secrets and variables → Actions, add `ANDROID_KEYSTORE_BASE64` (the .jks file as
   base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`ayo`) and `ANDROID_KEY_PASSWORD`.
3. A build run then adds a release job that signs an **app bundle** (`bundleRelease`, the .aab Google asks for) with a
   version code from the run number — it is written when the account exists, so nothing waits on a key that isn't there.
4. In Play Console: create the app ("Ayo & Nchò", game, free), turn on Play App Signing (Google keeps the real key; yours
   only uploads), upload the .aab to the closed test track and add the 12 testers. Google asks for 14 days of closed
   testing before the app can go to everyone.

## Still to come in the apps

- iPhone and iPad (L4): the iOS project from the same shell, checked on a Mac runner on demand, and a guide to TestFlight.
- Store purchases (L12), notifications (L14), Game Center / Play Games (L20).
