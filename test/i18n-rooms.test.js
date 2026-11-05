// French (Launch L18, slice 5): playing a friend — the Rooms screen, the door, the shouts, taking back, giving up, the call,
// block and report, the server's answers, the away titles and the invite — and the store's rows, the purchases' toasts,
// the reminder (its notification too) and the first game's tips. Every line French, with no English left in it, whatever
// the friend is called; the words that leave the page (the tab's title, the invite, the notification) go through t().
import { test } from "node:test";
import assert from "node:assert/strict";
import { translate, OVERLAP } from "../web/i18n.js";
import { FR_ROOMS } from "../web/i18n-rooms.js";
import { awayWords, awayTitle, makeAway } from "../web/away.js";
import { blockWords } from "../web/block.js";
import { callWords } from "../web/call.js";
import { backWords, undoWords } from "../web/takeback.js";
import { BUTTON, BUTTON_KEYS, gaveUpWords } from "../web/giveup.js";
import { inviteText, whatsappLink, ERROR_TEXT } from "../web/online.js";
import { SHOUTS } from "../web/shouts.js";
import { storeView, nowLine, tapAction, restoreWords, GOLD_OPENS, BOARDS, SEEDS, BUNDLE_ROW, priceLabel } from "../web/store.js";
import { failWords, restoredWords, NAMES } from "../web/purchase.js";
import { remindNote, reminderWords, offerWords, makeReminders, testNotifications } from "../web/remind.js";

const fr = (s) => translate(s, "fr");
const FRIENDS = ["Tete", "Bola", "Ada Obi", "Chidi", "Kémi"];
const KEEPS = /Tete|Bola|Ada Obi|Chidi|Kémi|Mama Ngozi|Papa Ike|Nchò|Ayo|Gold|App Store|Google Play|Wi-Fi|WhatsApp|Iroko|Chai|Ewo|Oya|Ha ha|[A-Z]{4}\./g;
const ENGLISH = new RegExp(String.raw`(?<!\p{L})(the|and|you|your|they|them|their|is|are|was|has|have|to|of|with|room|door|friend|move|game|board|play|played|again|back|take|taken|asks?|asked|waiting|video|voice|call|line|weak|better|picture|block|blocked|report|problem|phone|store|yours|bought|app|link|restore|restored|nothing|signal|try|reminder|seeds?|pit|days?|turn|this|that|now|here|tap|click|let|in|off|at|for|be|it|who|join|joined|knock|knocked|wants)(?!\p{L})`, "iu");
function french(line, what) {
  if (!line) return;
  if (/^(Iroko|Gold)$/.test(line)) return assert.equal(fr(line), line); // names stay
  const f = fr(line);
  assert.notEqual(f, line, `${what}: no French for «${line}»`);
  assert.ok(!ENGLISH.test(f.replace(KEEPS, "")), `${what}: English left in «${f}» (from «${line}»)`);
  assert.ok(!/ [:;?!]/.test(f), `${what}: a plain space before : ; ? ! in «${f}»`);
  return f;
}

test("none of slice 5's phrases was already in the dictionary, and none has a plain space before : ; ? !", () => {
  assert.deepEqual(OVERLAP, []);
  for (const [en, f] of Object.entries(FR_ROOMS)) assert.ok(!/ [:;?!]/.test(f), `«${en}» → «${f}»`);
});

test("the shouts are French on the phone that shows them, friend to friend", () => {
  for (const s of SHOUTS) french(s.text, "shout");
  assert.equal(fr("Oya, your move!"), "Oya, à toi !");
  for (const n of FRIENDS) for (const s of SHOUTS) french(awayWords("shout", { name: n, text: s.text }), "away shout");
});

