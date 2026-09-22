#!/usr/bin/env python3
"""Build catalog.js — the single source of truth for every game on the portal.

Local cabinets live in this repo. Everything else is one of Caleb's other
live GitHub Pages sites and is opened inside the portal's play page by URL.
Thumbnails are real captured frames (assets/thumbs/*.webp), never mockups.

    python3 tools/build_catalog.py        # writes ../catalog.js
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HUB  = 'https://calebhomwe.github.io/arcade-hub/games/'
NEON = 'https://calebhomwe.github.io/neon-game-arcade/games/'
PLAY = 'https://calebhomwe.github.io/playables/'

CATS = [  # order = nav order
  ('arcade',  'Arcade'),
  ('hyper',   'Hyper-Casual'),
  ('puzzle',  'Puzzle'),
  ('classic', 'Classic'),
  ('learning','Learning'),
  ('sim',     'Sim & Worlds'),
  ('idle',    'Idle'),
]

G = []
def add(id, title, cat, blurb, src, thumb, ext=False, rec=None, label=None, tags=(), featured=False, new=False, players=1, frm='', note=''):
    G.append({'id':id, 'title':title, 'cat':cat, 'blurb':blurb, 'src':src, 'thumb':'assets/thumbs/'+thumb, 'ext':ext,
              'rec':rec, 'label':label, 'tags':list(tags), 'featured':featured, 'new':new, 'players':players, 'from':frm, 'note':note})

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
N = [
 ('neon-dash','Neon Dash','arcade','Dodge · Slide · Collect. Three-lane neon endless runner.','neon-dash/index.html','neon-neon-dash.webp',('runner','3d'),True),
 ('critter-rush','Critter Rush 3D','arcade','Race to the finish! Use weapons to slow rivals.','critter-rush/index.html','neon-critter-rush.webp',('racing','3d'),False),
 ('critter-rush-2d','Critter Rush 2D','arcade','The Fun-Run style rewrite: flatter, faster, far more readable.','critter-rush-2d/index.html','neon-critter-rush-2d.webp',('racing','sprites'),False),
 ('dominion','Dominion','sim','Seeded biome world generated fresh every run.','dominion/index.html','neon-dominion.webp',('world','procedural'),False),
 ('living-world','Dominion: Living World','sim','The same world, now with agents that keep moving without you.','living-world/index.html','neon-living-world.webp',('world','agents'),False),
 ('mini-life-sim','Mini Life Sim','sim','Click an object to choose an interaction, click the floor to move. Keep needs healthy, earn money, survive the week.','mini-life-sim/index.html','neon-mini-life-sim.webp',('life','sims'),False),
 ('bridge-race-classic','Bridge Race','hyper','Run, collect planks and build across the gaps.','bridge-race-classic.html','neon-bridge-race-classic.webp',('bridge','runner'),False),
]
for id,t,c,b,src,thumb,tags,feat in N:
    add(id,t,c,b,NEON+src,thumb,ext=True,tags=tags,featured=feat,frm='Neon Arcade')

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

# ---------- verify thumbs exist ----------
missing=[g['thumb'] for g in G if not os.path.exists(os.path.join(ROOT,g['thumb']))]
ids=[g['id'] for g in G]; assert len(ids)==len(set(ids)), 'duplicate id'
out = '/* Generated by tools/build_catalog.py — do not edit by hand. */\n'
out += 'const CATS = %s;\n' % json.dumps([{'id':i,'name':n} for i,n in CATS])
out += 'const CATALOG = %s;\n' % json.dumps(G, ensure_ascii=False, indent=0).replace('\n',' ')
open(os.path.join(ROOT,'catalog.js'),'w',encoding='utf-8').write(out)
print('catalog.js: %d games (%d local, %d external), %d categories' % (len(G), sum(not g['ext'] for g in G), sum(g['ext'] for g in G), len(CATS)))
if missing: print('MISSING THUMBS (%d):' % len(missing)); [print('  ',m) for m in missing]
