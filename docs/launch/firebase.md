# Game numbers and crash reports — the free Firebase project (Launch L13)

The game already has the module and the switch: `web/telemetry.js`, and Settings → Privacy → **Share game numbers and crash reports**.
Today it records nothing — there is nowhere to send to. Once Meka makes a free Firebase project, a build run wires it into the
Android and iPhone apps only (the web link never sends anything).

## What it will ever say

Eight moments and a crash, each with a few words from fixed lists (anything else is dropped in `clean`, tested in `test/telemetry.test.js`):

| Moment | Words it carries |
|---|---|
| `game_start` (a game's first move; not the puzzle or the lesson) | game (ncho / ayo), opponent (easy, steady, medium, hard, master, local, friend), first game on this phone |
| `game_end` | game, opponent, result (win / loss / draw), how it ended (played / gave_up / circling), moves as a band (≤10 … >100), first game |
| `lesson_end` | done or skipped, the step (1–3) |
| `puzzle_play` | game, solved, shown |
| `invite_sent` | whatsapp / copy / share |
| `invite_joined` | host / friend |
| `store_open` | from home / settings |
| `purchase` | which of the six products |
| `crash` | error / rejection, the error's class, our file name and the line to the nearest ten — never the message |

Each also carries the platform (android / ios). No name, room code, moves, shouts, anything typed, no advertising ID.

## Meka's clicks (about 10 minutes, free — the Spark plan; no card needed)

1. Go to https://console.firebase.google.com, sign in with the Google account that will own the Play Console, **Create a project**, name it "Ayo and Ncho".
2. **Google Analytics: on**, a new Analytics account "Ayo and Ncho", your country. Untick "data sharing" options you don't want (none are needed).
3. In the project: **Add app → Android**, package name `com.mekaminu.ayoncho`, nickname "Ayo & Nchò Android". Download `google-services.json`. Skip the SDK steps (the build run does them).
4. **Add app → Apple**, bundle ID `com.mekaminu.ayoncho`. Download `GoogleService-Info.plist`. Skip the SDK steps.
5. **Crashlytics** (left menu, Release & Monitor) → **Get started** for each app.
6. Analytics → **Data retention** → 2 months is enough. Settings → **Data sharing** off for anything you didn't choose.
7. Send the two files to a build run (or add them to the repo's GitHub Actions secrets as `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST`, pasting each file's text). They are not secret keys, but they stay out of the public repo.

## What the wiring run then does

- Adds `@capacitor-firebase/analytics` and `@capacitor-firebase/crashlytics` (free, MIT) to the apps, collection off until the switch says on (`setEnabled`), advertising ID collection off (`google_analytics_adid_collection_enabled=false`, and no AdSupport framework on iOS).
- Hands them to `makeTelemetry` as the sink in `web/app.js` (only inside the apps).
- Updates the privacy page first (what is sent, to Google as our processor, how to switch it off), then Apple's privacy labels ("Usage data" and "Crash data", not linked to you, not used for tracking) and Google's Data safety form (App activity, Crash logs; collected, not shared, optional).
- Decides with Meka whether the switch starts on or asks on first open (see Needs Meka in the build plan).
