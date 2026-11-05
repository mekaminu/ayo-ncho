"""The store's preview video (Launch L15, slice 3): about 23 seconds of the real game on the real board, made the way the game's
own clip is (the board drawn by board.js, every seed moved by the engine's events), with the board's own sounds as its track.

    python3 tools/store-preview.py                  both recordings, then the three videos (about 40 minutes in SwiftShader)
    python3 tools/store-preview.py --only=phone     just one recording (phone | ipad), then the videos
    python3 tools/store-preview.py --encode         the videos again from the frames already recorded
    python3 tools/store-preview.py --lang=fr        the same video with the game in French (?lang=fr, as Settings → Language →
                                                    Français), under listing-fr.json's captions, into docs/launch/store/preview-fr/
                                                    (frames in docs/launch/store/src-fr/, kept out of git) — idea 5 Nov, from L18

What it plays (docs/launch/store/listing.json "preview" holds the captions): a game against Nnamdi a few moves in
(tools/previewpos.js finds it), your move. A tap on the pit lands its path marks (where every seed will go, the captures);
a second tap sows it — two relays, two captures, the hand counting down — then Nnamdi answers and his move is explained
under the board, and a tap on his words plays it again, slowly;
Hint picks Mama Ngozi's pit with its path and one more tap sows it; the name holds to the end. (Mama Ngozi's take is off for the video.) One caption at a time sits over the board, fading in and out.

Always the full board (?lite=0: the software renderer would otherwise pass for a slow phone). How: headless Chromium with its clock stopped (Playwright's clock): each frame the page's timers move on exactly 1/30 s,
the page draws once (requestAnimationFrame is held to one call a frame), every CSS animation is pinned to the same clock,
and the frame is captured — so the video plays at the game's real pace however slowly the software renderer draws it.
Every sound the board makes is kept with its moment (window.__soundLog, web/game.js) and played again through the same
web/sound.js into an OfflineAudioContext, so the track is the board's own knocks, stereo, in time with the seeds.

The videos, in docs/launch/store/preview/ (H.264 High ≤ level 4.0, 30 fps, AAC 256 kb/s stereo 48 kHz, progressive, MP4):
    ios-6.9-preview.mp4    886 × 1920   App Store Connect → iPhone 6.9" Display → App Previews (the 6.5" uses it scaled)
    ios-13-preview.mp4    1600 × 1200   App Store Connect → iPad 13" Display → App Previews
    play-youtube.mp4      1920 × 1080   Google Play takes a YouTube link: upload this to YouTube (public or unlisted,
                                        ads off) and paste the link in Play Console → Main store listing → Video
Apple: 15–30 seconds, at most 30 fps, at most 500 MB; the poster frame is the one at 5 seconds unless one is chosen.
"""
import sys, os, json, base64, subprocess, shutil, http.server, threading, functools
from playwright.sync_api import sync_playwright

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LANG = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--lang=")), "en"); assert LANG in ("en", "fr"), LANG
FR = LANG == "fr"; sfx = "-fr" if FR else ""
store = os.path.join(root, "docs", "launch", "store"); srcd = os.path.join(store, "src" + sfx); outd = os.path.join(store, "preview" + sfx)
listing = json.load(open(os.path.join(store, "listing-fr.json" if FR else "listing.json"))); CAPS = listing["preview"]["captions"]
FPS = 30; RATE = 48000; MIN_S, MAX_S = 15.0, 29.5
# name: the page's size in CSS pixels and its density (the frame is exactly the store's size)
RECORDINGS = {"phone": (443, 960, 2), "ipad": (800, 600, 2)}
# where the caption sits and its size: on the phone across the top of the board; on the iPad in the open wood left of the board
PLACE = {"phone": ("left:0;right:0;top:10.5vh", "25px"), "ipad": ("left:2.5vw;width:36vw;top:40vh", "25px")}
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
FONTS = [("Fraunces", 600, "fraunces", "fraunces-latin-600-normal.woff2"), ("Fraunces", 700, "fraunces", "fraunces-latin-700-normal.woff2"),
         ("Inter", 400, "inter", "inter-latin-400-normal.woff2"), ("Inter", 500, "inter", "inter-latin-500-normal.woff2"), ("Inter", 600, "inter", "inter-latin-600-normal.woff2")]
FONT_CSS = "\n".join(f"@font-face{{font-family:'{f}';font-style:normal;font-weight:{w};font-display:block;src:url(/node_modules/@fontsource/{p}/files/{n}) format('woff2')}}" for f, w, p, n in FONTS)

