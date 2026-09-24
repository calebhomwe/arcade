#!/usr/bin/env python3
"""Build catalog.js — the single source of truth for every game on the portal.

Local cabinets live in this repo. Everything else is one of Caleb's other
live GitHub Pages sites and is opened inside the portal's play page by URL.
Thumbnails are real captured frames (assets/thumbs/*.webp), never mockups.

    python3 tools/build_catalog.py        # writes ../catalog.js
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.dont_write_bytecode = True
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HUB  = 'https://calebhomwe.github.io/arcade-hub/games/'
NEON = 'https://calebhomwe.github.io/neon-game-arcade/games/'
PLAY = 'https://calebhomwe.github.io/playables/'

CATS = [  # order = nav order: (id, name, icon, one-line description). Colours live in site.css as --c-<id>.
  ('arcade',  'Arcade',       'joy',   'Fast reflexes, big scores: runners, shooters, racers and tower defence.'),
  ('hyper',   'Hyper-Casual', 'zap',   'One-thumb games you can learn in three seconds and replay for an hour.'),
  ('puzzle',  'Puzzle',       'puzzle','Merge, match, slide and think: brain teasers from gentle to fiendish.'),
  ('classic', 'Classic',      'crown', 'Chess, Connect Four, Snake and the rest of the all-time greats.'),
  ('learning','Learning',     'cap',   'Spelling, maths and music games where getting it right is how you win.'),
  ('sim',     'Sim & Worlds', 'globe', 'Farms, towns, kitchens and whole worlds to build, run and explore.'),
  ('idle',    'Idle',         'coins', 'Tap, upgrade, automate. Empires that keep growing while you are away.'),
]
# "Popular": the owner's ranked picks (no analytics on this site). Rank 1 is the most popular.
# The portal blends this with the visitor's own play counts.
POPULAR = ['kingdom-defense','bloxburg-town','godot-claire-big-life','neon-dash','survivor-wave','crowd-clash','high-nest',
  'hub-chess','critter-rush-2d','bridge-rush','hub-isle-of-bells','nistar','hole-grind','hub-block-blast','godot-swellrider',
  'hub-game-2048','cook-rush','claire-pip','rung-runner','helix-drop','clean-house','snake-clash','market-merge','hub-flappy-flight']

G = []
def add(id, title, cat, blurb, src, thumb, ext=False, rec=None, label=None, tags=(), featured=False, new=False, players=1, frm='', note='', stage=''):
    G.append({'id':id, 'title':title, 'cat':cat, 'blurb':blurb, 'src':src, 'thumb':'assets/thumbs/'+thumb, 'ext':ext,
              'rec':rec, 'label':label, 'tags':list(tags), 'featured':featured, 'new':new, 'players':players, 'from':frm, 'note':note, 'stage':stage})

# ---------- local cabinets (this repo) ----------
L = [
 ('high-nest','High Nest','arcade','One owl. One tree. The world\'s tallest treehouse. Drop each plank as it swings — whatever hangs over the edge is sawn off.','HighNest','hn_rec','best planks',('stack','timing'),True),
 ('market-merge','Market Merge','puzzle','Sort the delivery into one wooden crate. Two of a kind squash together into the next size up — chain the cascade.','MarketMerge','mm_rec','best score',('merge','2048'),False),
 ('survivor-wave','Survivor Wave','arcade','The horde took the city. You have 10 minutes, an auto-firing arsenal and one job: survive.','SurvivorWave','sw_rec','best wave',('survival','shooter'),True),
 ('surviv-royale','Surviv Royale','arcade','16 drop in. 1 walks out. Top-down battle royale on a shrinking map.','SurvivIO','sio_rec','best rank',('shooter','royale'),False),
 ('hole-grind','Hole Grind','hyper','Steer the hole. Swallow anything smaller than you, grow, then swallow what used to be too big.','HoleGrind','hg_rec','best mass',('hole','io'),False),
 ('balloon-bust','Balloon Bust','hyper','Reflex popping with a timer that never stops being rude.','BalloonBust','bb_rec','best pops',('reflex','tap'),False),
 ('long-way-home','The Long Way Home','learning','Eleven thousand light years out, with a cracked hull and no navigator. Every ring you pass asks you something.','SpellMathsGalaxy','tlwh_rec','best log',('spelling','maths','space'),False),
 ('maths-kart','Maths Kart GP','learning','Answer questions on the road — right answers rocket you forward.','MathsKart','mk_rec','best lap',('maths','racing'),False),
 ('math-miner','Math Miner','learning','Dig down, solve the rocks, haul the ore home.','MathMiner','mmn_rec','best depth',('maths','mining'),False),
 ('word-dungeon','Word Dungeon','learning','Spell your way past the door or the door stays shut.','WordDungeon','wd_rec','best floor',('spelling','dungeon'),False),
 ('fishing-for-words','Fishing for Words','learning','Cast a line, tap the strike ring, land letter-fish and number-fish. Spell the clue word or weigh your catch.','WordFishing','wf_rec','best catch',('spelling','cozy'),False),
 ('quiz-tower','Quiz Tower Defense','learning','Climb by answering. Miss twice and the tower drops you.','QuizTower','qt_rec','best floor',('quiz','tower defense'),False),
 ('mini-mart','QuickStop Mini Mart','sim','Run the shop: stock, price, restock, and survive the rush.','MiniMart','mmt_rec','best day',('shop','tycoon'),False),
 ('field-station','Field Station','sim','Quiet research-station management with real upkeep pressure.','FieldStation','fs_rec','best survey',('management','science'),False),
]
for id,t,c,b,folder,rec,label,tags,feat in L:
    slug = re.sub(r'(?<!^)(?=[A-Z])','-',folder).lower().replace('surviv-i-o','surviv-io')
    add(id,t,c,b,folder+'/index.html','arcade-'+slug+'.webp',rec=rec,label=label,tags=tags,featured=feat,frm='Cabinet')

# ---------- Bloxburg Town (Unity 6 WebGL, its own live site) ----------
add('bloxburg-town','Bloxburg Town','sim',
    'Claim a plot, build and furnish your house, work jobs, adopt a pet, buy a car, and live in a town whose neighbours keep their own schedules.',
    'https://calebhomwe.github.io/bloxburg-town/index.html','bloxburg-town.webp',ext=True,
    tags=('build','life sim','town','pets','driving'),featured=True,frm='Unity',
    note='Unity WebGL build: about 16 MB to load the first time, and happiest in a desktop browser. WASD to move, E to interact, B to build, F for furniture.')

# ---------- Playables (six hyper-casual, own live site) ----------
P = [
 ('bridge-rush','Bridge Rush','Collect material and lay the path in front of you. Run dry over a gap and you fall.',('bridge','runner'),True),
 ('crowd-clash','Crowd Clash','Steer your crowd down the track: take the gates that grow it, dodge the ones that don\'t, then throw it at the boss.',('crowd','runner'),False),
 ('helix-drop','Helix Drop','Rotate the tower to thread the gap and let gravity do the rest. Avoid the red.',('helix','drop'),False),
 ('rung-runner','Rung Runner','Auto-run, stack floating rungs, climb the walls, outrun the saws to the moon.',('ladder','runner'),False),
 ('snake-clash','Snake Clash','Eat, grow, and outlast the rival serpents in a tight glowing arena.',('snake','io'),False),
 ('volt-dash','Volt Dash','Your charge is always draining. Grab cells, hop and slide, burn a dash to survive.',('runner','energy'),False),
]
for id,t,b,tags,feat in P:
    d=''.join(w.capitalize() for w in id.split('-'))
    add(id,t,'hyper',b,PLAY+d+'/index.html','playables-'+id+'.webp',ext=True,tags=tags,featured=feat,frm='Playables')

# ---------- Pocket Arcade (arcade-hub: 38 single-file games) ----------
H = {  # file: (title, cat, blurb, tags)
 'flappy-flight':('Flappy Flight','arcade','Tap or press Space to flap. Fly through the pipes without crashing!',('flappy','tap')),
 'dino-dash':('Dino Dash','arcade','Tap or Space to jump (twice for a double jump). Swipe down to duck!',('runner','jump')),
 'color-switch':('Color Switch','arcade','Tap to spin. Pass through the colour that matches your ball — it changes after every pass.',('timing','colour')),
 'brick-breaker':('Brick Breaker','arcade','Drag anywhere (or ← → keys) to move the paddle. Break every brick!',('breakout','classic')),
 'game-2048':('2048','puzzle','Slide, merge, double. Reach the tile everyone claims they reached.',('merge','numbers')),
 'memory-match':('Memory Match','puzzle','Flip two, remember, flip again. Fewer moves, better rank.',('memory','cards')),
 'sudoku':('Sudoku','puzzle','Classic 9×9 with pencil marks and a hint that costs you time.',('logic','numbers')),
 'block-blast':('Block Blast','puzzle','Place blocks, clear lines, blast combos.',('blocks','tetris')),
 'minesweeper':('Minesweeper','puzzle','Tap to reveal · hold or right-click to flag · tap a number to chord.',('logic','classic')),
 'tower-stack':('Tower Stack','classic','Tap to drop the block. Stack as high as you can — land it dead-centre for a PERFECT.',('stack','timing')),
 'connect-four':('Connect Four','classic','Four in a row against a computer that actually blocks.',('board','vs-ai'),),
 'chess':('Chess','classic','A full chess engine with coaching, personalities and a ridiculous celebration.',('board','vs-ai','strategy')),
 'tic-tac-toe':('Tic Tac Toe','classic','Three in a row, three difficulties, zero mercy on Hard.',('board','vs-ai')),
 'simon-says':('Simon Says','classic','Watch the pattern, repeat it back. It gets long.',('memory','rhythm')),
 'snake':('Snake','classic','Swipe to steer. Eat apples, grow, don\'t crash! Rocks appear as you grow — grab gold to blast one.',('snake','classic')),
 'whack-a-mole':('Whack-a-Mole','hyper','Moles pop, you tap. Speed ramps, misses cost.',('tap','reflex')),
 'bubble-pop':('Bubble Pop','hyper','Pop bubbles fast! Bigger = more points. Never touch the bombs. Star bubbles split — tap twice!',('shooter','match')),
 'merge-blocks':('Merge Blocks','puzzle','Drop numbered blocks and merge equals down the column.',('merge','numbers')),
 'word-scramble':('Word Scramble','learning','Unscramble the letters before time runs out! Tap a tile to place it in a slot.',('spelling','words')),
 'hangman':('Hangman','learning','Guess the hidden word letter by letter. 7 wrong guesses and the hangman is complete!',('spelling','words')),
 'missing-letter':('Missing Letter','learning','A letter has vanished from the word! Pick the right one from 4 options before the 60-second clock hits zero.',('spelling','words')),
 'spell-and-say':('Spell & Say','learning','Listen to the spoken word, then spell it with the on-screen keyboard. 3 mistakes and it\'s game over!',('spelling','audio')),
 'rhyme-time':('Rhyme Time','learning','A word appears — type a word that RHYMES with it before the bar empties. Keep the chain alive on the beat.',('phonics','words')),
 'math-blast':('Math Blast','learning','Pop the bubble with the correct answer before it floats away! Streak your combo for big points.',('maths','shooter')),
 'math-run':('Math Run','learning','Swipe or tap a lane to run through the correct answer gate! Wrong gate = lose a heart. You have 3.',('maths','runner')),
 'math-snake':('Math Snake','learning','Swipe to steer! Eat the number that matches the answer. Wrong number = lose a heart.',('maths','snake')),
 'math-battle':('Math Battle','learning','Duel a rival: right answers hit, wrong ones hurt.',('maths','battle')),
 'idle-empire':('Idle Empire','idle','Tap the coin, buy buildings, and grow an empire! Own 25, 50 or 100 of a building to double its output.',('idle','tycoon')),
 'tap-monsters':('Tap Monsters','idle','Tap the monster to slay it, hire heroes for auto-DPS, and climb endless levels. Every 10th level is a BOSS.',('clicker','rpg')),
 'idle-miner':('Idle Miner','idle','Tap to dig deep! Upgrade your pickaxe, hire auto-miners, and blast with dynamite. Ore gets richer every tier.',('idle','mining')),
 'farm-harvest':('Farm Harvest','sim','Plant · Water · Harvest. Build helpers and grow your fortune!',('farm','cozy')),
 'farm-idle':('Farm Idle Tycoon','idle','Tap the tractor, buy buildings, and grow an endless farming empire!',('farm','idle')),
 'hole-swallow':('Hole Swallow','hyper','Drag the black hole around the field. Eat anything smaller — then the buildings.',('hole','io')),
 'knife-hit':('Knife Hit','hyper','Tap to throw a knife into the spinning log. Don\'t hit a stuck knife! Slice golden apples for +5.',('timing','throw')),
 'helix-smash':('Helix Smash','hyper','Bounce down the helix; smash through tiles when you have the speed.',('helix','drop')),
 'stack-ball':('Stack Ball','hyper','Rotate the stack and drop through the safe gaps. Red stops you.',('helix','drop')),
 'isle-of-bells':('Isle of Bells','sim','A cozy island where fish bite, bugs buzz, trees giggle when shaken and four fuzzy villagers need a friend.',('cozy','life','animal crossing')),
}
for f,(t,c,b,tags) in H.items():
    add('hub-'+f,t,c,b,HUB+f+'.html','hub-'+f+'.webp',ext=True,tags=tags,featured=(f in ('chess','isle-of-bells')),frm='Pocket Arcade')

# ---------- Neon Game Arcade (the bigger builds) ----------
# The five that have their own source repos ship from this repo now (newer builds than the copies on the Neon site).
add('neon-dash','Neon Dash','arcade','Dodge · Slide · Collect. Three-lane neon endless runner.','NeonDash/index.html','neon-dash.webp',tags=('runner','3d'),featured=True,frm='Cabinet')
add('critter-rush','Critter Rush 3D','arcade','Race to the finish! Use weapons to slow rivals.','CritterRush/index.html','critter-rush.webp',tags=('racing','3d'),frm='Cabinet')
add('critter-rush-2d','Critter Rush 2D','arcade','The Fun-Run style rewrite: flatter, faster, far more readable.','CritterRush2D/index.html','critter-rush-2d.webp',tags=('racing','sprites'),frm='Cabinet')
add('dominion','Dominion','sim','Seeded biome world generated fresh every run.','Dominion/index.html','dominion.webp',tags=('world','procedural'),frm='Cabinet')
add('living-world','Dominion: Living World','sim','The same world, now with agents that keep moving without you.','LivingWorld/index.html','living-world.webp',tags=('world','agents'),frm='Cabinet')
N = [
 ('mini-life-sim','Mini Life Sim','sim','Click an object to choose an interaction, click the floor to move. Keep needs healthy, earn money, survive the week.','mini-life-sim/index.html','neon-mini-life-sim.webp',('life','sims'),False),
 ('bridge-race-classic','Bridge Race','hyper','Run, collect planks and build across the gaps.','bridge-race-classic.html','neon-bridge-race-classic.webp',('bridge','runner'),False),
 ('game-arcade-7','Game Arcade — Bridge Race & Fashion Princess','arcade','Seven games in one page: Bridge Race, Fashion Princess dress-up, Tetris, Snake, Breakout, Flappy and a shooter, with touch controls.','neon-arcade.html','neon-game-arcade-7.webp',('7-in-1','dress-up','classic'),False),
]
for id,t,c,b,src,thumb,tags,feat in N:
    add(id,t,c,b,NEON+src,thumb,ext=True,tags=tags,featured=feat,frm='Neon Arcade')

# ---------- more cabinets (this repo) ----------
add('claire-pip',"Claire's Big Life",'sim',"Live · Play · Explore. Care for your pet, play fun activities, collect treasures, decorate your world, and dress Claire up in style!",'ClairePip/index.html','claire-pip.webp',tags=('pet','dress-up','kids','bible'),featured=True,frm='Cabinet',stage='tall',
    note='Pick an age band on the first screen and the activities adjust to it. Everything saves on this device.')
add('sneaker-drop','SneakerDrop — Hype Market Tycoon','sim','Bid on drops, snipe the resale market, cash out before the hype cools.','SneakerDrop/index.html','sneaker-drop.webp',tags=('tycoon','market'),frm='Cabinet')
add('deepcut-mine','DEEPCUT','arcade','Dig down, dodge the lava, haul the rare ore back up before the shaft closes.','DeepcutMine/index.html','deepcut-mine.webp',tags=('mining','dig'),frm='Cabinet')
add('cook-rush','Cook Rush','arcade','Day 1, opening shift. Tap the station each ticket needs, take food off the pan before it burns, then plate it.','CookRush/index.html','cook-rush.webp',tags=('cooking','time management'),frm='Cabinet')
add('typhoon-mine','TYPHOON MINE','arcade','Mine through the storm. Grab ore, brace for the gusts, get out.','TyphoonMine/index.html','typhoon-mine.webp',tags=('mining','storm'),frm='Cabinet')
add('clean-house','Clean House','sim','Tap a job card to load the house and start cleaning. Drag to look, click or drag surfaces to clean, wheel to zoom.','CleanHouse/index.html','clean-house.webp',tags=('cleaning','3d','satisfying'),frm='Cabinet')
add('tic-tac-toe','Tic Tac Toe — Beat the Bot','classic','Three in a row against a bot that does not blunder.','TicTacToe/index.html','tic-tac-toe.webp',tags=('board','vs-ai'),frm='Cabinet')
add('snap-jigsaw','Snap Jigsaw — Daily Puzzle Challenge','puzzle','Drag the patterned tiles into the grid. A fresh puzzle every day.','SnapJigsaw/index.html','snap-jigsaw.webp',tags=('jigsaw','daily'),frm='Cabinet')
add('kingdom-defense','Kingdom Defense','arcade','Build a 25-defender kingdom of fox scouts, badger cannons and polar cooling towers, master three-path upgrades, and stop layered air-pods and siege carriers across a campaign of hand-painted maps.','KingdomDefense/index.html','kingdom-defense.webp',tags=('tower defense','strategy','campaign'),featured=True,new=True,frm='Cabinet',note='Pick a map, tap a defender in the side panel, then tap clear ground to place it. Start Wave when ready.')
add('nistar','NISTAR','arcade','A four-lane rhythm game of praise: pick a song from the live stage, choose a gift, and hit every note as it lands. Charts from Easy to Master, holds, combos and a daily challenge.','Nistar/index.html','nistar.webp',tags=('rhythm','music','faith'),featured=True,new=True,frm='Cabinet',note='Lanes: D F J K. Pick a song, then press Play at the bottom. Max graphics for desktops, Lite for older machines.')
add('chili-firm','Chili Firm 2: Replanted','idle','Grandma Rosa left you twelve plots and a rusty hose. Plant, water and harvest chilies, work the market, hire farmhands and grow a hot-sauce empire, one story chapter at a time.','ChiliFirm/index.html','chili-firm.webp',tags=('idle','farm','tycoon','story'),new=True,frm='Cabinet',note='Tap a plot, then Plant. Water for double speed. The farm keeps earning while the tab is closed.')
add('chef-chloe-kitchen','Chef Chloe: Viral Kitchen','sim','Learn recipes in Chloe\'s kitchen, then serve them in the Café Rush. Daily rewards, a cookbook, a shop and a wardrobe to dress Chloe up.','ChefChloeKitchen/index.html','chef-chloe-kitchen.webp',tags=('cooking','kids','dress up'),new=True,frm='Cabinet',stage='tall')
add('rap-academy','Rap Academy','learning','Learn to rap by rapping: sixteen short lessons on flow, bars, rhyme schemes and breath, then mic games that score your timing against the beat, plus Faith Bars, Bar Builder and a cypher battle. Clean lyrics only.','RapAcademy/index.html','rap-academy.webp',tags=('music','rap','mic','lessons'),new=True,frm='Cabinet',note='The mic games ask to use your microphone; the lessons, quizzes and arcade rounds work without one.')

# ---------- Godot 4 web builds (this repo, one shared engine in Godot/_engine) ----------
GODOT_NOTE='Godot web build: the first game you open downloads the shared 38 MB engine once, then every Godot game starts fast. Desktop browsers are happiest; Chrome or Safari on a phone also work.'
GD = [
 ('godot-claire-big-life',"Claire's Big Life Adventure",'sim',"Claire's farm story: grow wheat and sunflowers, raise chickens, cows and sheep, bake, fill orders and the harbour boat, make friends and bring back the Lantern Fair across twelve chapters.",'claire-big-life',('farm','life sim','kids','township'),True,'WASD or arrows to walk, E to interact, tap or click anything that glows.'),
 ('godot-heat-firm','Heat Firm','sim','Cozy business idle: grow a single greenhouse from a leaky shed to a five-branch empire, switching between chilli, coffee, flowers, potions and lollies at will. Your staff keep working while you are away.','heat-firm',('idle','tycoon','greenhouse'),False,'Water: W · Harvest: E · Select plots: 1-6.'),
 ('godot-city-builder','City Builder 2000','sim','Place roads, houses, trees and cars on a grid, rotate objects, and watch citizen cars drive around your town.','city-builder',('city','builder','grid'),False,'1 Road · 2 House · 3 Tree · 4 Car · ? for help.'),
 ('godot-tidebreak','TIDEBREAK','arcade','Asset-free 3D arcade surfing: carve the face, pump for speed, land tricks in the barrel.','tidebreak',('surf','3d','tricks'),False,''),
 ('godot-tidebreak-world-tour','TIDEBREAK World Tour','sim','Season 1, Elite Division. Seven stops from Pipeline to the Tidebreak Finals: climb the rankings, earn tour points, unlock sponsors.','tidebreak-world-tour',('surf','career','menu'),False,'D-pad or mouse to select · A/Enter confirm · B/Esc back.'),
 ('godot-la-city','LA City','arcade','Deliver packages across a blocky downtown against the clock. Build rep, climb the rank board, survive the traffic.','la-city',('driving','delivery','3d'),False,'WASD to drive.'),
 ('godot-chef-chloe','Chef Chloe','sim','Run the kitchen for a full shift: chop, sizzle, plate, and toss the finished dishes to waiting customers.','chef-chloe',('cooking','shift','mini-games'),False,''),
]
GD.append(('godot-swellrider','SwellRider','arcade','Arcade surfing across real Hawaii at golden hour: drop into peeling reef breaks from Waikiki to Pipeline, get barrelled, and make every 80-second run count toward cash, XP and rank.','swellrider',('surf','3d','hawaii'),False,'A / D carve · W pump · S brake · Q / E change board · C camera.'))
GD.append(('godot-heavens-grace',"Heaven's Grace",'arcade','Godot rhythm prototype: 300 notes at 144 BPM across four lanes, four difficulties from Easy to Tapmaster.','heavens-grace',('rhythm','music','bible'),False,'Lanes: D F J K or arrows · Space start · R retry · P pause · tap lanes on mobile.'))
for id,t,c,b,folder,tags,feat,ctl in GD:
    add(id,t,c,b,'Godot/'+folder+'/index.html',id+'.webp',tags=tags,featured=feat,frm='Godot',note=(ctl+' ' if ctl else '')+GODOT_NOTE,stage='tall' if id=='godot-heavens-grace' else '')

# ---------- Skywalker mini-arcade (22 quick plays) ----------
S = {
 'balance-tile':('Balance Tile','Keep the tile steady.'),'breakout':('Brick Breaker','Clear the brick wall.'),'color-match':('Color Match','Match the incoming colours.'),
 'cut-rope':('Cut the Rope','Slice the rope at the right moment.'),'flappy-bird':('Flap & Fly','Thread the gaps.'),'grow-shrink':('Grow or Shrink','Change size to survive.'),
 'hole-eater':('Hole Eater','Consume the arena.'),'key-unlock':('Pull the Pin','Find the matching key.'),'lane-switcher':('Lane Switcher','Swap lanes and dodge.'),
 'match-swipe':('Match Swipe','Swipe matching shapes.'),'maze-runner':('Maze Runner','Find the exit.'),'parking-puzzle':('Parking Puzzle','Clear the traffic jam.'),
 'rope-swing':('Rope Swing','Swing through the course.'),'slide-runner':('Slide Runner','Slide under hazards.'),'slingshot':('Slingshot','Aim and launch.'),
 'snake':('Snake','Grow without hitting yourself.'),'sniper-shot':('Sniper Shot','Line up the target.'),'spike-jump':('Spike Jump','Jump the spike timing.'),
 'stack-tower':('Stack Tower','Build the tallest tower.'),'swim-dodge':('Swim Dodge','Dodge underwater hazards.'),'traffic-run':('Traffic Run','Cross the road safely.'),
 'turret-defense':('Turret Defense','Hold the line.'),
}
for f,(t,b) in S.items():
    add('sky-'+f,t,'hyper',b,NEON+'skywalker-playables/'+f+'.html','sky-'+f+'.webp',ext=True,tags=('quick play',),frm='Skywalker')

# ---------- derived fields ----------
for g in G:
    g['pop'] = POPULAR.index(g['id'])+1 if g['id'] in POPULAR else 0
    pv = 'assets/previews/%s.webp' % g['id']      # optional hover preview, picked up automatically
    g['preview'] = pv if os.path.exists(os.path.join(ROOT,pv)) else ''
    t2 = 'assets/thumbs/2x/' + os.path.basename(g['thumb'])     # 960x600 key art from tools/keyart.py, used by big tiles
    g['thumb2x'] = t2 if os.path.exists(os.path.join(ROOT,t2)) else ''
    g['mb'] = 0   # download size of a local game's own folder (the shared Godot engine is counted separately)
    if not g['ext']:
        d = os.path.dirname(os.path.join(ROOT, g['src']))
        g['mb'] = round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d) for f in fs) / 1048576, 1)
unknown=[i for i in POPULAR if i not in {g['id'] for g in G}]; assert not unknown, 'POPULAR has unknown ids: %s' % unknown

# ---------- verify thumbs exist ----------
missing=[g['thumb'] for g in G if not os.path.exists(os.path.join(ROOT,g['thumb']))]
ids=[g['id'] for g in G]; assert len(ids)==len(set(ids)), 'duplicate id'
out = '/* Generated by tools/build_catalog.py — do not edit by hand. */\n'
out += 'const CATS = %s;\n' % json.dumps([{'id':i,'name':n,'icon':ic,'desc':d} for i,n,ic,d in CATS], ensure_ascii=False)
out += 'const CATALOG = %s;\n' % json.dumps(G, ensure_ascii=False, indent=0).replace('\n',' ')
open(os.path.join(ROOT,'catalog.js'),'w',encoding='utf-8').write(out)
import portal_shell
portal_shell.write(ROOT, G, CATS)
print('catalog.js: %d games (%d local, %d external), %d categories' % (len(G), sum(not g['ext'] for g in G), sum(g['ext'] for g in G), len(CATS)))
for fn in ('index.html','manifest.webmanifest','README.txt'):
    fp=os.path.join(ROOT,fn); t=open(fp,encoding='utf-8').read()
    t2=re.sub(r'\b\d+ (free browser games|free games|games,|games"|games<)', lambda m: '%d %s' % (len(G), m.group(1)), t)
    if t2!=t: open(fp,'w',encoding='utf-8').write(t2); print('  count updated in', fn)

# ---------- sitemap + robots (one play URL per game) ----------
SITE = 'https://calebhomwe.github.io/arcade/'
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '  <url><loc>%s</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>' % SITE]
for c,*_ in CATS: sm.append('  <url><loc>%s?cat=%s</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>' % (SITE, c))
for g in G: sm.append('  <url><loc>%splay.html?g=%s</loc><changefreq>monthly</changefreq><priority>%s</priority></url>' % (SITE, g['id'], '0.8' if g['featured'] else '0.5'))
sm.append('</urlset>')
open(os.path.join(ROOT,'sitemap.xml'),'w',encoding='utf-8').write('\n'.join(sm)+'\n')
open(os.path.join(ROOT,'robots.txt'),'w',encoding='utf-8').write('User-agent: *\nAllow: /\nDisallow: /arcade/tools/\n\nSitemap: %ssitemap.xml\n' % SITE)
print('sitemap.xml: %d urls; robots.txt written' % (len(sm)-3))
if missing: print('MISSING THUMBS (%d):' % len(missing)); [print('  ',m) for m in missing]
