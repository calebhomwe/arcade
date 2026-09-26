import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const name=process.env.CASE||'clean-phone',mobile=name.endsWith('-phone'),slug=name.replace(/-(phone|desktop)$/,'');
const out='qa/remaining-results';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1,reducedMotion:'reduce'});
const page=await ctx.newPage();page.setDefaultTimeout(60000);const r={name,checks:[],errors:[],captureErrors:[]};
page.on('pageerror',e=>r.errors.push(e.message));page.on('response',p=>{if(p.status()>=400)r.errors.push(p.status()+' '+p.url());});
const check=(v,label)=>{assert.ok(v,label);r.checks.push(label);};
try{
 if(slug==='loader')await page.route('**/_engine/godot.js',route=>route.abort());
 await page.goto('http://localhost:3000/'+(slug==='clean'?'CleanHouse/':slug==='claire'?'ClairePip/':'Godot/'+(slug==='loader'?'heat-firm':slug)+'/'),{waitUntil:'domcontentloaded',timeout:45000});
 if(slug==='loader'){
  await page.waitForFunction(()=>document.body.dataset.boot==='failed');check(await page.locator('#retry').isVisible(),'Player download failure exposes a retry button');check(await page.locator('#boot-message').innerText()==='The game could not start.','Player download failure gives a readable message');
 }else if(slug==='clean'){
  await page.locator('.job').first().click();await page.waitForFunction(()=>window.__clean_debug.state().mode==='play');check(true,'Job card starts the playable room');
  const before=await page.evaluate(()=>window.__clean_debug.state().camera);await page.locator('#zoomIn').click();check(await page.evaluate(()=>window.__clean_debug.state().camera.dist)<before.dist,'Zoom in changes the camera');await page.locator('#zoomOut').click();
  await page.locator('#lookMode').click();const az=await page.evaluate(()=>window.__clean_debug.state().camera.az);await page.mouse.move(170,420);await page.mouse.down();await page.mouse.move(250,450,{steps:8});await page.mouse.up();check(await page.evaluate(()=>window.__clean_debug.state().camera.az)!==az,'Look mode rotates over the game surface');
  check(await page.evaluate(()=>!window.__clean_debug.state().scrubbing),'Look does not scrub');await page.locator('#lookMode').click();
  if(mobile){check(!await page.locator('#rail').isVisible(),'Phone toolbox starts collapsed');await page.locator('#toolboxToggle').click();check(await page.locator('#rail').isVisible(),'Phone toolbox opens');await page.locator('#toolboxToggle').click();}
  const pct=await page.locator('#cleanPct').innerText();
  const cx=mobile?195:640,cy=mobile?450:400;
  for(let y=cy-60;y<=cy+100;y+=40){await page.mouse.move(cx-35,y);await page.mouse.down();await page.mouse.move(cx+45,y,{steps:25});await page.mouse.up();}
  r.cleanBefore=pct;r.cleanAfter=await page.locator('#cleanPct').innerText();check(r.cleanAfter!==pct,'Scrubbing changes the visible clean percentage');
  check(await page.evaluate(()=>!window.__clean_debug.state().scrubbing),'Pointer release stops cleaning');
 }else if(slug==='claire'){
  await page.locator('#ageBands [data-band="medium"]').click();await page.locator('#startBtn').click();await page.waitForFunction(()=>document.querySelector('#intro').classList.contains('gone'));check(true,'Age selection and stable Start button enter the game');
  check(!await page.locator('#intro').isVisible(),'Onboarding no longer obscures gameplay');
  const stage=await page.locator('#stage').boundingBox();check(stage.x>=-1&&stage.x+stage.width<=(mobile?390:1280)+1,'Entire game stage fits the viewport without clipping');
 }else{
  await page.waitForFunction(()=>document.body.dataset.boot==='ready'||document.body.dataset.boot==='failed',null,{timeout:180000});
  check(await page.locator('body').getAttribute('data-boot')==='ready','Engine and game pack boot successfully');
  const box=await page.locator('#canvas').boundingBox();check(box.width>200&&box.height>150,'Game has a usable canvas');
  const dims=await page.locator('#canvas').evaluate(c=>({w:c.width,h:c.height}));check(Math.abs(box.width/box.height-dims.w/dims.h)<.03,'Canvas aspect ratio preserved');
  if(mobile&&await page.locator('#touch-controls button').count()){
   await page.evaluate(()=>{window.inputEvents=[];document.querySelector('canvas').addEventListener('keydown',e=>inputEvents.push('down:'+e.code));document.querySelector('canvas').addEventListener('keyup',e=>inputEvents.push('up:'+e.code));});
   const b=page.locator('#touch-controls button').first();await b.tap();check(await b.getAttribute('aria-pressed')==='false','Touch button releases after tap');
   const events=await page.evaluate(()=>inputEvents);check(events.some(e=>e.startsWith('down:'))&&events.some(e=>e.startsWith('up:')),'Touch button delivers press and release to engine canvas');
  }
  await page.keyboard.press('Enter');await page.waitForTimeout(1500);
  if(mobile&&slug!=='heavens-grace'){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(500);check((await page.locator('#canvas').boundingBox()).width>390,'Landscape expands the game view');}
 }
 check(r.errors.length===0,'No runtime or HTTP failures');r.status='checks-passed';
}catch(e){r.status='failed';r.failure=e.stack;}
try{await page.screenshot({path:`${out}/${name}.png`,timeout:60000});}catch(e){r.captureErrors.push(e.message);if(r.status==='checks-passed')r.status='checks-passed-capture-blocked';}
await fs.writeFile(`${out}/${name}.json`,JSON.stringify(r,null,2));console.log(JSON.stringify(r));await ctx.close();await browser.close();if(r.status!=='checks-passed')process.exitCode=1;
