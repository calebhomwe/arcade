#!/usr/bin/env python3
"""Key-art compositor for the portal's game tiles.

Every tile is built from a real frame of that game (tools/keyart/src/<id>.webp):
no invented art. For each game, tools/keyart/spec.json says what to crop and
how to lay it out. The compositor then applies one consistent grade and adds
the title logotype. Output:

    assets/thumbs/<thumb>.webp      480x300  (every tile)
    assets/thumbs/2x/<thumb>.webp   960x600  (big mosaic tiles, 2x screens)

Usage
    python3 tools/keyart.py import <id> <image> [x0,y0,x1,y1]   # copy a real frame (optional pixel crop) into src/
    python3 tools/keyart.py render [id ...]                     # render all (or some) tiles
    python3 tools/keyart.py sheet <out.png> [id ...]            # contact sheet for review

Spec fields (all optional)
    logo     title text; "|" forces a line break           (default: catalogue title)
    mode     "scene" (a cropped moment of play) or "hero" (for minimal or dark games:
             the hero element enlarged over a vivid backdrop made from the same frame)
    crop     [x0,y0,x1,y1] 0..1 of the source: the scene, kept HUD-free
             (widened or narrowed to 16:10 around its centre)
    hero     [x0,y0,x1,y1] 0..1 of the source: the hero element (hero mode)
    blend    "screen" lifts a sprite off a black background; "normal" otherwise
    heroAt   "right" | "center" | "left"      heroH  height as a fraction of the tile (0.8)
    mask     "feather" | "soft" (oval edges) | "card" (rounded, white-framed, glowing) | "none"
    heroes   several hero elements: [{"box":[..], "src":"-2" (tools/keyart/src/<id>-2.webp),
             "at":"right"|"left"|"center"|[x,y] centre as 0..1, "h":0.8, "mask":..., "blend":..., "rot":deg}]
    backdrop "gradient" (hero default) | "scene" (the graded crop) | "blur" (the crop, blurred)
    accent   logo colour (default: the category colour)
    bg       [c1, c2] backdrop gradient for hero mode
    pos      logo position: bl bc br tl tc tr l c   size  max logo width as a fraction (0.84)
    grade    {"sat":1.3,"con":1.1,"bri":1.03}
    flip     mirror the scene horizontally

Needs Chromium through Python Playwright (CHROME env var, default: the one in /opt/pw-browsers).
"""
import json, os, re, sys, shutil, asyncio, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KA = os.path.join(ROOT, 'tools', 'keyart')
SRC = os.path.join(KA, 'src')
SPEC = os.path.join(KA, 'spec.json')
THUMBS = os.path.join(ROOT, 'assets', 'thumbs')
CHROME = os.environ.get('CHROME', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
CAT_ACCENT = {'arcade': '#ff4d6d', 'hyper': '#ff9d1c', 'puzzle': '#9b7bff', 'classic': '#1ec8f0',
              'learning': '#2fd58a', 'sim': '#ff5fc4', 'idle': '#ffc21a'}
W, H = 960, 600

def catalog():
    t = open(os.path.join(ROOT, 'catalog.js'), encoding='utf-8').read()
    return json.loads(re.search(r'const CATALOG = (\[.*\]);', t).group(1))

def load_spec():
    return json.load(open(SPEC, encoding='utf-8')) if os.path.exists(SPEC) else {}

def src_path(gid):
    return os.path.join(SRC, gid + '.webp')

def cmd_import(gid, path, crop=None):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(tuple(int(v) for v in crop.split(',')))
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    os.makedirs(SRC, exist_ok=True)
    im.save(src_path(gid), 'WEBP', quality=90, method=6)
    print('imported', gid, im.size)

def fit_aspect(c, sw, sh, r=1.6):
    """Trim crop c (0..1) to aspect r around its centre, staying inside it (so a HUD-free crop stays HUD-free)."""
    x0, y0, x1, y1 = c[0] * sw, c[1] * sh, c[2] * sw, c[3] * sh
    cx, cy, w, h = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
    if w / h > r: w = h * r
    else: h = w / r
    if w > sw: w = sw; h = w / r
    if h > sh: h = sh; w = h * r
    cx = min(max(cx, w / 2), sw - w / 2); cy = min(max(cy, h / 2), sh - h / 2)
    return [(cx - w / 2) / sw, (cy - h / 2) / sh, (cx + w / 2) / sw, (cy + h / 2) / sh]

def bg_css(url, c, box_w, box_h):
    """CSS so the region c (0..1) of image `url` exactly fills a box_w x box_h element."""
    cw, ch = c[2] - c[0], c[3] - c[1]
    px = 0 if cw >= .999 else c[0] / (1 - cw) * 100
    py = 0 if ch >= .999 else c[1] / (1 - ch) * 100
    return "background-image:url('%s');background-size:%.3f%% %.3f%%;background-position:%.3f%% %.3f%%;background-repeat:no-repeat" % (url, 100 / cw, 100 / ch, px, py)

def mix(hexc, other, t):
    a = [int(hexc[i:i + 2], 16) for i in (1, 3, 5)]; b = [int(other[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(round(x + (y - x) * t) for x, y in zip(a, b))

def page(g, s, sw, sh):
    url = 'file://' + src_path(g['id'])
    acc = s.get('accent') or CAT_ACCENT.get(g['cat'], '#ff4d6d')
    gr = dict({'sat': 1.3, 'con': 1.1, 'bri': 1.03}, **s.get('grade', {}))
    filt = 'saturate(%s) contrast(%s) brightness(%s)' % (gr['sat'], gr['con'], gr['bri'])
    raw = s.get('logo') or g['title']
    if '|' not in raw and ' ' in raw and len(raw) > 8:   # balance into two lines
        ws = raw.split(' ')
        k = min(range(1, len(ws)), key=lambda i: max(len(' '.join(ws[:i])), len(' '.join(ws[i:]))))
        raw = ' '.join(ws[:k]) + '|' + ' '.join(ws[k:])
    logo = html.escape(raw).replace('|', '<br>')
    mode = s.get('mode', 'scene')
    pos = s.get('pos', 'l' if mode == 'hero' else 'bc')
    layers = []
    heroes = s.get('heroes') or ([{'box': s['hero'], 'at': s.get('heroAt', 'right'), 'h': s.get('heroH', .8), 'mask': s.get('mask', 'feather'),
                                   'blend': s.get('blend')}] if 'hero' in s else [])
    backdrop = s.get('backdrop', 'gradient' if mode == 'hero' else 'scene')
    at0 = heroes[0].get('at', 'right') if heroes else 'center'
    if backdrop in ('scene', 'blur'):
        c = fit_aspect(s.get('crop', [0, 0, 1, 1]), sw, sh)
        extra = ';filter:blur(14px) ' + filt + ' brightness(.85);inset:-30px' if backdrop == 'blur' else ';filter:' + filt
        layers.append('<div style="position:absolute;inset:0;%s%s;%s"></div>' % (bg_css(url, c, W, H), extra, 'transform:scaleX(-1)' if s.get('flip') else ''))
        if backdrop == 'blur' and s.get('bg'):
            layers.append('<div style="position:absolute;inset:0;background:linear-gradient(125deg,%s,%s);opacity:.45;mix-blend-mode:color"></div>' % tuple(s['bg']))
    else:
        c1, c2 = s.get('bg') or [mix(acc, '#1a0840', .55), mix(acc, '#ffffff', .15)]
        layers.append("<div style=\"position:absolute;inset:-80px;%s;filter:blur(34px) saturate(1.7) brightness(.8)\"></div>" % bg_css(url, [0, 0, 1, 1], W, H))
        layers.append('<div style="position:absolute;inset:0;background:linear-gradient(125deg,%s 0%%,%s 100%%);opacity:.86"></div>' % (c1, c2))
        rx = {'right': '68%', 'left': '32%'}.get(at0, '50%') if isinstance(at0, str) else '%d%%' % (at0[0] * 100)
        layers.append('<div style="position:absolute;inset:-60%%;background:repeating-conic-gradient(from 0deg at %s 50%%,rgba(255,255,255,.10) 0 6deg,transparent 6deg 18deg)"></div>' % ('calc(%s * .45 + 27.5%%)' % rx))
        layers.append('<div style="position:absolute;inset:0;background:radial-gradient(440px 380px at %s 52%%,rgba(255,255,255,.38),transparent 70%%)"></div>' % rx)
    for hdef in heroes:
        hurl = 'file://' + src_path(g['id'] + hdef.get('src', '')); hsw, hsh = sw, sh
        if hdef.get('src'):
            from PIL import Image
            hsw, hsh = Image.open(src_path(g['id'] + hdef['src'])).size
        hc = hdef['box']; hw, hh = (hc[2] - hc[0]) * hsw, (hc[3] - hc[1]) * hsh
        bh = H * hdef.get('h', .8); bw = bh * hw / hh
        at = hdef.get('at', 'right')
        maxw = W * (.92 if at == 'center' else hdef.get('maxw', s.get('maxw', .52)))
        if bw > maxw: bw = maxw; bh = bw * hh / hw
        if isinstance(at, list): left, top = W * at[0] - bw / 2, H * at[1] - bh / 2
        else:
            left = {'right': W * .97 - bw, 'left': W * .03, 'center': (W - bw) / 2}[at]
            top = (H - bh) / 2 + H * .03
        mk = {'feather': '-webkit-mask-image:radial-gradient(ellipse 50% 50% at 50% 50%,#000 60%,transparent 100%);',
              'soft': '-webkit-mask-image:radial-gradient(ellipse 52% 52% at 50% 50%,#000 80%,transparent 100%);',
              'card': 'border-radius:26px;box-shadow:0 0 0 7px #fff,0 26px 50px rgba(0,0,0,.55),0 0 70px %s;' % acc,
              'none': ''}[hdef.get('mask', 'feather')]
        blend = 'mix-blend-mode:screen;' if hdef.get('blend') == 'screen' else ''
        rot = 'transform:rotate(%sdeg);' % hdef['rot'] if hdef.get('rot') else ''
        layers.append('<div style="position:absolute;left:%dpx;top:%dpx;width:%dpx;height:%dpx;%s;%s%s%sfilter:%s drop-shadow(0 18px 30px rgba(0,0,0,.45))"></div>'
                      % (left, top, bw, bh, bg_css(hurl, hc, bw, bh), mk, blend, rot, filt))
    # vignette + a scrim where the logo sits
    layers.append('<div style="position:absolute;inset:0;background:radial-gradient(ellipse 75% 70% at 50% 45%,transparent 55%,rgba(8,4,24,.5) 100%)"></div>')
    scr = {'b': 'linear-gradient(0deg,rgba(10,6,30,.62) 0,rgba(10,6,30,.25) 28%,transparent 48%)',
           't': 'linear-gradient(180deg,rgba(10,6,30,.6) 0,rgba(10,6,30,.22) 28%,transparent 48%)',
           'l': 'linear-gradient(90deg,rgba(10,6,30,.55) 0,rgba(10,6,30,.2) 38%,transparent 58%)',
           'c': 'radial-gradient(ellipse 60% 40% at 50% 50%,rgba(10,6,30,.45),transparent 75%)'}
    layers.append('<div style="position:absolute;inset:0;background:%s"></div>' % scr[pos[0] if pos[0] in 'btl' else 'c'])
    maxw = W * s.get('size', .5 if mode == 'hero' else .72)
    align = {'l': 'left', 'c': 'center', 'r': 'right'}[pos[1] if len(pos) > 1 else ('l' if pos == 'l' else 'c')]
    place = {'bl': 'left:44px;bottom:34px', 'bc': 'left:50%;bottom:34px;transform:translateX(-50%)', 'br': 'right:44px;bottom:34px',
             'tl': 'left:44px;top:30px', 'tc': 'left:50%;top:30px;transform:translateX(-50%)', 'tr': 'right:44px;top:30px',
             'l': 'left:48px;top:50%;transform:translateY(-50%)', 'c': 'left:50%;top:50%;transform:translate(-50%,-50%)'}[pos]
    light = mix(acc, '#ffffff', .55)
    return '''<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url('file://%(font)s') format('woff2');font-weight:300 700}
html,body{margin:0;background:#000}
#s{position:relative;width:%(W)dpx;height:%(H)dpx;overflow:hidden;background:#101020}
#logo{position:absolute;%(place)s;max-width:%(maxw)dpx;width:%(maxw)dpx;font:700 150px/.9 F;letter-spacing:-.01em;text-align:%(align)s}
#logo span{display:block;white-space:nowrap}
#logo .o{position:absolute;inset:0;color:#140a2e;-webkit-text-stroke:var(--st) #140a2e;filter:drop-shadow(0 var(--sd) 0 #140a2e) drop-shadow(0 12px 18px rgba(0,0,0,.5))}
#logo .f{position:relative;background:linear-gradient(180deg,#fff 0 42%%,%(light)s 62%%,%(acc)s 100%%);-webkit-background-clip:text;background-clip:text;color:transparent}
</style></head><body><div id="s">%(layers)s<div id="logo"><span class="o">%(logo)s</span><span class="f">%(logo)s</span></div></div>
<script>
const L=document.getElementById('logo'),maxw=%(maxw)d,maxh=%(maxh)d,M=document.createElement('span');let fs=150;
M.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:700 150px/.9 F;letter-spacing:-.01em';document.body.appendChild(M);
const words=L.querySelector('.f').innerHTML.split('<br>');
function wmax(){M.style.fontSize=fs+'px';return Math.max(...words.map(w=>{M.innerHTML=w;return M.getBoundingClientRect().width}))}
function set(){L.style.fontSize=fs+'px';L.style.setProperty('--st',Math.round(fs*.2)+'px');L.style.setProperty('--sd',Math.round(fs*.08)+'px')}
const lines=Math.max(2,L.querySelector('.f').innerHTML.split('<br>').length);
document.fonts.load('700 150px F').then(()=>{set();while(fs>36&&(wmax()>maxw-fs*.1||L.offsetHeight>maxh)){fs-=3;set()}
L.style.width='fit-content';document.title='ok'});
</script></body></html>''' % dict(font=os.path.join(ROOT, 'assets', 'fonts', 'fredoka.woff2'), W=W, H=H, place=place, maxw=maxw,
                                  maxh=H * s.get('maxh', .62 if mode == 'hero' else .36), align=align, light=light, acc=acc, layers=''.join(layers), logo=logo)

async def render(ids):
    from playwright.async_api import async_playwright
    from PIL import Image
    games = {g['id']: g for g in catalog()}; spec = load_spec()
    ids = ids or [i for i in spec if not spec[i].get('skip')]
    os.makedirs(os.path.join(THUMBS, '2x'), exist_ok=True)
    tmp = os.path.join(KA, '_render.html')
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--allow-file-access-from-files'])
        pg = await b.new_page(viewport={'width': W, 'height': H})
        for gid in ids:
            g, s = games.get(gid), spec.get(gid, {})
            if not g or not os.path.exists(src_path(gid)) or s.get('skip'): print('skip', gid); continue
            sw, sh = Image.open(src_path(gid)).size
            open(tmp, 'w', encoding='utf-8').write(page(g, s, sw, sh))
            await pg.goto('file://' + tmp); await pg.wait_for_function('document.title=="ok"'); await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(60)
            name = os.path.basename(g['thumb'])
            big = os.path.join(THUMBS, '2x', name)
            await pg.screenshot(path=big + '.png', clip={'x': 0, 'y': 0, 'width': W, 'height': H})
            im = Image.open(big + '.png').convert('RGB'); os.remove(big + '.png')
            im.save(big, 'WEBP', quality=80, method=6)
            im.resize((480, 300), Image.LANCZOS).save(os.path.join(THUMBS, name), 'WEBP', quality=84, method=6)
            print('rendered', gid)
        await b.close()
    if os.path.exists(tmp): os.remove(tmp)

def sheet(out, ids):
    from PIL import Image, ImageDraw
    games = {g['id']: g for g in catalog()}
    ids = ids or list(load_spec())
    cols = 6; tw, th = 320, 200
    im = Image.new('RGB', (cols * tw, ((len(ids) + cols - 1) // cols) * (th + 16)), 'white'); d = ImageDraw.Draw(im)
    for i, gid in enumerate(ids):
        f = os.path.join(THUMBS, os.path.basename(games[gid]['thumb']))
        x, y = (i % cols) * tw, (i // cols) * (th + 16)
        im.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, y)); d.text((x + 3, y + th + 2), gid, fill='black')
    im.save(out); print(out)

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit()
    if a[0] == 'import': cmd_import(a[1], a[2], a[3] if len(a) > 3 else None)
    elif a[0] == 'render': asyncio.run(render(a[1:]))
    elif a[0] == 'sheet': sheet(a[1], a[2:])
