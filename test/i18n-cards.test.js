// French (Launch L18, slice 3): every line the cards build is French — Game over (its top line, the title, how the game
// went, the record, the rating, the next opponent), Mama Ngozi's review, the puzzle's result, the lesson's end, Home's
// record and rating lines — and the words that leave the page (the result, the puzzle, the clip's caption).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translate } from "../web/i18n.js";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { rateMoves } from "../engine/ai.js";
import { gameStory, storyWords } from "../web/story.js";
import { cardLine as recordLine, standing } from "../web/record.js";
import { cardWords, homeLine } from "../web/rating.js";
import { reviewPlan, reviewItem, summaryWords, stepWords, OPEN_LINES, CLEAN_LINE, END_LINE } from "../web/review.js";
import { cardLine as puzzleCard, resultLabel, runLine } from "../web/daily.js";
import { clipCaption } from "../web/clip.js";
import { shareText as puzzleShare, dailyPuzzle } from "../engine/puzzle.js";
import { gaveUpWords } from "../web/giveup.js";
import { overTitle, continueLine, shareText as localShare } from "../web/local.js";
import { nextUp } from "../web/lesson.js";
import { offerWords } from "../web/remind.js";
import { endedWords } from "../web/circling.js";

const fr = (s) => translate(s, "fr");
const NAMES = /Mama Ngozi|Nnamdi|Adaeze|Auntie Bisi|Papa Ike|Tete|Nchò|Ayo/g;
const ENGLISH = new RegExp(String.raw`(?<!\p{L})(pit|pits|seeds?|takes?|took|gives?|gave|up|led|lead|trail|best|win|wins|draws?|moves?|game|games|rating|for|beating|losing|with|from|start|the|and|you|your|they|them|she|her|him|played|would|differently|short|row|day|captured|sown|relays?|beat|lost|drew|both|phone|each|Ready|Play|next|of|after|swing|way|level|whole|end|in)(?!\p{L})`, "iu");
function french(line, what) {
  if (!line) return;
  const f = fr(line);
  assert.notEqual(f, line, `${what}: no French for «${line}»`);
  assert.ok(!ENGLISH.test(f.replace(NAMES, "").replace(/Gold|3D/g, "")), `${what}: English left in «${f}» (from «${line}»)`);
  assert.ok(!/ [:;?!]/.test(f), `${what}: a plain space before : ; ? ! in «${f}»`);
}
const lines = (s) => s.split("\n").map(fr).join("\n");

test("Game over's lines are French over random games of both kinds, from either seat, against anyone", () => {
  let seed = 5; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const seen = new Set(); const say = (l, what) => { if (!l || seen.has(l)) return; seen.add(l); french(l, what); };
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 40; g++) {
    let s = newGame(variant, {}, g % 2);
    while (!s.over) { const ms = legalMoves(s); s = applyMove(s, ms[Math.floor(rnd() * ms.length)]).state; }
    const name = variant === "ncho" ? "Nchò" : "Ayo";
    for (const player of [0, 1]) {
      const st = gameStory(s.moves, variant, {}, player);
      say(storyWords(st, { me: "You", them: "Nnamdi" }), "story");
      say(storyWords(st, { me: "Player 2", them: "Player 1" }), "story, two of us");
      say(storyWords(st, { me: "You", them: "Tete", gaveUp: gaveUpWords(1 - player, player, "Tete").story }), "story, they gave up");
      say(storyWords(st, { me: "You", them: "Tete", gaveUp: gaveUpWords(player, player, "Tete").story }), "story, you gave up");
      const [a, b] = [s.stores[player], s.stores[1 - player]];
      say(`${name} · ${s.moves.length} moves`, "eyebrow");
      say(`${name} · ${s.moves.length} moves · ${gaveUpWords(player, player, "Tete").who}`, "eyebrow, gave up");
      say(`${name} · ${s.moves.length} moves · ${endedWords()}`, "eyebrow, called");
      say(`Ayo & Nchò — ${a === b ? "I drew with" : a > b ? "I beat" : "I lost to"} Mama Ngozi ${a}–${b} in ${s.moves.length} moves.`, "share");
    }
    say(overTitle(s), "two of us title"); say(localShare(s), "two of us share"); say(continueLine(s), "two of us continue");
  }
  assert.ok(seen.size > 200, `only ${seen.size} lines`);
});

