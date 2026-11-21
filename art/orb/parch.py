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

# Ш117: the middle of the page — one flat paper tone. The averaged row kept page2's inner vignette (darker by the edges,
# lighter in the centre); the 9-slice scales the side slices and the middle differently, so the vignette broke into
# a visible light rectangle with hard edges. Flat paper from the inner edge of the gold border to the other side.
P = np.asarray(out).astype(float)
C = np.array([236, 218, 184, 255], float)
X0, X1, Y0, Y1, FX, FY = 74, 790, 130, 719, 16, 20
w = np.zeros(P.shape[:2])
ys, xs = np.mgrid[0:P.shape[0], 0:P.shape[1]]
wx = np.clip(np.minimum(xs - X0, X1 - xs) / FX, 0, 1)
wy = np.clip(np.minimum(ys - Y0, Y1 - 14 - ys) / FY, 0, 1)
w = (wx * wy)[..., None]
P = P * (1 - w) + C * w
out = Image.fromarray(P.round().astype('uint8'), 'RGBA')
out.save(os.path.join(UI, 'parch9.webp'), quality=95, method=6)
print('flat middle', out.size)

# Ш117 (2): the old shadow smudges under the top and bottom ornaments — keep only the fine detail (ornaments, runes,
# paper grain) on the flat tone: paper = C + (pixel − background); the background is a wide median (thin ornament lines
# drop out of it, broad smudges stay), smoothed.
from PIL import ImageFilter
P = np.asarray(out).astype(float)
B = np.asarray(out.convert('RGB').resize((216, 230), Image.BILINEAR).filter(ImageFilter.MedianFilter(9)).resize(out.size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(4)).convert('RGBA')).astype(float)
R = np.clip(C + (P - B), 0, 255); R[..., 3] = P[..., 3]
X0, X1, Y0, Y1, F = 82, 782, 34, 792, 12
wx = np.clip(np.minimum(xs - X0, X1 - xs) / F, 0, 1)
wy = np.clip(np.minimum(ys - Y0, Y1 - ys) / F, 0, 1)
w = (wx * wy)[..., None]
out = Image.fromarray((P * (1 - w) + R * w).round().astype('uint8'), 'RGBA')
out.save(os.path.join(UI, 'parch9.webp'), quality=95, method=6)
print('detail on flat', out.size)
