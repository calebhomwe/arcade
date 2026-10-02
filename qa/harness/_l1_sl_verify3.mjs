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
await new Promise(r=>srv.listen(4615,r));
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:720}});
const page=await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message.slice(0,200)));
page.on('crash',()=>console.log('*** PAGE CRASHED ***'));
page.on('close',()=>console.log('*** PAGE CLOSED ***'));
page.on('console',m=>console.log('CON['+m.type()+']',m.text().slice(0,200)));
await page.goto('http://127.0.0.1:4615/SummitLine/index.html',{waitUntil:'load'});
await page.waitForFunction(()=>window.__game,{timeout:120000}).catch(e=>console.log('waitForFunction fail',e.message.slice(0,100)));
console.log('boot ok');
await page.waitForTimeout(1000);
try { const r = await page.evaluate(()=>({state:window.__game.state(), frames:window.__frames, gaps:(window.__gaps||[]).slice(-5)})); console.log('state:', JSON.stringify(r)); }
catch(e){ console.log('EVAL FAIL:', e.message.slice(0,200)); }
await b.close(); srv.close(); process.exit(0);
