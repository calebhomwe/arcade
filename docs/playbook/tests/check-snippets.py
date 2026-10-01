#!/usr/bin/env python3
"""Every fenced block preceded by `<!-- from FILE -->` must appear verbatim in FILE (so the docs only show tested code)."""
import re, sys, pathlib
PB = pathlib.Path(__file__).resolve().parent.parent
bad = n = 0
for md in sorted(PB.glob('*.md')):
    for m in re.finditer(r'<!-- from ([^ ]+) -->\n```[a-z]*\n(.*?)\n```', md.read_text(), re.S):
        n += 1
        src = (PB / m.group(1)).read_text()
        if m.group(2) not in src: bad += 1; print('MISMATCH', md.name, m.group(1), m.group(2)[:60].replace('\n', ' '))
print(f'{n} tested snippets checked, {bad} mismatches'); sys.exit(1 if bad else 0)
