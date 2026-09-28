#!/usr/bin/env python3
"""Build assets/game-meta.json: what the arcade standard expects of every game.

Sources, merged in this order:
  1. catalog.js (run tools/build_catalog.py first): id, title, category, tags, blurb.
  2. The tables below: genre module, graphics tier, cheat policy, owner-frozen games.
  3. A scan of each game's source (this repo, or the local clone of its own repo for
     external games): how it renders today, whether it saves, respects reduced motion,
     plays audio, and which keys it already uses (so P / Esc are only bound when free).
  4. Hand-written content in qa/standard/meta/<id>.json: howto, tips, controls,
     tricks, cheats, difficulty, and any overrides. One file per game so several people
     (or agents) can write content at once without merge conflicts. External games may
     instead keep theirs in their own repo at standard-meta/<id>.json.

    python3 tools/game_meta.py            # writes assets/game-meta.json
    python3 tools/game_meta.py --report   # also prints what each game is missing

Nothing here is invented: a field that nobody wrote stays empty, and the harness
reports it as missing.
"""
import glob, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOME = os.path.dirname(ROOT)
META_DIR = os.path.join(ROOT, 'qa', 'standard', 'meta')

# External games are opened by URL; their code lives in these sibling clones.
EXT_REPOS = {
    'https://calebhomwe.github.io/arcade-hub/': 'arcade-hub',
    'https://calebhomwe.github.io/neon-game-arcade/': 'neon-game-arcade',
    'https://calebhomwe.github.io/playables/': 'playables',
    'https://calebhomwe.github.io/bloxburg-town/': 'bloxburg-town',
}
# Godot web builds ship a binary .pck; their scenes are read from the source repo.
GODOT_REPOS = {
    'godot-claire-big-life': 'claires-big-life-adventure', 'godot-heat-firm': 'heat-firm-godot',
    'godot-city-builder': 'city-builder-godot', 'godot-tidebreak': 'tidebreak-godot',
    'godot-tidebreak-world-tour': 'TidebreakWorldTour', 'godot-la-city': 'LACity-Godot',
    'godot-chef-chloe': 'ChefChloe-Godot', 'godot-swellrider': 'swellrider-godot',
    'godot-heavens-grace': 'heavens-grace',
}

# Caleb said to leave these alone. They are audited and reported, never put on a work list.
FROZEN = {'nistar', 'godot-heavens-grace', 'chef-chloe-kitchen', 'godot-chef-chloe'}
# Caleb is working on these directly on main: only additive, merge-friendly changes.
OWNER_ACTIVE = {'summit-line', 'kingdom-defense'}

GENRES = {  # id: (name, extra features the genre module requires; see qa/standard/STANDARD.md section 3)
    'board-sports': ('Board sports / tricks', ['trick-system', 'trick-list', 'combo', 'land-bail-feedback', 'trick-tutorial']),
    'racing':       ('Racing / driving', ['countdown', 'position-or-lap-hud', 'results-with-time', 'best-time-or-ghost']),
    'tower-defense':('Tower defense', ['wave-preview', 'speed-control', 'tower-info', 'upgrade-and-sell', 'star-results']),
    'puzzle':       ('Puzzle', ['hints', 'undo', 'level-select-or-daily']),
    'learning':     ('Learning', ['age-or-level-bands', 'hints', 'grown-up-progress-report']),
    'idle':         ('Idle / tycoon', ['offline-earnings', 'upgrade-tree', 'big-number-format', 'prestige-or-next-goal']),
    'management':   ('Management / shop / shift', ['goals-or-day-targets', 'economy-readout', 'upgrade-path', 'end-of-day-summary']),
    'rhythm':       ('Rhythm', ['latency-calibration', 'difficulty-select', 'results-grade', 'no-fail-option']),
    'life-sim':     ('Life / farm / world sim', ['autosave', 'goals-or-quests', 'day-time-ui', 'inventory']),
    'arcade':       ('Arcade / survival / shooter', ['difficulty', 'power-up-list', 'wave-or-level-counter', 'high-score-table']),
    'board':        ('Board / classic', ['rules-screen', 'ai-difficulty', 'undo']),
    'hyper-casual': ('Hyper-casual', ['one-tap-start', 'instant-restart', 'best-score-badge', 'tutorial-card']),
}
GENRE_BY_ID = {
    'summit-line': 'board-sports', 'godot-tidebreak': 'board-sports', 'godot-swellrider': 'board-sports',
    'godot-tidebreak-world-tour': 'board-sports',
    'kingdom-defense': 'tower-defense',
    'critter-rush': 'racing', 'critter-rush-2d': 'racing', 'godot-la-city': 'racing',
    'nistar': 'rhythm', 'godot-heavens-grace': 'rhythm',
    'chili-firm': 'idle', 'godot-heat-firm': 'idle',
    'sneaker-drop': 'management', 'mini-mart': 'management', 'field-station': 'management', 'cook-rush': 'management',
    'clean-house': 'management', 'chef-chloe-kitchen': 'management', 'godot-chef-chloe': 'management',
    'hub-chess': 'board', 'hub-connect-four': 'board', 'hub-tic-tac-toe': 'board', 'tic-tac-toe': 'board',
    'hub-simon-says': 'puzzle', 'hub-tower-stack': 'hyper-casual', 'hub-snake': 'arcade',
    'high-nest': 'hyper-casual', 'hole-grind': 'hyper-casual', 'balloon-bust': 'hyper-casual',
    'hub-flappy-flight': 'hyper-casual', 'hub-dino-dash': 'hyper-casual', 'hub-color-switch': 'hyper-casual',
    'hub-brick-breaker': 'arcade', 'game-arcade-7': 'arcade',
    'sky-parking-puzzle': 'puzzle', 'sky-key-unlock': 'puzzle', 'sky-cut-rope': 'puzzle', 'sky-maze-runner': 'puzzle',
    'sky-turret-defense': 'hyper-casual',
}
GENRE_BY_CAT = {'hyper': 'hyper-casual', 'puzzle': 'puzzle', 'classic': 'arcade', 'learning': 'learning',
                'idle': 'idle', 'sim': 'life-sim', 'arcade': 'arcade'}

