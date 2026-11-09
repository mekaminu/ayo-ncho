# Stronger words when asked (idea 9 Nov, late night): a phone or Mac set to "Increase contrast" (iPhone and iPad: Accessibility
# → Display → Increase Contrast; the Mac: Accessibility → Display → Increase contrast; Chrome and Samsung Internet pass the
# same on) tells the page so (prefers-contrast: more), and the game's faint words — the small grey lines under a name, the
# labels, the counts on empty pits, the chips laid over the board — should then come up strong enough to read at arm's length.
# axe (tools/a11y.py) cannot judge them, because the words sit over the carved wood and the 3D board, a picture it cannot
# measure. This does: it opens each screen in headless Chromium, notes every word on it (its colour, how faded it and its
# parents are, its size and weight), takes the same screen with every word made invisible, and judges each word against the
# real pixels that were behind it (tools/contrast.js, WCAG 2.2: the worst tenth of the pixels under the word).
#   1. asked for more contrast: every word reaches 7:1 (4.5:1 for large words — WCAG's AAA, the enhanced level), on every
#      screen, at the phone (390x844, touch), the Fold open (800x900) and the Mac (1180x820), in English and French; the
#      check fails otherwise and names them;
#   2. it reports how many words fall under 4.5:1 (AA) as the game is drawn normally (never failed: the approved look keeps
#      its soft greys, and nearly every word passes anyway);
#   3. the page follows the setting live: turned on with the game open, the words come up at once;
#   4. no page error.
# Usage: python3 tools/contrast.py [picture.png] [--quick]   -> the picture (default docs/render-2026-11-09-contrast.png):
#        Home and Settings at the phone, as drawn | asked for more contrast
import base64, json, os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright
from PIL import Image
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-contrast.png"))
QUICK = "--quick" in sys.argv
tmp = os.path.join(os.environ.get("TMPDIR", "/tmp"), "ayo-contrast"); os.makedirs(tmp, exist_ok=True)
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
MATH = open(os.path.join(root, "tools", "contrast.js")).read().replace("export function", "function")
errs = []

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p
PORT = int(os.environ.get("PORT", "0")) or free_port()
BASE = "http://127.0.0.1:%d" % PORT

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("contrast: " + what + ((" · " + errs[0]) if errs else ""))

# every word on the screen a reader can see: where its letters are, its colour as drawn (with its own alpha and every parent's
# opacity), its size and weight. Words that are not there to be read are left out: hidden or faded to nothing, off the screen,
# a disabled control (WCAG leaves those out too), aria-hidden decoration, a lone symbol or dot.
COLLECT = r"""() => {
  const out = [];
  const W = innerWidth, H = innerHeight;
  const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Map();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim();
    if (!t || !/[\p{L}\p{N}]/u.test(t)) continue;
    const el = n.parentElement; if (!el || el.closest('svg,canvas,script,style,noscript,[aria-hidden="true"],[hidden],:disabled,[inert]')) continue;
    const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || cs.display === 'contents' && false) continue;
    let a = 1; for (let p = el; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none') { a = 0; break; } a *= parseFloat(s.opacity); }
    const fg = rgba(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color && !/rgba?\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color);
    if (!fg) continue; a *= fg[3]; if (a < 0.05) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const b of r.getClientRects()) {
      if (b.width < 2 || b.height < 4) continue;
      const x0 = Math.max(0, Math.floor(b.left)), y0 = Math.max(0, Math.floor(b.top)), x1 = Math.min(W, Math.ceil(b.right)), y1 = Math.min(H, Math.ceil(b.bottom));
      if (x1 - x0 < 2 || y1 - y0 < 4) continue;
      // something else laid over the word (a card over the Home list) hides it: judged where it is seen only
      const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2); if (top && top !== el && !el.contains(top) && !top.contains(el)) continue;
      let who = el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      const host = el.closest('[id]'); if (host && host !== el) who = '#' + host.id + ' ' + who;
      out.push({ who, text: t.slice(0, 40), fg: fg.slice(0, 3), alpha: a, px: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) || 400, box: [x0, y0, x1, y1] });
    }
  }
  return out;
}"""
HIDE = "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important;caret-color:transparent!important;transition:none!important}"
JUDGE = MATH + r"""
async ([png, items, more]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  return items.map((w) => {
    const [x0, y0, x1, y1] = w.box;
    const r = judge(w.fg, w.alpha, g.getImageData(x0, y0, x1 - x0, y1 - y0).data);
    return { ...w, ratio: Math.round(r * 100) / 100, needs: needs(w.px, w.weight, false), aaa: needs(w.px, w.weight, true) };
  });
}"""