test("the away titles, the door, joining and the toasts of a game with a friend, whatever the friend is called", () => {
  const kinds = [["move", {}], ["move", { mine: false }], ["knock", {}], ["joined", {}], ["joined", { mine: true }], ["rematch", {}],
    ["over", { result: "won", score: [27, 21] }], ["over", { result: "lost", score: [21, 27] }], ["over", { result: "draw", score: [24, 24] }],
    ["over", { result: "won" }], ["over", { result: "won", gaveUp: true }], ["over", { result: "lost", gaveUp: true }], ["askback", {}], ["call", { mode: "video" }], ["call", {}]];
  for (const n of [...FRIENDS, undefined]) for (const [k, d] of kinds) french(awayWords(k, { name: n, ...d }), `away ${k}`);
  for (const n of FRIENDS) {
    for (const l of [`${n} wants to play`, `${n} is at the door`, `Knocked — waiting for ${n} to let you in`, `${n} let you in — your move`, `${n} let you in — they start`,
      `${n} did not let you in this time`, `Knocked — ${n} decides`, `${n} joined`, `${n} wants to play again`, `Waiting for ${n}…`, `playing as ${n}`, `Play again — ${n} is ready`]) french(l, "room line");
  }
  for (const l of ["tap to open a room", "opening a room…", "waiting for a friend", "someone is at the door", "no connection · tap to try again", "too many rooms open · tap to try again",
    "Nchò · same rules as the board", "Ayo · same rules as the board", "Knocking on room EDNE…", "Room EDNE · send your friend this page's link", "Room EDNE — share this page's link", "room EDNE",
    "Let them in and they take the far seat. Nobody else can join once they do.", "Let them in and they take the far seat. 1 more is waiting behind them.", "Let them in and they take the far seat. 3 more are waiting behind them.",
    "deciding whether to let you in", "away — they will see you knocked when they are back", "away — their seat is held", "their move", "catching up…", "Caught up with the board", "tap Home to go back",
    "Your friends see this name at the board. Asked once, kept on this phone.", "Your friend sees this name when they knock on your board.", "Open the room"]) french(l, "rooms");
  // the title is outside the page's body: the controller puts the words through t() itself
  const doc = { hidden: true, title: "Ayo & Nchò", querySelector: () => null };
  const away = makeAway({ doc, t: fr }); away.note("move", { name: "Tete", mine: true });
  assert.equal(doc.title, "À vous · Tete a joué — Ayo & Nchò");
  away.note("shout", { name: "Tete", text: "Oya, your move!" });
  assert.equal(doc.title, awayTitle("Tete : Oya, à toi !", 2));
  away.back(); assert.equal(doc.title, "Ayo & Nchò");
});

test("taking back, giving up, the call and block and report", () => {
  for (const n of FRIENDS) {
    for (const [k, v] of Object.entries(backWords(n))) french(v, `takeback ${k}`);
    for (const mine of [0, 1]) for (const [k, v] of Object.entries(gaveUpWords(mine, 0, n))) french(v, `gave up ${k}`);
    for (const k of ["chip", "askVideo", "askVoice", "asking", "stopAsk", "stopped", "asked", "askedSub", "declined", "theysaidno", "theystopped", "starting", "live", "ended", "theyended", "theyleft", "failed", "nomedia", "away", "mic", "cam", "theirCam", "hangUp", "muted", "weak", "theirweak", "better", "videoAgain", "theirvideoagain", "weakNote"]) {
      french(callWords(k, n), `call ${k}`); if (k === "asked") french(callWords(k, n, "video"), "call asked video");
    }
    for (const k of ["block", "armed", "armedKeys", "blockLabel", "done", "atDoor", "seated", "report", "reportLabel", "none", "unblock", "unblocked", "note"]) french(blockWords(k, n), `block ${k}`);
    for (const l of [`Voice with ${n} — the line is weak — mute, hang up`, `Voice with ${n} — the line is weak, now better: video again — mute, hang up`, `Video and voice with ${n} — mute, camera, hang up`,
      `Voice with ${n}`, `Show ${n}'s picture`, `Hide ${n}'s picture`]) french(l, "call menu");
  }
  french(backWords().chip + " · U", "undo title"); french(undoWords({ gone: 1 }), "undo");
  for (const b of [BUTTON, BUTTON_KEYS]) for (const v of Object.values(b)) french(v, "give up button");
  for (const l of ["Give up this game — press again to confirm", "Take it back?", "take it back?", "Mute", "Unmute", "Mute your microphone", "Turn your microphone back on", "The line is better: turn the pictures back on",
    "Camera off", "Camera on", "This browser cannot do video or voice", "Nothing starts until they say yes.", "The lighter board is on: voice only. Nothing starts until they say yes.",
    callWords("askedSub"), " The lighter board is on, so this phone sends voice only.", callWords("weakNote"), " Video again comes here once the line is better."]) french(l, "call/give up"); // two text nodes each
  assert.equal(fr("Take it back?"), "Reprendre le coup ?");
});

test("every answer the server can give, and the invite (friend to friend: « tu »)", async () => {
  const msgs = Object.values(ERROR_TEXT);
  assert.ok(msgs.length >= 20, `only ${msgs.length} answers found`);
  for (const m of msgs) french(m, "server");
  for (const l of ["No connection right now — reconnecting", "This browser cannot open a live connection", "Could not reach the server — check your signal and try again"]) french(l, "connection");
  const inv = french(inviteText("edne"), "invite");
  assert.match(inv, /^Viens jouer .* Salle EDNE\.$/);
  const wa = decodeURIComponent(whatsappLink("EDNE", "https://ayo-ncho.onrender.com/?room=EDNE", fr).split("text=")[1]);
  assert.equal(wa, inv + "\nhttps://ayo-ncho.onrender.com/?room=EDNE");
  assert.ok(decodeURIComponent(whatsappLink("EDNE", "x")).includes("Come and play"), "English unless asked");
});

