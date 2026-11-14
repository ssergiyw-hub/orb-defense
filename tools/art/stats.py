import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, it = sys.argv[1], int(sys.argv[2])
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
mn = im.min(-1); mx = im.max(-1); dark = im.mean(-1) < 100
st = ndimage.generate_binary_structure(2, 2)
core = ndimage.binary_fill_holes(ndimage.binary_closing(dark, structure=st, iterations=it))
core = ndimage.binary_opening(core, iterations=2)
lab, n = ndimage.label(core); sz = ndimage.sum(core, lab, range(1, n+1)); core = lab == 1 + int(np.argmax(sz))
# reference: true background
bgv = mn[~ndimage.binary_dilation(core, iterations=40)]
print('bg min p5/p50', np.percentile(bgv,5), np.percentile(bgv,50))
l3, n3 = ndimage.label((mn > 236) & core)
for i in range(1, n3 + 1):
    m = l3 == i
    if m.sum() > 600:
        ys, xs = np.where(m)
        print(i, m.sum(), int(xs.mean()), int(ys.mean()), 'mn%.1f' % mn[m].mean(), 'sat%.1f' % (mx-mn)[m].mean(), '>=252: %.2f' % (mn[m] >= 252).mean())
