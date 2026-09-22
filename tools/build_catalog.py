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
def add(id, title, cat, blurb, src, thumb, ext=False, rec=None, label=None, tags=(), featured=False, new=False, players=1):
    G.append(dict(id=id, title=title, cat=cat, blurb=blurb, src=src, thumb='assets/thumbs/'+thumb, ext=ext,
                  rec=rec, label=label, tags=list(tags), featured=featured, new=new, players=players))

# ---------- local cabinets (this repo) ----------
L = [
 ('high-nest','High Nest','arcade','Stack the treehouse into the stars without dropping a plank.','HighNest','hn_rec','best planks',('stack','timing'),True),
 ('market-merge','Market Merge','puzzle','Merge produce crates before the stall runs out of counter space.','MarketMerge','mm_rec','best score',('merge','2048'),False),
 ('survivor-wave','Survivor Wave','arcade','Bullet-heaven survival — hold the field as the waves compound.','SurvivorWave','sw_rec','best wave',('survival','shooter'),True),
 ('surviv-royale','Surviv Royale','arcade','Top-down battle royale against bots on a shrinking map.','SurvivIO','sio_rec','best rank',('shooter','royale'),False),
 ('hole-grind','Hole Grind','hyper','Swallow the town one parked car at a time and grow the hole.','HoleGrind','hg_rec','best mass',('hole','io'),False),
 ('balloon-bust','Balloon Bust','hyper','Reflex popping with a timer that never stops being rude.','BalloonBust','bb_rec','best pops',('reflex','tap'),False),
 ('long-way-home','The Long Way Home','learning','Spelling and arithmetic wrapped in a long voyage back to Earth.','SpellMathsGalaxy','tlwh_rec','best log',('spelling','maths','space'),False),
 ('maths-kart','Maths Kart GP','learning','Answer fast, drive fast — times tables as a racing line.','MathsKart','mk_rec','best lap',('maths','racing'),False),
 ('math-miner','Math Miner','learning','Dig deeper by solving deeper. Arithmetic with a payoff loop.','MathMiner','mmn_rec','best depth',('maths','mining'),False),
 ('word-dungeon','Word Dungeon','learning','Spell your way past the door or the door stays shut.','WordDungeon','wd_rec','best floor',('spelling','dungeon'),False),
 ('fishing-for-words','Fishing for Words','learning','Calm vocabulary fishing — the gentlest thing on the shelf.','WordFishing','wf_rec','best catch',('spelling','cozy'),False),
 ('quiz-tower','Quiz Tower','learning','Climb by answering. Miss twice and the tower drops you.','QuizTower','qt_rec','best floor',('quiz','tower defense'),False),
 ('mini-mart','Mini Mart','sim','Run the shop: stock, price, restock, and survive the rush.','MiniMart','mmt_rec','best day',('shop','tycoon'),False),
 ('field-station','Field Station','sim','Quiet research-station management with real upkeep pressure.','FieldStation','fs_rec','best survey',('management','science'),False),
]
for id,t,c,b,folder,rec,label,tags,feat in L:
    slug = re.sub(r'(?<!^)(?=[A-Z])','-',folder).lower().replace('surviv-i-o','surviv-io')
    add(id,t,c,b,folder+'/index.html','arcade-'+slug+'.webp',rec=rec,label=label,tags=tags,featured=feat)

# ---------- Playables (six hyper-casual, own live site) ----------
P = [
 ('bridge-rush','Bridge Rush','Collect material and lay the path in front of you. Run dry over a gap and you fall.',('bridge','runner'),True),
 ('crowd-clash','Crowd Clash','Steer a swarm through ×/− gates, pick the best side, then burst the boss with what you gathered.',('crowd','runner'),False),
 ('helix-drop','Helix Drop','Rotate the tower to thread the gap and let gravity do the rest. Avoid the red.',('helix','drop'),False),
 ('rung-runner','Rung Runner','Auto-run, stack floating rungs, climb the walls, outrun the saws to the moon.',('ladder','runner'),False),
 ('snake-clash','Snake Clash','Eat, grow, and outlast the rival serpents in a tight glowing arena.',('snake','io'),False),
 ('volt-dash','Volt Dash','Your charge is always draining. Grab cells, hop and slide, burn a dash to survive.',('runner','energy'),False),
]
for id,t,b,tags,feat in P:
    d=''.join(w.capitalize() for w in id.split('-'))
    add(id,t,'hyper',b,PLAY+d+'/index.html','playables-'+id+'.webp',ext=True,tags=tags,featured=feat)

