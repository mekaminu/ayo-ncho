"""The store apps' web files, checked the way the app opens them: built into app/www (tools/build-app.js), served from
the folder alone, with EVERY outside address blocked (no CDN, no fonts site, no server: the phone has no signal), and
window.Capacitor standing in for the app, its plugins logging what the game asks of them.
  python3 tools/render-app.py out.png [--wide] [--ios]
--ios: as the iPhone app (an iPhone 15-sized screen, or an iPad's with --wide): Capacitor says 'ios', the page is marked
html.ios, nothing listens for a back button (iPhones have none) and Settings → Back is tapped instead; navigator has no
vibrate (as on iOS) so the haptics must go to the app.
Checks: no page errors; three.js and both fonts load from inside the app; a real move is played and the reply comes back;
the haptics went to the phone's own motor; Settings → back button → Home; back on Home puts the app away; the share sheet
and keep-awake stand in for the browser's. Writes a picture of the board after the move.
"""
import functools, http.server, json, os, subprocess, sys, threading
from playwright.sync_api import sync_playwright

out = sys.argv[1]; wide = "--wide" in sys.argv; ios = "--ios" in sys.argv
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
www = os.path.join(root, "app", "www")
subprocess.check_call(["node", os.path.join(root, "tools", "build-app.js")])
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8769), functools.partial(Quiet, directory=www))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
FAKE = """(() => {
  const log = []; window.__appLog = log; const back = [];
  const P = (name, fns) => new Proxy({}, { get: (_, k) => (k in fns ? fns[k] : (...a) => { log.push([name, k, a[0] ?? null]); return Promise.resolve(); }) });
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => '%s', Plugins: {
    App: P('App', { addListener: (e, f) => { if (e === 'backButton') back.push(f); return Promise.resolve({ remove() {} }); }, minimizeApp: () => { log.push(['App', 'minimizeApp', null]); return Promise.resolve(); } }),
    Haptics: P('Haptics', {}), Share: P('Share', {}), KeepAwake: P('KeepAwake', {}), SplashScreen: P('SplashScreen', {}),
  } };
  window.__back = () => back.forEach((f) => f({ canGoBack: false }));
  try { Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined }); } catch {}
  try { Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined }); } catch {}
})();""" % ("ios" if ios else "android")
outside = []
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    size = ({"width": 1180, "height": 820} if wide else {"width": 393, "height": 852}) if ios else ({"width": 1180, "height": 820} if wide else {"width": 390, "height": 844})
    pg = b.new_page(viewport=size, device_scale_factor=1, has_touch=ios, is_mobile=ios and not wide)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    def gate(r):
        if r.request.url.startswith("http://127.0.0.1:8769/"): return r.continue_()
        outside.append(r.request.url); r.abort()
    pg.route("**/*", gate)
    pg.add_init_script(FAKE + "localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done');")
    pg.goto("http://127.0.0.1:8769/index.html?capture=1&stay=home", wait_until="load")
    pg.wait_for_function("window.__done===true", timeout=180000)
    assert pg.evaluate("document.documentElement.classList.contains('app')"), "the page did not notice it is inside the app"
    assert pg.evaluate("document.documentElement.classList.contains('%s')" % ("ios" if ios else "android")), "the page is not marked with its platform"
    pg.evaluate("document.fonts.ready")
    fonts = pg.evaluate("[document.fonts.check('600 20px Fraunces'), document.fonts.check('500 14px Inter')]")
    loaded = pg.evaluate("[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight)")
    assert any("Fraunces" in f for f in loaded) and any("Inter" in f for f in loaded), ("the fonts did not load from inside the app", loaded, fonts)
    assert pg.evaluate("typeof navigator.share === 'function' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function'"), "share sheet / keep-awake not in place"
    pg.click("#homeSettings")
    pg.wait_for_function("!document.querySelector('#settings').hidden", timeout=5000)
    if ios:
        # no back button on an iPhone: nothing may listen for one, and Settings' own Back goes Home
        pg.evaluate("window.__back()"); assert not any(e[1] == "minimizeApp" for e in pg.evaluate("window.__appLog")), "an iPhone has no back button to listen to"
        assert not pg.evaluate("document.querySelector('#settings').hidden"), "a back event moved the iPhone app"
        pg.click("#settingsBack")
    else:
        pg.evaluate("window.__back()")
    pg.wait_for_function("!document.querySelector('#home').hidden", timeout=5000)
    if not ios:
        # back on Home puts the app away
        pg.evaluate("window.__back()"); assert ["App", "minimizeApp", None] in pg.evaluate("window.__appLog"), "back on Home did not put the app away"
    # a real game: Play, a move, the reply
    pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
    legal = pg.evaluate("window.__ayo.legal"); pit = max(legal, key=lambda i: pg.evaluate("window.__ayo.state.pits[%d]" % i))
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit); pg.mouse.click(x, y); pg.wait_for_timeout(300); pg.mouse.click(x, y)
    pg.wait_for_function("window.__ayo.state.moves.length >= 2 && !window.__ayo.busy", timeout=240000)
    log = pg.evaluate("window.__appLog")
    assert any(e[0] == "Haptics" for e in log), ("no haptics went to the phone", log)
    assert any(e[0] == "KeepAwake" and e[1] == "keepAwake" for e in log), ("the screen was not kept on during the game", log)
    # back during a game goes Home (the game is kept); on the iPhone, the Home button on the board
    if ios: pg.click("#homeBtn")
    else: pg.evaluate("window.__back()")
    pg.wait_for_function("!document.querySelector('#home').hidden", timeout=5000)
    assert not pg.evaluate("document.querySelector('#continueBtn').disabled"), "the game should be there to continue"
    pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
    pg.wait_for_timeout(600); pg.screenshot(path=out, timeout=120000)
    b.close()
srv.shutdown()
print("app check: plugins used:", sorted({e[0] + "." + e[1] for e in log}))
print("app check: blocked outside requests:", sorted(set(outside)) or "none")
if [u for u in outside]: print("the app asked for something outside itself:", *sorted(set(outside)), sep="\n  "); sys.exit(1)
if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
print("wrote", out)
