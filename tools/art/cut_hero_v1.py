# White-background cut-out: everything outside the black outline that is light becomes transparent;
# soft coloured glow/smoke outside the outline keeps its colour with partial alpha (colour-to-alpha).
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, out, x0, x1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
lum = im.mean(-1); mn = im.min(-1)
dark = lum < 90                     # the black outline
# outside = light pixels reachable from the border without crossing the outline
light = ~ndimage.binary_dilation(dark, iterations=1)
lab, n = ndimage.label(light)
border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
outside = np.isin(lab, border[border > 0])
# enclosed pure-white pockets (between staff and body) are background too
for i in range(1, n + 1):
    if i in border: continue
    m = lab == i
    if m.sum() > 300 and (mn[m] > 238).mean() > 0.93: outside |= m
# colour-to-alpha against white in the outside region
a = (255 - im.min(-1)) / 255.0
a = np.clip((a - 0.04) / 0.96, 0, 1)
alpha = np.where(outside, a, 1.0)
alpha = ndimage.gaussian_filter(alpha, 0.6)
alpha = np.where(outside, alpha, 1.0)
col = np.where(alpha[..., None] > 0.01, (im - 255 * (1 - alpha[..., None])) / np.maximum(alpha[..., None], 0.01), im)
col = np.clip(col, 0, 255)
# keep only the chosen copy (x range) and drop specks
solid = (alpha > 0.5)
lab2, n2 = ndimage.label(ndimage.binary_dilation(solid, iterations=6))
keepl = []
for i in range(1, n2 + 1):
    ys, xs = np.where(lab2 == i)
    if len(xs) > 2000 and x0 <= xs.mean() <= x1: keepl.append(i)
keep = ndimage.binary_dilation(np.isin(lab2, keepl), iterations=30)
alpha = alpha * keep
rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
img = Image.fromarray(rgba, 'RGBA')
bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
img = img.crop(bb)
# 512 tall
s = 512 / img.height
img = img.resize((round(img.width * s), 512), Image.LANCZOS)
img.save(out + '.png'); img.save(out + '.webp', quality=88, method=6)
print(out, img.size, bb)
