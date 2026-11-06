// French (Launch L18, slice 2): every line the board builds as it plays is French, over random games of both kinds —
// the hint line (where the seeds go, what it leaves open, the hint, feed them, the keys), their move explained, her take,
// last 8, circling, the count by touch, the mouse, undo, hurry, who starts, the lesson and the pits' labels.
import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../web/i18n.js";
import { newGame, applyMove, legalMoves, sideOf } from "../engine/ayo.js";
import { sowPath, pathWords, playedWords, pickedHint, hintedHint, answerOf, answerWords, giftNoteWords } from "../web/path.js";
import { takeWords } from "../web/coach.js";
import { narrowOf, feedWords, onlyLead } from "../web/feed.js";
import { hoverAt } from "../web/hover.js";
import { countWords } from "../web/count.js";
import { last8Words, crossedWords, inLast8 } from "../web/last8.js";
import { circling, circlingRest, circlingWords, calledWords, endedWords, beganWords } from "../web/circling.js";
import { hintText, pitLabel } from "../web/keys.js";
import { hurryWords } from "../web/hurry.js";
import { undoWords } from "../web/takeback.js";
import { startWords } from "../web/starts.js";
import * as lesson from "../web/lesson.js";

const fr = (s) => translate(s, "fr");
// English words that must never be left in a French line (names and Nchò / Ayo aside)
const ENGLISH = /\b(pit|pits|seeds?|takes?|took|gives?|gave|ends?|ended|picks?|picked|again|their|they|them|your|you|tap|click|press|sow|the|and|or|move|moves|only|would|wins?|left|empty|reaches|capture|level|better|play)\b/i;
function french(line, what) {
  if (!line) return;
  const f = fr(line);
  assert.notEqual(f, line, `${what}: no French for «${line}»`);
  assert.ok(!ENGLISH.test(f.replace(/Mama Ngozi|Nnamdi|Adaeze|Auntie Bisi|Papa Ike|Nchò|Ayo/g, "")), `${what}: English left in «${f}» (from «${line}»)`);
  assert.ok(!/ [:;?!]/.test(f), `${what}: a thin space before : ; ? ! in «${f}»`);
}

test("every line the board says as it plays is French, over random games of both kinds and from either seat", () => {
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let lines = 0; const seen = new Set();
  const say = (l, what) => { if (!l || seen.has(l)) return; seen.add(l); french(l, what); lines++; };
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 40; g++) {
    let s = newGame(variant);
    while (!s.over) {
      const you = s.turn, moves = legalMoves(s);
      for (const keys of [false, true]) {
        say(hintText("pick", { keys }), "hint"); say(hintText("puzzle", { keys }), "puzzle");
        say(hintText("picked", { keys, key: "3", seeds: s.pits[moves[0]] }), "picked");
      }
      const n = narrowOf(s, you); say(feedWords(n, { you }), "feed"); say(onlyLead(n, { you }), "only");
      for (const m of moves) {
        const p = sowPath(s, m), a = answerOf(s, m); const key = String(sideOf(you).indexOf(m) + 1);
        say(pathWords(p, { you }), "path"); say(answerWords(a), "answer");
        for (const keys of [false, true]) {
          const line = pickedHint(p, { you, keys, key, seeds: s.pits[m], answer: a });
          say(line, "picked hint"); say(hintedHint(line, "Mama Ngozi", { keys, key }), "hint that teaches");
          if (n && n.only === m) say(`${onlyLead(n, { you })} · ${line}`, "the only move");
        }
        say(playedWords(p, { you: 1 - you }), "their move"); say(playedWords(p, { you }), "your move, from your seat");
        say(`Nnamdi's move: ${playedWords(p, { you: 1 - you })}. Watch it again, slowly`, "chip label");
        for (const kind of ["better", "win", "save"]) say(takeWords({ pit: m, kind, gap: 1 + (m % 7) }, p, { you }), "her take");
      }
      for (let pit = 0; pit < 12; pit++) {
        say(countWords({ state: s, pit, you }), "count");
        say(hoverAt({ state: s, pit, you, press: true }).words, "mouse");
        say(pitLabel(pit, s.pits[pit], { you, selected: moves[0], legal: moves }), "label");
      }
      if (inLast8(s)) { say(last8Words(s), "last 8"); say(crossedWords(s), "last 8 toast"); }
      const c = circling(s); if (c) { say(circlingRest(c, { you }), "circling"); say(circlingRest(c, { you, me: "Player 2" }), "circling, two of us"); say(beganWords(c), "circling toast"); }
      const m = moves[Math.floor(rnd() * moves.length)];
      s = applyMove(s, m).state;
    }
  }
  assert.ok(lines > 400, `only ${lines} lines`);
});

