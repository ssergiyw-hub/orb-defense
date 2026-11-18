"""Ш93: the reward parchment that doesn't stretch its ornaments — from page2.webp: the side diamonds are covered by a
plain row of the side (the mean of rows 470–600 stretched, feathered into the top and bottom), so the middle band of the 9-slice is uniform and can stretch to any height.
-> assets/orb/ui/parch9.webp (slices for CSS: 130 100 200 100)."""
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(HERE, '../../assets/orb/ui')
im = Image.open(os.path.join(UI, 'page2.webp')).convert('RGBA')
W, H = im.size
out = im.copy()
import numpy as np
y0, y1 = 130, H - 200
row = Image.fromarray(np.asarray(im.crop((0, 470, W, 600))).astype(float).mean(0, keepdims=True).round().astype('uint8'), 'RGBA').resize((W, y1 - y0), Image.BILINEAR)  # the mean of plain rows, stretched: no bands, no diamonds, no streaks
mid = np.asarray(row).astype(float); orig = np.asarray(im.crop((0, y0, W, y1))).astype(float)
F = 28  # feather into the original above and below
a = np.ones(y1 - y0); a[:F] = np.linspace(0, 1, F); a[-F:] = np.linspace(1, 0, F)
blend = orig * (1 - a[:, None, None]) + mid * a[:, None, None]
out.paste(Image.fromarray(blend.round().astype('uint8'), 'RGBA'), (0, y0))
out.save(os.path.join(UI, 'parch9.webp'), quality=95, method=6)
print(out.size)
