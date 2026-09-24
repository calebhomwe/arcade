"""Portal QA: captures at 3 viewports, console/HTTP errors, page weight and paint timings."""
import asyncio, json, sys
from playwright.async_api import async_playwright
B='http://127.0.0.1:8765/arcade/'
OUT='/home/user/arcade/qa/portal/'
VPS=[(1440,900),(1280,800),(390,844)]
PAGES=[('home','index.html',[]),('category','index.html?cat=arcade',[]),('search','index.html',[('search','farm')]),('game','play.html?g=kingdom-defense',[]),
       ('game-playing','play.html?g=high-nest',[('click','#playbtn'),('wait',3500)])]
PERF="""() => { const n=performance.getEntriesByType('navigation')[0]; const r=performance.getEntriesByType('resource');
 const paint=Object.fromEntries(performance.getEntriesByType('paint').map(p=>[p.name,Math.round(p.startTime)]));
 let bytes=n.transferSize||n.encodedBodySize, byType={}; for(const e of r){const b=e.transferSize||e.encodedBodySize||0; bytes+=b; const t=e.initiatorType; byType[t]=(byType[t]||0)+b;}
 return {dcl:Math.round(n.domContentLoadedEventEnd), load:Math.round(n.loadEventEnd), paint, lcp:window.__lcp||null, requests:r.length+1, kb:Math.round(bytes/1024), byTypeKB:Object.fromEntries(Object.entries(byType).map(([k,v])=>[k,Math.round(v/1024)]))}; }"""
async def main():
    only=sys.argv[1].split(',') if len(sys.argv)>1 else None
    res={}; allerr=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--no-sandbox'])
        for scheme in ('light','dark'):
            for (w,h) in VPS:
                for name,url,acts in PAGES:
                    if only and name not in only: continue
                    if scheme=='dark' and name not in ('home','game'): continue
                    mob=w<500
                    ctx=await b.new_context(viewport={'width':w,'height':h},color_scheme=scheme,is_mobile=mob,has_touch=mob,device_scale_factor=1)
                    await ctx.add_init_script("new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lcp=Math.round(e.startTime)}).observe({type:'largest-contentful-paint',buffered:true});")
                    pg=await ctx.new_page(); errs=[]
                    pg.on('pageerror',lambda e: errs.append('pageerror: '+str(e)[:200]))
                    pg.on('console',lambda m: errs.append('console.'+m.type+': '+m.text[:200]) if m.type in ('error','warning') else None)
                    pg.on('response',lambda r: errs.append('HTTP %d %s'%(r.status,r.url)) if r.status>=400 else None)
                    pg.on('requestfailed',lambda r: errs.append('failed %s %s'%(r.url,r.failure)) if 'about:blank' not in r.url else None)
                    await pg.goto(B+url,wait_until='load'); await pg.wait_for_timeout(1200)
                    perf=await pg.evaluate(PERF)
                    for a in acts:
                        if a[0]=='search': await pg.click('#q') if not mob else await pg.click('#srch-btn'); await pg.keyboard.type(a[1],delay=50); await pg.wait_for_timeout(700)
                        elif a[0]=='click': await pg.click(a[1])
                        elif a[0]=='wait': await pg.wait_for_timeout(a[1])
                    tag='%s_%dx%d%s'%(name,w,h,'' if scheme=='light' else '_dark')
                    await pg.screenshot(path=OUT+tag+'.png')
                    if name in ('home','game') and scheme=='light': 
                        # scroll through so lazy images load, then a full-page capture
                        H=await pg.evaluate('document.body.scrollHeight')
                        for y in range(0,H,600): await pg.evaluate('window.scrollTo(0,%d)'%y); await pg.wait_for_timeout(120)
                        await pg.evaluate('window.scrollTo(0,0)'); await pg.wait_for_timeout(600)
                        await pg.screenshot(path=OUT+tag+'_full.png',full_page=True)
                    over=await pg.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth')
                    res[tag]={'perf':perf,'errors':errs,'horizontal_overflow':over}
                    allerr+=[(tag,e) for e in errs]
                    print(tag,perf['kb'],'KB',perf['paint'],'lcp',perf['lcp'],'errs',len(errs),'overflow',over,flush=True)
                    await ctx.close()
        await b.close()
    json.dump(res,open(OUT+'metrics.json' if not only else '/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/qa/metrics_partial.json','w'),indent=1)
    print('TOTAL ERRORS',len(allerr)); [print(' ',t,e) for t,e in allerr]
asyncio.run(main())