# Held time: one requestAnimationFrame call a frame (the page draws once), and every CSS animation pinned to the frame's clock.
HOLD = """(() => {
  const queue = []; window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; }; window.cancelAnimationFrame = () => {};
  window.__soundLog = [];
  window.__frame = (ms) => {
    const cbs = queue.splice(0); const now = performance.now(); for (const cb of cbs) { try { cb(now); } catch (e) { setTimeout(() => { throw e; }); } }
    for (const a of document.getAnimations()) {
      if (a.__t0 === undefined) { a.__t0 = ms; a.pause(); }
      const t = ms - a.__t0, end = a.effect ? a.effect.getComputedTiming().endTime : 0;
      if (Number.isFinite(end) && t >= end) { if (a.playState !== 'finished') a.finish(); } else a.currentTime = t;
    }
  };
})();"""
# The caption over the board: the game's own type and brass, one at a time.
CAPTION = """((top, size) => {
  const s = document.createElement('style'); s.textContent = `#pvCap{position:fixed;display:flex;justify-content:center;pointer-events:none;z-index:99;opacity:0;transition:opacity .35s ease}
  #pvCap.on{opacity:1} #pvCap div{font:600 var(--size)/1.1 Fraunces,serif;color:#f6ead6;letter-spacing:-.01em;text-align:center;padding:.42em .9em .5em;border-radius:.7em;
  background:rgba(20,12,7,.72);box-shadow:0 0 0 1.5px rgba(230,183,111,.5),0 10px 30px rgba(0,0,0,.55);max-width:86%;text-wrap:balance}
  #pvCap i{display:block;width:2.2em;height:3px;margin:.32em auto 0;border-radius:2px;background:#e6b76f;opacity:.85}`;
  document.head.appendChild(s); document.documentElement.style.setProperty('--size', size); const d = document.createElement('div'); d.id = 'pvCap'; d.style.cssText = top; d.innerHTML = '<div><span></span><i></i></div>'; document.body.appendChild(d);
  window.__caption = (text) => { if (text) d.querySelector('span').textContent = text; d.classList.toggle('on', !!text); };
})"""

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv

