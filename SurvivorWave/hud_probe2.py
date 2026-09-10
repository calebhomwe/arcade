from playwright.sync_api import sync_playwright
import json

JS = """() => {
  const res = {state, t: Math.round(gameTime)};
  try { renderHUD(); res.direct = 'ok'; } catch(e) {
    res.direct = 'THROW: ' + e.message;
    res.stack = (e.stack || '').split('\\n').slice(0, 5);
  }
  return res;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto("http://localhost:8993/survivor-wave.html?v=20")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    for wait_s in (1, 3, 6, 10):
        pg.wait_for_timeout((wait_s - (0 if wait_s == 1 else [1,3,6,10][[1,3,6,10].index(wait_s)-1])) * 1000)
        r = pg.evaluate(JS)
        print(wait_s, 's ->', json.dumps(r))
    b.close()