# ---------- Pocket Arcade (arcade-hub: 38 single-file games) ----------
H = {  # file: (title, cat, blurb, tags)
 'flappy-flight':('Flappy Flight','arcade','Tap to flap, thread the pipes, and try not to look at the score.',('flappy','tap')),
 'dino-dash':('Dino Dash','arcade','The no-internet runner, with a pulse: jump the cacti, duck the birds.',('runner','jump')),
 'color-switch':('Color Switch','arcade','Bounce through the wheel — only on the colour that matches your ball.',('timing','colour')),
 'brick-breaker':('Brick Breaker','arcade','Paddle, ball, wall. Power-ups fall; catch the good ones.',('breakout','classic')),
 'game-2048':('2048','puzzle','Slide, merge, double. Reach the tile everyone claims they reached.',('merge','numbers')),
 'memory-match':('Memory Match','puzzle','Flip two, remember, flip again. Fewer moves, better rank.',('memory','cards')),
 'sudoku':('Sudoku','puzzle','Classic 9×9 with pencil marks and a hint that costs you time.',('logic','numbers')),
 'block-blast':('Block Blast','puzzle','Drop shapes into the grid and clear full lines before you run out of room.',('blocks','tetris')),
 'minesweeper':('Minesweeper','puzzle','Count the neighbours, flag the mines, trust the numbers.',('logic','classic')),
 'tower-stack':('Tower Stack','classic','Time the drop and keep the tower square. Overhang gets trimmed.',('stack','timing')),
 'connect-four':('Connect Four','classic','Four in a row against a computer that actually blocks.',('board','vs-ai'),),
 'chess':('Chess','classic','A full chess engine with coaching, personalities and a ridiculous celebration.',('board','vs-ai','strategy')),
 'tic-tac-toe':('Tic Tac Toe','classic','Three in a row, three difficulties, zero mercy on Hard.',('board','vs-ai')),
 'simon-says':('Simon Says','classic','Watch the pattern, repeat it back. It gets long.',('memory','rhythm')),
 'snake':('Snake','classic','The one from the phone. Eat, grow, do not bite yourself.',('snake','classic')),
 'whack-a-mole':('Whack-a-Mole','hyper','Moles pop, you tap. Speed ramps, misses cost.',('tap','reflex')),
 'bubble-pop':('Bubble Pop','hyper','Aim, fire, match three, and keep the ceiling off the line.',('shooter','match')),
 'merge-blocks':('Merge Blocks','puzzle','Drop numbered blocks and merge equals down the column.',('merge','numbers')),
 'word-scramble':('Word Scramble','learning','Unscramble the letters before the timer runs the word out.',('spelling','words')),
 'hangman':('Hangman','learning','Guess the word one letter at a time. Six wrong and it is over.',('spelling','words')),
 'missing-letter':('Missing Letter','learning','One letter is gone. Put it back. Faster.',('spelling','words')),
 'spell-and-say':('Spell & Say','learning','Hear the word, spell the word, hear it again if you need to.',('spelling','audio')),
 'rhyme-time':('Rhyme Time','learning','Pick the word that rhymes before the beat drops.',('phonics','words')),
 'math-blast':('Math Blast','learning','Arithmetic under fire — answer to shoot the right asteroid.',('maths','shooter')),
 'math-run':('Math Run','learning','Endless runner where every gate is a sum. Pick the true one.',('maths','runner')),
 'math-snake':('Math Snake','learning','Snake, but the food is the correct answer.',('maths','snake')),
 'math-battle':('Math Battle','learning','Duel a rival: right answers hit, wrong ones hurt.',('maths','battle')),
 'idle-empire':('Idle Empire','idle','Buy buildings, earn while away, prestige for multipliers.',('idle','tycoon')),
 'tap-monsters':('Tap Monsters','idle','Tap to hit, hire heroes to hit for you, farm the boss.',('clicker','rpg')),
 'idle-miner':('Idle Miner','idle','Dig, upgrade, automate. The mine keeps going when you leave.',('idle','mining')),
 'farm-harvest':('Farm Harvest','sim','Plant, water, harvest, sell. Rain helps. Crows do not.',('farm','cozy')),
 'farm-idle':('Farm Idle','idle','A farm that grows itself once you have set it up right.',('farm','idle')),
 'hole-swallow':('Hole Swallow','hyper','Be the hole. Eat the small things first, then the buildings.',('hole','io')),
 'knife-hit':('Knife Hit','hyper','Throw knives into the spinning log without hitting the ones already there.',('timing','throw')),
 'helix-smash':('Helix Smash','hyper','Bounce down the helix; smash through tiles when you have the speed.',('helix','drop')),
 'stack-ball':('Stack Ball','hyper','Rotate the stack and drop through the safe gaps. Red stops you.',('helix','drop')),
 'isle-of-bells':('Isle of Bells','sim','A cozy island life: fish, plant, decorate, and talk to the neighbours.',('cozy','life','animal crossing')),
}
for f,(t,c,b,tags) in H.items():
    add('hub-'+f,t,c,b,HUB+f+'.html','hub-'+f+'.webp',ext=True,tags=tags,featured=(f in ('chess','isle-of-bells')))

