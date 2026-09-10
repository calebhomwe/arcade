import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
    pg.goto("http://localhost:8993/survivor-wave.html?v=15")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('FIGHT')); b.click(); }")
    pg.wait_for_timeout(1200)
    # place towers tight around the player via API (now-valid anywhere)
    n = pg.evaluate("""() => {
      gold=5000; window.oil=200; player.invT=600;
      const px=player.x, py=player.y;
      const types=['gatling','tesla','mortar','tack','watch','tithe'];
      const offs=[[90,-40],[-90,-40],[150,60],[-150,60],[60,110],[-60,110]];
      let ok=0; for(let i=0;i<6;i++) if(TOWERSYS.addTower(types[i],px+offs[i][0],py+offs[i][1])) ok++;
      return ok;
    }""")
    pg.wait_for_timeout(30000)  # 30s of combat — enemies definitely arrive
    combat = pg.evaluate("""() => {
      const rs=(typeof runStats!=='undefined'&&runStats.dmg)?runStats.dmg:{};
      const tw={}; for(const k in rs) if(k.indexOf('Tower')===0) tw[k]=Math.round(rs[k]);
      const e0=enemies[0];
      return {towerDmg: tw, enemyCount: enemies.length,
              nearestEnemy: e0?Math.round(Math.hypot(e0.x-player.x,e0.y-player.y)):null,
              tprojActive: (function(){ return 'hidden-in-closure'; })()};
    }""")
    pg.screenshot(path='combat_test.png')
    print(json.dumps({'placed': n, 'combat': combat, 'pageerrors': errs[:6]}, indent=1))
    b.close()
