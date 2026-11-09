# A Windows Contrast theme (idea 9 Nov, late night): Windows' high-contrast themes (Settings → Accessibility → Contrast
# themes), with Edge or Chrome, repaint every colour on a page in the theme's handful (the page sees forced-colors: active)
# and throw away backgrounds. Before this, the chosen Nchò / Relay / Medium / Loser looked like the others, the switches
# lost their knobs and the board and seed swatches came out as empty rings. web/index.html now answers in the theme's own
# colours. This opens the real server in headless Chromium with forced colours on (Playwright's forced_colors, Chromium's
# own forcing), at the phone (390x844) and the Mac (1180x820), and checks on Home, Settings and the Store:
#   1. every chosen choice (aria-pressed="true") is painted differently from an unchosen one beside it;
#   2. every switch has a knob that stands out from its track, and on and off look different;
#   3. every visible button or choice has a frame or a fill of its own (nothing is bare words);
#   4. the wood and seed swatches keep their colours (not repainted to the theme's background);
#   5. a game opens and a real move plays, with no page error.
# Usage: python3 tools/forced.py [picture.png]   -> the picture (default docs/render-2026-11-09-forced.png): Settings as drawn | in a Contrast theme
import io, os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright
from PIL import Image
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-forced.png"))
tmp = os.path.join(os.environ.get("TMPDIR", "/tmp"), "ayo-forced"); os.makedirs(tmp, exist_ok=True)
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p
PORT = int(os.environ.get("PORT", "0")) or free_port()
BASE = "http://127.0.0.1:%d" % PORT

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("forced: " + what + ((" · " + errs[0]) if errs else ""))

