import urllib.request, urllib.parse, os, sys, concurrent.futures as cf
BASE='https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/'
OUT='icons_raw/'
# key -> candidate emoji names (first that exists wins)
WANT={
 'wheat':['Sheaf of rice'],'corn':['Ear of corn'],'carrot':['Carrot'],'sunflower':['Sunflower'],'tomato':['Tomato'],'strawberry':['Strawberry'],'potato':['Potato'],
 'blueberries':['Blueberries'],'cotton':['White flower','Cloud'],'chili':['Hot pepper'],'sugarcane':['Bamboo','Pine decoration'],'grapes':['Grapes'],'pumpkin':['Jack-o-lantern','Pumpkin'],
 'watermelon':['Watermelon'],'pineapple':['Pineapple'],
 'egg':['Egg'],'milk':['Glass of milk'],'truffle':['Chestnut'],'wool':['Yarn','Ball of yarn'],'fleece':['Llama'],'honey':['Honey pot'],
 'flour':['Bowl with spoon'],'cornmeal':['Popcorn'],'sugar':['Candy'],'oil':['Olive'],'bread':['Bread'],'cookie':['Cookie'],'cornbread':['Flatbread'],'muffin':['Cupcake'],'cake':['Shortcake'],'pie':['Pie'],
 'butter':['Butter'],'cheese':['Cheese wedge'],'yogurt':['Cup with straw'],'icecream':['Ice cream','Soft ice cream'],'honeycake':['Birthday cake'],'pancakes':['Pancakes'],
 'jam':['Canned food'],'bluejam':['Canned food'],'sauce':['Canned food'],'chilisauce':['Canned food'],'jelly':['Canned food'],
 'scarf':['Scarf'],'sweater':['Coat'],'shirt':['T-shirt'],'blanket':['Teddy bear'],'candle':['Candle'],'lantern':['Red paper lantern'],
 'sandwich':['Sandwich'],'soup':['Pot of food'],'pizza':['Pizza'],'salad':['Green salad'],'stew':['Stew','Pot of food'],'pumpkinpie':['Pie'],
 'juice':['Beverage box'],'smoothie':['Tropical drink'],'carrotjuice':['Beverage box'],'melonjuice':['Tropical drink'],'punch':['Tropical drink'],
 'chicken':['Chicken'],'cow':['Cow face'],'pig':['Pig face'],'sheep':['Ewe'],'llama':['Llama'],'bee':['Honeybee'],'horse':['Horse face'],
 'coin':['Coin','Money bag'],'star':['Star'],'gem':['Gem stone'],'gift':['Wrapped gift'],'heart':['Red heart'],'sparkles':['Sparkles'],'trophy':['Trophy'],'crown':['Crown'],
 'hammer':['Hammer and wrench'],'orders':['Clipboard','Scroll'],'boat':['Sailboat'],'ship':['Ship'],'barn':['House with garden','Hut'],'market':['Convenience store','Department store'],
 'tasks':['Memo','Spiral notepad'],'album':['Closed book','Books'],'wardrobe':['Coat','T-shirt'],'settings':['Gear'],'sun':['Sun'],'moon':['Crescent moon'],'lock':['Locked'],'check':['Check mark button'],
 'land':['Sheaf of rice'],'decor':['Cherry blossom','Blossom'],'friends':['People hugging','Busts in silhouette'],'fire':['Fire'],'calendar':['Calendar'],'camera':['Camera'],'clock':['Hourglass not done','Alarm clock'],
 'fruit':['Red apple'],'wave':['Waving hand'],'thumbs':['Thumbs up'],'bell':['Bell'],'pip':['Dog face'],'claire':['Girl'],'butterfly':['Butterfly'],'ladybird':['Lady beetle'],'bunny':['Rabbit face'],'bird':['Bird'],'frog':['Frog'],'fish':['Fish'],'firefly':['Sparkles'],'deer':['Deer'],
 'rain':['Cloud with rain'],'snow':['Snowflake'],'leaf':['Fallen leaf'],'flower':['Cherry blossom'],'seedling':['Seedling'],'tractor':['Tractor'],'truck':['Delivery truck'],'hand':['Raised hand'],
}
def try_get(key,names):
    for n in names:
        slug=n.lower().replace(' ','_').replace('-','_')
        url=BASE+urllib.parse.quote(n)+'/3D/'+slug+'_3d.png'
        try:
            d=urllib.request.urlopen(url,timeout=25).read()
            open(OUT+key+'.png','wb').write(d); return key,n,len(d)
        except Exception as e: continue
    return key,None,0
with cf.ThreadPoolExecutor(8) as ex:
    res=list(ex.map(lambda kv: try_get(*kv), WANT.items()))
miss=[k for k,n,l in res if not n]
print('got',len(res)-len(miss),'missing',miss)
