import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const allCatalog=vm.runInNewContext((await fs.readFile(path.join(root,'catalog.js'),'utf8'))+';CATALOG');
const selectedCatalog=process.env.GAME_IDS?allCatalog.filter(g=>process.env.GAME_IDS.split(',').includes(g.id)):allCatalog;
const catalog=selectedCatalog.filter((g,i)=>i%Number(process.env.SHARD_TOTAL||1)===Number(process.env.SHARD_INDEX||0));
const base=process.env.BASE_URL||'http://127.0.0.1:3000/';
const out=process.env.REPORT_DIR||path.join(root,'qa/results');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
// Only observable DOM state is used as progression evidence. Animation alone is not a pass.
async function snapshot(frame){return frame.evaluate(()=>({text:document.body.innerText.slice(0,14000),canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),controls:[...document.querySelectorAll('button,[role=button],input')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>({text:(e.innerText||e.value||e.getAttribute('aria-label')||'').trim(),id:e.id})).slice(0,50)}));}
async function test(game,mobile){
 const r={id:game.id,title:game.title,source:game.src,viewport:mobile?'phone':'desktop',status:'unverified',actions:[],errors:[],http:[],requests:[],note:game.note};
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',reducedMotion:'reduce'});
 const deadline=setTimeout(()=>{r.deadlineExceeded=true;ctx.close().catch(()=>{});},65000);
 const page=await ctx.newPage();page.setDefaultTimeout(4000);
 page.on('pageerror',e=>r.errors.push(e.message));page.on('response',e=>{if(e.status()>=400)r.http.push({status:e.status(),url:e.url()})});page.on('requestfailed',e=>r.requests.push({url:e.url(),error:e.failure()?.errorText}));
 try{
  await page.goto(base+'play.html?g='+game.id,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#playbtn').click();r.actions.push('Clicked portal Play');
  const handle=await page.locator('#frame').elementHandle();const f=await handle.contentFrame();
  await f.waitForLoadState('domcontentloaded',{timeout:45000});
  await page.waitForTimeout(/Godot|Unity/.test(game.note)?14000:3000);
  r.before=await snapshot(f);
  const starts={'high-nest':'#play','market-merge':'#play','survivor-wave':'#playBtn','surviv-royale':'#btn-play','hole-grind':'#btnPlay','maths-kart':'#bPlay','math-miner':'#btnMath','fishing-for-words':'#btn-math','neon-dash':'#play-btn','critter-rush':'#playBtn','critter-rush-2d':'#play','sneaker-drop':'#startBtn','deepcut-mine':'#btnPlay','cook-rush':'#btnPlay','typhoon-mine':'#btnPlay','nistar':'#start-btn','chef-chloe-kitchen':'#bootStart'};
  if(starts[game.id]){const b=f.locator(starts[game.id]);if(await b.count()&&await b.isVisible()){const label=await b.innerText();await b.click();r.actions.push('Started via '+label);await page.waitForTimeout(800);}}

  // Use rendered controls, never invoke internal game functions or mutate its state.
  for(let n=0;n<3;n++){
   const buttons=f.getByRole('button',{name:/^(?:[▶►▷]\s*)?(?:play(?:\s+now)?|start(?:\s+(?:game|building|run|adventure|playing))?|new game|let.s (?:go|play)|begin|continue|easy|classic|normal)(?:\s*[!▶►])?$/i});
   let chosen=null;for(let i=0;i<await buttons.count();i++){if(await buttons.nth(i).isVisible()){chosen=buttons.nth(i);break;}}
   if(!chosen)break;const label=await chosen.innerText();await chosen.click();r.actions.push('Clicked '+label);await page.waitForTimeout(650);
  }
  if(game.id==='kingdom-defense'){
   const map=f.getByRole('button',{name:/^Cloverfield Lane Cloverfield Lane/});
   if(await map.count()&&await map.isVisible()){await map.click();r.actions.push('Selected Cloverfield Lane');}
   const wave=f.getByRole('button',{name:'START WAVE',exact:true});
   if(await wave.count()&&await wave.isVisible()){await wave.click();r.actions.push('Started first wave');await page.waitForTimeout(2500);}
  }
  r.started=await snapshot(f);
  if(mobile){for(const label of ['Dig down','Dig right','Accelerate','Steer right']){const control=f.getByRole('button',{name:label,exact:true});if(await control.count()&&await control.isVisible()){await control.tap();r.actions.push('Tapped '+label);}}}
  if(game.id==='market-merge'){await page.keyboard.down('ArrowRight');await page.keyboard.press('Space');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');r.actions.push('Held direction while dropping fruit');}
  const canvas=f.locator('canvas:visible').first();
  if(await canvas.count()){
    const box=await canvas.boundingBox();if(box){try{await canvas.click({position:{x:box.width*.5,y:box.height*.65},timeout:1200});r.actions.push('Tapped canvas centre/lower play area');}catch{r.actions.push('Canvas covered by menu; pointer action skipped');}}
  }
  // Standard browser-game verbs; the per-game note and before/after evidence remain in report.
  for(const key of ['Enter','ArrowRight','Space','ArrowLeft','ArrowUp','w','d']){await page.keyboard.down(key);await page.waitForTimeout(220);await page.keyboard.up(key);r.actions.push('Pressed '+key);}
  await page.waitForTimeout(1800);r.after=await snapshot(f);
  r.stateChanged=r.started.text!==r.after.text;
  r.startChanged=r.before.text!==r.started.text;
  r.overflow=await f.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  r.url=f.url();
  r.status=r.errors.length||r.http.some(x=>x.status>=400)?'error':r.stateChanged?'interaction-observed':'needs-review';
  if(!r.before.text.trim()&&!r.before.canvas.length)r.status='blank';
  await page.screenshot({path:path.join(out,game.id+'-'+r.viewport+'.png')});
 }catch(e){r.status='blocked';r.failure=e.message;await page.screenshot({path:path.join(out,game.id+'-'+r.viewport+'.png')}).catch(()=>{});}
 finally{clearTimeout(deadline);await ctx.close();results.push(r);await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({id:r.id,viewport:r.viewport,status:r.status,errors:r.errors,http:r.http,failure:r.failure,actions:r.actions}));}
}
const jobs=catalog.flatMap(g=>[{g,m:false},{g,m:true}]);
await Promise.all(Array.from({length:2},async()=>{while(jobs.length){const job=jobs.shift();await test(job.g,job.m);}}));
for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,'portal-'+(mobile?'phone':'desktop')+'.png')});
 await page.close();
}
await browser.close();
const counts=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Arcade harness</title><style>body{font:16px system-ui;background:#111513;color:#f5f7f1;max-width:1200px;margin:40px auto;padding:20px}a{color:#c5ee78}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #465046;text-align:left}img{max-width:280px}summary{cursor:pointer}</style><h1>Every-game browser harness</h1><p>${catalog.length} games, desktop and phone. ${results.length} checks. ${esc(JSON.stringify(counts))}</p><p>Interaction observed means visible text changed after input. This is smoke coverage, not proof of full game completion. Canvas-only gameplay needs visual review. Microphone, network and hardware-dependent features can remain unverified.</p><p><a href="results.json">Full machine-readable evidence</a></p><table><tr><th>Game</th><th>Viewport</th><th>Result</th><th>Evidence</th></tr>${results.sort((a,b)=>a.id.localeCompare(b.id)||a.viewport.localeCompare(b.viewport)).map(r=>`<tr><td>${esc(r.title)}</td><td>${r.viewport}</td><td>${r.status}<br>${esc(r.failure||r.errors.join('; '))}</td><td><details><summary>Actions and screenshot</summary><p>${esc(r.actions.join(' → '))}</p><a href="${r.id}-${r.viewport}.png"><img loading="lazy" src="${r.id}-${r.viewport}.png"></a></details></td></tr>`).join('')}</table>`);
console.log('SUMMARY '+JSON.stringify(counts));
if(results.length!==catalog.length*2)process.exitCode=1;