def record(name, limit=None):
    w, h, dpr = RECORDINGS[name]; frames = os.path.join(srcd, f"preview-{name}")
    shutil.rmtree(frames, ignore_errors=True); os.makedirs(frames)
    pos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "previewpos.js"), "7"], cwd=root).decode())
    saved = {"moves": pos["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "medium", "stats": {"biggest": 4, "captures": 2, "started": 0}}
    srv = serve(); base = f"http://127.0.0.1:{srv.server_port}"; errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=True)  # a phone and an iPad: touch, so the words say "tap"
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
        pg.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body=FONT_CSS, content_type="text/css"))
        pg.route("https://fonts.gstatic.com/**", lambda r: r.abort())
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=os.path.join(root, "node_modules", "three", "build", "three.module.js"), content_type="text/javascript"))
        pg.add_init_script("localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'medium'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.name', 'Meka'); localStorage.setItem('ayo.take', '0');" % json.dumps(json.dumps(saved)))
        pg.clock.install(); pg.add_init_script(HOLD)
        pg.goto(f"{base}/web/index.html?capture=1&stay=home&lite=0&lang={LANG}", wait_until="load")  # the full board, seed physics on: never the lighter one
        assert pg.evaluate("document.documentElement.lang") == LANG, "the game in the video's language"
        pg.evaluate("document.fonts.ready"); pg.evaluate(CAPTION + "(%s, %s)" % tuple(json.dumps(v) for v in PLACE[name]))
        cdp = ctx.new_cdp_session(pg)
        clock = {"ms": 0, "i": 0}
        def frame():  # the page's clock moves on one frame, it draws once, and the frame is kept
            i = clock["i"]; target = round((i + 1) * 1000 / FPS); pg.clock.run_for(target - clock["ms"]); clock["ms"] = target
            pg.evaluate("window.__frame(%d)" % target)
            shot = cdp.send("Page.captureScreenshot", {"format": "jpeg", "quality": 94, "clip": {"x": 0, "y": 0, "width": w, "height": h, "scale": dpr}})
            open(os.path.join(frames, f"{i:04d}.jpg"), "wb").write(base64.b64decode(shot["data"])); clock["i"] = i + 1
            if i % 30 == 0: print(f"  {name} {i / FPS:4.1f}s", flush=True)
        def run(n):
            for _ in range(n): frame()
        def until(js, most):
            for _ in range(most):
                if pg.evaluate(js): return True
                frame()
            return False
        run(10)  # Home settles; the board is ready
        assert pg.evaluate("!window.__ayo.quality.tier.lite && window.__ayo.quality.physics"), "the full board, with seed physics"
        pg.tap("#continueBtn"); run(36)
        n0 = pg.evaluate("window.__ayo.state.moves.length"); assert pg.evaluate("window.__ayo.state.turn") == 0, "your move"
        clock["t0"] = pg.evaluate("performance.now()"); first = clock["i"]
        def tap(pit):
            x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
            pg.touchscreen.tap(x, y)
        pg.evaluate("window.__soundLog.length = 0")
        pg.evaluate("window.__caption(%s)" % json.dumps(CAPS[0])); run(18)
        tap(pos["pit"]); run(75)  # the path marks land
        assert pg.evaluate("window.__ayo.selected") == pos["pit"], "the first tap picks the pit"
        assert pg.evaluate("window.__ayo.marks.caps.length") >= 2, "the captures are ringed"
        pg.evaluate("window.__caption('')"); run(8); tap(pos["pit"])
        run(6); pg.evaluate("window.__caption(%s)" % json.dumps(CAPS[1]))
        assert until(f"window.__ayo.state.moves.length > {n0} && !window.__ayo.hurry.playing", 30 * 12), "the turn ends"
        pg.evaluate("window.__caption('')"); run(10); pg.evaluate("window.__caption(%s)" % json.dumps(CAPS[2]))
        assert until(f"window.__ayo.state.moves.length > {n0 + 1} && !window.__ayo.busy && !!window.__ayo.explain", 30 * 8), "Nnamdi answers"
        run(40)  # his move's words under the board, then a tap on them plays it again, slowly
        box = pg.evaluate("document.querySelector('#lastMove').getBoundingClientRect().toJSON()"); x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        pg.touchscreen.tap(x, y)
        run(4); assert pg.evaluate("window.__ayo.replaying"), "his move plays again"
        assert until("!window.__ayo.replaying && !window.__ayo.busy", 30 * 10), "the replay ends"
        run(15); pg.evaluate("window.__caption('')"); run(10); pg.evaluate("window.__caption(%s)" % json.dumps(CAPS[3]))
        # Hint: Mama Ngozi's pit is picked for you with its path, and one more tap sows it
        pg.touchscreen.tap(*pg.evaluate("(() => { const r = document.querySelector('#hintBtn').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()"))
        assert until("window.__ayo.selected !== null", 30 * 6), "the hint picks a pit"
        run(60); hinted = pg.evaluate("window.__ayo.selected")
        said = pg.evaluate("document.querySelector('#hint').textContent"); print("  hint line:", said, flush=True)
        if FR: assert "tap again" not in said and "would play" not in said and said.strip(), ("the hint line in French", said)
        tap(hinted)
        assert until(f"window.__ayo.state.moves.length > {n0 + 2} && !window.__ayo.busy", 30 * 10), "the hinted move is sown"
        run(10); pg.evaluate("window.__caption('')"); run(10); pg.evaluate("window.__caption(%s)" % json.dumps(CAPS[4]))
        left = round(max(MIN_S + 0.5, (clock["i"] - first) / FPS + 2.8) * FPS) - (clock["i"] - first)
        run(left)
        seconds = (clock["i"] - first) / FPS; assert MIN_S <= seconds <= MAX_S, ("15 to 30 seconds", seconds)
        assert pg.evaluate("window.__ayo.state.moves.length") >= n0 + 3
        if FR: assert pg.evaluate("document.documentElement.lang") == "fr", "still French at the end"
        # the board's own sounds, played again in time into a stereo track
        wav = pg.evaluate("""async ([t0, secs, rate]) => {
          const { boardAudio } = await import('/web/sound.js');
          const off = new OfflineAudioContext(2, Math.ceil(secs * rate), rate), a = boardAudio(off);
          for (const [t, kind, ...args] of window.__soundLog) { const when = (t - t0) / 1000; if (when < 0 || when > secs - 0.2) continue;
            if (kind === 'land') a.land(args[0], args[1], args[2], args[3], when); else if (kind === 'rattle') a.rattle(args[0], args[1], when); else a.tap(args[0], args[1], when); }
          const buf = await off.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
          const out = new DataView(new ArrayBuffer(44 + n * 4)), s = (o, t) => [...t].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
          s(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
          out.setUint32(24, rate, true); out.setUint32(28, rate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); s(36, 'data'); out.setUint32(40, n * 4, true);
          for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
          const u8 = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
          return { b64: btoa(bin), sounds: window.__soundLog.length };
        }""", [clock["t0"], seconds, RATE])
        open(os.path.join(frames, "sound.wav"), "wb").write(base64.b64decode(wav["b64"]))
        json.dump({"first": first, "frames": clock["i"] - first, "seconds": seconds, "sounds": wav["sounds"], "pit": pos["pit"]}, open(os.path.join(frames, "take.json"), "w"))
        print(f"{name}: {seconds:.1f} s, {wav['sounds']} sounds", flush=True)
        b.close()
    srv.shutdown()
    assert not errors, errors

