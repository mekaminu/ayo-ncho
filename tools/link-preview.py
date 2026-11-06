#!/usr/bin/env python3
"""The picture a shared link shows (WhatsApp, iMessage, Telegram, Facebook): web/share-board.jpg and web/share-board-fr.jpg,
1200 x 630 (the size Open Graph asks for), cut from the real board by tools/feature-scene.html, the same scene as Google
Play's banner: the carved board lying across the picture under the lamp, the name on the dark wood to its left.
server/preview.js points og:image at them. Run once when the look changes:  python3 tools/link-preview.py
"""
import os, sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
from PIL import Image

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
W, H = 1200, 630

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv

def main():
    srv = serve(); base = f"http://127.0.0.1:{srv.server_port}"; tmp = os.path.join(root, "web", "_share.png")
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        for lang, name in (("en", "share-board.jpg"), ("fr", "share-board-fr.jpg")):
            pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
            errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(f"{base}/tools/feature-scene.html?w={W}&h={H}&off=0.16&cy=1.25" + ("&lang=fr" if lang == "fr" else ""), wait_until="load")
            pg.wait_for_function("window.__done === true", timeout=240000)
            pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
            if errs: sys.exit("page error: " + errs[0])
            pg.screenshot(path=tmp); pg.close()
            out = os.path.join(root, "web", name)
            Image.open(tmp).convert("RGB").resize((W, H), Image.LANCZOS).save(out, "JPEG", quality=84, optimize=True, progressive=True)
            kb = os.path.getsize(out) // 1024
            if kb > 300: sys.exit(f"{name} is {kb} KB: WhatsApp skips pictures over about 300 KB")
            print(name, f"{kb} KB")
        b.close()
    os.remove(tmp); srv.shutdown()

if __name__ == "__main__":
    main()
