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
await new Promise(r=>srv.listen(4616,r));
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:720}});
const page=await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message.slice(0,150)));
page.on('crash',()=>console.log('*** CRASH ***'));
page.on('console',m=>{ if(/CONTEXT_LOST|Context Lost/.test(m.text())) console.log('CTXLOST'); });
await page.goto('http://127.0.0.1:4616/SummitLine/index.html',{waitUntil:'load'});
await page.waitForFunction(()=>window.__game,{timeout:120000});
await page.waitForTimeout(1500);
const alive1 = await page.evaluate(()=>1).then(()=>true).catch(()=>false);
console.log('alive before tap:', alive1);
// heartbeat INSIDE the page (fresh install now, not init script)
await page.evaluate(()=>{ window.__gaps=[]; let last=performance.now();
  window.__hb=setInterval(()=>{ const n=performance.now(); if(n-last>250) window.__gaps.push(Math.round(n-last)); last=n; },50); });
const t0=Date.now();
await page.click('#btnPlay');
try { await page.waitForFunction(()=>document.querySelector('#countdown').textContent.trim().length>0,{timeout:10000});
  console.log('tap -> countdown visible:', Date.now()-t0, 'ms'); } catch(e){ console.log('countdown did not show in 10s'); }
await page.waitForTimeout(8000);
console.log('gaps during race >250ms:', JSON.stringify(await page.evaluate(()=>window.__gaps).catch(()=>'<gone>')));
console.log('state:', await page.evaluate(()=>window.__game.state()).catch(()=>'<gone>'));
await b.close(); srv.close(); process.exit(0);
