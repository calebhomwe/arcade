"""Portal shell: the parts of index.html / play.html that come from the catalogue.

Called by build_catalog.py. It rewrites the blocks between <!--@name--> and
<!--/@name--> markers so the side rail, phone chips, footer and icon sprite are
in the HTML at first paint (no waiting for JavaScript), and always match CATS.
Icons are drawn for this site on a 24px grid (stroke 2, round caps).
"""
import os, re, html, datetime

ICONS = {
  'menu':   '<path d="M4 6h16M4 12h16M4 18h16"/>',
  'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  'x':      '<path d="M6 6l12 12M18 6L6 18"/>',
  'home':   '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5"/>',
  'clock':  '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  'heart':  '<path d="M12 20s-7.2-4.5-9-8.8C1.8 8.1 3.9 5 7.1 5c2 0 3.6 1.1 4.9 2.8C13.3 6.1 14.9 5 16.9 5c3.2 0 5.3 3.1 4.1 6.2C19.2 15.5 12 20 12 20z"/>',
  'spark':  '<path d="M11 3.5l1.9 5.2 5.2 1.9-5.2 1.9L11 17.7l-1.9-5.2-5.2-1.9 5.2-1.9z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  'flame':  '<path d="M12 21.5c3.9 0 6.8-2.6 6.8-6.5 0-3.2-2-5.4-3.5-7-.3 1.8-1.1 3-2.2 3.4.4-3.2-.9-6.3-3.8-8.2.2 2.9-1.4 4.8-2.8 6.6-1.3 1.8-2.3 3.4-2.3 5.2 0 3.9 3.9 6.5 7.8 6.5z"/><path d="M12 21.5c-1.7 0-3-1.2-3-3 0-1.6 1.4-2.7 2.3-3.9.4 1.1 1.3 1.6 2 1.8.5 1 .7 1.6.7 2.1 0 1.8-.6 3-2 3z"/>',
  'grid':   '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  'dice':   '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/>',
  'joy':    '<rect x="3" y="14" width="18" height="6.5" rx="2.5"/><path d="M12 14V9"/><circle cx="12" cy="6" r="3"/><path d="M7 17.3h2"/>',
  'zap':    '<path d="M13.5 2.5L5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  'puzzle': '<path d="M5 7h3.2a2.3 2.3 0 1 1 4.6 0H16v3.2a2.3 2.3 0 1 1 0 4.6V19h-3.2a2.3 2.3 0 1 0-4.6 0H5v-4.2a2.3 2.3 0 1 0 0-4.6z"/>',
  'crown':  '<path d="M3.5 8l4.3 3.8L12 5l4.2 6.8L20.5 8l-1.8 10.5H5.3z"/><path d="M6 21h12"/>',
  'cap':    '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.8v4.4c2.6 2.3 8.4 2.3 11 0v-4.4"/><path d="M21.5 9.5v5"/>',
  'globe':  '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.4 3.6 5.3 3.6 8.5s-1 6.1-3.6 8.5c-2.6-2.4-3.6-5.3-3.6-8.5s1-6.1 3.6-8.5z"/>',
  'coins':  '<ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7"/><path d="M9.5 16.3c.9 1.3 3 2.2 5.5 2.2 3 0 5.5-1.1 5.5-2.5v-4c0-1.2-1.8-2.2-4.3-2.4"/><path d="M14.5 14.4c2.8-.2 6-1 6-2.4"/>',
  'sun':    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  'moon':   '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  'gear':   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  'left':   '<path d="M15 5l-7 7 7 7"/>',
  'right':  '<path d="M9 5l7 7-7 7"/>',
  'play':   '<path d="M8 5.2c0-1 1.1-1.6 1.9-1.1l10 6.8c.8.5.8 1.7 0 2.2l-10 6.8c-.8.5-1.9-.1-1.9-1.1z" fill="currentColor" stroke="none"/>',
  'up':     '<path d="M7 11v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l3.6-7.2a2 2 0 0 1 3.4 1.6L13.4 9h5.3a2 2 0 0 1 2 2.4l-1.4 7a2 2 0 0 1-2 1.6H7"/>',
  'down':   '<path d="M17 13V4h2.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1z"/><path d="M17 13l-3.6 7.2a2 2 0 0 1-3.4-1.6l.6-3.6H5.3a2 2 0 0 1-2-2.4l1.4-7a2 2 0 0 1 2-1.6H17"/>',
  'share':  '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
  'full':   '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  'restart':'<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
  'ext':    '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  'ratio':  '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M7 9.5v-1h2M17 14.5v1h-2"/>',
  'link':   '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  'mail':   '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  'chat':   '<path d="M4 18.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18z"/>',
  'check':  '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'trophy': '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H4.5c0 3 1.5 4.5 3.7 4.8M16 5.5h3.5c0 3-1.5 4.5-3.7 4.8"/><path d="M12 13v4M8.5 20h7"/>',
  'bolt':   '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>',
  'shield': '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  'offline':'<path d="M5 13a7 7 0 0 1 14 0"/><path d="M8.5 13a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
  'key':    '<rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9"/>',
  'mic':    '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  'download':'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
}
LOGO = ('<symbol id="logo" viewBox="0 0 48 48"><defs><linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#ffb000"/><stop offset=".48" stop-color="#ff3d8b"/><stop offset="1" stop-color="#6d4aff"/></linearGradient></defs>'
        '<rect x="2" y="2" width="44" height="44" rx="14" fill="url(#lg-a)"/>'
        '<path d="M2 26c10-6 30-6 44 0v6c0 7.7-6.3 14-14 14H16C8.3 46 2 39.7 2 32z" fill="#000" opacity=".12"/>'
        '<path d="M18.5 15.6c0-1.7 1.9-2.8 3.4-1.8l11.6 7.6c1.3.9 1.3 2.8 0 3.6l-11.6 7.6c-1.5 1-3.4-.1-3.4-1.8z" fill="#fff"/>'
        '<circle cx="36.5" cy="11.5" r="2.4" fill="#fff" opacity=".9"/><circle cx="11.5" cy="36.5" r="1.6" fill="#fff" opacity=".6"/></symbol>')

