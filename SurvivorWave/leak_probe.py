from playwright.sync_api import sync_playwright
import json

JS = """() => {
  const res = {};
  const m = ctx.getTransform();
  res.transform = [m.a, m.b, m.c, m.d, Math.round(m.e), Math.round(m.f)];
  res.cam = [Math.round(cam.x), Math.round(cam.y)];
  // catch the per-frame thrower: wrap the three suspect block draws by
  // re-running their section via renderHUD with a trapping proxy on ctx
  return res;
}"""

INSTALL = """() => {
  // instrument: wrap CanvasRenderingContext2D.restore to detect imbalance per frame
  window.__saves = 0; window.__restores = 0; window.__firstThrow = null;
  const origSave = ctx.save.bind(ctx), origRestore = ctx.restore.bind(ctx);
  window.__frame = function(){ window.__saves = 0; window.__restores = 0; };
  const loopCheck = function(){
    ctx.save = origSave; ctx.restore = origRestore;
  };
  return 'installed';
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto("http://localhost:8993/survivor-wave.html?v=22")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(2000)
    r = pg.evaluate(JS)
    print(json.dumps(r, indent=1))
    b.close()
