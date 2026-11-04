# The store apps

The Android and iPhone apps are the same game as the web link, wrapped with Capacitor 8. The web files go inside the app
(three.js and the two fonts too), so it opens and plays against the computer with no signal; games with friends talk to
the live server at https://ayo-ncho.onrender.com.

App id: `com.mekaminu.ayoncho` · name "Ayo & Nchò" · Android target: Android 16 (API 36), minimum Android 7 (API 24) ·
iPhone and iPad: iOS 15 or later, built with Xcode 26 (Capacitor 8 needs it).

## What is where

- `capacitor.config.json` — the app's id, name, where its web files are (`app/www`), the dark splash, edge-to-edge bars.
- `tools/build-app.js` — makes `app/www` from `web/` and `engine/`: three.js from `node_modules` (0.170.0) instead of the CDN,
  Fraunces and Inter from `@fontsource` instead of Google Fonts, and no service worker. Not committed; built each time.
- `web/app.js` — what changes inside the app (nothing on the web link): rooms and invite links go to the live server,
  the phone's own haptics, share sheet and keep-awake stand in for the browser's, the Android back button steps back
  like each screen's Back (from Home it puts the app away; in a game with a friend it never leaves the room), the splash goes.
- `android/` — the Android project (Capacitor's, with our icon, splash and dark theme). The icons and splash are cut from
  a render of the real 3D board (one pit of Job's tears under lamp light, `tools/icon-scene.html`) by `python3 tools/app-icons.py`,
  which also writes the web link's icons and the stores' (`docs/launch/store/icon-appstore-1024.png`, `icon-play-512.png`).
- `ios/` — the iPhone and iPad project (Capacitor's, plugins through Swift Package Manager, no CocoaPods): our icon
  (1024, no transparency), the board on the dark wood as the launch screen, light status bar icons, both orientations on
  iPad, `ITSAppUsesNonExemptEncryption = NO` (the game uses only HTTPS, so App Store Connect asks no export questions).
- `tools/render-app.py out.png [--ios] [--wide]` — opens `app/www` in headless Chromium the way the app does, with every outside address
  blocked and the app's plugins faked: no page errors, the fonts and three.js load from inside, a move is played, the
  haptics, keep-awake and the back button go to the app.

## Every push

GitHub Actions (`.github/workflows/ci.yml`, job `android`) builds the app's web files, syncs them into `android/` and
builds a **debug APK**, kept for 30 days as the run's artifact `ayo-ncho-android-debug`.

The iPhone app is compiled only when asked (`.github/workflows/ios.yml`: Actions → ios → Run workflow), because macOS
minutes are expensive once the repo is private. It compiles for the iOS Simulator with no signing — a check that
nothing is broken, not something to install.

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

## The iPhone and iPad app, from your Mac to TestFlight

You need: a Mac with **Xcode 26 or later** (free, from the Mac App Store), **Node 22** (nodejs.org), and the **Apple
Developer account** ($99 a year, see Needs Meka). Everything else is in the repo.

1. **Get the code** (Terminal):

       git clone https://github.com/mekaminu/ayo-ncho && cd ayo-ncho
       npm install
       node tools/build-app.js
       npx cap sync ios
       npx cap open ios

   Xcode opens the project and fetches the plugins (the first time takes a minute or two; the left bar shows
   "Package Dependencies" filling in).
2. **Sign it with your team, once**: in Xcode's left bar click **App** (the blue icon at the top), then the **App**
   target → **Signing & Capabilities** → tick *Automatically manage signing* → **Team**: your name or company (sign in with
   your Apple ID under Xcode → Settings → Accounts if it is not listed). The bundle identifier is already
   `com.mekaminu.ayoncho`; leave it.
3. **Try it on your iPhone**: plug the phone in (or pick it over Wi-Fi), choose it in the device menu at the top of
   Xcode, press ▶ Run. The first time, the iPhone asks you to turn on Developer Mode (Settings → Privacy & Security →
   Developer Mode) and to trust your account (Settings → General → VPN & Device Management). It opens with no signal and
   plays the computer; games with friends need signal. An iPad or a Simulator ("iPhone 17") works the same way.
4. **Make the app in App Store Connect, once** (appstoreconnect.apple.com → Apps → **+** → New App): platform iOS, name
   "Ayo & Nchò: Nigerian Mancala" (the store name; the home-screen name stays "Ayo & Nchò"), primary language English
   (UK), bundle ID `com.mekaminu.ayoncho` (it appears in the list after step 2), SKU `ayoncho`, full access.
5. **Send a build**: in Xcode set the device menu to **Any iOS Device (arm64)**, then **Product → Archive**. When the
   Organizer window opens, select the archive → **Distribute App** → **App Store Connect** → **Upload**, and accept the
   defaults (automatic signing, upload symbols). Before every later upload, raise the build number: App target → General
   → *Build* (1, 2, 3 …); *Version* stays 1.0 until a release.
6. **TestFlight**: after about 10–30 minutes the build shows under the app's **TestFlight** tab ("Processing", then
   ready). The encryption question is already answered by the app (no). Add yourself and the family under **Internal
   Testing** (up to 100 people on your team, no review); for friends outside it, **External Testing** takes a short
   review by Apple the first time, then a public link. Testers install the free **TestFlight** app and open the invite.

When the code changes: `git pull && npm install && node tools/build-app.js && npx cap sync ios`, then from step 5.

## Still to come in the apps

- Store purchases (L12), notifications (L14), Game Center / Play Games (L20).