def sprite():
    syms = ''.join('<symbol id="i-%s" viewBox="0 0 24 24">%s</symbol>' % (k, v) for k, v in ICONS.items())
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">%s%s</svg>' % (LOGO, syms)

def ico(name):
    return '<svg class="i" aria-hidden="true"><use href="#i-%s"/></svg>' % name

def rail(G, CATS):
    n = {c[0]: sum(g['cat'] == c[0] for g in G) for c in CATS}
    out = ['<nav class="rail" id="rail" aria-label="Browse games">']
    for key, label, icon, href in (('home', 'Home', 'home', './'), ('recent', 'Recently played', 'clock', './?view=recent'),
                                   ('favourites', 'Favourites', 'heart', './?view=favourites'), ('new', 'New games', 'spark', './?view=new'),
                                   ('popular', 'Popular', 'flame', './?view=popular'), ('all', 'All games', 'grid', './?view=all')):
        extra = '<span class="n">%d</span>' % len(G) if key == 'all' else ''
        out.append('  <a href="%s" data-view="%s" title="%s"><span class="dot">%s</span><span>%s</span>%s</a>' % (href, key, label, ico(icon), label, extra))
    out.append('  <hr><h4>Categories</h4>')
    for cid, name, icon, _ in CATS:
        out.append('  <a href="./?cat=%s" data-cat="%s" data-c style="--cc:var(--c-%s)" title="%s"><span class="dot">%s</span><span>%s</span><span class="n">%d</span></a>'
                   % (cid, cid, cid, html.escape(name), ico(icon), html.escape(name), n[cid]))
    out.append('  <hr><a href="play.html?g=random" data-random title="Surprise me"><span class="dot">%s</span><span>Surprise me</span></a>' % ico('dice'))
    out.append('  <p class="mini">%d games, all free. No ads, no accounts. Favourites and bests stay on this device.</p>' % len(G))
    out.append('</nav>')
    return '\n'.join(out)

