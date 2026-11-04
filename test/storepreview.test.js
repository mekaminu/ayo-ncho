// The store's preview video (Launch L15, slice 3): the three videos made by tools/store-preview.py are there and are what
// App Store Connect takes for an app preview — 15 to 30 seconds, at most 30 fps, H.264 High at level 4.0 or lower, stereo AAC
// at 44.1 or 48 kHz with every track enabled, at the exact accepted size — read from the MP4's own boxes (no ffprobe needed);
// the move the video plays is one that shows the game off, and the captions are short, the listing's, and claim nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { newGame, applyMove, replay } from '../engine/ayo.js';
import { showsOff } from '../tools/previewpos.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs/launch/store/preview');
const L = JSON.parse(readFileSync(join(ROOT, 'docs/launch/store/listing.json'), 'utf8'));
const VIDEOS = { 'ios-6.9-preview.mp4': [886, 1920], 'ios-13-preview.mp4': [1600, 1200], 'play-youtube.mp4': [1920, 1080] };

// Walk an MP4's boxes: the movie's length, and for each track its kind, enabled flag, size, codec and the codec's settings.
export function mp4Info(buf) {
  const info = { tracks: [], faststart: false };
  const kids = (s, e, f) => { let i = s; while (i + 8 <= e) { let size = buf.readUInt32BE(i); const type = buf.toString('latin1', i + 4, i + 8); let h = 8; if (size === 1) { size = Number(buf.readBigUInt64BE(i + 8)); h = 16; } else if (size === 0) size = e - i; f(type, i + h, i + size); i += size; } };
  let sawMdat = false;
  kids(0, buf.length, (type, s, e) => {
    if (type === 'mdat') sawMdat = true;
    if (type === 'moov') {
      info.faststart = !sawMdat;
      kids(s, e, (t, s2, e2) => {
        if (t === 'mvhd') { const v = buf[s2]; const scale = buf.readUInt32BE(s2 + (v ? 20 : 12)); const dur = v ? Number(buf.readBigUInt64BE(s2 + 24)) : buf.readUInt32BE(s2 + 16); info.seconds = dur / scale; }
        if (t !== 'trak') return;
        const tr = {}; info.tracks.push(tr);
        kids(s2, e2, (t3, s3, e3) => {
          if (t3 === 'tkhd') { tr.enabled = !!(buf.readUInt32BE(s3) & 1); tr.width = buf.readUInt32BE(e3 - 8) / 65536; tr.height = buf.readUInt32BE(e3 - 4) / 65536; }
          if (t3 !== 'mdia') return;
          kids(s3, e3, (t4, s4, e4) => {
            if (t4 === 'mdhd') { const v = buf[s4]; tr.scale = buf.readUInt32BE(s4 + (v ? 20 : 12)); tr.duration = v ? Number(buf.readBigUInt64BE(s4 + 24)) : buf.readUInt32BE(s4 + 16); }
            if (t4 === 'hdlr') tr.kind = buf.toString('latin1', s4 + 8, s4 + 12);
            if (t4 !== 'minf') return;
            kids(s4, e4, (t5, s5, e5) => { if (t5 !== 'stbl') return; kids(s5, e5, (t6, s6, e6) => {
              if (t6 === 'stts') { let n = 0; const c = buf.readUInt32BE(s6 + 4); for (let k = 0; k < c; k++) n += buf.readUInt32BE(s6 + 8 + k * 8); tr.samples = n; }
              if (t6 !== 'stsd') return;
              const es = s6 + 8; tr.codec = buf.toString('latin1', es + 4, es + 8);
              if (tr.codec === 'avc1') { // VisualSampleEntry is 78 bytes after the box header, then avcC
                tr.codedW = buf.readUInt16BE(es + 8 + 24); tr.codedH = buf.readUInt16BE(es + 8 + 26);
                kids(es + 8 + 78, es + buf.readUInt32BE(es), (t7, s7) => { if (t7 === 'avcC') { tr.profile = buf[s7 + 1]; tr.level = buf[s7 + 3]; } });
              }
              if (tr.codec === 'mp4a') { tr.channels = buf.readUInt16BE(es + 8 + 16); tr.rate = buf.readUInt32BE(es + 8 + 24) / 65536; }
            }); });
          });
        });
      });
    }
  });
  return info;
}

