import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto("http://localhost:8993/survivor-wave.html?v=13")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(1200)
    out = pg.evaluate("""() => {
      const res = {};
      // 1) drawTower for each type on an offscreen canvas
      for (const ty of ['gatling','tesla','mortar','tack','watch','tithe']) {
        try {
          const c = document.createElement('canvas'); c.width=80; c.height=80;
          const g = c.getContext('2d'); g.translate(40,44);
          drawTower(g, {ty, x:0, y:0, ang:-0.5, cd:0, tier:1}, false);
          const d = g.getImageData(0,0,80,80).data;
          let lit=0; for (let i=3;i<d.length;i+=4) if (d[i]>40) lit++;
          res['draw_'+ty] = lit;
        } catch(e) { res['draw_'+ty] = 'THROW: '+e.message; }
      }
      // 2) force-place one of each near player on a grass-ish spot, tick, check damage
      gold=5000; window.oil=200; player.invT=200;
      const px=player.x, py=player.y;
      let placed=0;
      const offs=[[120,-120],[-140,-90],[150,120],[-110,140],[220,0],[0,-220]];
      const types=['gatling','tesla','mortar','tack','watch','tithe'];
      for (let i=0;i<6;i++) {
        if (TOWERSYS.addTower(types[i], px+offs[i][0], py+offs[i][1])) placed++;
      }
      res.placed = placed;
      return res;
    }""")
    pg.wait_for_timeout(8000)
    out2 = pg.evaluate("""() => {
      const rs = (typeof runStats!=='undefined' && runStats.dmg) ? runStats.dmg : {};
      const tw = {};
      for (const k in rs) if (k.indexOf('Tower')===0) tw[k]=Math.round(rs[k]);
      return {
        towerDmg: tw,
        towers: TOWERSYS.towers.map(t=>({ty:t.ty, tier:t.tier, hp:t.hp, off:t.kscOff, cd:Math.round((t.cd||0)*100)})),
        enemiesNear: enemies.length,
        hudOk: (function(){ try { renderHUD(); return 'renderHUD-ok'; } catch(e){ return 'THROW: '+e.message; } })()
      };
    }""")
    pg.screenshot(path='diag_towers.png')
    print(json.dumps({'draw': out, 'combat': out2, 'pageerrors': errs[:5]}, indent=1))
    b.close()