def chips(G, CATS):
    out = ['<nav class="chips" id="chips" aria-label="Browse games">',
           '  <a class="chip" href="./" data-view="home">%s Home</a>' % ico('home'),
           '  <a class="chip" href="./?view=new" data-view="new" style="--cc:var(--c-learning)">%s New</a>' % ico('spark'),
           '  <a class="chip" href="./?view=popular" data-view="popular" style="--cc:var(--c-hyper)">%s Popular</a>' % ico('flame')]
    for cid, name, icon, _ in CATS:
        out.append('  <a class="chip" href="./?cat=%s" data-cat="%s" style="--cc:var(--c-%s)">%s %s</a>' % (cid, cid, cid, ico(icon), html.escape(name)))
    out += ['  <a class="chip" href="./?view=recent" data-view="recent">%s Recent</a>' % ico('clock'),
            '  <a class="chip" href="./?view=favourites" data-view="favourites" style="--cc:#ff3d6e">%s Favourites</a>' % ico('heart'),
            '  <a class="chip" href="./?view=all" data-view="all">%s All %d</a>' % (ico('grid'), len(G)),
            '</nav>']
    return '\n'.join(out)

def foot(G, CATS):
    year = datetime.date.today().year
    cats = ''.join('<li><a href="./?cat=%s">%s</a></li>' % (c[0], html.escape(c[1])) for c in CATS)
    return '\n'.join([
      '<footer class="foot">', '  <div class="in">',
      '    <div><a class="brand" href="./" aria-label="Caleb\'s Arcade home"><svg class="logo" aria-hidden="true"><use href="#logo"/></svg><span class="word">Caleb\'s Arcade<small>play free · no ads</small></span></a>',
      '      <p>%d free games you can play right now in the browser: arcade, puzzle, learning, sims and more. No downloads, no sign-ups, nothing to install.</p>' % len(G),
      '      <div class="perks"><span>%s No ads</span><span>%s No accounts</span><span>%s Saves on your device</span></div></div>' % (ico('check'), ico('shield'), ico('offline')),
      '    <div><h2 class="fh">Categories</h2><ul>%s</ul></div>' % cats,
      '    <div><h2 class="fh">Explore</h2><ul><li><a href="./?view=new">New games</a></li><li><a href="./?view=popular">Popular</a></li><li><a href="./?view=all">All %d games</a></li><li><a href="play.html?g=random">Surprise me</a></li><li><a href="./?view=recent">Recently played</a></li><li><a href="./?view=favourites">Favourites</a></li></ul></div>' % len(G),
      '    <div><h2 class="fh">Your arcade</h2><ul><li><button type="button" data-open-prefs>Settings &amp; theme</button></li><li><button type="button" data-open-prefs="data">Back up your progress</button></li><li><button type="button" data-open-prefs="report">Tester report for Caleb</button></li><li><a href="sitemap.xml">Sitemap</a></li></ul></div>',
      '    <div class="base"><span>© %d Caleb\'s Arcade. Every game here was made by Caleb.</span><span class="keys"><span><kbd class="kbd">/</kbd> search</span><span><kbd class="kbd">S</kbd> surprise me</span><span><kbd class="kbd">,</kbd> settings</span></span></div>' % year,
      '  </div>', '</footer>'])

def write(ROOT, G, CATS):
    blocks = {'sprite': sprite(), 'rail': rail(G, CATS), 'chips': chips(G, CATS), 'foot': foot(G, CATS)}
    for fn in ('index.html', 'play.html'):
        fp = os.path.join(ROOT, fn)
        t = open(fp, encoding='utf-8').read()
        for k, v in blocks.items():
            t = re.sub(r'<!--@%s-->.*?<!--/@%s-->' % (k, k), lambda m: '<!--@%s-->\n%s\n<!--/@%s-->' % (k, v, k), t, flags=re.S)
        open(fp, 'w', encoding='utf-8').write(t)
    print('portal shell: sprite (%d icons), rail, chips and footer written into index.html + play.html' % len(ICONS))