# Graphics tier = the bar the game is held to (not what it is today; the scan says that).
# 3D-R: the owner asked for realism. 3D-S: genres whose best-known games are 3D.
TIER_3DR = {'summit-line', 'godot-tidebreak', 'godot-swellrider'}
TIER_3DS = {
    'critter-rush', 'neon-dash', 'godot-la-city', 'maths-kart', 'clean-house', 'godot-city-builder',
    'godot-claire-big-life', 'bloxburg-town', 'hole-grind', 'hub-hole-swallow', 'sky-hole-eater',
    'crowd-clash', 'bridge-rush', 'bridge-race-classic', 'rung-runner', 'helix-drop', 'hub-helix-smash',
    'hub-stack-ball', 'mini-life-sim',
}
WHY_3D = {
    'hole-grind': 'Hole.io is a 3D game: the fun is watching buildings tip into the hole.',
    'hub-hole-swallow': 'Hole.io is a 3D game: the fun is watching buildings tip into the hole.',
    'sky-hole-eater': 'Hole.io is a 3D game: the fun is watching buildings tip into the hole.',
    'helix-drop': 'Helix Jump is a 3D tower you rotate.', 'hub-helix-smash': 'Helix Jump is a 3D tower you rotate.',
    'hub-stack-ball': 'Stack Ball is a 3D tower you smash through.',
    'crowd-clash': 'Crowd runners (Count Masters) are 3D tracks seen from behind.',
    'bridge-rush': 'Bridge Race is a 3D stair-building race.', 'bridge-race-classic': 'Bridge Race is a 3D stair-building race.',
    'rung-runner': 'Ladder Master is a 3D climb.', 'maths-kart': 'Kart racing reads best in 3D.',
    'mini-life-sim': 'The Sims-style rooms read best in 3D.',
}

def load_catalog():
    t = open(os.path.join(ROOT, 'catalog.js'), encoding='utf-8').read()
    return json.loads(re.search(r'const CATALOG = (.*);\s*$', t, re.M).group(1))

def source_dir(g):
    if not g['ext']:
        return os.path.dirname(os.path.join(ROOT, g['src']))
    for pre, repo in EXT_REPOS.items():
        if g['src'].startswith(pre):
            return os.path.join(HOME, repo, os.path.dirname(g['src'][len(pre):]))
    return None

def entry_file(g):
    if not g['ext']:
        return os.path.join(ROOT, g['src'])
    for pre, repo in EXT_REPOS.items():
        if g['src'].startswith(pre):
            return os.path.join(HOME, repo, g['src'][len(pre):])
    return None

def read_sources(g):
    """The text a single game is made of. External single-file games share a folder with
    dozens of others, so only the entry file and the scripts it names are read."""
    ent, d = entry_file(g), source_dir(g)
    if not ent or not os.path.exists(ent):
        return '', []
    files = [ent]
    shared_folder = g['ext'] and not g['src'].endswith('/index.html')
    if shared_folder:
        t = open(ent, encoding='utf-8', errors='ignore').read()
        for m in re.findall(r'src=["\']([^"\':]+\.m?js)["\']', t):
            p = os.path.normpath(os.path.join(os.path.dirname(ent), m))
            if os.path.exists(p): files.append(p)
    else:
        for r, ds, fs in os.walk(d):
            ds[:] = [x for x in ds if x not in ('.git', 'node_modules', 'qa', 'tests', 'proof', 'shots')]
            for f in fs:
                if f.endswith(('.html', '.js', '.mjs', '.css')):
                    files.append(os.path.join(r, f))
    text = []
    for p in dict.fromkeys(files):
        if os.path.getsize(p) < 6_000_000:
            text.append(open(p, encoding='utf-8', errors='ignore').read())
    return '\n'.join(text), files

