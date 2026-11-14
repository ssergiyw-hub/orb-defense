import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
src, out, it = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
mn = im.min(-1); dark = im.mean(-1) < 100
st = ndimage.generate_binary_structure(2, 2)
core = ndimage.binary_fill_holes(ndimage.binary_closing(dark, structure=st, iterations=it))
core = ndimage.binary_opening(core, iterations=2)
lab, n = ndimage.label(core); sz = ndimage.sum(core, lab, range(1, n+1)); core = lab == 1 + int(np.argmax(sz))
white = mn > 236
l3, n3 = ndimage.label(white & core)
o = Image.fromarray(im.astype(np.uint8)); d = ImageDraw.Draw(o)
arr = np.asarray(o).copy()
arr[~core] = (arr[~core] * 0.4 + np.array([255, 0, 255]) * 0.6).astype(np.uint8)
for i in range(1, n3 + 1):
    m = l3 == i
    if m.sum() > 600: arr[m] = [0, 200, 255]
o = Image.fromarray(arr); d = ImageDraw.Draw(o)
for i in range(1, n3 + 1):
    ys, xs = np.where(l3 == i)
    if len(xs) > 600: d.text((int(xs.mean()) - 6, int(ys.mean()) - 6), str(i), fill=(255, 0, 0))
o.resize((o.width // 2, o.height // 2)).save(out)