def page(ctx, tag):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    pg.route("https://fonts.gstatic.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def up(pg): pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
def home(pg):
    pg.goto(BASE + "/?capture=1&stay=home", wait_until="load"); up(pg)
    pg.wait_for_function("!document.querySelector('#home').hidden", timeout=30000)

# what the page shows in a screen, read from the computed colours (what Chromium paints after forcing)
JUDGE = r"""(scope) => {
  const root = document.querySelector(scope);
  const seen = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  const bg = el => getComputedStyle(el).backgroundColor, img = el => getComputedStyle(el).backgroundImage;
  const clear = c => c === 'transparent' || /rgba\(.*, 0\)$/.test(c);
  const pageBg = bg(document.body);
  const out = { ringed: [], chosen: [], switches: [], bare: [], swatches: [] };
  // 1. chosen against an unchosen sibling in the same group
  for (const on of root.querySelectorAll('[aria-pressed="true"]')) {
    if (!seen(on) || on.classList.contains('chip')) continue;
    if (on.classList.contains('swatch')) { out.ringed.push([on.dataset.v || 'swatch', getComputedStyle(on).outlineStyle !== 'none' && parseFloat(getComputedStyle(on).outlineWidth) >= 2]); continue; }
    const off = [...on.parentElement.children].find(b => b !== on && b.getAttribute('aria-pressed') === 'false' && seen(b) && b.className === on.className);
    if (off) { const k = scope.slice(1) + out.chosen.length; on.dataset.fcOn = k; off.dataset.fcOff = k; out.chosen.push([on.textContent.trim().slice(0, 24) || on.className, k]); }
  }
  // 2. switches: the knob stands out from the track, on and off differ
  for (const sw of root.querySelectorAll('.sw')) {
    if (!seen(sw)) continue; const k = sw.querySelector('i');
    out.switches.push([sw.id || sw.getAttribute('aria-label') || 'switch', sw.getAttribute('aria-checked'), bg(sw), k ? bg(k) : '', k && bg(k) !== bg(sw) && !clear(bg(k))]);
  }
  // 3. every button or choice has a frame or a fill of its own
  for (const b of root.querySelectorAll('button.btn,button.segbtn,button.pill,button.choose,button.chip,button.play,button.sw')) {
    if (!seen(b)) continue; const cs = getComputedStyle(b);
    const framed = parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none' && !clear(cs.borderTopColor);
    const filled = !clear(bg(b)) && bg(b) !== pageBg;
    if (!framed && !filled) out.bare.push(b.id || b.textContent.trim().slice(0, 24) || b.className);
  }
  // 4. swatches keep their colours
  for (const s of root.querySelectorAll('.swatch')) {
    if (!seen(s)) continue; const c = bg(s), i = img(s);
    out.swatches.push([s.dataset.v || s.className, (i && i !== 'none') || (!clear(c) && c !== pageBg)]);
  }
  return out;
}"""

def judge(pg, scope, name, size):
    r = pg.evaluate(JUDGE, scope)
    check(len(r["chosen"]) > 0 or name == "Home (store closed)", "%s, %s: has chosen choices to look at (%d)" % (name, size, len(r["chosen"])))
    for what, k in r["chosen"]:  # judged on the pixels: the computed colours can differ only in an alpha the theme then hides
        a = mean(pg.locator('[data-fc-on="%s"]' % k).screenshot()); b = mean(pg.locator('[data-fc-off="%s"]' % k).screenshot())
        d = sum(abs(x - y) for x, y in zip(a, b))
        check(d >= 120, "%s, %s: the chosen %r stands out from the others (%.0f apart)" % (name, size, what, d))
    for v, ok in r["ringed"]: check(ok, "%s, %s: the chosen %s swatch has a ring round it" % (name, size, v))
    states = set()
    for sid, on, track, knob, ok in r["switches"]:
        check(ok, "%s, %s: the switch %s has a knob that stands out (%s on %s)" % (name, size, sid, knob, track)); states.add((on, track))
    if len({s[0] for s in states}) == 2: check(len({s[1] for s in states}) == 2, "%s, %s: a switch on and a switch off look different" % (name, size))
    check(not r["bare"], "%s, %s: every button has a frame or a fill (%s)" % (name, size, ", ".join(r["bare"][:6]) or "all %d" % 0))
    for v, ok in r["swatches"]: check(ok, "%s, %s: the %s swatch keeps its colour" % (name, size, v))
    return r

def mean(png):
    im = Image.open(io.BytesIO(png)).convert("RGB"); w, h = im.size; n = float(w * h)
    r = g = b = 0
    for (cr, cg, cb) in (im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()): r += cr; g += cg; b += cb
    return (r / n, g / n, b / n)

SIZES = [("phone", {"width": 390, "height": 844, "touch": True}), ("Mac", {"width": 1180, "height": 820, "touch": False})]

def run(browser, size, forced, tag):
    w = size[1]
    ctx = browser.new_context(viewport={"width": w["width"], "height": w["height"]}, has_touch=w["touch"], is_mobile=w["touch"],
                              forced_colors="active" if forced else "none", color_scheme="dark", reduced_motion="reduce", locale="en-GB")
    ctx.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); localStorage.setItem('ayo.name','Meka');")
    pg = page(ctx, tag); shot = os.path.join(tmp, "%s-%s-settings.png" % (tag, size[0]))
    home(pg)
    if forced:
        check(pg.evaluate("matchMedia('(forced-colors: active)').matches"), "%s: the page hears the Contrast theme (forced-colors: active)" % size[0])
        judge(pg, "#home", "Home", size[0])
    pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])"); pg.wait_for_timeout(800)
    pg.screenshot(path=shot)
    if forced:
        judge(pg, "#settings", "Settings", size[0])
        pg.goto(BASE + "/?capture=1&stay=home", wait_until="load"); up(pg)
        pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])"); pg.wait_for_timeout(800)
        r = pg.evaluate(JUDGE, "#store")
        check(not r["bare"], "The Store, %s: every button has a frame or a fill (%s)" % (size[0], ", ".join(r["bare"][:6]) or "all"))
        for v, ok in r["swatches"]: check(ok, "The Store, %s: the %s swatch keeps its colour" % (size[0], v))
        # a real move plays
        pg.goto(BASE + "/?capture=1", wait_until="load"); up(pg)
        pg.wait_for_function("window.__ayo.state && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=60000)
        before = pg.evaluate("JSON.stringify(window.__ayo.state.pits)")
        x, y = pg.evaluate("window.__ayo.pitAt(window.__ayo.legal[0])")
        pg.mouse.click(x, y); pg.wait_for_timeout(350); pg.mouse.click(x, y)
        pg.wait_for_function("JSON.stringify(window.__ayo.state.pits) !== %r" % before, timeout=60000)
        check(True, "%s: a move plays on the board in a Contrast theme" % size[0])
    ctx.close(); return shot

def main():
    srv = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env=dict(os.environ, PORT=str(PORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try: socket.create_connection(("127.0.0.1", PORT), 0.2).close(); break
            except OSError: time.sleep(0.1)
        with sync_playwright() as p:
            b = p.chromium.launch(args=GL); pair = None
            for size in SIZES:
                f = run(b, size, True, "forced")
                if size[0] == "phone": pair = (run(b, size, False, "plain"), f)
            b.close()
        A = Image.open(pair[0]); B = Image.open(pair[1]); w, h = A.size
        pic = Image.new("RGB", (w * 2 + 12, h), (13, 9, 6)); pic.paste(A, (0, 0)); pic.paste(B, (w + 12, 0))
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True); pic.save(out)
    finally:
        srv.terminate()
    check(not errs, "no page error" + ("" if not errs else ": " + "; ".join(errs[:3])))
    print("forced: every choice, switch and button reads in a Windows Contrast theme (%s)" % os.path.relpath(out, root))

main()