def page(ctx, tag):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    pg.route("https://fonts.gstatic.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def up(pg): pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
def home(pg, lang):
    pg.goto(BASE + "/?capture=1&stay=home&lang=" + lang, wait_until="load"); up(pg)
    pg.wait_for_function("!document.querySelector('#home').hidden", timeout=30000)
def s_home(pg, lang): home(pg, lang)
def s_friends(pg, lang):
    home(pg, lang); pg.click("#friendsBtn"); pg.wait_for_timeout(600)
    if pg.evaluate("!document.querySelector('#nameCard').hidden"): pg.fill("#nameField", "Meka"); pg.click("#nameGo"); pg.wait_for_timeout(600)
def s_settings(pg, lang): home(pg, lang); pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
def s_feel(pg, lang):
    s_settings(pg, lang); pg.evaluate("document.querySelector('#physicsNow').closest('.row').scrollIntoView({ block: 'center' })")
def s_lower(pg, lang):
    s_settings(pg, lang); pg.evaluate("(() => { const s = document.querySelector('#settings'); const b = s.querySelector('.sheet') || s; (b.scrollHeight > b.clientHeight ? b : s).scrollTop = 1e6; })()")
def s_store(pg, lang): home(pg, lang); pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])")
def s_puzzle(pg, lang): home(pg, lang); pg.click("#puzzleCard")
def s_game(pg, lang):
    pg.goto(BASE + "/?capture=1&lang=" + lang, wait_until="load"); up(pg)
    pg.wait_for_function("window.__ayo.state && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=60000)
def s_moved(pg, lang):
    s_game(pg, lang)
    pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    pg.mouse.click(x, y); pg.wait_for_timeout(300)
    if pg.evaluate("window.__ayo.state.moves.length === 0 && !window.__ayo.busy"): pg.mouse.click(x, y)
    pg.wait_for_function("window.__ayo.state.moves.length >= 2 && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=120000)
def s_rules(pg, lang): s_game(pg, lang); pg.click("#rulesBtn"); pg.wait_for_selector("#rules:not([hidden])")
def legal(name):
    def go(pg, lang): pg.goto(BASE + "/" + name + ("" if lang == "en" else "?lang=" + lang), wait_until="load")
    return go
SCREENS = [("Home", s_home), ("With friends", s_friends), ("Settings", s_settings), ("Settings → Feel", s_feel), ("Settings, the end", s_lower),
           ("The Store", s_store), ("The daily puzzle", s_puzzle), ("A game at its start", s_game), ("After a move and the reply", s_moved),
           ("How to play", s_rules), ("Privacy", legal("privacy")), ("Terms", legal("terms")), ("Support", legal("support"))]
SIZES = [("phone", {"width": 390, "height": 844, "touch": True}), ("Fold open", {"width": 800, "height": 900, "touch": True}), ("Mac", {"width": 1180, "height": 820, "touch": False})]
LANGS = ["en", "fr"]
if QUICK: SIZES = SIZES[:1]; LANGS = LANGS[:1]

def measure(pg, more, tag):
    pg.evaluate("(() => { const b = document.querySelector('#bubble'); if (b) b.hidden = true; })()")
    pg.wait_for_timeout(300)
    items = pg.evaluate(COLLECT)
    pg.add_style_tag(content=HIDE)
    pg.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")
    png = pg.screenshot()
    pg.evaluate("document.querySelectorAll('style').forEach((s) => { if (s.textContent.startsWith('*,*::before')) s.remove(); })")
    return pg.evaluate(JUDGE, [base64.b64encode(png).decode(), items, more])

def run(browser, size, lang, more):
    w = size[1]
    ctx = browser.new_context(viewport={"width": w["width"], "height": w["height"]}, has_touch=w["touch"], is_mobile=w["touch"],
                              color_scheme="dark", reduced_motion="reduce", contrast="more" if more else "no-preference", locale="en-GB", bypass_csp=True)
    ctx.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); localStorage.setItem('ayo.name','Meka');")
    pg = page(ctx, "%s %s %s" % (size[0], lang, "more" if more else "as drawn")); res = {}
    for name, go in SCREENS:
        go(pg, lang); pg.wait_for_timeout(1200)
        res[name] = measure(pg, more, name)
        if size[0] == "phone" and lang == "en" and name in ("Home", "Settings"):
            pg.screenshot(path=os.path.join(tmp, "%s-%s.png" % ("more" if more else "drawn", name)))
    ctx.close(); return res

def live(browser):
    # the setting changed with the game open: the words come up at once, and go back when it is turned off
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, color_scheme="dark", reduced_motion="reduce", bypass_csp=True)
    ctx.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done');")
    pg = page(ctx, "live"); home(pg, "en"); pg.wait_for_timeout(800)
    muted = "getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()"
    a = pg.evaluate(muted); pg.emulate_media(contrast="more"); pg.wait_for_timeout(100); b = pg.evaluate(muted)
    pg.emulate_media(contrast="no-preference"); pg.wait_for_timeout(100); c = pg.evaluate(muted)
    ctx.close(); return a, b, c