test("the record, the rating, the next one up, giving up", () => {
  const entries = [{ w: 4, l: 2, d: 0, best: [30, 18] }, { w: 1, l: 3, d: 1, best: [25, 23] }, { w: 2, l: 2, d: 3, best: null }, { w: 0, l: 1, d: 0, best: null }];
  for (const e of entries) { french(standing(e), "pill"); french(recordLine(e), "record"); french(recordLine(e, true), "record, new best"); }
  // the card puts "new best" in <em>: the text nodes either side carry the separator
  french("you lead 4–2 ·", "record node"); french("· 1 draw", "record node");
  for (const lv of ["easy", "steady", "medium", "hard", "master"]) for (const o of ["win", "loss", "draw"]) for (const c of [18, -12, 0]) {
    const w = cardWords(lv, c, o, "Mama Ngozi"); french(w, "rating"); french(`${w} · 3 of 10 games, it is still finding you`, "rating, settling");
  }
  for (const d of [{ n: 3, r: 1040, change: 18 }, { n: 9, r: 990 }, { n: 12, r: 1210, change: -9 }, { n: 15, r: 1000, change: 0 }]) french(homeLine(d), "home rating");
  const names = { easy: "Adaeze", steady: "Auntie Bisi", medium: "Nnamdi", hard: "Mama Ngozi" };
  for (const lv of ["easy", "steady", "medium"]) french(nextUp(lv, "firstWin", names).text, "next up");
  for (const mine of [0, 1]) { const g = gaveUpWords(mine, 0, "Tete"); for (const k of ["who", "title", "toast", "story"]) french(g[k], "gave up " + k); }
});

test("Mama Ngozi's review: the card line, every step and her lines", () => {
  for (const n of [0, 1, 2, 7]) for (const locked of [false, true]) french(summaryWords(Array(n).fill({}), { locked }), "summary");
  french(summaryWords([], { done: false }), "summary, going"); french(summaryWords([], { done: false, seen: 3, total: 20 }), "summary, counting");
  french(`Mama Ngozi's review: ${summaryWords([{}, {}])}. Step through them on the board`, "aria");
  for (const l of [...OPEN_LINES, CLEAN_LINE, END_LINE]) french(l, "her line");
  french(`“${OPEN_LINES[0]}”`, "her line, quoted"); french(`Mama Ngozi: “${END_LINE}”`, "her last line"); french("Mama Ngozi's move, played through", "hint");
  let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let steps = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 3; g++) {
    let s = newGame(variant); let k = 0;
    while (!s.over && k++ < 24) { const ms = legalMoves(s); s = applyMove(s, ms[Math.floor(rnd() * ms.length)]).state; }
    for (const seat of [0, 1]) for (const e of reviewPlan(s.moves, variant, {}, 0, seat).slice(0, 8)) {
      const it = reviewItem(e, rateMoves(e.before, "hard"), { you: seat }); if (!it) continue;
      french(stepWords(it, 0, 3), "review step"); steps++;
    }
  }
  assert.ok(steps > 5, `only ${steps} steps`);
});

