# Orb Defense marble UI (правка Ш46): cuts the Meshy UI kit (magenta background) into pieces and converts the
# backgrounds — Серёгины порталы 2071/2072/2073 and the clean temple made in Meshy from his mockup 2064.
#   python3 art/orb/ui.py   →  assets/orb/ui/*.webp
import numpy as np, os
from PIL import Image
from scipy import ndimage as nd
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
OUT = os.environ.get('ORB_OUT', '../../assets/orb/') + 'ui/'
os.makedirs(OUT, exist_ok=True)
def save(img, name, q=90): img.save(OUT + name, 'WEBP', quality=q, method=6); print(name, img.size)

im = np.array(Image.open('src/meshy-uikit.png').convert('RGB')).astype(int)
mag = (im[:, :, 0] > 150) & (im[:, :, 2] > 150) & (im[:, :, 1] < 120) & (np.abs(im[:, :, 0] - im[:, :, 2]) < 90)
PIECES = {  # name: (x, y, w, h)
  'slot': (9, 10, 329, 326), 'slot2': (348, 10, 328, 326), 'tile': (708, 30, 288, 287),
  'plaque': (12, 432, 418, 138), 'wreath': (452, 376, 272, 262), 'sphere': (736, 382, 274, 239),
  'btn_green': (17, 630, 646, 207), 'btn_stone': (790, 660, 166, 164), 'tab': (15, 856, 481, 146),
}
for k, (x, y, w, h) in PIECES.items():
    x0, y0, x1, y1 = x - 4, y - 4, x + w + 4, y + h + 4
    a = im[y0:y1, x0:x1].copy(); m = mag[y0:y1, x0:x1]
    lab, n = nd.label(m); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    if k == 'wreath':  # the painted checker in the middle is a hole: cut a circle
        cy, cx = 482 - y0, 588 - x0
        yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
        bg |= (yy - cy) ** 2 + (xx - cx) ** 2 < 93 ** 2
    al = nd.gaussian_filter((~bg).astype(float), 0.7); al = np.clip((al - 0.15) / 0.7, 0, 1)
    # magenta spill on the rim: pull red/blue down to green where the pixel is pinkish
    pink = (a[:, :, 0] > a[:, :, 1] + 40) & (a[:, :, 2] > a[:, :, 1] + 40)
    a[pink, 0] = np.minimum(a[pink, 0], a[pink, 1] + 30); a[pink, 2] = np.minimum(a[pink, 2], a[pink, 1] + 10)
    img = Image.fromarray(np.dstack([a, al * 255]).astype(np.uint8), 'RGBA')
    bb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox(); img = img.crop(bb)
    save(img, k + '.webp')
# backgrounds
save(Image.open('src/meshy-temple.png').convert('RGB'), 'temple.webp', 88)
for c, f in (('green', 'ref/2071.png'), ('blue', 'ref/2072.png'), ('purple', 'ref/2073.png')):
    save(Image.open('src/' + f).convert('RGB'), f'portal_{c}.webp', 88)
