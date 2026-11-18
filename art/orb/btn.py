"""Ш84: the emerald button and the gold crest (Meshy sheet art/orb/src/meshy-btn-crest.png, from Seryoga's sample 2444)
-> assets/orb/ui/btn_emerald.webp (a 9-slice button, no text) and assets/orb/ui/crest.webp (sits on top of title plaques)."""
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'heroes.py')).read()
ns = {}; exec(compile(src[:src.index('def sheet_poses')], 'heroes', 'exec'), ns)  # reuse cut() from heroes.py
im = ns['cut'](os.path.join(HERE, 'src/meshy-btn-crest.png'))
a = np.asarray(im)[..., 3] > 30
rows = np.where(a.any(1))[0]
# two blobs stacked: split at the empty band between them
gaps = [y for y in range(rows.min(), rows.max()) if not a[y].any()]
mid = gaps[len(gaps) // 2]
out = os.path.join(HERE, '../../assets/orb/ui')
for name, box in (('crest', (0, 0, im.width, mid)), ('btn_emerald', (0, mid, im.width, im.height))):
    part = im.crop(box); part = part.crop(part.getbbox())
    part.save(os.path.join(out, name + '.webp'), quality=95, method=6)
    print(name, part.size)
