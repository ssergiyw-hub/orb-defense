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
# Ш50: library («Шары») and treasury («Магазин») backgrounds
save(Image.open('src/meshy-library.png').convert('RGB'), 'library.webp', 86)
save(Image.open('src/meshy-treasury.png').convert('RGB'), 'treasury.webp', 86)
# Ш54: the marble chest in three states (closed / light in the seam / open) on magenta
ch = np.array(Image.open('src/meshy-chest3.png').convert('RGB')).astype(int)
cm = (ch[:, :, 0] > 140) & (ch[:, :, 2] > 140) & (ch[:, :, 1] < 110) & (np.abs(ch[:, :, 0] - ch[:, :, 2]) < 90)
lab, n = nd.label(cm); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bgc = np.isin(lab, list(edge))
# Ш64: a soft edge — the matte from the colour distance to magenta, not a hard mask
bgcol = np.median(ch[bgc], axis=0)
dm = np.sqrt(((ch - bgcol) ** 2).sum(-1))
soft = np.clip((dm - 25) / 110, 0, 1)
al = np.where(nd.binary_dilation(bgc, iterations=3) & ~nd.binary_erosion(bgc, iterations=3), soft, (~bgc).astype(float))
al = nd.gaussian_filter(al, 0.6)
band = nd.binary_dilation(bgc, iterations=4) & ~bgc  # the edge: un-mix the magenta out of the colour, keep the soft alpha
aa = np.clip(al, 0.05, 1)[..., None]
ch = np.where(band[..., None], np.clip((ch - (1 - aa) * bgcol) / aa, 0, 255), ch)
pk = np.minimum(ch[:, :, 0], ch[:, :, 2]) - ch[:, :, 1]  # the glow blended into magenta (inside the body): fade it out
al = np.where(band, al, al * np.clip(1 - (pk - 10) / 22, 0, 1))
pink = (ch[:, :, 0] > ch[:, :, 1] + 40) & (ch[:, :, 2] > ch[:, :, 1] + 40)
ch[pink, 0] = np.minimum(ch[pink, 0], ch[pink, 1] + 30); ch[pink, 2] = np.minimum(ch[pink, 2], ch[pink, 1] + 10)
full = Image.fromarray(np.dstack([ch, al * 255]).astype(np.uint8), 'RGBA')
fg = al > 0.3
lab2, n2 = nd.label(nd.binary_dilation(fg, iterations=6))
sizes = nd.sum(fg, lab2, range(1, n2 + 1))
big = sorted(sorted(range(n2), key=lambda i: -sizes[i])[:3], key=lambda i: nd.center_of_mass(fg, lab2, i + 1)[1])
for k, i in enumerate(big):
    m = lab2 == i + 1
    part = np.array(full); part[..., 3] = np.where(m, part[..., 3], 0)
    img = Image.fromarray(part, 'RGBA'); img = img.crop(img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
    img.thumbnail((360, 360), Image.LANCZOS)
    save(img, f'chest{k}.webp')
# Ш63: the marble wheel (magenta outside a circle) and Ш67: the tasks arch
wh = np.array(Image.open('src/meshy-wheel.png').convert('RGB')).astype(float)
mg = (wh[..., 0] > 180) & (wh[..., 2] > 180) & (wh[..., 1] < 90)
ys, xs = np.nonzero(~mg); cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2; R = min(ys.max() - ys.min(), xs.max() - xs.min()) / 2 - 2
yy, xx = np.mgrid[:wh.shape[0], :wh.shape[1]]
a = np.clip(R - np.hypot(yy - cy, xx - cx) + 0.5, 0, 1)
im = Image.fromarray(np.dstack([wh, a * 255]).astype(np.uint8), 'RGBA').crop((int(cx - R - 1), int(cy - R - 1), int(cx + R + 1), int(cy + R + 1))).resize((640, 640), Image.LANCZOS)
save(im, 'wheel.webp')
save(Image.open('src/meshy-arch.png').convert('RGB'), 'arch.webp', 86)
# Ш65: a clean page for the ball card — the drawn line frames inside are painted out, the ornament at the edges stays
import cv2
pg = np.array(Image.open('../../assets/orb/ui/page.webp').convert('RGBA'))
rgb = pg[..., :3].copy()
x0, y0, x1, y1 = 100, 118, 766, 655
reg = rgb[y0:y1, x0:x1].astype(int)
lum = reg.mean(-1)
bg = nd.median_filter(lum, size=25)
m = (lum < bg - 10) | ((reg[..., 0] - reg[..., 2]) > 95)  # gold lines and stars are darker / more saturated than parchment
m = nd.binary_dilation(m, iterations=3)
mask = np.zeros(rgb.shape[:2], np.uint8); mask[y0:y1, x0:x1] = m.astype(np.uint8) * 255
clean = cv2.inpaint(np.ascontiguousarray(rgb[..., ::-1]), mask, 9, cv2.INPAINT_TELEA)[..., ::-1]
cf = clean.astype(float)
lo = np.stack([nd.gaussian_filter(cf[..., k], 18) for k in range(3)], -1)
flat = np.stack([nd.gaussian_filter(cf[..., k], 90) for k in range(3)], -1)
w = np.zeros(rgb.shape[:2]); w[y0 - 10:y1 + 10, x0 - 10:x1 + 10] = 1; w = nd.gaussian_filter(w, 8)[..., None]
cf = cf * (1 - w) + (cf - lo + flat) * w  # even out the lighter boxes the frames left behind
save(Image.fromarray(np.dstack([np.clip(cf, 0, 255).astype(np.uint8), pg[..., 3]]), 'RGBA'), 'page2.webp', 90)
