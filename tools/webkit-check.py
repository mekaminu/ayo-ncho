# Safari's own engine (idea 6 Nov, from the friend's iPhone): a friend's iPhone (Safari, iOS 26) got a black screen on the game link
# and the invite link, while Chrome dressed up as an iPhone starts fine — so it is something only WebKit does. This opens the game in
# Playwright's WebKit (the engine inside Safari; every browser on an iPhone uses it) dressed as an iPhone, the way the friend did:
#   1. the game link (a phone past its first-game lesson and tips, so a plain game follows): does the board start, or does "The board couldn't start" show?
#   2. a real move: tap a pit twice and wait for the opponent's reply
#   3. the invite link (?room=CODE, a code nobody opened) as a first visit, nothing kept on the phone: the board starts, no page error
# It writes what it saw — every page error, console error and failed request, the boot screen's small print, the WebGL renderer —
# to <out>.md (also to the GitHub run's summary) and a picture of each page, and exits 1 if any page did not start or threw.
# WebKit cannot be downloaded into the build container, so this runs in GitHub Actions (.github/workflows/safari.yml) on every push
# that touches the game, and by hand there (Run workflow). Locally: python3 tools/webkit-check.py out --browser chromium (a dry run).
# Usage: python3 tools/webkit-check.py docs/webkit [--browser webkit|firefox|chromium] [--device "iPhone 15" | "Firefox on Android" | "Firefox on a Mac"]
# Firefox (idea 9 Nov): the same check in Firefox's engine, Gecko, dressed as Firefox on Android and on a Mac (.github/workflows/firefox.yml).
import sys, os, json, time, subprocess, urllib.request
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import pollwait; pollwait.install()  # the real server's page is locked (server/headers.js): waits poll with evaluate

out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "webkit-check"
def arg(name, default):
    for i, a in enumerate(sys.argv):
        if a == name and i + 1 < len(sys.argv): return sys.argv[i + 1]
        if a.startswith(name + "="): return a.split("=", 1)[1]
    return default
browser = arg("--browser", "webkit"); device = arg("--device", "iPhone 15")
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8769; BASE = "http://127.0.0.1:%d/" % PORT
os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)

node = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env={**os.environ, "PORT": str(PORT), "ROOM_SECRET": "webkit-check-secret"}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
for _ in range(100):
    try: urllib.request.urlopen(BASE + "healthz", timeout=1); break
    except Exception: time.sleep(0.1)
else:
    print("server did not start:", node.stderr.read().decode()); sys.exit(1)

STATE = """() => { const f = document.querySelector('#bootFail'); const c = document.querySelector('canvas');
  let gl = null; try { const x = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (x) { const d = x.getExtension('WEBGL_debug_renderer_info'); gl = (x instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1') + ' · ' + (d ? x.getParameter(d.UNMASKED_RENDERER_WEBGL) : x.getParameter(x.RENDERER)); } else gl = 'none'; } catch (e) { gl = 'error: ' + e; }
  return { up: !!window.__ayoUp, fail: f ? f.innerText.replace(/\\s+/g, ' ').trim() : null, wait: !!document.querySelector('#bootWait'),
    three: window.__ayo3d || null, canvas: c ? [c.width, c.height] : null, gl, ua: navigator.userAgent,
    hint: (document.querySelector('#hint') || {}).textContent || '', home: !!document.querySelector('#home') && !document.querySelector('#home').hidden }; }"""

SNAP = "JSON.stringify({ moves: window.__ayo.state.moves.length, turn: window.__ayo.state.turn, busy: window.__ayo.busy, selected: window.__ayo.selected, hurry: window.__ayo.hurry.playing, tweens: window.__ayo.tweens, hint: document.querySelector('#hint').textContent, opp: (document.querySelector('#oppSub') || {}).textContent, home: !document.querySelector('#home').hidden, over: !document.querySelector('#gameover').hidden })"
# Firefox's own engine (idea 9 Nov): the phones and Macs Playwright has no ready dress for. Firefox on Android (Gecko, its own
# engine, unlike every browser on an iPhone) at the folded Fold's width with a touch screen; Firefox on a Mac at a laptop's size.
OWN = {
    "Firefox on Android": {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2.5, "has_touch": True,
                           "user_agent": "Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0"},
    # the Mac at 1x: the runner draws with the CPU, and a 2880x1800 board took so long a frame that the click's press and release
    # arrived a count's length apart (a held press counts the pit instead of playing it) — a real Mac's GPU never does that
    "Firefox on a Mac": {"viewport": {"width": 1440, "height": 900}, "device_scale_factor": 1, "has_touch": False,
                         "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0"},
}
ENGINE = {"webkit": "Safari's engine", "firefox": "Firefox's engine", "chromium": "Chrome's engine"}.get(browser, browser)
report = []; bad = []
def section(title, lines): report.append("### " + title); report.extend(lines); report.append("")

