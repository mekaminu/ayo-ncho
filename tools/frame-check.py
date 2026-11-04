# The slow-phone frame check (Launch L16): how much each frame costs the page at the lighter tier, against budgets, in headless
# Chromium with the CPU slowed down as on a cheap Android phone.
#
# Usage: python3 tools/frame-check.py [docs/launch/frames.json] [--throttle=4] [--moves=3] [--drawscale=0.25] [--judge]
#
# For each tier (the lighter board, then the full one, each in a fresh phone page 390 × 844 at 2× with touch) it opens a game,
# slows the page's CPU by --throttle (Chrome DevTools' own CPU throttling: 4× is what Lighthouse uses for a mid-range phone; a
# £60 Android is nearer 6×), then plays --moves of your moves (the richest pit each time, so relays and captures are in it) with
# the computer's replies (the full board: --full-moves, one by default, as software WebGL draws it very slowly), and reads what
# the game's own frame meter (web/frametime.js) measured while seeds moved:
#   logic  — the page's own work for each frame before drawing: tweens, seed physics, placing the camera, badges and the hand's
#            numbers — what a slow phone's CPU pays every frame. Judged against BUDGET.
#   render — the time inside three.js's render call. In this container WebGL is drawn in software by SwiftShader, whose queue
#            pushes back into that call, so it is reported, not judged; what drives it on a phone is judged instead: the scene.
#   gap    — the time between frames, the container's software drawing again: reported, not judged
#   the scene — draw calls and triangles a frame, textures and their memory, the pixel ratio
# The container's software WebGL is far too slow to draw a phone's full pixels many times, so the canvas is drawn at --drawscale of
# its pixel ratio (a quarter, by default): the scene and all the page's own work each frame are the same; pixel_ratio is the
# tier's own (what a phone draws at) and drawn_ratio what the check drew at.
# The lighter tier must keep within BUDGET (below) and be lighter than the full one where it promises to be. The results go to
# the JSON file (default docs/launch/frames.json), which test/frametime.test.js checks; it exits 1 on a page error or a budget
# missed. --judge also checks Auto's own judgement: the full board drawn slowly (the meter told each frame came 45 ms late)
# is remembered, said once, and the next open uses the lighter board, until a choice in Settings starts it afresh.
import json, os, sys, time, http.server, functools, threading, datetime
from playwright.sync_api import sync_playwright

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "launch", "frames.json"))
arg = lambda k, d: next((type(d)(a.split("=", 1)[1]) for a in sys.argv if a.startswith("--" + k + "=")), d)
THROTTLE = arg("throttle", 4.0); DRAWSCALE = arg("drawscale", 0.25); MOVES = arg("moves", 3); FULL_MOVES = arg("full-moves", 1); JUDGE = "--judge" in sys.argv
# What the lighter board must keep to at the throttle (a frame is 16.7 ms at 60 a second; the GPU needs the rest of it)
BUDGET = {"logic_p95_ms": 4.0, "logic_p50_ms": 2.0, "calls": 140, "triangles": 150000, "tex_mb": 8.0, "pixel_ratio": 1.0,
          "lite_vs_full_triangles": 0.6, "lite_vs_full_tex": 0.5}
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8768), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errors = []

def page(b, extra="", init=""):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.level', 'medium'); }" + init)
    pg.goto("http://127.0.0.1:8768/web/index.html?capture=1&stay=home" + extra, wait_until="load")
    pg.wait_for_function("window.__done===true", timeout=180000)
    return ctx, pg

def play(pg, moves):  # your richest pit each time (relays, captures), then the computer's reply; finger taps, as on a phone
    for k in range(moves):
        print("  move", k + 1, "…", flush=True)
        st = pg.evaluate("window.__ayo.state")
        if st["over"]: break
        legal = pg.evaluate("window.__ayo.legal"); pit = max(legal, key=lambda i: st["pits"][i])
        x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
        pg.touchscreen.tap(x, y); pg.wait_for_timeout(350); pg.touchscreen.tap(x, y)
        pg.wait_for_function("window.__ayo.state.moves.length > %d" % len(st["moves"]), timeout=60000)
        pg.wait_for_function("(!window.__ayo.busy && window.__ayo.state.turn === window.__ayo.seat && window.__ayo.tweens === 0) || window.__ayo.state.over", timeout=600000)

