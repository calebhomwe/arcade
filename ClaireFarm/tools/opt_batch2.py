import subprocess, sys, os, json
from concurrent.futures import ThreadPoolExecutor
BL='/opt/blender/blender-4.2.5-linux-x64/blender'
SRC='/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/cf/src/meshy/'
OUT='/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/cf/opt4/'
SPEC={'red_barn':(3000,1024),'silos':(1500,512),'windmill':(3200,512),'tractor':(2200,512),'cottage':(3200,512),'farmhouse':(4200,512),
 'bakery':(3800,512),'greenhouse':(3000,512),'house_yellow':(4200,512),'house_brick':(3800,512),'workshop':(3200,512),'cafe':(3200,512),
 'library':(3200,512),'boutique':(3200,512),'town_hall':(3500,512),'chapel':(3000,512),'market_stall':(3000,512),'fountain':(2200,512),'lighthouse':(1600,512),
 'hay_bales':(1000,512),'flower_bed':(1000,512),'picket_fence':(200,256),'street_lamp':(600,256),'rowboat':(500,256),'pickup':(1800,512),
 'cow':(1800,512),'sheep':(1800,512),'chicken':(1200,512)}
only=sys.argv[1:]
def run(n):
    t,x=SPEC[n]
    r=subprocess.run([BL,'--background','--factory-startup','--python','cf_prep.py','--','--in',SRC+n+'.glb','--out',OUT+n+'.glb','--tris',str(t),'--tex',str(x),'--delimit','UV'],capture_output=True,text=True)
    l=[l for l in r.stdout.splitlines() if l.startswith('CFPREP')]
    return n,(l[0][7:] if l else r.stdout[-300:]+r.stderr[-300:])
names=[n for n in SPEC if not only or n in only]
with ThreadPoolExecutor(2) as ex:
    for n,l in ex.map(run,names): print(n,l,flush=True)
