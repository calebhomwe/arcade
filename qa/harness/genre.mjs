import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='qa/genre-results';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
for(const mobile of [false,true])for(const game of ['tower','snow']){
 const name=game+'-'+(mobile?'phone':'desktop');if(process.env.CASE&&process.env.CASE!==name)continue;const r={name,checks:[],errors:[]};
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?1:0.5});
 const page=await ctx.newPage();r.console=[];page.on('console',m=>{if(m.type()==='error')r.console.push(m.text());});page.on('pageerror',e=>r.errors.push(e.message));
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
   await page.waitForFunction(()=>window.__game?.state()==='title'||document.querySelector('#loadTxt')?.textContent.startsWith('Could not load:'),{},{timeout:150000});
   check(await page.evaluate(()=>window.__game?.state()==='title'),'Licensed 3D assets load and title renders');
   // Pure physics regressions use real modules; the visible race below uses only UI inputs.
   r.physics=await page.evaluate(async()=>{
    const {Racer}=await import('./js/physics.js');const {AIDriver}=await import('./js/ai.js');const neutral={steer:0,tuck:false,brake:false,jump:false,grab:false,grabType:0,boost:false};
    const a=new Racer(),b=new Racer();a.step(1/60,{...neutral,boost:true});b.step(1/60,neutral);
    const boostImmediate=a.speed>b.speed&&a.boost<.25;
    a.pendingRail={name:'Rail',pts:500};a.crash('test');const crashDropsRail=a.pendingRail===null;
    a.reset(3,0);const cleanReset=a.score===0&&!a.finished&&!a.pendingRail;
    const landing=new Racer({s:30,speed:10});landing.vel.set(0,-1,-10);landing.yaw=0;landing.pendingRail={name:'Boardslide',pts:500};landing.landing();
    const railBanksAfterLanding=landing.score===500&&landing.pendingRail===null;
    const bad=new Racer({s:30});bad.vel.set(0,-1,-10);bad.yaw=Math.PI/2;bad.pendingRail={name:'Boardslide',pts:500};bad.landing();
    const badLandingScoresZero=bad.score===0&&bad.crashT>0&&!bad.pendingRail;
    const fast=new Racer({s:40}),slow=new Racer({s:40});fast.reset(40,0,14);slow.reset(40,0,14);for(let i=0;i<30;i++){fast.step(1/60,neutral);slow.step(1/60,{...neutral,brake:true});}
    const brakingSlows=slow.speed<fast.speed;
    const bot=new Racer({s:3,colliders:__game.player().colliders,rails:__game.player().rails});const driver=new AIDriver(bot,{seed:7,aggression:.6,style:.5});let crashes=0,frames=0;for(;frames<60*360&&!bot.finished;frames++){bot.step(1/60,driver.input(1/60,bot.s,true));crashes+=bot.events.filter(e=>e.type==='crash').length;}
    const raceFinishes=bot.finished&&bot.s>=2000;
    return {boostImmediate,crashDropsRail,cleanReset,railBanksAfterLanding,badLandingScoresZero,brakingSlows,raceFinishes};
   });check(Object.values(r.physics).every(Boolean),'Boost, crash and reset physics regressions pass');
   await page.locator('#btnPlay').click();await page.waitForFunction(()=>__game.state()==='race',{},{timeout:90000});
   if(mobile){check(await page.locator('#touch').isVisible(),'Touch controls are visible');await page.locator('#tBoost').tap();}
   else await page.keyboard.down('ArrowUp');
   await page.waitForFunction(()=>__game.player().s>15,{},{timeout:90000});
   check(true,'Rider moves downhill during real-time play');
   if(mobile){const box=await page.locator('#tJump').boundingBox();const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await page.waitForFunction(()=>__game.player().jumpHeld&&__game.player().charge>.5,{},{timeout:90000});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else{await page.keyboard.up('ArrowUp');await page.keyboard.down('Space');await page.waitForFunction(()=>__game.player().jumpHeld&&__game.player().charge>.5,{},{timeout:90000});await page.keyboard.up('Space');}
   await page.waitForFunction(()=>__game.player().totalAir>0,{},{timeout:90000});check(true,'Charge and release produces airtime');
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
 }catch(e){r.status='failed';r.failure=e.message;r.diagnostics=await page.evaluate(()=>({loading:document.querySelector('#loadTxt')?.textContent,pending:window.__assetLoads?[...window.__assetLoads]:[],state:window.__game?.state(),player:window.__game?{s:__game.player().s,time:__game.player().time,charge:__game.player().charge}:null,visibility:document.visibilityState})).catch(()=>null);await page.screenshot({path:`${out}/${name}-failure.png`,timeout:10000}).catch(()=>{});}
 finally{results.push(r);console.log(JSON.stringify(r));await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await ctx.close();}
}
await browser.close();if(results.some(r=>r.status!=='passed'))process.exitCode=1;
