# A long evening (idea 8 Nov): game after game on one page, the way the family plays on a Sunday night, and nothing builds up.
# A phone keeps the game's tab open for hours; every new game, every move, every card opened and closed must give back what it
# took, or after the twentieth game the board stutters, the battery drains and the phone's browser closes the tab. In headless
# Chromium as a phone (390x844, touch) this opens the game and, ROUNDS times over, plays a new game from Home: two moves and the
# computer's two replies, then Undo and Put it back, How to play, Home, Settings and the Store, and every few rounds a whole game
# to its end and its Game over card. After each round it lets the page settle, makes the browser collect its garbage and reads:
# the JavaScript heap, the page's DOM nodes and event listeners (Chrome's own counters), the 3D library's geometries and textures
# still held on the graphics card, the seed meshes in the scene, running tweens and timers. tools/soak-judge.js then compares the
# rounds after the first two (the first ones load and warm caches) and fails on anything that grows round after round.
# Usage: python3 tools/soak.py [report.md] [--rounds N]   -> prints each round; writes the report (default docs/launch/soak.md)
import functools, http.server, json, os, subprocess, sys, threading, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and sys.argv[i - 1] != "--rounds"]
out = args[0] if args else os.path.join(root, "docs", "launch", "soak.md")
ROUNDS = int(sys.argv[sys.argv.index("--rounds") + 1]) if "--rounds" in sys.argv else 10
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
PORT = int(os.environ.get("SOAK_PORT", "8771"))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/web/index.html" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--js-flags=--expose-gc"]
# counts the page's live timers: every setTimeout not yet fired or cleared, every setInterval not cleared
TIMERS = """(() => { const live = new Set(); window.__timers = live; const st = window.setTimeout, ct = window.clearTimeout, si = window.setInterval, ci = window.clearInterval;
  window.setTimeout = function (f, ...a) { let id; id = st.call(window, function (...b) { live.delete(id); return typeof f === 'function' ? f.apply(this, b) : undefined; }, ...a); live.add(id); return id; };
  window.clearTimeout = function (id) { live.delete(id); return ct.call(window, id); };
  window.setInterval = function (...a) { const id = si.apply(window, a); live.add('i' + id); return id; };
  window.clearInterval = function (id) { live.delete('i' + id); return ci.call(window, id); }; })();"""
READ = """() => { const a = window.__ayo, f = a.frames; return { geometries: f.geometries, textures: f.textures, seeds: a.seeds.length, tweens: a.tweens, timers: window.__timers ? window.__timers.size : 0, toasts: document.querySelectorAll('.toast').length }; }"""

def wait_turn(pg, n):  # your move again after n moves in all (yours and theirs)
    pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.moves.length >= %d && window.__ayo.state.turn === 0 && !window.__ayo.busy)" % n, timeout=240000)

