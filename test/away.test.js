import { test } from "node:test";
import assert from "node:assert/strict";
import { awayWords, awayTitle, dotIcon, svgUrl, isAway, makeAway, BASE } from "../web/away.js";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512"/></svg>';

function page({ hidden = false, focus = true } = {}) {
  const link = { attrs: { rel: "icon", href: "./icon.svg" }, getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; } };
  const doc = { hidden, title: BASE, hasFocus: () => focus, querySelector: (q) => (q === 'link[rel="icon"]' ? link : null) };
  const badges = [];
  const nav = { setAppBadge: (n) => { badges.push(n); return Promise.resolve(); }, clearAppBadge: () => { badges.push(0); return Promise.resolve(); } };
  return { doc, nav, link, badges };
}

test("the words for each thing a friend can do while you are away", () => {
  assert.equal(awayWords("move", { name: "Tete", mine: true }), "Your move · Tete played");
  assert.equal(awayWords("move", { name: "Tete", mine: false }), "Tete played"); // a relay that leaves it their move again
  assert.equal(awayWords("knock", { name: "Tete" }), "Tete is at the door");
  assert.equal(awayWords("joined", { name: "Tete", mine: true }), "Tete joined · your move");
  assert.equal(awayWords("joined", { name: "Tete" }), "Tete joined");
  assert.equal(awayWords("rematch", { name: "Tete" }), "Tete wants to play again");
  assert.equal(awayWords("over", { name: "Tete", result: "won", score: [27, 21] }), "You won 27–21");
  assert.equal(awayWords("over", { name: "Tete", result: "lost", score: [21, 27] }), "Tete won 27–21"); // their score first when they won
  assert.equal(awayWords("over", { name: "Tete", result: "draw", score: [24, 24] }), "A draw 24–24");
  assert.equal(awayWords("shout", { name: "Tete", text: "Oya, your move!" }), "Tete: Oya, your move!");
  assert.equal(awayWords("move", {}), "Your move · Your friend played"); // no name yet
  assert.equal(awayWords("nonsense", { name: "Tete" }), "");
});

test("the title: latest first, a count once more than one thing happened, the game's name last", () => {
  assert.equal(awayTitle("Tete is at the door", 1), "Tete is at the door — Ayo & Nchò");
  assert.equal(awayTitle("Your move · Tete played", 3), "(3) Your move · Tete played — Ayo & Nchò");
  assert.equal(awayTitle("", 2), BASE);
});

test("the dotted icon is the game's icon with a brass dot on top", () => {
  const d = dotIcon(SVG);
  assert.ok(d.startsWith(SVG.slice(0, -6)) && d.endsWith("</svg>"));
  assert.ok(d.includes("#e6b76f") && d.indexOf("<circle") > d.indexOf("<rect"), "the dot is drawn over the icon");
  assert.ok(svgUrl(d).startsWith("data:image/svg+xml,") && decodeURIComponent(svgUrl(d).slice(19)) === d);
  assert.equal(dotIcon("not svg"), "not svg");
});

test("away means hidden, or a computer window that is not in front", () => {
  assert.equal(isAway({ hidden: true, hasFocus: () => true }), true);
  assert.equal(isAway({ hidden: false, visibilityState: "hidden" }), true);
  assert.equal(isAway({ hidden: false, hasFocus: () => false }), true);
  assert.equal(isAway({ hidden: false, hasFocus: () => true }), false);
  assert.equal(isAway({ hidden: false }), false);
  assert.equal(isAway(null), false);
});

test("at the board nothing is said; away it is said, counted, dotted and badged; coming back clears it all", () => {
  const p = page(); const chimes = [];
  const a = makeAway({ doc: p.doc, nav: p.nav, icon: () => SVG, chime: (k) => chimes.push(k) });
  assert.equal(a.note("move", { name: "Tete", mine: true }), false, "nothing while you are looking");
  assert.equal(p.doc.title, BASE); assert.deepEqual(p.badges, []); assert.equal(a.back(), false);

  p.doc.hidden = true;
  assert.equal(a.note("knock", { name: "Tete" }), true);
  assert.equal(p.doc.title, "Tete is at the door — Ayo & Nchò");
  assert.ok(p.link.attrs.href.startsWith("data:image/svg+xml,"), "the tab's icon gets its dot");
  assert.deepEqual(chimes, [], "the door makes its own knock");
  a.note("joined", { name: "Tete" }); a.note("move", { name: "Tete", mine: true });
  assert.equal(p.doc.title, "(3) Your move · Tete played — Ayo & Nchò");
  assert.deepEqual(p.badges, [1, 2, 3]); assert.deepEqual(chimes, ["joined", "move"]);
  assert.equal(a.count, 3);

  p.doc.hidden = false;
  assert.equal(a.back(), true);
  assert.equal(p.doc.title, BASE); assert.equal(p.link.attrs.href, "./icon.svg"); assert.equal(p.badges.at(-1), 0); assert.equal(a.count, 0);
  assert.equal(a.back(), false, "a second back does nothing");
});

test("a browser with no badges, no icon link and no focus check still gets the title", () => {
  const doc = { hidden: true, title: BASE, querySelector: () => null };
  const a = makeAway({ doc, nav: {}, icon: SVG });
  assert.equal(a.note("over", { name: "Tete", result: "won", score: [25, 23] }), true);
  assert.equal(doc.title, "You won 25–23 — Ayo & Nchò");
  doc.hidden = false; a.back(); assert.equal(doc.title, BASE);
  const b = makeAway({ doc: { hidden: true, title: BASE, querySelector: () => null }, nav: { setAppBadge: () => { throw new Error("no"); } } });
  assert.equal(b.note("move", { name: "Tete", mine: true }), true, "a badge that throws never stops the title");
});