test("the store's rows, its card, every tap and the purchases' toasts", () => {
  const prices = { gold: "£4.99", board_benin_bronze: "£2.99", board_grandpa: "£2.99", seeds_cowries: "£1.99", seeds_palm_kernels: "£1.99", bundle_all: "£7.99" };
  for (const inApp of [false, true]) for (const owned of [new Set(), new Set(["gold", "seeds_cowries"]), new Set(["bundle_all", "gold"])]) for (const stones of [false, true]) for (const pr of [null, prices]) {
    const v = storeView({ owned, stones, days: 3, need: 7, finish: "mahogany", seeds: "jobs", tryFinish: "benin", inApp, prices: pr });
    french(v.gold.sub, "gold sub"); french(v.note, "note"); french(v.now.tag, "now tag"); french(v.now.words, "now words"); french(v.now.title, "now title");
    if (!/£/.test(v.gold.button)) french(v.gold.button, "gold button");
    for (const r of [...v.boards, ...v.seeds, v.bundle]) {
      french(r.name, "row name"); french(r.sub, "row sub"); if (!/£/.test(r.button)) french(r.button, "row button");
      const a = tapAction(r, { inApp, prices: pr, days: 3, need: 7 }); if (a.words) french(a.words, "tap");
      french(`See ${r.name} on the board`, "row label"); french(`${r.name} on the board`, "try toast");
    }
    french(tapAction({ id: "gold", state: "buy" }, { inApp, prices: null }).words, "gold tap");
  }
  for (const o of GOLD_OPENS) french(o.what, "gold opens");
  french(nowLine({ finish: "iroko", seeds: "jobs" }).title, "iroko");
  for (const i of [false, true]) french(restoreWords(i), "restore");
  french(priceLabel("gold", { inApp: true }), "soon");
  for (const name of Object.values(NAMES)) {
    for (const e of ["user cancelled", "pending", "network down", "already owned", ""]) french(failWords({ message: e }, name).words, "fail");
    french(`${name} is yours — thank you`, "bought");
  }
  const all = new Set(Object.keys(NAMES));
  french(restoredWords(new Set(), all), "restored"); french(restoredWords(all, all), "all restored"); french(restoredWords(all, new Set()), "nothing");
  french(restoredWords(new Set(["gold"]), new Set(["seeds_cowries"])), "restored and gone");
  for (const x of ["River stones", "Cowries", "Benin bronze"]) french(`${x} unlocked — pick them in Settings`, "unlocked");
  assert.equal(fr("Cowries are yours"), "Les cauris sont à vous");
  assert.equal(fr("Something on the board"), "Something on the board", "only a look's name is read as a look");
});

test("the reminder: Settings' line, the offer, the toasts and the notification itself", async () => {
  for (const app of [false, true]) for (const on of [false, true]) for (const perm of ["granted", "denied", "prompt"]) { const n = remindNote(app, on, perm); if (n !== "on") french(n, "remind note"); }
  for (const h of [9, 13, 19]) { french(offerWords(h), "offer"); french(`Reminder on · ${String(h).padStart(2, "0")}:00 each day, only while the puzzle is unplayed`, "toast"); }
  french("Notifications are off for the app — turn them on in the phone's settings, then here", "toast");
  for (const v of ["ncho", "ayo"]) { const w = reminderWords("2026-11-05", v); french(w.title, "title"); french(w.body, "body"); }
  const L = testNotifications(); const r = makeReminders(L, { now: () => new Date(2026, 10, 5, 8), t: fr });
  await r.sync({ on: true, hour: 19, variant: "ncho", ask: true });
  const { notifications } = await L.getPending();
  assert.ok(notifications.length > 0);
  for (const n of notifications) { assert.match(n.title, /^Énigme du jour · /); assert.match(n.body, /^Prenez \d+ en un tour · Règles du Nchò\. Une nouvelle position vous attend\.$/); }
});

test("the first game's tips and the puzzle's Show me", () => {
  for (const l of ["Your six pits are the column nearest you, on the right. Tap one with seeds: brass marks show where its seeds will go. Tap again to sow.",
    "The seeds go one per pit anticlockwise: up your side, then down theirs. The count beside each pit keeps score for you.",
    "A pit that reaches 4 is captured by whoever owns that side — and your last seed landing in a pit with seeds picks it up and keeps going.",
    "Your last seed made a pit 2 or 3 on their side, so you captured it, plus any 2s and 3s right behind it.",
    "Mama Ngozi: watch this one…", "Mama Ngozi showed you — now play it yourself", "4 days in a row"]) french(l, "tip");
  // the streak's own line is never read as a friend's name
  assert.match(fr("2 days played"), /^2 jours de jeu$/);
});
