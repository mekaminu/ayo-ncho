# The stores' forms — the answers (Launch L15)

Each answer says why, from what the game actually does (the code in this repo, checked by `test/storepage.test.js`). Two moments matter:

- **Today**: nothing is recorded about how people play; the only thing that leaves the phone is a game with a friend — the nickname typed, the moves and the eight fixed shouts — held in the server's memory for that game and dropped 10 minutes after a room nobody joined, or 6 hours after the last move.
- **Once the Firebase project is wired in** (Launch L13, waits on Meka): game numbers and crash reports go to Google's Firebase from the apps, while Settings → Privacy → Share game numbers and crash reports is on. The wiring run must update the privacy labels and the Data safety form **before** that build goes to review. The answers for that day are below each "today" answer.

Audience: **13 and over** in the store settings (Meka's yes, 3 Nov). Anyone can still play; this keeps the game out of Google's Families programme and Apple's Kids category, which restrict analytics.

## Apple — Age rating (App Store Connect → App Information → Age Ratings)

| Question | Answer | Why |
|---|---|---|
| Parental Controls | No | none in the app |
| Age Assurance | No | no age check |
| Unrestricted Web Access | No | the privacy, terms and support links open in Safari, outside the app; there is no browser inside |
| User-Generated Content | No | the only typed thing is a nickname, shown only to the friend you let in |
| Social Media | No | no feeds, profiles or followers |
| Messaging and Chat | No | a friend in a room can send only one of eight fixed phrases (`web/shouts.js`); no typed or voice chat. If App Review reads the shouts as chat, answering Yes fits the 13+ audience anyway |
| Advertising | No | no ads, no ad SDK |
| Every content question (violence, horror, mature or suggestive themes, profanity or crude humour, alcohol/tobacco/drugs, sexual content, nudity, medical, health) | None | a board game; the opponents' lines are gentle teasing |
| Gambling, simulated gambling, contests | None | no chance, no betting, nothing won but seeds |
| Loot boxes | No | every purchase is a named, one-time item |

Expected rating: **4+**. (13+ is the audience setting; the rating is what the content earns.)

## Google Play — Content rating (IARC questionnaire)

- Category: **Game** (not a casino or social app).
- Violence, fear, sexuality, gambling (real or simulated), language, controlled substances, crude humour: **No** to each.
- Do users interact or exchange content? **Yes** — online games with a friend you invite by code; the nickname and the eight fixed shouts are all that pass. Is it moderated? Only fixed phrases can be sent.
- Does the app share the user's location? **No.**
- Digital purchases? **Yes** (Gold and the looks).
- Unrestricted internet access? **No.**

Expected: **PEGI 3 / Everyone / USK 0**, with the notes "Users Interact" and "In-App Purchases".

## Google Play — Target audience and content

- Target age groups: **13–15, 16–17, 18 and over.** Not "appeals to children" in the store listing.
- Ads: **No, my app does not contain ads.**
- App access: **All functionality is available without special access** (no sign-in). Gold is bought; reviewers use their own test purchases.
- News app, government app, financial features, health, COVID-19, Data safety for a VPN: **No** / not applicable.

## Apple — App Privacy ("privacy nutrition labels")

**Today:**

| Data type | Collected? | Linked to the person? | Used to track? | Purpose |
|---|---|---|---|---|
| User Content → **Gameplay Content** (the moves of a game with a friend, the fixed shouts, the nickname shown to the friend) | Yes | **No** — no account; a room is a code and two random seat tokens | No | App Functionality |

Everything else: **Not collected.** (Settings, records, puzzle days, ratings and purchases stay on the phone; purchases go through Apple, which Apple declares itself.) A strict reading of Apple's definition ("kept longer than needed to serve the request in real time") might let a game held only for its own length count as not collected; declaring it is the safe side and costs nothing on the page.

**Once Firebase is wired** (add, each **not linked**, **not used for tracking**; no advertising identifier is ever read):

| Data type | Purpose | From |
|---|---|---|
| Usage Data → **Product Interaction** | Analytics | the nine fixed moments in `web/telemetry.js` (a game started or ended, the lesson, a puzzle played, an invite, a friend let in, the store opened, a purchase) |
| Diagnostics → **Crash Data** | App Functionality | Crashlytics, and the error's class, file and line from `web/telemetry.js` |
| Diagnostics → **Other Diagnostic Data** | App Functionality | Crashlytics (device model, OS version, free memory) |
| Identifiers → **Device ID** | Analytics | Firebase's own app-instance and installation IDs (not the advertising ID) |
| Location → **Coarse Location** | Analytics | Google Analytics derives a city or country from the connection |

Check that table against Firebase's own page for privacy labels on the day the wiring run lands; it is the authority.

## Google Play — Data safety (Play Console → App content → Data safety)

**Today:**

- Does the app collect or share any of the required user data types? **Yes.**
- Is all user data encrypted in transit? **Yes** (HTTPS and secure WebSocket only).
- Do you provide a way for users to request that their data be deleted? **Yes** — a game with a friend is deleted by itself within 6 hours; anyone may also write to the support address (on the support page).
- Data collected (none **shared** — Render runs the server for us as a service provider, which Google does not count as sharing):

| Category → type | Collected | Ephemeral? | Required or optional | Purpose |
|---|---|---|---|---|
| Personal info → **Name** (the nickname typed for a game with a friend) | Yes | No (held for the game, up to 6 hours) | Optional — only for playing a friend | App functionality |
| App activity → **Other actions** (the moves and shouts of a game with a friend) | Yes | No | Optional | App functionality |

**Once Firebase is wired** (add; all **collected, not shared**, **optional** — the switch in Settings → Privacy):

| Category → type | Purpose |
|---|---|
| App activity → **App interactions** | Analytics |
| App info and performance → **Crash logs** | Analytics; App functionality |
| App info and performance → **Diagnostics** | Analytics; App functionality |
| Device or other IDs → **Device or other IDs** (Firebase's app-instance ID) | Analytics |
| Location → **Approximate location** (derived by Google Analytics) | Analytics |

## Apple — Export compliance (encryption)

"Does your app use encryption?" — **No** beyond the operating system's own HTTPS, which is exempt. The app already says so in its Info.plist (`ITSAppUsesNonExemptEncryption` = NO), so App Store Connect stops asking for each build.

## Apple — Content rights

"Does your app contain, show or access third-party content?" — **No.** The board, seeds, faces and sounds are drawn or made on the device by the game's own code; the open-source parts (three.js, Capacitor, the Fraunces and Inter fonts) are code and fonts under their licences, credited on the support page.

## Both — prices and where it is sold

- Price of the app: **Free.** In-app purchases: the six in [products.md](../products.md).
- Countries: everywhere both stores allow. The EU needs the trader details (an address or P.O. box, a phone, an email) once anything is sold, or leave the EU out at first — Meka's call with the seller account.