def sow(pg):  # your next move: the first pit you may play, tapped as a finger would (pick, then sow)
    n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]")
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    for k in range(6):  # pick, then sow; on a loaded machine a tap can come before the board is ready for it, so tap until it goes
        if not pg.evaluate("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % n): break
        if k >= 2: TAPS["again"] += 1  # (8 Nov: one run waited four minutes for a move whose second tap was lost)
        pg.mouse.click(x, y); pg.wait_for_timeout(350)
    wait_turn(pg, n + 2)
TAPS = {"again": 0}

def click(pg, sel):
    pg.wait_for_selector(sel + ":not([hidden])", timeout=30000)
    try: pg.click(sel, timeout=8000)
    except Exception: pg.evaluate("document.querySelector(%s).click()" % json.dumps(sel))
    pg.wait_for_timeout(500)

def to_home(pg):
    for _ in range(4):
        if pg.evaluate("!document.querySelector('#home').hidden"): return
        pg.wait_for_function("!window.__ayo.busy", timeout=120000)
        for sel in ["#rulesClose", "#settingsBack", "#storeBack", "#goHome", "#homeBtn"]:
            if pg.evaluate("(s => { const e = document.querySelector(s); return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; })(%s)" % json.dumps(sel)): click(pg, sel); break
        try: pg.wait_for_function("!document.querySelector('#home').hidden", timeout=8000); return
        except Exception: pass
    pg.screenshot(path=os.environ.get("SOAK_STUCK", "/tmp/soak-stuck.png"))
    raise SystemExit("could not get back to Home: " + json.dumps(pg.evaluate("[...document.querySelectorAll('section:not([hidden]), .card:not([hidden])')].map(e => e.id)")))

def new_game(pg):
    to_home(pg)  # Play over a game under way asks once and wants the second tap within three seconds (web/keepgame.js): both taps from the page
    pg.evaluate("(async () => { const b = document.querySelector('#playBtn'); b.click(); await new Promise((r) => setTimeout(r, 300)); if (b.classList.contains('armed')) b.click(); })()")
    pg.wait_for_function("document.querySelector('#home').hidden && window.__ayo.state.moves.length <= 1 && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=120000)  # (they open the game half the time: the loser starts)

def round_(pg, k):
    T = time.time(); step = lambda w: print("   %4.0f s %s" % (time.time() - T, w), flush=True) if os.environ.get("SOAK_LOG") else None
    new_game(pg); step("new game")
    sow(pg); step("move 1"); sow(pg); step("move 2")
    if pg.evaluate("(() => { const e = document.querySelector('#undo'); return !!e && !e.disabled && !e.closest('[hidden]'); })()"):
        click(pg, "#undo"); pg.wait_for_function("!window.__ayo.busy", timeout=60000); pg.wait_for_timeout(600)
        if pg.evaluate("(() => { const e = document.querySelector('#redoBtn'); return !!e && !e.hidden; })()"):
            pg.evaluate("document.querySelector('#redoBtn').click()"); pg.wait_for_timeout(500); pg.wait_for_function("!window.__ayo.busy", timeout=120000)
    step("undo, redo"); click(pg, "#rulesBtn"); click(pg, "#rulesClose"); step("rules")
    if k % 4 == 3:  # a whole game, to its end: the rest played by the hurry (each move still sown and scooped, quicker)
        guard = 0
        while not pg.evaluate("window.__ayo.state.over") and guard < 200:
            guard += 1
            if pg.evaluate("window.__ayo.state.turn === 0 && !window.__ayo.busy"):
                pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
                pg.mouse.click(x, y); pg.wait_for_timeout(250)
                if pg.evaluate("window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.selected === %d" % pit): pg.mouse.click(x, y)
            pg.wait_for_timeout(150); pg.evaluate("window.__ayo.hurryNow && window.__ayo.hurryNow()")
        pg.wait_for_selector("#gameover:not([hidden])", timeout=60000); pg.wait_for_timeout(2500)
        click(pg, "#goHome")
    to_home(pg)
    click(pg, "#homeSettings"); click(pg, "#settingsBack")
    click(pg, "#homeStore"); click(pg, "#storeBack")

def measure(pg, cdp):
    pg.wait_for_timeout(3000)  # the board settles: Home's slow turn is a camera move, not a tween; toasts fade
    for _ in range(3): cdp.send("HeapProfiler.collectGarbage"); pg.wait_for_timeout(150)
    heap = cdp.send("Runtime.getHeapUsage"); dom = cdp.send("Memory.getDOMCounters")
    r = pg.evaluate(READ)
    r.update({"heapMB": round(heap["usedSize"] / 1048576, 2), "nodes": dom["nodes"], "listeners": dom["jsEventListeners"], "documents": dom["documents"]})
    return r

def main():
    t0 = time.time(); errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
        if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
        pg.add_init_script(TIMERS + "if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.level', 'easy'); localStorage.setItem('ayo.talk', 'few'); }")
        pg.goto(BASE + "?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        cdp = ctx.new_cdp_session(pg); cdp.send("HeapProfiler.enable")
        rows = [dict(measure(pg, cdp), round=0)]
        print("round  0 %s" % json.dumps(rows[0]))
        for k in range(1, ROUNDS + 1):
            t = time.time()
            try: round_(pg, k)
            except Exception as e:
                pg.screenshot(path=os.environ.get("SOAK_STUCK", "/tmp/soak-stuck.png"))
                print(json.dumps(pg.evaluate("(async () => { const a = window.__ayo; const t0 = performance.now(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return { deal: a.deal, tweens: a.tweens, hurry: a.hurry, rest: a.rest, frame: Math.round(performance.now() - t0), hint: document.querySelector('#hint').textContent, sub: document.querySelector('#oppSub').textContent, mood: a.mood, last: a.state.moves.slice(-3), caught: a.caught, frames: a.frames.calls }; })()")))
                if errors: print("page errors:", *errors, sep="\n  ")  # (8 Nov: the one stuck run never said whether a frame had thrown)
                print("stuck in round %d: %s" % (k, str(e).split("\n")[0]), json.dumps(pg.evaluate("({ moves: window.__ayo.state.moves.length, turn: window.__ayo.state.turn, over: window.__ayo.state.over, busy: window.__ayo.busy, home: !document.querySelector('#home').hidden, shown: [...document.querySelectorAll('section:not([hidden]), .card:not([hidden])')].map(e => e.id), play: document.querySelector('#playBtn').className })")))
                raise SystemExit(1)
            r = dict(measure(pg, cdp), round=k, seconds=round(time.time() - t)); rows.append(r)
            print("round %2d %s" % (k, json.dumps(r)), flush=True)
        b.close()
    srv.shutdown()
    data = os.path.join(os.path.dirname(out), "soak.json"); json.dump(rows, open(data, "w"), indent=1)
    verdict = json.loads(subprocess.run(["node", os.path.join(root, "tools", "soak-judge.js"), data], capture_output=True, text=True).stdout)
    lines = ["# A long evening", "", "Made by `python3 tools/soak.py` in headless Chromium as a phone (390×844): %d rounds on one page, each a new game from Home (two moves and the computer's replies, Undo and Put it back, How to play, Settings and the Store), every fourth one played to its end and its Game over card. After each round the page settles, the browser collects its garbage and the counters are read. `tools/soak-judge.js` fails on anything that grows round after round once the first two rounds have warmed up." % ROUNDS, "",
             "| Round | Heap (MB) | DOM nodes | Listeners | Geometries | Textures | Seeds | Tweens | Timers |", "|---|---|---|---|---|---|---|---|---|"]
    for r in rows: lines.append("| %d | %.2f | %d | %d | %d | %d | %d | %d | %d |" % (r["round"], r["heapMB"], r["nodes"], r["listeners"], r["geometries"], r["textures"], r["seeds"], r["tweens"], r["timers"]))
    lines += ["", "**%s**" % ("Nothing builds up." if verdict["ok"] else "Grows: " + "; ".join(verdict["grows"]))]
    for k, v in verdict["series"].items(): lines.append("- %s: %s" % (k, v))
    if errors: lines += ["", "Page errors: " + "; ".join(errors)]
    if TAPS["again"]: lines += ["", "Taps tried again (a tap the board was not ready for): %d" % TAPS["again"]]
    open(out, "w").write("\n".join(lines) + "\n"); print("report:", os.path.relpath(out, root)); print("%.0f s" % (time.time() - t0))
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    if not verdict["ok"]: print("grows:", *verdict["grows"], sep="\n  "); sys.exit(1)
    print("nothing builds up")

main()
