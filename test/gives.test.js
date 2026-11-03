// Whose 4 is it: the path splits its captures by who gets the seeds (web/path.js takes / gives), the capture hand's number
// is pale when it carries seeds to the other side (web/handcount.js haulKind), all read from the engine's own events.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, applyMove, legalMoves, owner } from '../engine/ayo.js';
import { sowPath, giftNoteWords } from '../web/path.js';
import { haulKind } from '../web/handcount.js';

function* positions(variant, games, seed0) {
  let seed = seed0; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let g = 0; g < games; g++) {
    let s = newGame(variant);
    while (!s.over && s.moves.length < 300) { yield s; const l = legalMoves(s); s = applyMove(s, l[Math.floor(rnd() * l.length)]).state; }
  }
}

for (const variant of ['ncho', 'ayo']) {
  test(`${variant}: takes and gives split the captures by who gets the seeds, over random games`, () => {
    let gifts = 0, takes = 0, checked = 0;
    for (const s of positions(variant, 60, variant === 'ncho' ? 7 : 11)) {
      for (const m of legalMoves(s)) {
        const p = sowPath(s, m); const { events } = applyMove(s, m); const me = s.turn; checked++;
        assert.deepEqual([...p.takes, ...p.gives].sort((a, b) => a - b), [...p.captures].sort((a, b) => a - b), 'every captured pit goes one way');
        assert.ok(p.takes.every((k) => !p.gives.includes(k)), 'never both');
        // whoever got a pit last is who the ring names
        const lastBy = new Map(); for (const e of events) if (e.type === 'capture') for (const k of e.pits) lastBy.set(k, e.by);
        for (const k of p.takes) assert.equal(lastBy.get(k), me);
        for (const k of p.gives) assert.equal(lastBy.get(k), 1 - me);
        // a gift that is not the last-8 sweep is a 4 on the other side's ground (Nchò: it goes to its owner)
        for (const e of events) if (e.type === 'capture' && e.by !== me && !e.last8) { assert.equal(e.n, 4); for (const k of e.pits) assert.equal(owner(k), 1 - me); }
        // the pale hand: exactly the captures going to the other side
        for (const e of events) if (e.type === 'capture') assert.equal(haulKind(events, e), e.by === me ? 'mine' : 'gift');
        if (p.gives.length) gifts++; if (p.takes.length) takes++;
      }
    }
    assert.ok(checked > 1000, `checked ${checked}`);
    if (variant === 'ncho') assert.ok(gifts > 50 && takes > 50, `gifts ${gifts}, takes ${takes}`);
    else assert.equal(gifts, 0, 'Ayo never hands a capture to the other side');
  });
}

test('the words: Nchò says why, Ayo says only whose', () => {
  assert.match(giftNoteWords({ capture: 4 }), /makes 4 before your last seed is theirs/);
  assert.match(giftNoteWords({ capture: 23 }), /^A pale ring: those seeds go to their trough, not yours\.$/);
  assert.equal(haulKind([], { by: 0 }), 'mine');
});