test("the puzzle's result, the lesson's end and the share words", () => {
  for (const [g, t] of [[8, 8], [0, 8], [5, 8], [12, 10]]) { french(resultLabel(g, t), "badge"); french(`${g} of ${t}`, "best"); french(`${g} of ${t} seeds`, "row"); }
  for (const n of [0, 1, 5]) french(runLine(n), "run");
  for (const e of [null, { solved: true }, { shown: true }, { got: 5, target: 8 }]) french(puzzleCard(e), "home card");
  for (const h of [9, 13, 19]) { french(offerWords(h), "offer"); french(`Reminder on · ${String(h).padStart(2, "0")}:00 each day`, "reminder on"); }
  for (const l of ["You captured", "Mama Ngozi's move captures", "the move captures 8", "Learn Nchò · done", "about a minute", "Play Adaeze", "Play Auntie Bisi",
    "One move. Your pits are on the right. Relay sowing counts.", "One move. Your pits are on the right. 2s and 3s behind your last seed count too."]) french(l, "puzzle");
  for (const variant of ["ncho", "ayo"]) {
    const p = dailyPuzzle("2026-11-05", variant); const text = puzzleShare(p, 5);
    const out = lines(text); assert.notEqual(out.split("\n")[0], text.split("\n")[0]); assert.equal(out.split("\n")[1], text.split("\n")[1], "the seed row stays");
    french(text.split("\n")[0], "puzzle share");
  }
  for (const turn of [{ relays: 3, seeds: 8, drops: 20 }, { relays: 1, seeds: 0, drops: 9 }, { relays: 0, seeds: 1, drops: 4 }, { relays: 0, seeds: 0, drops: 1 }, { relays: 0, seeds: 0, drops: 6 }])
    for (const game of ["ncho", "ayo"]) french(clipCaption(turn, "Nnamdi", game), "clip");
});

test("the French reads right", () => {
  assert.equal(fr("You led for good from move 14 · biggest swing: move 7, 12 seeds your way"), "Vous avez mené pour de bon dès le coup 14 · plus grand basculement : coup 7, 12 graines pour vous");
  assert.equal(fr("Nnamdi led from the start · biggest swing: move 3, 4 seeds Nnamdi's way · Tete gave up after move 22"), "Nnamdi a mené dès le début · plus grand basculement : coup 3, 4 graines pour Nnamdi · Tete a abandonné après le coup 22");
  assert.equal(fr("you lead 3–1 · new best win 28–20 · 1 draw"), "vous menez 3–1 · nouvelle meilleure victoire 28–20 · 1 nul");
  assert.equal(fr("+18 for beating Mama Ngozi (1600) · 3 of 10 games, it is still finding you"), "+18 pour votre victoire sur Mama Ngozi (1600) · 3 parties sur 10, le classement se cale encore");
  assert.equal(fr("Ready for Nnamdi? Play him next · Medium"), "Prêt pour Nnamdi ? Jouez contre lui ensuite · Moyen");
  assert.equal(fr("1 of 3 · move 7 · you played your pit 5 (took 4) · your pit 3 was the move · takes 8 · 6 seeds better"),
    "1 sur 3 · coup 7 · vous avez joué votre trou 5 (pris 4) · le bon coup, c’était votre trou 3 · prend 8 · 6 graines de mieux");
  assert.equal(fr("Mama Ngozi: “That is all. Next game, count twice.”"), "Mama Ngozi : « C’est tout. À la prochaine partie, comptez deux fois. »");
  assert.equal(fr("My best turn against Nnamdi at Nchò: 3 relays, 8 seeds captured. Ayo & Nchò — Nigerian Mancala in 3D."),
    "Mon meilleur tour contre Nnamdi au Nchò : 3 relais, 8 graines prises. Ayo & Nchò — le mancala nigérian en 3D.");
  assert.equal(lines("Ayo & Nchò daily · 2026-11-05 · captured 5/8\n●●●●●○○○"), "Ayo & Nchò, l’énigme du jour · 2026-11-05 · pris 5/8\n●●●●●○○○");
  assert.equal(fr("Ayo & Nchò — I beat Tete 27–21 in 40 moves."), "Ayo & Nchò — J’ai battu Tete 27–21 en 40 coups.");
  assert.equal(fr("“A line with no French yet.”"), "“A line with no French yet.”", "a line with no French stays English, whole");
});

test("game.js sends the shared words through the page's language", () => {
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /let text = tLines\(local \? localShare/);
  assert.match(game, /text \+= .\\n. \+ tLines\(watchLink\(\)\)/); // the watch link's words too (web/watch.js)
  assert.match(game, /const text = tLines\(shareText\(p, puzzle\.got\) \+ .\\n. \+ weekShare\(/); // the week line (web/week.js) rides in the same tLines
  assert.match(game, /const caption = tLines\(clipCaption\(/);
});
