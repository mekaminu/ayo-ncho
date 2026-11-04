"""Every icon of the game, cut from the real 3D board (L6): tools/icon-scene.html draws one pit of Job's tears under lamp
light with the game's own board.js, slots.js and textures.js (headless Chromium, software WebGL, three.js from node_modules);
this script takes two pictures of it and cuts every size the stores and the web ask for.
Run: python3 tools/app-icons.py        (about 20 s; writes everything below, then a contact sheet in docs/)

  The two pictures (1024 × 1024, opaque):
    whole  — the pit's rim 80% of the picture across: the icon as people see it
    roomy  — the same pit, the camera further back (rim 50%), for icons the launcher masks (Android's adaptive circle /
             squircle shows only the middle 67%, safe 61%; the web's maskable icon keeps the middle 80%)
  Web (web/): icon-512.png, icon-192.png (any), icon-maskable-512.png, icon-maskable-192.png (maskable), icon-180.png (the
    iPhone home screen, square: iOS rounds it), icon-32.png (the tab), icon.svg (the tab's icon as an SVG: the picture on a
    rounded tile, 128 px inside, so the away dot of web/away.js still draws on it)
  Android: mipmap-*/ic_launcher.png (legacy: rounded square), ic_launcher_round.png (circle), ic_launcher_foreground.png
    (roomy, full bleed at 108 dp: the launcher cuts its own shape); the background colour stays the dark wood
  iOS: AppIcon.appiconset/AppIcon-512@2x.png — whole at 1024, RGB with no alpha (iOS rounds the corners itself)
  Splash (Android drawables, iOS Splash.imageset): the pit in a soft-edged circle in the middle of the dark wood colour
  Stores: docs/launch/store/icon-play-512.png (Google Play's 512 × 512, square: Play rounds it) and icon-appstore-1024.png
  Docs: docs/icon-<date>.png, a contact sheet of the sizes and shapes for Meka to look at
"""
import io, pathlib, functools, threading, http.server, base64, datetime
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / 'android/app/src/main/res'
IOS = ROOT / 'ios/App/App/Assets.xcassets'
WEB = ROOT / 'web'
STORE = ROOT / 'docs/launch/store'
DARK = (13, 9, 6, 255)
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
SPLASH = {'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280), 'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920)}
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
FILL = {'whole': 0.8, 'roomy': 0.5}

def shoot():
    """The two pictures of the pit, from the real board in a browser."""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    H = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        for k, f in FILL.items():
            pg = b.new_page(viewport={'width': 1024, 'height': 1024}); errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(f'http://127.0.0.1:{srv.server_port}/tools/icon-scene.html?fill={f}')
            pg.wait_for_function('window.__done', timeout=120000)
            assert not errors, errors
            out[k] = Image.open(io.BytesIO(pg.screenshot())).convert('RGBA'); pg.close()
        b.close()
    srv.shutdown()
    return out

def size(im, s): return im.resize((s, s), Image.LANCZOS)
def cut(im, s, shape, radius=0.225):
    """im at s × s, cut to a rounded square or a circle (transparent outside), drawn 4× and brought down for a smooth edge."""
    big = size(im, s * 4); m = Image.new('L', (s * 4, s * 4), 0); d = ImageDraw.Draw(m)
    if shape == 'circle': d.ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
    else: d.rounded_rectangle((0, 0, s * 4 - 1, s * 4 - 1), radius=round(s * 4 * radius), fill=255)
    o = Image.new('RGBA', (s * 4, s * 4), (0, 0, 0, 0)); o.paste(big, (0, 0), m); return size(o, s)
def opaque(im): flat = Image.new('RGBA', im.size, DARK); flat.alpha_composite(im); return flat.convert('RGB')

