# Locked doors (idea 9 Nov): the real server sends the page with a Content-Security-Policy that refuses eval, and Playwright's
# wait_for_function compiles its predicate inside the page with eval (in Chromium and WebKit alike), so a wait on a locked page
# fails at once. evaluate goes round the policy, so install() makes every wait poll with evaluate instead. Used by the checks
# that open the real server or serve the page locked: tools/render.py, tools/webkit-check.py, tools/firstopen.py.
import time
from playwright.sync_api import Page, Frame, TimeoutError

def _poll(self, expression, arg=None, timeout=30000, polling=None):
    every = polling / 1000.0 if isinstance(polling, (int, float)) else 0.05
    end = time.time() + (30000 if timeout is None else timeout) / 1000.0
    while True:
        v = self.evaluate(expression, arg) if arg is not None else self.evaluate(expression)
        if v: return v
        if time.time() > end: raise TimeoutError("wait_for_function (polled, the page locked): timeout %sms exceeded waiting for %s" % (timeout, str(expression)[:120]))
        time.sleep(every)

def install():
    Page.wait_for_function = _poll; Frame.wait_for_function = _poll
