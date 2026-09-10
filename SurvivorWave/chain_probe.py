from playwright.sync_api import sync_playwright
import json

JS = """() => {
  const res = {};
  res.head = renderHUD.toString().slice(0, 160).replace(/\\s+/g, ' ');
  res.len = renderHUD.toString().length;
  res.guards = {
    oil: typeof KSC_OIL_ALTARS !== 'undefined' ? (window.KSC_OIL_ALTARS || 'let?') : 'missing',
    clash: typeof window.KSC_CLASH !== 'undefined' ? window.KSC_CLASH : 'missing',
    boss2: typeof window.KSC_BOSS2 !== 'undefined' ? window.KSC_BOSS2 : 'missing',
    diff: typeof window.KSC_DIFF !== 'undefined'
  };
  res.towersys = typeof TOWERSYS !== 'undefined';
  res.scriptCount = document.querySelectorAll('script').length;
  let hasKscBlocks = 0;
  document.querySelectorAll('script').forEach(s => {
    const t = s.textContent || '';
    if (t.indexOf('KSC_OIL_ALTARS') >= 0) hasKscBlocks++;
    if (t.indexOf('KSC_CLASH') >= 0) hasKscBlocks++;
    if (t.indexOf('KSC_BOSS2') >= 0) hasKscBlocks++;
    if (t.indexOf('TOWER PLACEMENT SYSTEM') >= 0) hasKscBlocks++;
  });
  res.kscScriptTags = hasKscBlocks;
  return res;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto("http://localhost:8993/survivor-wave.html?v=17")
    pg.wait_for_timeout(2500)
    out = pg.evaluate(JS)
    out['pageerrors'] = errs[:8]
    print(json.dumps(out, indent=1))
    b.close()
