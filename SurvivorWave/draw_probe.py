from playwright.sync_api import sync_playwright
import json

JS = """() => {
  const cvReal = document.getElementById('cv');
  const res = {
    ctxCanvasIsCv: ctx.canvas === cvReal,
    cvSize: [cvReal.width, cvReal.height],
    ctxSize: [ctx.canvas.width, ctx.canvas.height],
    canvasCount: document.querySelectorAll('canvas').length,
    cvIsFirst: document.querySelectorAll('canvas')[0] === cvReal
  };
  // instrument: count fillRect calls + capture coords during one manual renderHUD()
  const log = [];
  const orig = ctx.fillRect.bind(ctx);
  ctx.fillRect = function(x,y,w,h){ if (log.length < 12) log.push([Math.round(x), Math.round(y), Math.round(w), Math.round(h)]); return orig(x,y,w,h); };
  try { renderHUD(); } catch(e) { log.push(['THROW', e.message]); }
  ctx.fillRect = orig;
  res.fillRectCalls = log;
  return res;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto("http://localhost:8993/survivor-wave.html?v=23")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(2000)
    r = pg.evaluate(JS)
    print(json.dumps(r, indent=1))
    b.close()
