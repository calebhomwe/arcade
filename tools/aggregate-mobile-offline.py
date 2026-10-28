#!/usr/bin/env python3
"""Run with the four sibling repositories checked out beside each other."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
repos=['arcade','arcade-hub','neon-game-arcade','playables'];groups={}
for repo in repos:
    text=(root.parent/repo/'offline-manifest.js').read_text()
    groups[repo]=json.loads(text.split(' = ',1)[1].rsplit(';',1)[0])['groups']
games=json.loads(re.search(r'const CATALOG = (\[[\s\S]*?\]);',(root/'catalog.js').read_text())[1])
out=[]
for game in games:
    repo='arcade';entry=game['src']
    if entry.startswith('https://calebhomwe.github.io/'):
        repo,entry=entry.split('https://calebhomwe.github.io/')[1].split('/',1)
    package=groups.get(repo,{}).get(game['id'])
    reason='Desktop engine export; phone offline play has not been established.' if game.get('iphone')=='no' else 'Separate maintained build; device and offline verification still needed.'
    out.append({'id':game['id'],'title':game['title'],'repo':repo,'entry':entry,'supported':bool(package),'bytes':package['bytes'] if package else 0,'reason':'' if package else reason})
(root/'offline-catalog.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(str(sum(g['supported'] for g in out))+' downloadable / '+str(len(out))+' catalogue entries')
