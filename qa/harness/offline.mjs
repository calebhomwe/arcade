import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const which=process.env.CASE||'plane-pack',out='qa/offline-results';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});const page=await ctx.newPage();page.setDefaultTimeout(240000);
const r={case:which,checks:[],errors:[]},check=(v,s)=>{if(!v)throw Error(s);r.checks.push(s);};page.on('pageerror',e=>r.errors.push(e.message));
try{
 if(which==='plane-pack'){
  await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});
  await page.locator('#plane-pack').click();await page.waitForFunction(()=>document.querySelector('#plane-pack .lbl')?.textContent==='Plane pack ready');
  check(true,'One tap saves all 12 plane-pack games');await ctx.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
  check((await page.title()).includes("Caleb's Arcade"),'Arcade home reloads without a network');
  await page.goto('http://localhost:3000/play.html?g=clean-house',{waitUntil:'domcontentloaded'});await page.locator('#playbtn').click();
  const frame=page.frames().find(f=>f.url().includes('CleanHouse'));await frame.waitForSelector('.job');await frame.locator('.job').first().click();await frame.waitForFunction(()=>window.__clean_debug.state().mode==='play');
  check(true,'Saved Clean House starts and enters gameplay offline');
 }else{
  await page.goto('http://localhost:3000/play.html?g=godot-heat-firm',{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});
  await page.locator('#offline').click();await page.waitForFunction(()=>document.querySelector('#offline .lbl')?.textContent==='Offline ready');
  check(true,'Godot engine and game pack finish saving');await ctx.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#playbtn').click();
  const frame=page.frames().find(f=>f.url().includes('heat-firm'));await frame.waitForFunction(()=>document.body.dataset.boot==='ready',null,{timeout:180000});
  check(true,'Heat Firm boots from offline storage');
 }
 check(r.errors.length===0,'No runtime errors');r.status='passed';await page.screenshot({path:`${out}/${which}.png`,timeout:20000}).catch(e=>r.captureWarning=e.message);
}catch(e){r.status='failed';r.failure=e.stack;}
await fs.writeFile(`${out}/${which}.json`,JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();if(r.status!=='passed')process.exitCode=1;