def main():
    pic = shoot(); whole, roomy = pic['whole'], pic['roomy']
    # web
    for s in (512, 192): opaque(size(whole, s)).save(WEB / f'icon-{s}.png', optimize=True); opaque(size(roomy, s)).save(WEB / f'icon-maskable-{s}.png', optimize=True)
    opaque(size(whole, 180)).save(WEB / 'icon-180.png', optimize=True)
    cut(whole, 32, 'square').save(WEB / 'icon-32.png', optimize=True)
    buf = io.BytesIO(); opaque(size(whole, 128)).save(buf, 'PNG', optimize=True)
    (WEB / 'icon.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">\n'
        '  <!-- one pit of Job\'s tears from the 3D board (tools/app-icons.py); the away dot (web/away.js) is drawn over it -->\n'
        '  <defs><clipPath id="tile"><rect width="512" height="512" rx="112"/></clipPath></defs>\n'
        '  <rect width="512" height="512" rx="112" fill="#0d0906"/>\n'
        f'  <image clip-path="url(#tile)" width="512" height="512" href="data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"/>\n'
        '</svg>\n')
    # Android
    for d, k in DENS.items():
        out = RES / f'mipmap-{d}'; s = round(48 * k)
        cut(whole, s, 'square', 0.18).save(out / 'ic_launcher.png', optimize=True)
        cut(whole, s, 'circle').save(out / 'ic_launcher_round.png', optimize=True)
        opaque(size(roomy, round(108 * k))).save(out / 'ic_launcher_foreground.png', optimize=True)
    (RES / 'values/ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0D0906</color>\n</resources>\n')
    # the splash: the pit in a circle whose edge melts into the dark wood colour
    def disc(s):
        im = size(whole, s); m = Image.new('L', (s, s), 0); e = round(s * 0.08)
        ImageDraw.Draw(m).ellipse((e, e, s - e, s - e), fill=255); m = m.filter(ImageFilter.GaussianBlur(s * 0.04))
        o = Image.new('RGBA', (s, s), (0, 0, 0, 0)); o.paste(im, (0, 0), m); return o
    def splash(w, h, path, share=0.36):
        im = Image.new('RGBA', (w, h), DARK); s = round(min(w, h) * share); im.alpha_composite(disc(s), ((w - s) // 2, (h - s) // 2)); im.convert('RGB').save(path, optimize=True)
    for d, (w, h) in SPLASH.items():
        splash(w, h, RES / f'drawable-port-{d}/splash.png'); splash(h, w, RES / f'drawable-land-{d}/splash.png')
    splash(480, 320, RES / 'drawable/splash.png')
    # iOS
    opaque(whole).save(IOS / 'AppIcon.appiconset/AppIcon-512@2x.png', optimize=True)
    for n in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'): splash(2732, 2732, IOS / 'Splash.imageset' / n, 0.26)
    # the stores
    STORE.mkdir(parents=True, exist_ok=True)
    opaque(size(whole, 512)).save(STORE / 'icon-play-512.png', optimize=True); opaque(whole).save(STORE / 'icon-appstore-1024.png', optimize=True)
    # a contact sheet for Meka: the big icon, then how each phone shows it, on the dark wood and on a light wallpaper
    sheet = Image.new('RGBA', (1600, 900), (24, 17, 12, 255)); sheet.alpha_composite(cut(whole, 560, 'square'), (60, 170))
    light = Image.new('RGBA', (840, 260), (226, 218, 204, 255)); sheet.alpha_composite(light, (700, 480))
    x = 700
    for s, shape, src in ((180, 'square', whole), (120, 'circle', roomy.crop((171, 171, 853, 853))), (96, 'square', whole), (60, 'circle', whole), (40, 'square', whole)):
        for y in (210, 520):
            sheet.alpha_composite(cut(src, s, shape), (x, y + (180 - s) // 2))
        x += s + 40
    d = ImageDraw.Draw(sheet)
    def font(px):
        for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/opentype/inter/Inter-Regular.otf'):
            try: return ImageFont.truetype(f, px)
            except OSError: pass
        return ImageFont.load_default()
    d.text((60, 56), "Ayo & Nchò — the app icon, cut from the 3D board", fill=(230, 183, 111, 255), font=font(34))
    d.text((60, 108), "iPhone (rounded square) · Android (circle) · 96 · 60 · 40 px — on the dark wood and on a light wallpaper", fill=(210, 200, 185, 255), font=font(20))
    sheet.convert('RGB').save(ROOT / f'docs/icon-{datetime.date.today().isoformat()}.png', optimize=True)
    print('icons written: web/, android res, iOS assets, docs/launch/store/, docs/icon-*.png')

if __name__ == '__main__':
    main()