def tier(b, lite):
    ctx, pg = page(b, "&lite=%d&drawscale=%s" % (1 if lite else 0, DRAWSCALE))
    pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=60000)
    pg.wait_for_function("window.__ayo.tweens === 0", timeout=60000)
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": THROTTLE})
    pg.evaluate("window.__ayo.framesReset(); window.__frameParts = {}"); t0 = time.time()
    play(pg, MOVES if lite else FULL_MOVES)  # the full board is slow to draw in software: one move and its reply
    f = pg.evaluate("window.__ayo.frames"); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    s = f["stats"]; P = pg.evaluate("window.__frameParts"); n = max(1, P.get("frames", 1))
    parts = {k: {"mean": round(P.get(k, 0) / n, 2), "max": round(P.get(k + "#max", 0), 1)} for k in ("tweens", "physics", "place", "render")}
    L = sorted(P.get("logic", [])); q = lambda a, x: round(a[min(len(a) - 1, max(0, -(-int(x * len(a) * 1000) // 1000) - 1))], 2) if a else 0
    logic = {"p50": q(L, 0.5), "p95": q(L, 0.95), "max": round(L[-1], 1) if L else 0, "frames": len(L)}
    r = {"lite": f["lite"], "moves": len(pg.evaluate("window.__ayo.state.moves")), "seconds": round(time.time() - t0, 1), "frames": s["frames"], "worked": s["worked"],
         "logic_ms": logic, "work_ms": s["work"], "gap_ms": s["gap"], "fps_here": s["fps"], "calls": f["calls"], "triangles": f["triangles"], "geometries": f["geometries"],
         "textures": f["textures"], "tex_mb": round(f["texBytes"] / 1048576, 1), "pixel_ratio": f["pixelRatio"], "drawn_ratio": f["drawn"], "parts_ms": parts}
    print(("lighter" if lite else "full   "), json.dumps(r))
    ctx.close(); return r

def judge(b):  # Auto's own judgement: a full board drawn slowly here is remembered and the next open is lighter
    # a phone with cores and memory to spare, so Auto starts on the full board (this container has 2 cores, which Auto calls slow)
    ctx, pg = page(b, "&judge=60&drawscale=%s" % DRAWSCALE, " Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });")
    q = pg.evaluate("window.__ayo.quality"); assert not q["lite"] and q["reason"] == "auto", ("the check starts on the full board, Auto", q)
    pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=60000)
    pg.evaluate("window.__frameGap = 45")  # the meter is told every frame came 45 ms after the last: under 25 a second
    for _ in range(12):
        if pg.evaluate("window.__ayo.frames.judged") or pg.evaluate("window.__ayo.state.over"): break
        play(pg, 1)
    f = pg.evaluate("window.__ayo.frames"); assert f["judged"] and f["measured"] == "slow", ("a slow full board is remembered", f["stats"], f["verdict"])
    pg.evaluate("window.__frameGap = 0")
    t = f["said"]; assert t and "lighter board comes in from the next time" in t, ("said in a toast", t)
    print("judge: slow full board remembered after", f["stats"]["frames"], "moving frames · median gap", f["stats"]["gap"]["p50"], "ms ·", t)
    pg.reload(wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
    q = pg.evaluate("window.__ayo.quality"); assert q["lite"] and q["reason"] == "this phone drew the full board slowly", q
    pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
    note = pg.evaluate("document.querySelector('#qualityNow').textContent")
    assert note.startswith("now lighter (this phone drew the full board slowly)") and "seeds lately" in note and "full board" in note, note
    print("judge: next open lighter ·", note)
    pg.click('.seg[data-set="quality"] .segbtn[data-v="auto"]')  # Auto chosen again: judged afresh
    pg.wait_for_timeout(1500); pg.wait_for_function("window.__done===true", timeout=180000)
    q = pg.evaluate("window.__ayo.quality"); assert not q["lite"] and q["reason"] == "auto", ("a choice in Settings starts it afresh", q)
    assert pg.evaluate("window.__ayo.frames.measured") == "", pg.evaluate("window.__ayo.frames.measured")
    print("judge: Auto chosen again → full board, judged afresh")
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    if JUDGE: judge(b)
    if "--only-judge" in sys.argv: b.close(); srv.shutdown(); sys.exit(1 if errors else 0)
    lite = tier(b, True); full = tier(b, False)
    b.close()
srv.shutdown()
if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)

checks = [
    ("lighter: the page's logic a frame at %g× slower CPU, 95th percentile ≤ %g ms" % (THROTTLE, BUDGET["logic_p95_ms"]), lite["logic_ms"]["p95"] <= BUDGET["logic_p95_ms"]),
    ("lighter: the page's logic a frame at %g× slower CPU, median ≤ %g ms" % (THROTTLE, BUDGET["logic_p50_ms"]), lite["logic_ms"]["p50"] <= BUDGET["logic_p50_ms"]),
    ("lighter: draw calls a frame ≤ %d" % BUDGET["calls"], lite["calls"] <= BUDGET["calls"]),
    ("lighter: triangles a frame ≤ %d" % BUDGET["triangles"], lite["triangles"] <= BUDGET["triangles"]),
    ("lighter: textures ≤ %.0f MB" % BUDGET["tex_mb"], lite["tex_mb"] <= BUDGET["tex_mb"]),
    ("lighter: pixel ratio 1", lite["pixel_ratio"] <= BUDGET["pixel_ratio"]),
    ("lighter: triangles ≤ %d%% of the full board's" % (BUDGET["lite_vs_full_triangles"] * 100), lite["triangles"] <= full["triangles"] * BUDGET["lite_vs_full_triangles"]),
    ("lighter: textures ≤ %d%% of the full board's" % (BUDGET["lite_vs_full_tex"] * 100), lite["tex_mb"] <= full["tex_mb"] * BUDGET["lite_vs_full_tex"]),
    ("enough moving frames measured (lighter ≥ 150, full ≥ 20)", lite["logic_ms"]["frames"] >= 150 and full["logic_ms"]["frames"] >= 20),
]
for name, ok in checks: print(("  ok  " if ok else "  MISS"), name)
res = {"date": datetime.date.today().isoformat(), "throttle": THROTTLE, "moves": {"lite": MOVES, "full": FULL_MOVES}, "drawscale": DRAWSCALE, "viewport": "390x844 @2x, touch",
       "renderer": "headless Chromium, SwiftShader (software WebGL): render and gap_ms are the container's software drawing, not a phone's GPU; logic_ms and the scene are what is judged",
       "budget": BUDGET, "lite": lite, "full": full, "checks": [{"name": n, "ok": ok} for n, ok in checks], "pass": all(ok for _, ok in checks)}
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with open(out, "w") as fh: json.dump(res, fh, indent=2, ensure_ascii=False); fh.write("\n")
print("wrote", out, "· pass" if res["pass"] else "· BUDGET MISSED")
sys.exit(0 if res["pass"] else 1)
