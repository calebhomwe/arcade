import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
    pg.goto("http://localhost:8993/survivor-wave.html?v=14")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(1200)
    pg.evaluate("() => { gold=5000; window.oil=200; player.invT=300; }")
    # REAL UI path: click BUILD button, click cards, click canvas spots
    pg.evaluate("() => { document.querySelectorAll('button').forEach(x=>{ if(x.textContent.indexOf('BUILD [T]')>=0) x.click(); }); }")
    pg.wait_for_timeout(300)
    barVisible = pg.evaluate("() => { const bars=[...document.querySelectorAll('div')].filter(d=>d.style.display==='flex'); return bars.length>0; }")
    # click each card by its text, then click a canvas spot
    spots = [(500, 420), (760, 420), (500, 250), (760, 250), (400, 560), (880, 560)]
    cards = ['SLING THROWER', 'PROPHET HERALD', 'BOMBARDIER', 'TACK DEFENDER', 'WATCHTOWER', 'TITHE COLLECTOR']
    placed = []
    for name, (sx, sy) in zip(cards, spots):
        clicked = pg.evaluate(f"""() => {{
          const els=[...document.querySelectorAll('div')];
          for (const d of els) {{
            if (d.textContent && d.textContent.trim().indexOf('{name}')===0 && d.onclick) {{ d.click(); return true; }}
          }}
          return false;
        }}""")
        pg.mouse.click(sx, sy)
        pg.wait_for_timeout(150)
        n = pg.evaluate("() => TOWERSYS.towers.length")
        placed.append([name, clicked, n])
    pg.wait_for_timeout(9000)  # let them fight
    combat = pg.evaluate("""() => {
      const rs=(typeof runStats!=='undefined'&&runStats.dmg)?runStats.dmg:{};
      const tw={}; for(const k in rs) if(k.indexOf('Tower')===0) tw[k]=Math.round(rs[k]);
      return {towerDmg: tw, towers: TOWERSYS.towers.map(t=>t.ty+':'+t.tier)};
    }""")
    pg.screenshot(path='ui_place.png')
    print(json.dumps({'barVisible': barVisible, 'placed': placed, 'combat': combat, 'pageerrors': errs[:6]}, indent=1))
    b.close()
