import sys
from PIL import Image, ImageDraw
# usage: compare.py mine.png out.png  -> left: reference panel (ref_03 main + ref_04), right: mine
ref3=Image.open('/home/user/claires-big-life-adventure/references/calebs_farm/ref_03.png').convert('RGB').crop((0,0,940,485))
ref4=Image.open('/home/user/claires-big-life-adventure/references/calebs_farm/ref_04.png').convert('RGB')
mine=Image.open(sys.argv[1]).convert('RGB')
H=560
def fit(im,h): return im.resize((int(im.width*h/im.height),h),Image.LANCZOS)
a,b,c=fit(ref3,H),fit(ref4,H),fit(mine,H)
W=a.width+b.width+c.width+40
sheet=Image.new('RGB',(W,H+34),(20,20,24)); d=ImageDraw.Draw(sheet)
x=10
for im,l in ((a,'reference ref_03 (main panel)'),(b,'reference ref_04'),(c,'current build')):
    sheet.paste(im,(x,30)); d.text((x,8),l,fill=(255,230,150)); x+=im.width+10
sheet.save(sys.argv[2],quality=90)
print(sheet.size)
