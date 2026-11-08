// Every screen as a screen reader sees it (idea 8 Nov): the page's landmarks and the layering that tools/a11y.py checks in a browser,
// held here so a change to index.html cannot quietly undo them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const game = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
const css = (sel) => [...html.matchAll(new RegExp('(?:^|[}\\s])' + sel.replace(/[.#]/g, '\\$&') + '\\{([^}]*)\\}', 'g'))].map((m) => m[1]).join(';');
const z = (sel) => { const m = css(sel).match(/z-index:(\d+)/g); return m ? +m.pop().split(':')[1] : 0; };

test('one main landmark holds every screen and card, and lays nothing out', () => {
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  const open = html.indexOf('<main id="game">'), close = html.indexOf('</main>');
  for (const id of ['c', 'pits', 'home', 'rooms', 'puzzle', 'store', 'settings', 'gameover', 'nameCard', 'knockCard', 'backCard', 'callCard', 'rules']) {
    const at = html.indexOf(`id="${id}"`); assert.ok(at > open && at < close, id + ' sits inside <main>');
  }
  assert.match(css('main#game'), /display:contents/);
});

test('one title for the page, read but not shown', () => {
  const h1 = html.match(/<h1\b[^>]*>/g) || [];
  assert.equal(h1.length, 1); assert.match(h1[0], /class="sr"/);
  assert.match(css('.sr'), /position:absolute/); assert.match(css('.sr'), /clip/);
});

test('what the game adds to the page goes inside the landmark', () => {
  assert.match(game, /const stage = document\.getElementById\("game"\)/);
  assert.doesNotMatch(game, /function toast[^\n]*body\.appendChild/);
  assert.match(game, /stage\.appendChild\(glEl\)/);
});

test('a label on a plain span carries a role', () => {
  for (const m of html.matchAll(/<span\b[^>]*aria-label=[^>]*>/g)) assert.match(m[0], /role="/, m[0]);
});

test('a card sits above the chips under the board, the bubble above the card', () => {
  assert.ok(z('.card') >= z('#words'), 'card over #words');
  assert.ok(html.indexOf('id="words"') < html.indexOf('id="rules"'), 'equal layers: the card comes later, so it is on top');
  assert.ok(z('#bubble') > z('.card') && z('#myBubble') > z('.card'), 'the bubble stays over the card');
  assert.ok(z('.toast') > z('.card'), 'a toast shows over a card');
});
