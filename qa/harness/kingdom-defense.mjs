import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, devices, webkit} from 'playwright';

const engine = process.env.ENGINE || 'chromium';
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const base = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const proof = process.env.REPORT_DIR || 'qa/results/kingdom-defense';
await mkdir(proof, {recursive: true});

async function waitForText(page, selector, text) {
  await page.waitForFunction(([selector, text]) => document.querySelector(selector).textContent === text, [selector, text]);
}

async function buildPoint(page) {
  return page.evaluate(() => {
    const samples = Array.from({length: 65}, (_, i) => window.pointAt(KD.pathTotal * i / 65));
    let best = null;
    for (let y = 16; y < KD.H; y += 12) {
      for (let x = 18; x < KD.W - 14; x += 12) {
        if (!KD.canBuild(x, y) || document.elementFromPoint(x, y)?.id !== 'game') continue;
        const coverage = samples.filter(p => Math.hypot(x - p.x, y - p.y) <= KD.TYPES.otter.range).length;
        if (!best || coverage > best.coverage) best = {x, y, coverage};
      }
    }
    return best;
  });
}

async function run(view, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).pathname.includes('/KingdomDefense/')) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  // Use the live game loop and controls. Suppress audio on machines without an output device.
  await page.addInitScript(() => {
    localStorage.setItem('kd-sound', 'off');
    Object.defineProperty(window, 'AudioContext', {value: undefined});
    Object.defineProperty(window, 'webkitAudioContext', {value: undefined});
  });
  await page.goto(new URL('KingdomDefense/', base).href);
  await page.locator('#loading').waitFor({state: 'hidden'});
  await page.locator('#play').click();
  await page.locator('[data-map="0"]').click();
  await waitForText(page, '#wavePreview', 'NEXT WAVE 1 · 20× Red Pod');
  assert.equal(await page.locator('#wavePreview').isVisible(), true);
  await page.locator('[data-cat="Military"].filter').click();
  const first = await buildPoint(page);
  assert(first && first.coverage > 0, `${view}: legal position in tower range`);
  await page.locator('.card[data-type="otter"]').click();
  if (options.hasTouch) await page.touchscreen.tap(first.x, first.y);
  else await page.mouse.click(first.x, first.y);
  await page.waitForFunction(() => KD.state.towers.length === 1);
  const second = await buildPoint(page);
  assert(second && second.coverage > 0, `${view}: second legal position`);
  if (options.hasTouch) {
    // Safari and Chromium keep a touch pointer on the card after it moves away from the shop.
    await page.locator('.card[data-type="otter"]').evaluate((card, point) => {
      const box = card.getBoundingClientRect();
      const init = {bubbles: true, pointerType: 'touch', pointerId: 2, isPrimary: true};
      card.dispatchEvent(new PointerEvent('pointerdown', {...init, clientX: box.x + 20, clientY: box.y + 20}));
      card.dispatchEvent(new PointerEvent('pointermove', {...init, clientX: point.x, clientY: point.y}));
      card.dispatchEvent(new PointerEvent('pointerup', {...init, clientX: point.x, clientY: point.y}));
    }, second);
  } else {
    await page.locator('.card[data-type="otter"]').click();
    await page.mouse.click(second.x, second.y);
  }
  await page.waitForFunction(() => KD.state.towers.length === 2);
  await waitForText(page, '#money', '20');
  await page.screenshot({path: `${proof}/${engine}-${view}-placed.png`});
  await page.locator('#startWave').click();
  await waitForText(page, '#wave', '1/40');
  await waitForText(page, '#wavePreview', 'WAVE 1 · 20× Red Pod');

  // Advance the same update loop deterministically so the regression does not wait on wave timers.
  await page.evaluate(() => KD.step(1 / 30, 120));
  if (options.hasTouch) {
    const before = await page.evaluate(() => {
      for (let i = 0; !KD.state.enemies.some(e => !e.dead) && i < 600; i++) KD.step(1 / 60, 1);
      const pod = KD.state.enemies.find(e => !e.dead);
      if (!pod) throw new Error('Expected a live pod before rotating the viewport');
      pod.d = KD.pathTotal * 0.64;
      Object.assign(pod, window.pointAt(pod.d, pod.routeIndex));
      window.setPause(true);
      const board = window.boardRect();
      return {x: pod.x / KD.W, y: (pod.y - board.y) / board.h};
    });
    await page.setViewportSize({width: 844, height: 390});
    await page.waitForFunction(() => KD.W === 844);
    const after = await page.evaluate(() => {
      const pod = KD.state.enemies.find(e => !e.dead);
      const board = window.boardRect();
      return {x: pod.x / KD.W, y: (pod.y - board.y) / board.h, lives: KD.state.lives};
    });
    assert(Math.abs(before.x - after.x) < 0.005 && Math.abs(before.y - after.y) < 0.005);
    assert.equal(after.lives, 30);
    await page.locator('#resume').click();
    await page.screenshot({path: `${proof}/${engine}-${view}-rotated.png`});
  }

  await page.evaluate(() => {
    for (let i = 0; KD.waveActive && i < 12000; i += 30) KD.step(1 / 30, 30);
  });
  await waitForText(page, '#wavePreview', 'NEXT WAVE 2 · 18× Blue Pod');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kd-best'))['0:medium']), 1);
  await page.screenshot({path: `${proof}/${engine}-${view}-wave-cleared.png`});

  // Two pods breaching on the final wave award one result and leave the map un-cleared.
  const crowns = await page.evaluate(() => {
    const crowns = KD.career.crowns;
    KD.state.wave = KD.waves.length;
    KD.state.lives = 1;
    for (let i = 0; i < 2; i++) {
      const pod = new Enemy('red');
      pod.d = KD.pathTotal - 0.01;
      KD.state.enemies.push(pod);
    }
    KD.step(1 / 30, 1);
    return KD.career.crowns - crowns;
  });
  assert.equal(crowns, 80);
  await waitForText(page, '#endTitle', 'GATE BREACHED');
  await waitForText(page, '#endProgressLabel', '1 OF 40 WAVES CLEARED');
  assert.equal(await page.locator('#kd-next-mission').isVisible(), false);
  await page.locator('#endMapSelect').click();
  assert.match(await page.locator('[data-map="0"]').innerText(), /BEST W40/);
  assert.doesNotMatch(await page.locator('[data-map="0"]').innerText(), /CLEARED/);

  await page.locator('[data-map="0"]').click();
  await page.evaluate(() => KD.finish(true));
  await waitForText(page, '#endTitle', 'KINGDOM SECURED');
  assert.equal(await page.locator('#kd-next-mission').isVisible(), true);
  await page.waitForFunction(() => document.querySelectorAll('#endStars .lit').length === 3);
  await page.screenshot({path: `${proof}/${engine}-${view}-victory.png`});
  await page.locator('#kd-next-mission').click();
  assert.equal(await page.evaluate(() => KD.selectedMap), 1);
  await page.reload();
  await page.locator('#loading').waitFor({state: 'hidden'});
  await page.locator('#play').click();
  assert.match(await page.locator('[data-map="0"]').innerText(), /★★★ CLEARED/);
  assert.deepEqual(errors, [], `${view}: runtime and asset errors`);
  await context.close();
  console.log(`${engine} ${view}: placement, waves, results, and reload passed`);
}

try {
  await run('desktop', {viewport: {width: 1280, height: 720}});
  await run('iphone', devices['iPhone 13']);
} finally {
  await browser.close();
}
