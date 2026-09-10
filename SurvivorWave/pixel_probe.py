from playwright.sync_api import sync_playwright
import json

PROBE = """() => {
  const cv = document.getElementById('cv');
  const g = cv.getContext('2d');
  const pts = {pill1:[40,66], pill2:[40,86], xpbar:[640,6], minimap:[1210,110], oilbar:[60,144]};
  const out = {};
  for (const k in pts) {
    const [x,y] = pts[k];
    const d = g.getImageData(x, y, 1, 1).data;
    out[k] = [d[0], d[1], d[2], d[3]];
  }
  out.W = W; out.H = H; out.state = state;
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto("http://localhost:8993/survivor-wave.html?v=19")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(2000)
    r1 = pg.evaluate(PROBE)
    pg.evaluate("() => { gold=500; TOWERSYS.addTower('gatling',player.x+90,player.y-40); }")
    pg.wait_for_timeout(1500)
    r2 = pg.evaluate(PROBE)
    print(json.dumps({'menu_run_start': r1, 'with_tower': r2}, indent=1))
    b.close()