test('the move the video plays shows the game off: relays, captures for you, nothing handed over', () => {
  const pos = JSON.parse(execFileSync('node', [join(ROOT, 'tools/previewpos.js'), '7']).toString());
  const s = replay(pos.moves, 'ncho');
  assert.equal(s.turn, 0, 'your move');
  const r = showsOff(s, pos.pit);
  assert.ok(r && r.relays >= 2 && r.takes >= 8, JSON.stringify(r));
  const { state } = applyMove(s, pos.pit); assert.equal(state.over, false);
  assert.equal(showsOff(newGame('ncho'), 0), null, 'an opening move is not that move');
});

test('the captions: five, short, from the listing, no prices or claims the stores refuse', () => {
  const caps = L.preview.captions;
  assert.equal(caps.length, 5);
  for (const c of caps) {
    assert.ok(c.length <= 30, c);
    assert.doesNotMatch(c, /£|\$|€|free|best|#1|number one|top|Android|iPhone|iOS|Google|Apple/i, c);
  }
  assert.equal(caps[4], 'Ayo & Nchò · Nigerian Mancala', 'it ends on the name');
  const tool = readFileSync(join(ROOT, 'tools/store-preview.py'), 'utf8');
  for (const k of [0, 1, 2, 3, 4]) assert.ok(tool.includes(`CAPS[${k}]`), `the tool shows caption ${k + 1}`);
});

test('every video is there and is what App Store Connect takes for an app preview', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.mp4')).sort();
  assert.deepEqual(files, Object.keys(VIDEOS).sort());
  for (const [f, [w, h]] of Object.entries(VIDEOS)) {
    const buf = readFileSync(join(DIR, f)); const m = mp4Info(buf);
    assert.ok(statSync(join(DIR, f)).size < 60 * 1024 * 1024, `${f}: kept small for the repo (Apple's limit is 500 MB)`);
    assert.ok(m.faststart, `${f}: the index first, so it streams`);
    assert.ok(m.seconds >= 15 && m.seconds <= 30, `${f}: ${m.seconds} s`);
    const v = m.tracks.find((t) => t.kind === 'vide'), a = m.tracks.find((t) => t.kind === 'soun');
    assert.ok(v && a, `${f}: a picture and a sound track`); assert.equal(m.tracks.length, 2);
    for (const t of m.tracks) assert.ok(t.enabled, `${f}: every track enabled`);
    assert.equal(v.codec, 'avc1'); assert.equal(v.profile, 100, `${f}: H.264 High`); assert.ok(v.level <= 40, `${f}: level ${v.level}`);
    assert.deepEqual([v.width, v.height, v.codedW, v.codedH], [w, h, w, h], `${f}: exactly ${w} × ${h}`);
    const fps = v.samples / (v.duration / v.scale); assert.ok(fps > 29.9 && fps <= 30.01, `${f}: ${fps} fps`);
    assert.equal(a.codec, 'mp4a'); assert.equal(a.channels, 2, `${f}: stereo`); assert.ok([44100, 48000].includes(a.rate), `${f}: ${a.rate} Hz`);
    assert.ok(Math.abs(a.duration / a.scale - v.duration / v.scale) < 0.25, `${f}: the sound runs the length of the picture`);
  }
});

test('a poster for each video and the README says where each goes', () => {
  const files = readdirSync(DIR);
  for (const f of Object.keys(VIDEOS)) assert.ok(files.includes(f.replace('.mp4', '-poster.jpg')), f);
  const md = readFileSync(join(DIR, 'README.md'), 'utf8');
  for (const f of Object.keys(VIDEOS)) assert.ok(md.includes(f), f);
  assert.match(md, /iPhone 6\.9/); assert.match(md, /iPad 13/); assert.match(md, /YouTube/);
  for (const c of L.preview.captions) assert.ok(md.includes(c), c);
});
