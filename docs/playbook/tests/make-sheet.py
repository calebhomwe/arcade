#!/usr/bin/env python3
"""Side-by-side: our WebKit iPhone capture next to a cropped panel of the reference key art. Usage: make-sheet.py OURS.png REF.png OUT.jpg [x0,y0,x1,y1]
The reference (Caleb's key art, ref_03.png) is used for internal comparison only; the output sheet is not for a public video."""
import sys
from PIL import Image, ImageDraw
ours, ref, out = sys.argv[1:4]
box = tuple(int(v) for v in sys.argv[4].split(',')) if len(sys.argv) > 4 else (480, 0, 765, 485)
a = Image.open(ours).convert('RGB'); b = Image.open(ref).convert('RGB').crop(box)
H = 664
a = a.resize((round(a.width * H / a.height), H), Image.LANCZOS); b = b.resize((round(b.width * H / b.height), H), Image.LANCZOS)
S = Image.new('RGB', (a.width + b.width + 30, H + 30), (24, 30, 44)); d = ImageDraw.Draw(S)
S.paste(a, (10, 24)); S.paste(b, (a.width + 20, 24)); d.text((12, 6), 'look-real-demo.html, WebKit 26.0, iPhone 13 profile', fill=(230, 235, 245)); d.text((a.width + 22, 6), 'ref_03.png (key art), cropped panel', fill=(230, 235, 245))
S.save(out, quality=86); print(S.size)
