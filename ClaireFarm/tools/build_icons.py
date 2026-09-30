from PIL import Image
import json, os
SRC='icons_raw/'; CELL=128
# key -> (base file, badge file or None)
BADGES={'jam':'strawberry','bluejam':'blueberries','sauce':'tomato','chilisauce':'chili','jelly':'grapes','carrotjuice':'carrot','juice':'grapes','melonjuice':'watermelon','punch':'pineapple','pumpkinpie':'pumpkin','stew':None,'yogurt':'strawberry','smoothie':'strawberry','honeycake':'honey','cornbread':'corn','icecream':'strawberry','sandwich':None,'blanket':'wool','sweater':'wool','shirt':'cotton','scarf':'wool','soup':'carrot','salad':None,'oil':'sunflower','cornmeal':'corn','flour':'wheat','sugar':'sugarcane','muffin':'strawberry'}
keys=sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
cols=12; rows=(len(keys)+cols-1)//cols
atlas=Image.new('RGBA',(cols*CELL,rows*CELL),(0,0,0,0)); m={}
def load(k):
    im=Image.open(SRC+k+'.png').convert('RGBA')
    bb=im.getbbox(); im=im.crop(bb)
    s=(CELL-8)/max(im.size); return im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS)
for i,k in enumerate(keys):
    im=load(k)
    cell=Image.new('RGBA',(CELL,CELL),(0,0,0,0))
    cell.paste(im,((CELL-im.width)//2,(CELL-im.height)//2),im)
    b=BADGES.get(k)
    if b and os.path.exists(SRC+b+'.png'):
        bi=load(b).resize((56,56),Image.LANCZOS)
        cell.paste(bi,(CELL-58,CELL-58),bi)
    c,r=i%cols,i//cols; atlas.paste(cell,(c*CELL,r*CELL)); m[k]=[c,r]
os.makedirs('/home/user/arcade/ClaireFarm/textures',exist_ok=True)
atlas.save('/home/user/arcade/ClaireFarm/textures/icons.webp',quality=86,method=6)
json.dump({'cell':CELL,'cols':cols,'rows':rows,'map':m},open('/home/user/arcade/ClaireFarm/textures/icons.json','w'),separators=(',',':'))
print(len(keys),'icons',atlas.size, os.path.getsize('/home/user/arcade/ClaireFarm/textures/icons.webp')//1024,'KB')
atlas.resize((atlas.width//2,atlas.height//2)).convert('RGBA').save('icons_preview.png')
