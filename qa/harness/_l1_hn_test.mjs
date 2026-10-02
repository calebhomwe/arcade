import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const srv = createServer(async (req,res)=>{
  try{
    let p = decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/')) p+='index.html';
    const f = path.join(root,p);
    const data = await readFile(f);
    res.setHeader('Content-Type', p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'application/octet-stream');
    res.end(data);
  }catch(e){res.statusCode=404;res.end('x');}
});
await new Promise(r=>srv.listen(4611,r));
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const page = await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.message.slice(0,150));});
await page.goto('http://127.0.0.1:4611/HighNest/index.html',{waitUntil:'load'});
await page.waitForTimeout(1200);
console.log('boot scene state:', await page.evaluate(()=>document.querySelectorAll('.screen.on').length));
// start the game
await page.tap('#play');
await page.waitForTimeout(800);
console.log('phase after play:', await page.evaluate(()=>window.__nest_debug.state().phase));
// force game over
await page.evaluate(()=>window.__nest_debug.end());
await page.waitForTimeout(400);
console.log('phase after end:', await page.evaluate(()=>window.__nest_debug.state().phase));
console.log('over screen on:', await page.evaluate(()=>document.querySelector('#s-over').classList.contains('on')));
console.log('again btn box:', await page.evaluate(()=>{const r=document.querySelector('#again').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
console.log('elementFromPoint at centre:', await page.evaluate(()=>{const r=document.querySelector('#again').getBoundingClientRect();const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return t?(t.tagName+'.'+(t.className||'')):'none';}));
await page.tap('#again');
await page.waitForTimeout(700);
console.log('phase after tap again:', await page.evaluate(()=>window.__nest_debug.state().phase));
await b.close(); srv.close(); process.exit(0);
