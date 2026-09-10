from playwright.sync_api import sync_playwright
import json

JS = """() => {
  const res = {};
  try { renderHUD(); res.hud = 'ok'; } catch(e) {
    res.hud = 'THROW: ' + e.message;
    res.stack = (e.stack || '').split('\\n').slice(0,4).join(' | ');
  }
  res.hudLen = renderHUD.toString().length;
  res.hasDrawWorld = renderHUD.toString().indexOf('drawWorld') >= 0;
  return res;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto("http://localhost:8993/survivor-wave.html?v=16")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(1000)
    out = pg.evaluate(JS)
    print(json.dumps(out, indent=1))
    b.close()
