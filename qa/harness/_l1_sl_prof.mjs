import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
const srv = createServer(async (req,res)=>{
  try{
    let p = decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/')) p+='index.html';
    const data = await readFile(path.join(root,p));
    res.setHeader('Content-Type', MIME[path.extname(p)]||'application/octet-stream');
    res.end(data);
  }catch(e){res.statusCode=404;res.end('x');}
});
await new Promise(r=>srv.listen(4612,r));
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1280,height:720}});
const page = await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable');
await page.goto('http://127.0.0.1:4612/SummitLine/index.html',{waitUntil:'load'});
// wait for boot
await page.waitForFunction(()=>window.__game,{timeout:120000});
console.log('booted');
await cdp.send('Profiler.start');
const t0=Date.now();
await page.click('#btnPlay');
await page.waitForTimeout(15000);
const {profile}=await cdp.send('Profiler.stop');
await b.close(); srv.close();
// summarise self time by function
const nodes=new Map(profile.nodes.map(n=>[n.id,n]));
const self=new Map();
for(const n of profile.nodes){ for(const s of (n.hitCount?[...Array(n.hitCount)]:[])) {} }
for(const n of profile.nodes){ if(n.hitCount){ const label=(n.callFrame.functionName||'(anon)')+' @'+(n.callFrame.url||'').split('/').pop()+':'+n.callFrame.lineNumber; self.set(label,(self.get(label)||0)+n.hitCount);} }
const total=[...self.values()].reduce((a,b)=>a+b,0);
console.log('total samples', total, 'duration', ((Date.now()-t0)/1000).toFixed(1)+'s');
const top=[...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30);
for(const [k,v] of top) console.log(String(v).padStart(6), (v/total*100).toFixed(1)+'%', k);
process.exit(0);