def main():
    srv = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env=dict(os.environ, PORT=str(PORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try: socket.create_connection(("127.0.0.1", PORT), 0.2).close(); break
            except OSError: time.sleep(0.1)
        with sync_playwright() as p:
            br = p.chromium.launch(args=GL)
            total = aaa = soft = drawn_total = 0; bad = []
            for size in SIZES:
                for lang in LANGS:
                    m = run(br, size, lang, True)
                    for name, ws in m.items():
                        low = [w for w in ws if w["ratio"] < w["aaa"]]
                        total += len(ws); aaa += sum(1 for w in ws if w["ratio"] >= w["aaa"])
                        if "--list" in sys.argv and lang == "en":
                            for w in ws:
                                if w["ratio"] < w["aaa"]: print("  more, under AAA %s %s: %s %r %.2f:1" % (size[0], name, w["who"], w["text"], w["ratio"]))
                        for w in low: bad.append("%s %s, %s: %s %r %.2f:1" % (size[0], lang, name, w["who"], w["text"], w["ratio"]))
                    if size[0] == "phone":
                        d = run(br, size, lang, False)
                        for name, ws in d.items():
                            drawn_total += len(ws); soft += sum(1 for w in ws if w["ratio"] < w["needs"])
                            if lang == "en" and "--list" in sys.argv:
                                for w in ws:
                                    if w["ratio"] < w["needs"]: print("  as drawn %s: %s %r %.2f:1" % (name, w["who"], w["text"], w["ratio"]))
                    print("ok   measured %s, %s (%d screens)" % (size[0], lang, len(SCREENS)), flush=True)
            for b in bad[:60]: print("  " + b)
            check(not bad, "asked for more contrast, every word reaches 7:1 (4.5:1 large, WCAG's AAA) over what is behind it: %d of %d words fall short" % (len(bad), total))
            print("note as drawn (the approved look) on the phone, %d of %d words are under 4.5:1 (3:1 large) over the wood — not failed" % (soft, drawn_total))
            a, b, c = live(br)
            check(a != b and a == c, "the page follows the setting live: --muted %s, asked for more %s, and back to %s" % (a, b, c))
            br.close()
        A = Image.open(os.path.join(tmp, "drawn-Home.png")); B = Image.open(os.path.join(tmp, "more-Home.png"))
        C = Image.open(os.path.join(tmp, "drawn-Settings.png")); D = Image.open(os.path.join(tmp, "more-Settings.png")); w, h = A.size
        pic = Image.new("RGB", (w * 4 + 36, h), (13, 9, 6))
        for i, im in enumerate((A, B, C, D)): pic.paste(im.convert("RGB"), (i * (w + 12), 0))
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True); pic.save(out)
    finally:
        srv.terminate()
    check(not errs, "no page error" + ("" if not errs else ": " + "; ".join(errs[:3])))
    print("contrast: asked for more contrast, every word on every screen reaches WCAG's AAA (%s)" % os.path.relpath(out, root))

main()
