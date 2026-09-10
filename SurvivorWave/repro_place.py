import time, json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8993/survivor-wave.html?v=12"
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errors.append('PAGEERROR: ' + str(e)))
    pg.on('console', lambda m: errors.append('CONSOLE: ' + m.text) if m.type == 'error' else None)
    pg.goto(URL)
    pg.wait_for_timeout(2500)
    # start run
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(1500)
    pg.evaluate("() => { gold=5000; window.oil=200; player.invT=120; }")
    # open build bar via API
    pg.evaluate("() => TOWERSYS.toggleBar()")
    pg.wait_for_timeout(400)
    # place each type via the REAL place path: startPlace + click canvas
    spots = [('gatling', 500, 500), ('tesla', 700, 500), ('mortar', 500, 300),
             ('tack', 700, 300), ('watch', 400, 400), ('tithe', 800, 400)]
    results = {}
    for ty, sx, sy in spots:
        pg.evaluate(f"() => TOWERSYS.startPlace('{ty}')")
        pg.mouse.move(sx, sy)
        pg.wait_for_timeout(120)
        pg.mouse.click(sx, sy)
        pg.wait_for_timeout(150)
        st = pg.evaluate(f"() => {{ const t=TOWERSYS.towers[TOWERSYS.towers.length-1]; return {{ty:t?t.ty:null, tier:t?t.tier:null, n:TOWERSYS.towers.length}}; }}")
        results[ty] = st
    pg.evaluate("() => TOWERSYS.cancel()")
    # let them fire for a bit
    pg.wait_for_timeout(6000)
    dmg = pg.evaluate("() => { const rs=runStats&&runStats.dmg?runStats.dmg:{}; const out={}; for(const k in rs){ if(k.indexOf('Tower')===0) out[k]=Math.round(rs[k]); } return out; }")
    pg.screenshot(path='repro_place.png')
    # also test upgrade popover on one tower
    t0 = pg.evaluate("() => { const t=TOWERSYS.towers[0]; return {x:t.x, y:t.y, camx:cam.x, camy:cam.y, ty:t.ty}; }")
    sx = t0['x'] - t0['camx']; sy = t0['y'] - t0['camy']
    pg.mouse.click(int(sx), int(sy))
    pg.wait_for_timeout(400)
    pop = pg.evaluate("() => { const el=document.querySelectorAll('div'); let found=null; el.forEach(d=>{ if(d.style.display==='block' && d.textContent && d.textContent.indexOf('TIER')>=0) found=d.textContent.slice(0,140); }); return found; }")
    print(json.dumps({'placements': results, 'towerDamage': dmg, 'sellPopover': pop, 'errors': errors[:10]}, indent=1))
    b.close()