# ---------- Neon Game Arcade (the bigger builds) ----------
N = [
 ('neon-dash','Neon Dash','arcade','One-button neon runner: rhythm, reflex, and a hard stop.','neon-dash/index.html','neon-neon-dash.webp',('runner','3d'),True),
 ('critter-rush','Critter Rush 3D','arcade','Three-racer side-scrolling weapon race in 3D.','critter-rush/index.html','neon-critter-rush.webp',('racing','3d'),False),
 ('critter-rush-2d','Critter Rush 2D','arcade','The Fun-Run style rewrite: flatter, faster, far more readable.','critter-rush-2d/index.html','neon-critter-rush-2d.webp',('racing','sprites'),False),
 ('dominion','Dominion','sim','Seeded biome world generated fresh every run.','dominion/index.html','neon-dominion.webp',('world','procedural'),False),
 ('living-world','Dominion: Living World','sim','The same world, now with agents that keep moving without you.','living-world/index.html','neon-living-world.webp',('world','agents'),False),
 ('mini-life-sim','Mini Life Sim','sim','Manage needs, work, save money and run a tiny household.','mini-life-sim/index.html','neon-mini-life-sim.webp',('life','sims'),False),
 ('bridge-race-classic','Bridge Race Classic','hyper','Run, collect planks and build across the gaps.','bridge-race-classic.html','neon-bridge-race-classic.webp',('bridge','runner'),False),
 ('tidebreak','Tidebreak','arcade','Local 2-player arena: grab the package, set traps, deliver it first.','skywalker-tidebreak.html','neon-skywalker-tidebreak.webp',('2-player','arena'),False),
]
for id,t,c,b,src,thumb,tags,feat in N:
    add(id,t,c,b,NEON+src,thumb,ext=True,tags=tags,featured=feat,players=2 if 'tidebreak'==id else 1)

# ---------- Skywalker mini-arcade (22 quick plays) ----------
S = {
 'balance-tile':('Balance Tile','Keep the tile steady.'),'breakout':('Breakout','Clear the brick wall.'),'color-match':('Color Match','Match the incoming colours.'),
 'cut-rope':('Cut Rope','Slice the rope at the right moment.'),'flappy-bird':('Flap & Fly','Thread the gaps.'),'grow-shrink':('Grow / Shrink','Change size to survive.'),
 'hole-eater':('Hole Eater','Consume the arena.'),'key-unlock':('Pull the Pin','Find the matching key.'),'lane-switcher':('Lane Switcher','Swap lanes and dodge.'),
 'match-swipe':('Match Swipe','Swipe matching shapes.'),'maze-runner':('Maze Runner','Find the exit.'),'parking-puzzle':('Parking Puzzle','Clear the traffic jam.'),
 'rope-swing':('Rope Swing','Swing through the course.'),'slide-runner':('Slide Runner','Slide under hazards.'),'slingshot':('Slingshot','Aim and launch.'),
 'snake':('Neon Snake','Grow without hitting yourself.'),'sniper-shot':('Sniper Shot','Line up the target.'),'spike-jump':('Spike Jump','Jump the spike timing.'),
 'stack-tower':('Stack Tower','Build the tallest tower.'),'swim-dodge':('Swim Dodge','Dodge underwater hazards.'),'traffic-run':('Traffic Run','Cross the road safely.'),
 'turret-defense':('Turret Defense','Hold the line.'),
}
for f,(t,b) in S.items():
    add('sky-'+f,t,'hyper',b,NEON+'skywalker-playables/'+f+'.html','sky-'+f+'.webp',ext=True,tags=('quick play',))

# ---------- verify thumbs exist ----------
missing=[g['thumb'] for g in G if not os.path.exists(os.path.join(ROOT,g['thumb']))]
ids=[g['id'] for g in G]; assert len(ids)==len(set(ids)), 'duplicate id'
out = '/* Generated by tools/build_catalog.py — do not edit by hand. */\n'
out += 'const CATS = %s;\n' % json.dumps([{'id':i,'name':n} for i,n in CATS])
out += 'const CATALOG = %s;\n' % json.dumps(G, ensure_ascii=False, indent=0).replace('\n',' ')
open(os.path.join(ROOT,'catalog.js'),'w',encoding='utf-8').write(out)
print('catalog.js: %d games (%d local, %d external), %d categories' % (len(G), sum(not g['ext'] for g in G), sum(g['ext'] for g in G), len(CATS)))
if missing: print('MISSING THUMBS (%d):' % len(missing)); [print('  ',m) for m in missing]