def godot_scan(repo):
    d = os.path.join(HOME, repo)
    tscn = [p for p in glob.glob(os.path.join(d, '**', '*.tscn'), recursive=True) if '/addons/' not in p and '/.godot/' not in p]
    gd = [p for p in glob.glob(os.path.join(d, '**', '*.gd'), recursive=True) if '/addons/' not in p and '/.godot/' not in p]
    t3 = sum(1 for p in tscn if re.search(r'type="(Camera3D|Node3D|MeshInstance3D)"', open(p, errors='ignore').read()))
    code = '\n'.join(open(p, errors='ignore').read() for p in gd)
    return t3, code

def source_available(g):
    if g['id'] in GODOT_REPOS:
        return os.path.isdir(os.path.join(HOME, GODOT_REPOS[g['id']]))
    ent = entry_file(g)
    return bool(ent and os.path.exists(ent))

def scan(g):
    """What the game is today, read from its code."""
    if g['id'] in GODOT_REPOS:
        t3, code = godot_scan(GODOT_REPOS[g['id']])
        ent = entry_file(g); html = open(ent, encoding='utf-8', errors='ignore').read() if ent and os.path.exists(ent) else ''
        return {
            'engine': 'godot', 'render': 'godot-3d' if t3 else 'godot-2d',
            'saves': bool(re.search(r'user://|FileAccess|ConfigFile', code)),
            'reducedMotion': bool(re.search(r'reduce[d_]?[_ ]?motion', code, re.I)),
            'audio': bool(re.search(r'AudioStreamPlayer', code)),
            'gamepad': bool(re.search(r'JOY_|joypad', code, re.I)),
            'usesP': bool(re.search(r'KEY_P\b', code)), 'usesEsc': bool(re.search(r'KEY_ESCAPE|ui_cancel', code)),
            'ownPause': bool(re.search(r'get_tree\(\)\.paused\s*=', code)),
            'sdk': 'arcade-sdk.js' in html, 'sdkInit': 'ArcadeSDK' in code or 'ArcadeSDK.init' in html,
        }
    text, files = read_sources(g)
    if not text:
        return {'engine': 'unknown', 'render': 'unknown'}
    if os.path.exists(os.path.join(source_dir(g) or '', 'Build')) or 'createUnityInstance' in text:
        engine, render = 'unity', 'unity-3d'
    elif re.search(r'three(\.module)?(\.min)?\.js|from\s+["\']three["\']|new THREE\.|WebGLRenderer', text):
        engine, render = 'three', 'three-3d'
    elif re.search(r'BABYLON\.', text):
        engine, render = 'babylon', 'babylon-3d'
    elif re.search(r'PIXI\.', text):
        engine, render = 'pixi', 'webgl-2d'
    elif re.search(r'Phaser\.', text):
        engine, render = 'phaser', 'webgl-2d'
    elif re.search(r'getContext\(\s*["\']webgl2?["\']', text):
        engine, render = 'webgl', 'webgl'
    elif re.search(r'getContext\(\s*["\']2d["\']', text):
        engine, render = 'canvas', 'canvas-2d'
    else:
        engine, render = 'dom', 'dom'
    keyP = re.search(r"""key(Code)?\s*[!=]==?\s*['"](p|P|KeyP)['"]|case\s+['"](p|P|KeyP)['"]|['"]KeyP['"]""", text)
    keyEsc = re.search(r"""['"]Escape['"]|keyCode\s*===?\s*27\b""", text)
    ent = entry_file(g); html = open(ent, encoding='utf-8', errors='ignore').read() if ent and os.path.exists(ent) else ''
    return {
        'engine': engine, 'render': render,
        'saves': bool(re.search(r'localStorage|indexedDB', text)),
        'reducedMotion': 'prefers-reduced-motion' in text,
        'audio': bool(re.search(r'AudioContext|new Audio\(|<audio|Howl\(', text)),
        'gamepad': 'getGamepads' in text,
        'touch': bool(re.search(r'touchstart|pointerdown|onpointer', text)),
        'usesP': bool(keyP), 'usesEsc': bool(keyEsc),
        'ownPause': bool(re.search(r'\bpaused?\s*=\s*(true|!)|togglePause|pauseGame|function pause', text)),
        'sdk': 'arcade-sdk.js' in html, 'sdkInit': 'ArcadeSDK.init' in text,
    }