test("the fixed lines: undo, hurry, the called game, who starts, the lesson, the pale ring", () => {
  for (const l of [calledWords(), endedWords(), giftNoteWords({ capture: 4 }), giftNoteWords({ capture: 2 }),
    undoWords({ name: "Mama Ngozi" }), undoWords({ gone: 1 }), undoWords({ local: true, mover: "Player 2" }),
    hurryWords(""), hurryWords("", { keys: true }), hurryWords("", { on: true }), hurryWords("ends in their pit 3 · takes 4"),
    "Nnamdi's move again, slowly", "Mama Ngozi's move, slowly", "Mama Ngozi's take: your pit 3 was the move · 6 seeds better. Play it through, slowly",
    startWords({ first: 1, why: "lost" }, ["You", "Nnamdi"]), startWords({ first: 0, why: "draw" }, ["You", "Nnamdi"]), startWords({ first: 0, why: "pref" }, ["You", "Nnamdi"]),
    `${startWords({ first: 1, why: "lost" }, ["Player 1", "Player 2"], false)} · pass the phone after each move`,
    lesson.SKIP, lesson.wrongPit, lesson.DONE.title, lesson.DONE.words("Adaeze"), lesson.replyWords("Adaeze"), "Finish",
    ...lesson.STEPS.flatMap((st, k) => [st.title, st.ask, st.after, lesson.eyebrow(k)]), ...lesson.AYO_STEPS.flatMap((st, k) => [st.title, st.ask, st.after, lesson.eyebrow(k, "ayo")]),
    lesson.doneEyebrow("ayo"), lesson.DONE_LINE.ayo, lesson.DONE_LINE.ncho, lesson.ROW_LINE.ayo, lesson.ROW_LINE.ncho, "game over", "passing the phone…", "Her take",
  ]) french(l, "fixed");
});

test("the French reads right", () => {
  assert.equal(fr("picks up again ×2 · ends in their pit 3 · takes 4 · then they can take 12 — tap again to sow"),
    "reprend ×2 · finit dans le trou 3 d’en face · prend 4 · puis l’autre peut prendre 12 — touchez encore pour semer");
  assert.equal(fr("They have no seeds — you must feed them: pits 2 or 5"), "L’autre côté n’a plus de graines — vous devez nourrir l’autre côté : trous 2 ou 5");
  assert.equal(fr("pits 1 and 3 would leave them nothing — play pit 5"), "Les trous 1 et 3 ne laisseraient rien à l’autre côté — jouez le trou 5");
  assert.equal(fr("Mama Ngozi would play pit 2 · ends in your pit 6 — Enter to sow"), "Mama Ngozi jouerait le trou 2 · finit dans votre trou 6 — Entrée pour semer");
  assert.equal(fr("your pit 3 was the move · takes 8 · 6 seeds better"), "le bon coup, c’était votre trou 3 · prend 8 · 6 graines de mieux");
  assert.equal(fr("Your pit 3 (key 3) · 5 seeds · picked — Enter to sow"), "Votre trou 3 (touche 3) · 5 graines · choisi — Entrée pour semer");
  assert.equal(fr("Taking back your move and Mama Ngozi's reply"), "On reprend votre coup et la réponse de Mama Ngozi");
  assert.equal(fr("Taking back Player 2's move"), "On reprend le coup de Joueur 2");
  assert.equal(fr("each keeps their side: you'd lose 20–28"), "chacun garde son côté : vous perdriez 20–28");
  assert.equal(fr("ends in their pit 1 · no capture in 60 moves — each keeps their side · ends the game — tap again to sow"),
    "finit dans le trou 1 d’en face · aucune prise en 60 coups — chacun garde son côté · finit la partie — touchez encore pour semer");
  assert.equal(fr("pit 2 doesn't reach them — they have no seeds: play pit 6"), "Le trou 2 n’atteint pas l’autre côté — l’autre côté n’a plus de graines\u00a0: jouez le trou 6");
  assert.equal(fr("pit 1 is empty"), "Le trou 1 est vide");
  assert.equal(fr("their pit 4 is empty"), "Le trou 4 d’en face est vide");
  assert.equal(fr("the last 6 went to them"), "les 6 dernières sont revenues à l’autre");
  assert.equal(fr("Nnamdi starts — the loser goes first"), "Nnamdi commence — le perdant joue en premier");
  assert.equal(fr("ends in their pit 3 · a part with no French — tap again to sow"), "ends in their pit 3 · a part with no French — tap again to sow", "never half French");
});
