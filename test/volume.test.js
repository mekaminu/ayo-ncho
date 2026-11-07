// Sound level (web/volume.js): Settings → Feel → Sound level moves the board's sounds and the music together, live.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEVELS, GAIN, MUSIC_CAP, levelPref, levelGain, boardGain, musicGain, levelNote, levelToast } from "../web/volume.js";
import { boardAudio } from "../web/sound.js";
import { makeMusic } from "../web/music.js";
import { translate } from "../web/i18n.js";

const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const html = read("../web/index.html"), game = read("../web/game.js"), sw = read("../web/sw.js");

// a stand-in for Web Audio: a clock moved by hand, gains that remember every ramp asked of them
function fakeCtx() {
  const param = (v) => ({ value: v, events: [], cancelScheduledValues() {}, setValueAtTime(x) { this.value = x; }, linearRampToValueAtTime(x, t) { this.events.push([x, t]); this.value = x; } });
  const node = (extra = {}) => ({ connect() {}, ...extra });
  const a = { sampleRate: 8000, currentTime: 0, destination: node(), gains: [], started: [] };
  a.createBuffer = (ch, n, rate) => { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { length: n, duration: n / rate, getChannelData: (i) => d[i] }; };
  a.createGain = () => { const g = node({ gain: param(1) }); a.gains.push(g); return g; };
  a.createDynamicsCompressor = () => node({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} });
  a.createConvolver = () => node({ buffer: null });
  a.createStereoPanner = () => node({ pan: param(0) });
  a.createBiquadFilter = () => node({ frequency: param(0), Q: param(0) });
  a.createBufferSource = () => { const s = node({ buffer: { duration: 0.1 }, playbackRate: param(1), start(t) { s.t = t; a.started.push(s); }, stop() {} }); return s; };
  return a;
}

test("three levels, Normal by default; Normal is exactly the sound as it always was", () => {
  assert.deepEqual(LEVELS, ["quiet", "normal", "loud"]);
  assert.equal(levelPref("shout"), "normal"); assert.equal(levelPref(undefined), "normal"); assert.equal(levelPref("loud"), "loud");
  assert.equal(boardGain("normal"), 0.75); assert.equal(musicGain("normal"), 0.2);
  assert.ok(GAIN.quiet < 1 && GAIN.loud > 1, "quiet is quieter, loud louder");
  assert.ok(boardGain("quiet") < boardGain("normal") && boardGain("normal") < boardGain("loud"));
  assert.ok(musicGain("quiet") < musicGain("normal") && musicGain("normal") < musicGain("loud"));
  assert.ok(musicGain("loud") <= MUSIC_CAP && musicGain("loud", 1) === MUSIC_CAP, "the music never climbs over the board's sounds");
  assert.equal(levelGain("loud"), GAIN.loud);
});

test("the board's audio starts at the level it is given and moves to a new one smoothly, never in a jump", () => {
  const a = fakeCtx();
  const au = boardAudio(a, "jobs", boardGain("quiet"));
  const bus = a.gains[0]; assert.equal(bus.gain.value, boardGain("quiet")); assert.equal(au.level, boardGain("quiet"));
  a.currentTime = 2; au.setLevel(boardGain("loud"));
  assert.equal(au.level, boardGain("loud"));
  const [v, t] = bus.gain.events.at(-1); assert.equal(v, boardGain("loud")); assert.ok(t > 2 && t <= 2.1, "eased over a few frames");
  assert.equal(au.setLevel(99), 2, "and never past twice as loud"); assert.equal(au.setLevel(-1), 0);
  assert.equal(boardAudio(fakeCtx()).level, 0.75, "with no level given it is the board's own 0.75 (the clip and the store video)");
});

test("the music follows the level: from the start, and live while it plays", () => {
  const a = fakeCtx(); const timer = { set: () => 1, clear() {} };
  const m = makeMusic(a, { seed: 3, timer, level: musicGain("quiet") });
  const master = a.gains[0];
  m.start(); assert.equal(master.gain.events.at(-1)[0], musicGain("quiet"), "it fades in to the quiet level");
  a.currentTime = 5; m.setLevel(musicGain("loud")); assert.equal(m.level(), musicGain("loud"));
  assert.equal(master.gain.events.at(-1)[0], musicGain("loud"), "heard at once while it plays");
  m.stop(); const n = master.gain.events.length; m.setLevel(musicGain("normal"));
  assert.equal(master.gain.events.length, n, "stopped, nothing is heard"); m.start();
  assert.equal(master.gain.events.at(-1)[0], musicGain("normal"), "and it starts again at the level chosen meanwhile");
});

test("the row's words, in English and French", () => {
  assert.match(levelNote("quiet"), /soft/); assert.match(levelNote("loud"), /louder/); assert.match(levelNote("normal"), /as made/);
  assert.match(levelNote("loud", false), /the sound is off/, "with the speaker off it says why nothing is heard");
  for (const p of LEVELS) {
    for (const s of [levelNote(p), levelNote(p, false), levelToast(p)]) { const fr = translate(s, "fr"); assert.notEqual(fr, s, s); assert.doesNotMatch(fr, /knocks|music|made|Quiet|Loud/); }
  }
  for (const w of ["Sound level", "Quiet", "Loud"]) assert.notEqual(translate(w, "fr"), w);
});

test("Settings carries the row under Sound, and the game wires it through", () => {
  const row = /<div class="row" id="volumeRow">[\s\S]*?<\/div><\/div>/.exec(html); assert.ok(row, "the row is there");
  for (const v of LEVELS) assert.ok(row[0].includes(`data-v="${v}"`), v);
  assert.ok(html.indexOf('data-set="sound"') < html.indexOf('id="volumeRow"') && html.indexOf('id="volumeRow"') < html.indexOf('data-set="music"'), "between Sound and Music");
  assert.match(sw, /'\.\/volume\.js'/, "kept for offline play");
  assert.match(game, /boardAudio\([^;]*boardGain\(volumeNow\(\)\)\)/, "the board's audio is made at the level");
  assert.match(game, /makeMusic\(sound\(\)\.ctx, \{ level: musicGain\(volumeNow\(\)\) \}\)/, "and the music");
  assert.match(game, /name === 'volume'[^\n]*volumeApply\(\)/, "a choice is heard at once");
});