def encode():
    os.makedirs(outd, exist_ok=True)
    x264 = ["-c:v", "libx264", "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p", "-r", str(FPS), "-preset", "slow", "-crf", "17",
            "-maxrate", "10M", "-bufsize", "20M", "-g", str(FPS), "-c:a", "aac", "-b:a", "256k", "-ar", str(RATE), "-ac", "2", "-movflags", "+faststart", "-shortest"]
    def make(rec, out, vf):
        d = os.path.join(srcd, f"preview-{rec}"); t = json.load(open(os.path.join(d, "take.json")))
        # the knocks brought up so the loudest sits at -3 dB (in the game they play quietly under the phone's own volume)
        vd = subprocess.run(["ffmpeg", "-i", os.path.join(d, "sound.wav"), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        peak = float(vd.split("max_volume:")[1].split("dB")[0]); gain = max(0.0, -3.0 - peak)
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-start_number", str(t["first"]), "-i", os.path.join(d, "%04d.jpg"),
               "-i", os.path.join(d, "sound.wav"), "-frames:v", str(t["frames"]), "-vf", vf, "-af", f"volume={gain:.1f}dB", *x264, os.path.join(outd, out)]
        subprocess.run(cmd, check=True); print("video", os.path.relpath(os.path.join(outd, out), root), flush=True)
    bg = "0x0d0906"
    if os.path.isdir(os.path.join(srcd, "preview-phone")): make("phone", "ios-6.9-preview.mp4", "scale=886:1920:flags=lanczos,setsar=1")
    if os.path.isdir(os.path.join(srcd, "preview-ipad")):
        make("ipad", "ios-13-preview.mp4", "scale=1600:1200:flags=lanczos,setsar=1")
        make("ipad", "play-youtube.mp4", f"scale=1440:1080:flags=lanczos,pad=1920:1080:240:0:color={bg},setsar=1")
    poster(); readme()

def readme():
    if FR: return readme_fr()
    L = ["# The store's preview video", "", "Made by `python3 tools/store-preview.py` from the real game on the real board, with the board's own sounds (do not edit by hand;",
         "run it again after the look changes). About 23 seconds: a game against Nnamdi, your first tap showing where every seed will go, the",
         "turn sown (two relays, two captures), Nnamdi's answer explained under the board and watched again slowly, a hint sown, and the name. Each `-poster.jpg` is the frame at 5 seconds.", "",
         "| Where it goes | File | Size |", "|---|---|---|",
         "| App Store Connect → the version → iPhone 6.9\" Display → App Previews (the 6.5\" is made from it) | `ios-6.9-preview.mp4` | 886 × 1920 |",
         "| App Store Connect → the version → iPad 13\" Display → App Previews | `ios-13-preview.mp4` | 1600 × 1200 |",
         "| YouTube (public or unlisted, ads off, not made for kids), then its link in Play Console → Main store listing → Video | `play-youtube.mp4` | 1920 × 1080 |", "",
         "Apple takes 15–30 seconds at up to 30 fps, H.264 with stereo AAC; all three are made that way (test/storepreview.test.js checks).",
         "Apple shows the preview muted until it is tapped, so the captions carry it:", ""]
    for i, c in enumerate(CAPS): L.append(f"{i+1}. {c}")
    open(os.path.join(outd, "README.md"), "w").write("\n".join(L) + "\n")

def readme_fr():
    L = ["# The store's preview video in French", "", "Made by `python3 tools/store-preview.py --lang=fr` from the real game in French on the real board, with the board's",
         "own sounds (do not edit by hand). The same game and the same moves as `../preview/`, the board's words in French, under the",
         "French captions of `../listing-fr.json`. Each `-poster.jpg` is the frame at 5 seconds.", "",
         "| Where it goes (French, fr-FR) | File | Size |", "|---|---|---|",
         "| App Store Connect → the French localisation → iPhone 6.9\" Display → App Previews | `ios-6.9-preview.mp4` | 886 × 1920 |",
         "| App Store Connect → the French localisation → iPad 13\" Display → App Previews | `ios-13-preview.mp4` | 1600 × 1200 |",
         "| YouTube (unlisted is fine, ads off, not made for kids), then its link in Play Console → Main store listing → Manage translations → French → Video | `play-youtube.mp4` | 1920 × 1080 |", "",
         "Apple shows the preview muted until it is tapped, so the captions carry it:", ""]
    for i, c in enumerate(CAPS): L.append(f"{i+1}. {c}")
    open(os.path.join(outd, "README.md"), "w").write("\n".join(L) + "\n")

def poster():  # the frame at 5 seconds (Apple's poster frame) of each, for Meka to see without playing them
    for f in sorted(os.listdir(outd)):
        if f.endswith(".mp4"):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "5", "-i", os.path.join(outd, f), "-frames:v", "1", "-q:v", "3",
                            os.path.join(outd, f[:-4] + "-poster.jpg")], check=True)

if __name__ == "__main__":
    only = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--only=")), None)
    if "--encode" not in sys.argv:
        for name in RECORDINGS:
            if not only or name in only: record(name)
    encode()