def cheat_policy(gid, genre):
    if gid in FROZEN: return 'frozen'
    if genre == 'learning': return 'learning'
    if genre == 'rhythm': return 'rhythm'
    return 'eligible'

def main():
    cat = load_catalog()
    thumbs = {g['id']: (g['thumb'], g.get('thumb2x', '')) for g in cat}
    # Where a game's source is not on this machine (CI has no access to the private Godot
    # repos), keep the scan from the last committed game-meta.json instead of guessing.
    try:
        previous = json.load(open(os.path.join(ROOT, 'assets', 'game-meta.json'), encoding='utf-8'))['games']
    except (OSError, ValueError, KeyError):
        previous = {}
    games, missing = {}, {}
    for g in cat:
        gid = g['id']
        genre = GENRE_BY_ID.get(gid) or GENRE_BY_CAT.get(g['cat'], 'arcade')
        sc = scan(g) if source_available(g) or g['id'] not in previous else previous[g['id']]['scan']
        is3d = sc.get('render', '').endswith('3d')
        tier = '3D-R' if gid in TIER_3DR else '3D-S' if (gid in TIER_3DS or is3d) else '2D-HD'
        # P / Esc may open the arcade menu only where the game does not already use them.
        free = [k for k, used in (('p', sc.get('usesP')), ('esc', sc.get('usesEsc'))) if not used]
        keys = '+'.join(free)   # 'p+esc', 'p', 'esc' or ''
        m = {
            'title': g['title'], 'cat': g['cat'], 'genre': genre, 'genreName': GENRES[genre][0],
            'modules': GENRES[genre][1], 'tier': tier, 'should3d': tier.startswith('3D'),
            'why3d': WHY_3D.get(gid, ''), 'cheatPolicy': cheat_policy(gid, genre),
            'frozen': gid in FROZEN, 'ownerActive': gid in OWNER_ACTIVE,
            'ext': g['ext'], 'src': g['src'], 'scan': sc,
            'pauseKeys': keys, 'pauseButton': 'tr',
            'howto': [], 'tips': [], 'controls': {}, 'tricks': [], 'cheats': [], 'difficulty': '',
            'features': {},   # genre-module feature -> where it lives in the game (written by the game's author)
        }
        p = os.path.join(META_DIR, gid + '.json')
        if not os.path.exists(p) and g['ext']:
            # External games may keep their content next to their code: <repo>/standard-meta/<id>.json
            for pre, repo in EXT_REPOS.items():
                if g['src'].startswith(pre):
                    q = os.path.join(HOME, repo, 'standard-meta', gid + '.json')
                    if os.path.exists(q): p = q
        if os.path.exists(p):
            own = json.load(open(p, encoding='utf-8'))
            for k, v in own.items():
                if k.startswith('_'): continue
                m[k] = v
            m['authored'] = sorted(k for k in own if not k.startswith('_'))
        else:
            m['authored'] = []
        games[gid] = m
        gaps = [k for k, ok in (('howto', len(m['howto']) >= 2), ('tips', len(m['tips']) >= 3),
                                ('controls', bool(m['controls'])), ('difficulty', bool(m['difficulty'])),
                                ('cheats', m['cheatPolicy'] != 'eligible' or len(m['cheats']) >= 3),
                                ('tricks', genre != 'board-sports' or len(m['tricks']) >= 6),
                                ('tile-2x', bool(thumbs[gid][1]))) if not ok]
        if gaps: missing[gid] = gaps
    out = {'version': 1, 'note': 'Generated by tools/game_meta.py from catalog.js, a source scan and qa/standard/meta/*.json. Do not edit by hand.',
           'genres': {k: {'name': v[0], 'modules': v[1]} for k, v in GENRES.items()}, 'games': games}
    open(os.path.join(ROOT, 'assets', 'game-meta.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    n3 = sum(1 for m in games.values() if m['should3d']); now3 = sum(1 for m in games.values() if m['should3d'] and m['scan'].get('render', '').endswith('3d'))
    print('game-meta.json: %d games, %d authored, %d frozen; %d should be 3D (%d are today); %d still missing content'
          % (len(games), sum(1 for m in games.values() if m['authored']), len(FROZEN), n3, now3, len(missing)))
    if '--report' in sys.argv:
        for gid, gaps in missing.items(): print('  %-28s %s%s' % (gid, ', '.join(gaps), '  (frozen)' if gid in FROZEN else ''))

if __name__ == '__main__':
    main()
