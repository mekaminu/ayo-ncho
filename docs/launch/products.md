# What to create in App Store Connect and Play Console

Six one-time purchases. Every one is **non-consumable** (bought once, kept for ever, restored on a new phone). The product ID must be typed exactly as below, in both stores: the app asks the stores for these IDs and nothing else. Prices are yours to set in each console; the app shows whatever the store says (the audit's placeholders are in brackets).

| Product ID | Name in the store | What it unlocks | Placeholder price |
|---|---|---|---|
| `gold` | Gold | Papa Ike (Master), Mama Ngozi's review of every game, every past daily puzzle and your games once those screens are built | (£3.99) |
| `board_benin_bronze` | Benin bronze board | the Benin bronze board (a look only) | (£2.99) |
| `board_grandpa` | Grandpa's board | Grandpa's board (a look only) | (£3.99) |
| `seeds_cowries` | Cowrie seeds | the cowrie seed set (a look only) | (£1.99) |
| `seeds_palm_kernels` | Palm kernel seeds | the palm kernel seed set (a look only) | (£1.99) |
| `bundle_all` | The whole market | every board and seed set, now and the ones to come | (£7.99) |

Short description for each (both stores ask for one): "A look for the board. It changes nothing about how the seeds fall or who wins." For Gold: "Papa Ike, the Master; Mama Ngozi's review of your games; the puzzle archive and your history. Never a win bought."

## App Store Connect (once the Apple Developer account exists)

1. Agreements, Tax and Banking: accept the Paid Apps agreement and add the bank and tax details (purchases cannot be tested or sold before this).
2. Your app → Monetization → In-App Purchases → **+** → type **Non-Consumable**, Reference name = the name above, Product ID = the ID above.
3. For each: a price (Price Schedule), a display name and description in English (UK) and English (US), and the review screenshot Apple asks for (a screenshot of the store screen is fine: docs/render-2026-11-04-store.png).
4. Tick **Family Sharing** if you want a family to share Gold and the looks (the app handles both ways).
5. Submit the six with the first build that goes to review (Apple reviews in-app purchases with a build).
6. To try buying before release: Users and Access → Sandbox → add a test account (a new email address), sign in with it on the iPhone under Settings → App Store → Sandbox Account, and buy in a TestFlight build: nothing is charged.

## Play Console (once the Google Play developer account exists)

1. Set up a payments profile (Setup → Payments profile) — Google needs it before any product can be created.
2. Upload a signed build to the internal testing track first (Play only lets you make products for an app with the BILLING permission uploaded; the app's build carries it).
3. Your app → Monetize with Play → Products → **In-app products** → Create product, with the Product ID above, the name, the description and a price; then **Activate** each one.
4. To try buying: Setup → License testing → add your Google account (and the testers'); their purchases go through with a test card and nothing is charged.

## How the app buys (for reference)

The app uses the free Capacitor plugin `@capgo/native-purchases` (StoreKit 2 on iPhone and iPad, Google Play Billing 9 on Android; no account or service of its own). A purchase checked on the phone (StoreKit 2's own verification; Google's purchased state) is kept in the phone's storage, acknowledged with the store, and **Restore purchases** in the store screen asks the store again on a new phone. Nothing about a purchase reaches our server. The web link sells nothing.

Once both consoles have the six products, a run checks a real purchase on each (sandbox on the iPhone, a licence tester on the Fold) — that check is the one thing in L12 that waits on your accounts.
