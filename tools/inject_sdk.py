#!/usr/bin/env python3
"""Put the arcade SDK first in <head> of every local game this repo serves.

    python3 tools/inject_sdk.py           # add it where missing (safe to run again)
    python3 tools/inject_sdk.py --check   # exit 1 if a game is missing it (for CI)

Run it again after re-vendoring a game or re-exporting a Godot build, since those
replace the game's index.html. Owner-frozen games are skipped, and external games
load the SDK from their own repos.

Godot web exports also get assets/godot-dpr-shim.js, on the line after the SDK tag (so before
godot.js runs): it caps the canvas pixel count on phones and adds a loading / crash screen.
Skipped for owner-frozen games and for NO_DPR_SHIM below.
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.dont_write_bytecode = True
from game_meta import FROZEN, load_catalog

# Godot builds that must never get the DPR shim / loading screen, even if FROZEN changes.
NO_DPR_SHIM = {'godot-heavens-grace', 'godot-chef-chloe'}
SHIM_NAME = 'godot-dpr-shim.js'

def tag_for(entry, name='arcade-sdk.js'):
    rel = os.path.relpath(os.path.join(ROOT, 'assets', name), os.path.dirname(entry)).replace(os.sep, '/')
    return '<script src="%s"></script>' % rel

def is_godot_export(g, text):
    """A Godot 4 web export: lives under Godot/ or its shell loads the engine and builds an Engine(GODOT_CONFIG)."""
    return g['src'].startswith('Godot/') or ('GODOT_CONFIG' in text and 'new Engine(' in text)

def add_shim(g, entry, t, check):
    """Return (new_text, status) where status is 'ok' (already there / not a Godot game), 'add' or 'missing'."""
    if g['id'] in NO_DPR_SHIM or not is_godot_export(g, t) or SHIM_NAME in t:
        return t, 'ok'
    if check:
        return t, 'missing'
    tag = tag_for(entry, SHIM_NAME)
    m = re.search(r'<script[^>]*src="[^"]*arcade-sdk\.js[^"]*"[^>]*></script>[ \t]*\r?\n?', t)   # right after the SDK tag
    if m:
        return t[:m.end()] + tag + '\n' + t[m.end():], 'add'
    m = re.search(r'<head[^>]*>\s*(<meta\s+charset[^>]*>\s*)?', t, re.I)
    if not m:
        return t, 'missing'
    return t[:m.end()] + tag + '\n' + t[m.end():], 'add'

def main():
    check = '--check' in sys.argv
    missing, added, shimmed = [], [], []
    for g in load_catalog():
        if g['ext'] or g['id'] in FROZEN:
            continue
        entry = os.path.join(ROOT, g['src'])
        t = open(entry, encoding='utf-8').read()
        if 'arcade-sdk.js' not in t:
            if check:
                missing.append(g['id']); continue
            tag = tag_for(entry)
            m = re.search(r'<head[^>]*>\s*(<meta\s+charset[^>]*>\s*)?', t, re.I)
            if not m:
                missing.append(g['id'] + ' (no <head>)'); continue
            t = t[:m.end()] + tag + '\n' + t[m.end():]
            open(entry, 'w', encoding='utf-8').write(t)
            added.append(g['id'])
        t2, status = add_shim(g, entry, t, check)
        if status == 'missing':
            missing.append(g['id'] + ' (godot-dpr-shim)')
        elif status == 'add':
            open(entry, 'w', encoding='utf-8').write(t2)
            shimmed.append(g['id'])
    if added: print('added the SDK to %d games: %s' % (len(added), ', '.join(added)))
    if shimmed: print('added the Godot DPR shim to %d games: %s' % (len(shimmed), ', '.join(shimmed)))
    if missing: print('missing the SDK or Godot shim: %s' % ', '.join(missing)); sys.exit(1)
    if not added and not shimmed: print('every local game loads the SDK (and every Godot build the DPR shim)')

if __name__ == '__main__':
    main()
