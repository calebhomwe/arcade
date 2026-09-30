import subprocess, sys, os, json
from concurrent.futures import ThreadPoolExecutor
BL='/opt/blender/blender-4.2.5-linux-x64/blender'
OPT='/home/user/arcade/tools/blender/optimize_glb.py'
SRC='/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/meshy/'
OUT='/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/cf/opt/'
os.makedirs(OUT,exist_ok=True)
SPEC={ # name: (tris, tex)
 'red_barn':(2600,1024),'silos':(1300,512),'windmill':(2600,512),'tractor':(1900,512),'cottage':(2300,512),'farmhouse':(2300,512),
 'chicken':(900,512),'cow':(1500,512),'sheep':(1500,512),
 'oak_tree':(700,256),'round_tree':(600,256),'orange_tree':(700,256),'pine_tree':(450,256),'blossom_tree':(900,256),
 'hay_bales':(700,512),'flower_bed':(700,512),'picket_fence':(200,256),'street_lamp':(500,256),'rowboat':(400,256),
 'market_stall':(2000,512),'pickup':(1400,512),'fountain':(1500,512),'lighthouse':(1200,512),
 'bakery':(2200,512),'greenhouse':(1800,512),'house_yellow':(2200,512),'house_brick':(2200,512),'workshop':(1800,512),
 'cafe':(2300,512),'library':(1800,512),'boutique':(1800,512),'town_hall':(2200,512),'chapel':(1800,512),
 'wheat_ripe':(500,256),'wheat_green':(500,256),'sunflower_plant':(450,256),'strawberry_plant':(600,256),'seedling':(250,256),
}
only=sys.argv[1:] 
def run(n):
    t,x=SPEC[n]
    r=subprocess.run([BL,'--background','--factory-startup','--python',OPT,'--','--in',SRC+n+'.glb','--out',OUT+n+'.glb','--tris',str(t),'--tex',str(x)],capture_output=True,text=True)
    line=[l for l in r.stdout.splitlines() if l.startswith('OPTIMIZE_GLB')]
    return n,(line[0][13:] if line else r.stdout[-300:]+r.stderr[-300:])
names=[n for n in SPEC if not only or n in only]
with ThreadPoolExecutor(2) as ex:
    for n,l in ex.map(run,names):
        try:
            j=json.loads(l); print(n, j['tris_in'],'->',j['outputs'][0]['tris'], j['outputs'][0]['bytes']//1024,'KB', flush=True)
        except Exception: print(n,'ERR',l[:300], flush=True)
