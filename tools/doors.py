# Locked doors (idea 9 Nov): checks in headless Chromium as a phone, against the real server (node server/index.js), that
#   1. the game opens and a move plays with the page's Content-Security-Policy on, and the browser reports no "Refused to …";
#   2. a name that tries to be markup cannot run: an <img onerror> and an <iframe srcdoc> with a script written into the page
#      (as a slip would write a stranger's name) are refused, and so is a <script> with a guessed key;
#   3. the page's own key changes on every load, and the legal pages run no script.
# Usage: python3 tools/doors.py
import json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
PORT = int(os.environ.get("PORT", "8798")); BASE = "http://127.0.0.1:%d/" % PORT
node = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env={**os.environ, "PORT": str(PORT), "ROOM_SECRET": "doors-check"}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
for _ in range(100):
    try: urllib.request.urlopen(BASE + "healthz", timeout=1); break
    except Exception: time.sleep(0.1)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
WATCH = "window.__refused = []; document.addEventListener('securitypolicyviolation', (e) => window.__refused.push(e.violatedDirective + ' ' + (e.blockedURI || e.sample || '')));"
def wait(pg, js, timeout=180):  # polled with evaluate: the page's policy (rightly) refuses Playwright's own eval'd waits
    end = time.time() + timeout
    while not pg.evaluate(js):
        if time.time() > end: raise SystemExit("timed out waiting for " + js)
        time.sleep(0.1)
errors = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        pg = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, has_touch=True, is_mobile=True).new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
        pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
        pg.add_init_script(WATCH)
        keys = []
        pg.on("response", lambda r: keys.append(r.headers.get("content-security-policy")) if r.url.split("?")[0] == BASE else None)
        pg.goto(BASE + "?capture=1", wait_until="load"); wait(pg, "window.__done===true")
        x, y = pg.evaluate("window.__ayo.pitAt(2)"); pg.mouse.click(x, y); pg.wait_for_timeout(300); pg.mouse.click(x, y)
        pg.wait_for_timeout(6000)
        assert pg.evaluate("window.__refused") == [], pg.evaluate("window.__refused")
        print("doors: the game opened and played with the policy on · nothing refused")
        # a slip: a stranger's "name" written into the page as markup
        pg.evaluate("""() => { const d = document.createElement('div'); d.innerHTML = '<img src="x" onerror="window.__ran=1"><b onmouseover="window.__ran=2">Tete</b>';
                     document.body.appendChild(d); const f = document.createElement('iframe'); f.srcdoc = '<script>parent.__ran=3</scr' + 'ipt>'; document.body.appendChild(f);
                     const s = document.createElement('script'); s.setAttribute('nonce', 'guessed'); s.textContent = 'window.__ran=4'; document.body.appendChild(s); }""")
        pg.wait_for_timeout(1200)
        ran = pg.evaluate("window.__ran"); refused = pg.evaluate("window.__refused")
        assert ran is None, "a typed name ran: %r" % ran
        assert any(r.startswith("script-src") for r in refused), refused
        print("doors: a name written as markup could not run (onerror, srcdoc, a guessed key) ·", len(refused), "refused")
        errors[:] = [e for e in errors if "Content Security Policy" not in e]  # those refusals were the point
        pg.reload(wait_until="load"); wait(pg, "window.__done===true")
        k = [x for x in keys if x]
        assert len(k) >= 2 and k[0] != k[1] and all("'nonce-" in x for x in k), k
        print("doors: a fresh key each load")
        lp = b.new_page(); lp.add_init_script(WATCH); lp.goto(BASE + "privacy", wait_until="load")
        assert lp.evaluate("document.scripts.length") == 0 and lp.evaluate("window.__refused") == []
        print("doors: the privacy page loads clean, no script")
        b.close()
finally:
    node.terminate()
if errors:
    print("page errors:"); [print("  " + e) for e in errors]; sys.exit(1)
print("doors ok")
