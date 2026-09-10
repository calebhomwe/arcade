from playwright.sync_api import sync_playwright
import json

JS = """() => {
  return {
    gainOil: typeof window.gainOil,
    oil: window.oil,
    makeEnemyWrapped: (typeof makeEnemy !== 'undefined') ? (makeEnemy.toString().indexOf('kscType') >= 0) : 'n/a',
    killEnemyWrapped: (typeof killEnemy !== 'undefined') ? (killEnemy.toString().indexOf('kscLooted') >= 0) : 'n/a',
    gainXPWrapped: (typeof gainXP !== 'undefined') ? (gainXP.toString().indexOf('KSC_DIFF') >= 0) : 'n/a',
    gameOverWrapped: (typeof gameOver !== 'undefined') ? (gameOver.toString().indexOf('survivorBoard') >= 0 || gameOver.toString().indexOf('kscRecordRun') >= 0) : 'n/a',
    startGameWrappedByTowers: (typeof startGame !== 'undefined') ? (startGame.toString().indexOf('tproj.length=0') >= 0) : 'n/a',
    updateWrappedByTowers: (typeof update !== 'undefined') ? (update.toString().indexOf('fireTower') >= 0) : 'n/a',
    renderHUDhead: renderHUD.toString().slice(0, 60).replace(/\\s+/g, ' ')
  };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.on('console', lambda m: errs.append('C: ' + m.text[:200]) if m.type == 'error' else None)
    pg.goto("http://localhost:8993/survivor-wave.html?v=24")
    pg.wait_for_timeout(2500)
    r = pg.evaluate(JS)
    r['loadErrors'] = errs[:10]
    print(json.dumps(r, indent=1))
    b.close()
