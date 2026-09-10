from playwright.sync_api import sync_playwright
import json

SETUP = """() => {
  window.__c = {upd:0, ren:0, hud:0, fw:0};
  const _u = update, _r = render, _h = renderHUD;
  update = function(){ window.__c.upd++; return _u.apply(this, arguments); };
  render = function(){ window.__c.ren++; return _r.apply(this, arguments); };
  renderHUD = (function(){ const inner = renderHUD; return function(){ window.__c.hud++; return inner.apply(this, arguments); }; })();
}"""

READ = """() => ({ c: window.__c, state })"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto("http://localhost:8993/survivor-wave.html?v=18")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(800)
    pg.evaluate(SETUP)
    pg.evaluate("() => { gold=5000; window.oil=200; player.invT=600; TOWERSYS.addTower('gatling',player.x+90,player.y-40); }")
    pg.wait_for_timeout(3000)
    a = pg.evaluate(READ)
    pg.wait_for_timeout(3000)
    c = pg.evaluate(READ)
    a['pageerrors'] = errs[:5]
    c['pageerrors'] = errs[:5]
    print(json.dumps({'t3s': a, 't6s': c}, indent=1))
    b.close()
