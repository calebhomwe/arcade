import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='qa/genre-results';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
for(const mobile of [false,true])for(const game of ['tower','snow']){
 const name=game+'-'+(mobile?'phone':'desktop');const r={name,checks:[],errors:[]};
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const page=await ctx.newPage();page.on('pageerror',e=>r.errors.push(e.message));
 page.on('response',res=>{if(res.status()>=400)r.errors.push(res.status()+' '+res.url());});
 const check=(x,msg)=>{assert.ok(x,msg);r.checks.push(msg);};
 try{
  await page.goto('http://localhost:3000/'+(game==='tower'?'KingdomDefense/':'SummitLine/?q=low'),{waitUntil:'domcontentloaded'});
  if(game==='tower'){
   await page.locator('#play').click();await page.locator('[data-map="0"]').click();
   await page.locator('#startWave').click();check(await page.evaluate(()=>KD.state.wave===0),'Cannot waste the opening wave without a defender');
   const before=await page.evaluate(()=>KD.state.money);
   const spots=await page.evaluate(()=>{const a=[];for(let y=KD.canvasTopMargin+35;y<KD.H-140;y+=16)for(let x=30;x<KD.W-KD.SBW-30;x+=16)if(KD.canBuild(x,y)){let d=Math.min(...KD.path.map(p=>Math.hypot(p.x-x,p.y-y)));if(d<110)a.push({x,y,d});}return a.sort((a,b)=>a.d-b.d);});
   check(spots.length>0,'Usable tower positions exist on this viewport');
   const pt=spots[0];await page.locator('[data-type="fox"]').click();await page.mouse.click(pt.x,pt.y);
   check(await page.evaluate(()=>KD.state.towers.length===1),'Pointer input places a tower');
   check(await page.evaluate(()=>KD.state.money)===before-170,'Placement deducts the listed price');
   await page.keyboard.press('Escape');await page.mouse.click(pt.x,pt.y);
   await page.locator('[data-up="0"]').click();check(await page.evaluate(()=>KD.state.towers[0].level>0),'Upgrade changes the placed tower');
   await page.locator('#target').click();check(await page.evaluate(()=>KD.state.towers[0].targetMode==='strong'),'Target priority cycles');
   await page.locator('#closeSheet').click();await page.locator('#startWave').click();
   await page.locator('.speed').last().click();await page.waitForFunction(()=>KD.state.kills>0,{},{timeout:90000});
   check(true,'Placed defender actually defeats enemies');
   await page.locator('#pause').click();const d=await page.evaluate(()=>KD.state.enemies.map(e=>e.d));await page.waitForTimeout(400);
   check(JSON.stringify(d)===JSON.stringify(await page.evaluate(()=>KD.state.enemies.map(e=>e.d))),'Pause freezes simulation');
   await page.locator('#resume').click();await page.waitForFunction(()=>KD.state.wave===1&&!KD.waveActive,{},{timeout:90000});
   check(await page.evaluate(()=>KD.state.lives>0),'First wave finishes with gate alive');
   r.state=await page.evaluate(()=>({wave:KD.state.wave,kills:KD.state.kills,lives:KD.state.lives,money:KD.state.money}));
   await page.screenshot({path:`${out}/${name}.png`,timeout:20000});
   await page.mouse.click(pt.x,pt.y);await page.locator('#sell').click();check(await page.evaluate(()=>KD.state.towers.length===0),'Selling removes the tower');
  }else{
   await page.waitForFunction(()=>window.__game?.state()==='title',{},{timeout:150000});
   check(true,'Licensed 3D assets load and title renders');
   // Pure physics regressions use real modules; the visible race below uses only UI inputs.
   r.physics=await page.evaluate(async()=>{
    const {Racer}=await import('./js/physics.js');const neutral={steer:0,tuck:false,brake:false,jump:false,grab:false,grabType:0,boost:false};
    const a=new Racer(),b=new Racer();a.step(1/60,{...neutral,boost:true});b.step(1/60,neutral);
    const boostImmediate=a.speed>b.speed&&a.boost<.25;
    a.pendingRail={name:'Rail',pts:500};a.crash('test');const crashDropsRail=a.pendingRail===null;
    a.reset(3,0);const cleanReset=a.score===0&&!a.finished&&!a.pendingRail;
    return {boostImmediate,crashDropsRail,cleanReset};
   });check(Object.values(r.physics).every(Boolean),'Boost, crash and reset physics regressions pass');
   await page.locator('#btnPlay').click();await page.waitForFunction(()=>__game.state()==='race',{},{timeout:45000});
   if(mobile){check(await page.locator('#touch').isVisible(),'Touch controls are visible');await page.locator('#tBoost').tap();}
   else await page.keyboard.down('ArrowUp');
   await page.waitForFunction(()=>__game.player().s>15,{},{timeout:45000});
   check(true,'Rider moves downhill during real-time play');
   await page.keyboard.down('Space');await page.waitForTimeout(900);await page.keyboard.up('Space');
   await page.waitForFunction(()=>__game.player().totalAir>0,{},{timeout:45000});check(true,'Charge and release produces airtime');
   await page.keyboard.up('ArrowUp');await page.locator('#btnPause').click();
   const s=await page.evaluate(()=>__game.player().s);await page.waitForTimeout(400);check(s===await page.evaluate(()=>__game.player().s),'Pause freezes snowboard physics');
   await page.locator('#btnResume').click();
   r.state=await page.evaluate(()=>{const p=__game.player();return{s:p.s,speed:p.speed,air:p.totalAir,score:p.score};});
   await page.screenshot({path:`${out}/${name}.png`,timeout:20000});
   if(mobile){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(500);await page.screenshot({path:`${out}/${name}-landscape.png`,timeout:20000});}
   await page.locator('#btnPause').click();await page.locator('#btnRestart').click();
   check(await page.evaluate(()=>__game.player().score===0&&__game.player().s===3),'Restart clears race and score');
  }
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');
  check(r.errors.length===0,'No runtime or failed-asset errors');r.status='passed';
 }catch(e){r.status='failed';r.failure=e.message;await page.screenshot({path:`${out}/${name}-failure.png`,timeout:10000}).catch(()=>{});}
 finally{results.push(r);console.log(JSON.stringify(r));await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await ctx.close();}
}
await browser.close();if(results.some(r=>r.status!=='passed'))process.exitCode=1;
