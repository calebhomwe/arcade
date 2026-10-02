import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.hdr':'a','.glb':'a','.jpg':'i','.png':'i','.woff2':'f','.mp3':'a','.json':'j'};
const srv = createServer(async (req,res)=>{ try{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/'))p+='index.html';
  const data=await readFile(path.join(root,p)); res.setHeader('Content-Type',MIME[path.extname(p)]||'a'); res.end(data);
}catch(e){res.statusCode=404;res.end('x');}});
await new Promise(r=>srv.listen(4613,r));
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:720}});
const page=await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
// heartbeat to measure main-thread stalls
await page.addInitScript(()=>{ window.__gaps=[]; let last=performance.now();
  setInterval(()=>{ const n=performance.now(); if(n-last>200) window.__gaps.push(Math.round(n-last)); last=n; },50); });
await page.goto('http://127.0.0.1:4613/SummitLine/index.html',{waitUntil:'load'});
await page.waitForFunction(()=>window.__game,{timeout:120000});
await page.waitForTimeout(1500);
console.log('gaps during boot+title:', JSON.stringify(await page.evaluate(()=>window.__gaps)));
await page.evaluate(()=>{window.__gaps.length=0;});
const t0=Date.now();
await page.tap('#btnPlay');
// time from tap until countdown number shows
try { await page.waitForFunction(()=>document.querySelector('#countdown').textContent.trim().length>0,{timeout:8000});
  console.log('tap -> countdown visible:', Date.now()-t0, 'ms'); } catch(e){ console.log('countdown never showed'); }
await page.waitForTimeout(9000);
const gaps=await page.evaluate(()=>window.__gaps);
console.log('gaps during race (>200ms):', JSON.stringify(gaps));
console.log('game state:', await page.evaluate(()=>window.__game.state()));
await b.close(); srv.close(); process.exit(0);
