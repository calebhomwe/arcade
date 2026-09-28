#!/usr/bin/env python3
"""Put the arcade SDK first in <head> of every local game this repo serves.

    python3 tools/inject_sdk.py           # add it where missing (safe to run again)
    python3 tools/inject_sdk.py --check   # exit 1 if a game is missing it (for CI)

Run it again after re-vendoring a game or re-exporting a Godot build, since those
replace the game's index.html. Owner-frozen games are skipped, and external games
load the SDK from their own repos.
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.dont_write_bytecode = True
from game_meta import FROZEN, load_catalog

def tag_for(entry):
    rel = os.path.relpath(os.path.join(ROOT, 'assets', 'arcade-sdk.js'), os.path.dirname(entry)).replace(os.sep, '/')
    return '<script src="%s"></script>' % rel

def main():
    check = '--check' in sys.argv
    missing, added = [], []
    for g in load_catalog():
        if g['ext'] or g['id'] in FROZEN:
            continue
        entry = os.path.join(ROOT, g['src'])
        t = open(entry, encoding='utf-8').read()
        if 'arcade-sdk.js' in t:
            continue
        if check:
            missing.append(g['id']); continue
        tag = tag_for(entry)
        m = re.search(r'<head[^>]*>\s*(<meta\s+charset[^>]*>\s*)?', t, re.I)
        if not m:
            missing.append(g['id'] + ' (no <head>)'); continue
        t = t[:m.end()] + tag + '\n' + t[m.end():]
        open(entry, 'w', encoding='utf-8').write(t)
        added.append(g['id'])
    if added: print('added the SDK to %d games: %s' % (len(added), ', '.join(added)))
    if missing: print('missing the SDK: %s' % ', '.join(missing)); sys.exit(1)
    if not added: print('every local game loads the SDK')

if __name__ == '__main__':
    main()
