import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.int16)
r,g,b = im[...,0],im[...,1],im[...,2]
mx = im.max(-1); mn = im.min(-1)
# checkerboard: light, almost grey pixels
bgish = (mn > 175) & (mx - mn < 22)
# keep only the part connected to the image border
lab, n = ndimage.label(bgish)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
bright = mx
inner = []
for i in range(1, n+1):
    if i in edge: continue
    m = lab == i
    a = m.sum()
    if a < 800: continue
    v = bright[m]
    # a checker patch has both tones: near-white and light grey
    if (v > 235).mean() > 0.2 and ((v > 180) & (v < 225)).mean() > 0.2: inner.append(i)
bg = np.isin(lab, list(edge) + inner)
# close small holes left by jpeg noise around the checker seams
bg = ndimage.binary_closing(bg, iterations=2) & ~ndimage.binary_erosion(~bgish, iterations=0)
fg = ~bg
fg = ndimage.binary_opening(fg, iterations=1)
lab2, n2 = ndimage.label(fg)
sizes = ndimage.sum(fg, lab2, range(1, n2+1))
keep = np.isin(lab2, [i+1 for i,s in enumerate(sizes) if s > 400])
alpha = ndimage.gaussian_filter(keep.astype(float), 0.7)
rgba = np.dstack([im.astype(np.uint8), (alpha*255).astype(np.uint8)])
Image.fromarray(rgba, 'RGBA').save(out)
ys, xs = np.where(keep); print(out, xs.min(), xs.max(), ys.min(), ys.max(), n2)
