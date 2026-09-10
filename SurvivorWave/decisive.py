from playwright.sync_api import sync_playwright
import json

JS = """() => {
  const cv = document.getElementById('cv');
  const g = cv.getContext('2d');
  const sample = (x, y) => { const d = g.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
  const res = {state, before: sample(49, 33)};
  renderHUD();               // draw the full chain synchronously
  res.after = sample(49, 33); // level-pill center pixel right after
  res.after2 = sample(128, 34); // kills text area
  return res;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto("http://localhost:8993/survivor-wave.html?v=21")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(2500)
    r = pg.evaluate(JS)
    pg.screenshot(path='decisive.png')
    print(json.dumps(r, indent=1))
    b.close()
