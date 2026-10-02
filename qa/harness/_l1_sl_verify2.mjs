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
await new Promise(r=>srv.listen(4614,r));
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:720}});
const page=await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
page.on('crash',()=>console.log('*** PAGE CRASHED ***'));
page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('*** NAVIGATED',f.url());});
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.message.slice(0,200));});
await page.goto('http://127.0.0.1:4614/SummitLine/index.html',{waitUntil:'load'});
await page.waitForFunction(()=>window.__game,{timeout:120000});
for (let i=0;i<3;i++){ await page.waitForTimeout(700); const ok=await page.evaluate(()=>1).then(()=>true).catch(()=>false); console.log('t+'+(i*0.7).toFixed(1)+'s eval ok:',ok); if(!ok)break; }
process.exit(0);
