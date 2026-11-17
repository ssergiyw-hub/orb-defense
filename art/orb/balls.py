"""Ш72: the orb pictures for the level-up cards, the pause and the taken-balls strip.
Sources (Meshy, magenta background): src/meshy-balls1.png — fire, ice, beam / ghost, poison, lightning (2 rows);
src/meshy-balls2.png — quake, cluster, wet, spike, normal (1 row). Out: assets/orb/ball/<id>.webp, 192 px."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
OUT = '../../assets/orb/ball/'; os.makedirs(OUT, exist_ok=True)


def cut(src):
    ch = np.array(Image.open(src).convert('RGB')).astype(float)
    bg = np.median(np.concatenate([ch[:8].reshape(-1, 3), ch[-8:].reshape(-1, 3)]), 0)
    d = np.sqrt(((ch - bg) ** 2).sum(-1))
    # magenta-ness: glow blended into the background keeps a soft alpha, the colour is un-mixed
    a = np.clip((d - 30) / 150, 0, 1)
    a = nd.gaussian_filter(a, 0.5)
    aa = np.clip(a, 0.05, 1)[..., None]
    rgb = np.clip((ch - (1 - aa) * bg) / aa, 0, 255)
    return np.dstack([rgb, a * 255]).astype(np.uint8)


def blobs(rgba, n, dil=18):
    a = rgba[..., 3] > 60
    lab, k = nd.label(nd.binary_dilation(a, iterations=dil))
    sizes = nd.sum(a, lab, range(1, k + 1))
    keep = sorted(range(k), key=lambda i: -sizes[i])[:n]
    boxes = []
    for i in keep:
        ys, xs = np.nonzero(lab == i + 1)
        boxes.append((ys.min(), xs.min(), ys.max(), xs.max(), i + 1))
    boxes.sort(key=lambda b: (round(b[0] / 200), b[1]))  # rows, then left to right
    out = []
    for y0, x0, y1, x1, i in boxes:
        part = rgba.copy(); part[..., 3] = np.where(lab == i, part[..., 3], 0)
        im = Image.fromarray(part[y0:y1 + 1, x0:x1 + 1], 'RGBA')
        s = max(im.size); sq = Image.new('RGBA', (s, s)); sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
        out.append(sq.resize((192, 192), Image.LANCZOS))
    return out


for name, im in zip(['fire', 'ice', 'beam', 'ghost', 'poison', 'lightning'], blobs(cut('src/meshy-balls1.png'), 6)):
    im.save(OUT + name + '.webp', 'WEBP', quality=90, method=6)
for name, im in zip(['quake', 'cluster', 'wet', 'spike', 'normal'], blobs(cut("src/meshy-balls2.png"), 5, 6)):
    im.save(OUT + name + '.webp', 'WEBP', quality=90, method=6)
print('balls ok')