with sync_playwright() as p:
    bt = getattr(p, browser)
    # Firefox on a runner with no graphics card: headless Gecko gives no WebGL at all, so the workflow runs it headed on a virtual
    # screen (xvfb-run, HEADED=1) and these prefs let it draw with the CPU (Mesa's llvmpipe), as a phone's GPU would
    ff = {"firefox_user_prefs": {"webgl.force-enabled": True, "webgl.disabled": False, "layers.acceleration.force-enabled": True}} if browser == "firefox" else {}
    b = bt.launch(headless=os.environ.get("HEADED") != "1", **ff)
    dev = dict(OWN[device]) if device in OWN else dict(p.devices[device]) if device in p.devices else {"viewport": {"width": 390, "height": 844}, "is_mobile": True, "has_touch": True}
    if browser != "webkit": dev = {k: v for k, v in dev.items() if k != "default_browser_type"}
    if browser == "firefox": dev.pop("is_mobile", None)  # Playwright's Firefox has no phone mode; the touch screen, the size and the browser's own name are what the game reads
    print("browser:", browser, b.version, "· device:", device)
    def visit(name, path, play=False):
        ctx = b.new_context(**{k: v for k, v in dev.items() if k != "default_browser_type"})
        if play: ctx.add_init_script("try { localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); } catch (e) {}")  # a phone that has had its lesson and tips: a plain game, nothing over the pits
        pg = ctx.new_page(); errs = []; fails = []; cons = []
        pg.on("pageerror", lambda e: errs.append(str(e) + ((" @ " + e.stack.splitlines()[1].strip()) if getattr(e, "stack", None) and len(e.stack.splitlines()) > 1 else "")))
        pg.on("console", lambda m: cons.append("%s: %s" % (m.type, m.text)) if m.type in ("error", "warning") else None)
        pg.on("requestfailed", lambda r: fails.append("%s %s (%s)" % (r.method, r.url[:120], r.failure)))
        pg.on("response", lambda r: fails.append("%d %s" % (r.status, r.url[:120])) if r.status >= 400 else None)
        t0 = time.time(); pg.goto(BASE + path, wait_until="commit", timeout=60000)
        try: pg.wait_for_function("window.__ayoUp || document.querySelector('#bootFail')", timeout=45000, polling=250)
        except Exception: pass
        s = pg.evaluate(STATE); secs = time.time() - t0
        moved = None; trace = []
        if s["up"] and play:
            try:
                pg.evaluate("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done')")  # past the first-game lesson: a plain game
                if s["home"]:
                    pg.click("#playBtn", timeout=10000)
                pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy && window.__ayo.legal.length && window.__ayo.state.turn === 0", timeout=60000)
                n0 = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]")
                x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit); how = "a finger" if dev.get("has_touch") else "the mouse"
                def press():
                    if how == "a finger": pg.touchscreen.tap(x, y)
                    else: pg.mouse.click(x, y)
                pg.evaluate("""() => { const c = document.querySelector('canvas'); window.__evs = [];
                  for (const k of ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'])
                    document.addEventListener(k, (e) => window.__evs.push(k + (e.pointerType ? ':' + e.pointerType : '') + '@' + (e.target.id || e.target.tagName) + (e.clientX != null ? ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY) : '')), true); }""")
                trace.append("before the tap: at (%d, %d) the page has %s; the board's own hit test says %s; canvas %s" % (x, y,
                    pg.evaluate("(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.tagName) + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : '') : 'nothing'; })", [x, y]),
                    pg.evaluate("window.__ayo.hitTest(%d, %d)" % (x, y)), pg.evaluate("JSON.stringify(document.querySelector('canvas').getBoundingClientRect())")))
                press(); pg.wait_for_timeout(500)
                trace.append("events seen: %s" % pg.evaluate("window.__evs.join(' | ') || 'none'"))
                if pg.evaluate("window.__ayo.selected") != pit and dev.get("has_touch"):  # say so, then try the mouse, so the rest can still be checked
                    trace.append("a finger's tap on pit %d at (%d, %d) picked nothing (selected: %s, hint: %s)" % (pit, x, y, pg.evaluate("window.__ayo.selected"), pg.evaluate("document.querySelector('#hint').textContent")))
                    bad.append(name + ": " + trace[-1]); how = "the mouse"; pg.evaluate("window.__evs.length = 0"); press(); pg.wait_for_timeout(500)
                    trace.append("the mouse: events seen: %s · selected: %s · hint: %s · busy %s · body %s" % (pg.evaluate("window.__evs.join(' | ') || 'none'"), pg.evaluate("window.__ayo.selected"), pg.evaluate("document.querySelector('#hint').textContent"), pg.evaluate("window.__ayo.busy"), pg.evaluate("document.body.className")))
                press()
                for k in range(24):  # up to two minutes, saying where the game stands every 5 s
                    if pg.evaluate("window.__ayo.state.moves.length >= %d && !window.__ayo.busy || window.__ayo.state.over" % (n0 + 2)): break
                    pg.wait_for_timeout(5000)
                    trace.append("%ds: %s" % ((k + 1) * 5, pg.evaluate(SNAP)))
                else: raise Exception("no reply after 2 minutes")
                moved = "played pit %d with %s, the reply came: %s" % (pit, how, pg.evaluate("window.__ayo.state.moves.join(' ')"))
            except Exception as e:
                moved = "could not play a move: " + str(e).splitlines()[0][:200]; bad.append(name + ": " + moved)
        pic = "%s-%s.png" % (out, name)
        try: pg.screenshot(path=pic, timeout=60000)
        except Exception as e: pic = "(no picture: %s)" % str(e).splitlines()[0][:120]
        ok = s["up"] and not errs
        if not s["up"]: bad.append("%s: the board did not start%s" % (name, (" — " + s["fail"]) if s["fail"] else ""))
        if errs: bad.append("%s: %d page error(s), first: %s" % (name, len(errs), errs[0][:200]))
        lines = ["- **%s** after %.1f s" % ("started" if s["up"] else "did NOT start", secs),
                 "- boot screen: " + (s["fail"] or ("still waiting" if s["wait"] else "none")),
                 "- 3D library from: %s · canvas %s · %s" % (s["three"] or "(not said)", s["canvas"], s["gl"]),
                 "- browser: `%s`" % s["ua"]]
        if moved: lines.append("- move: " + moved)
        if trace: lines.append("- while it played:"); lines += ["  - `%s`" % t[:400] for t in trace[:30]]
        lines.append("- page errors: " + (str(len(errs)) if errs else "none")); lines += ["  - `%s`" % e[:400] for e in errs[:8]]
        if cons: lines.append("- console errors/warnings:"); lines += ["  - `%s`" % c[:300] for c in cons[:12]]
        if fails: lines.append("- failed requests:"); lines += ["  - `%s`" % f for f in fails[:12]]
        lines.append("- picture: " + pic)
        section("%s — %s" % (name, path or "/"), lines); print(name, "started" if s["up"] else "DID NOT START", json.dumps(s)[:400], errs[:3])
        ctx.close(); return ok
    visit("game", "", play=True)
    visit("invite", "?room=QZXW")
    b.close()
node.terminate()

head = ["## %s check (%s, dressed as %s)" % (ENGINE, browser, device), "", ("**All good** — the board started on every page and no page threw." if not bad else "**Trouble:**")]
head += ["- " + x for x in bad]; head.append("")
md = "\n".join(head + report)
with open(out + ".md", "w") as f: f.write(md)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f: f.write(md + "\n")
print(md)
sys.exit(1 if bad else 0)
