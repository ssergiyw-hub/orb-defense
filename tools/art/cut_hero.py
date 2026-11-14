import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
src, out, it = sys.argv[1], sys.argv[2], int(sys.argv[3])
protect = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
mn = im.min(-1); mx = im.max(-1); dark = im.mean(-1) < 100
st = ndimage.generate_binary_structure(2, 2)
core = ndimage.binary_fill_holes(ndimage.binary_closing(dark, structure=st, iterations=it))
core = ndimage.binary_opening(core, iterations=2)
lab, n = ndimage.label(core); sz = ndimage.sum(core, lab, range(1, n+1)); core = lab == 1 + int(np.argmax(sz))
# enclosed background pockets: flat white like the paper, not tinted like cloth
l3, n3 = ndimage.label((mn > 236) & core)
for i in range(1, n3 + 1):
    m = l3 == i; a = m.sum()
    if a < 600: continue
    ys, xs = np.where(m); cx, cy = xs.mean(), ys.mean()
    if any(b[0] <= cx <= b[2] and b[1] <= cy <= b[3] for b in protect): continue
    if (mx - mn)[m].mean() < 4 and mn[m].mean() >= 249.8: core &= ~m
# flat white bits of the core that touch the outside (bridged gaps along the edge) are background too
fw = core & (mn > 244) & ((mx - mn) < 5)
l4, n4 = ndimage.label(fw)
touch = np.unique(l4[ndimage.binary_dilation(~core, iterations=1) & fw])
core &= ~np.isin(l4, touch[touch > 0])
extra = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
for (cx, cy, r) in extra.get('circles', []): core |= (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
# colour-to-alpha outside the core (glow, smoke)
a = np.clip(((255 - mn) / 255.0 - 0.04) / 0.96, 0, 1) ** 0.8
near = ndimage.binary_dilation(core, iterations=70)
alpha = np.where(core, 1.0, a * near)
edge = ndimage.gaussian_filter(core.astype(float), 0.7)
alpha = np.where(core, np.maximum(edge, 0.0), alpha)
alpha = np.where(core & (edge < 0.5), np.maximum(edge * 1.6, a), alpha)
alpha = np.clip(alpha, 0, 1)
if 'cutx' in extra: alpha[:, :extra['cutx']] *= core[:, :extra['cutx']]
if 'cutr' in extra: alpha[:, -extra['cutr']:] *= core[:, -extra['cutr']:]
if 'fire' in extra:  # recolour a yellow orb to fire: hue towards orange-red
    import colorsys
    fx, fy, fr = extra['fire']
    m = ((xx - fx) ** 2 + (yy - fy) ** 2 <= fr * fr)
    from PIL import Image as _I
    hsv = np.asarray(_I.fromarray(np.clip(im, 0, 255).astype(np.uint8)).convert('HSV')).astype(np.float32)
    yellow = m & (hsv[..., 0] > 20) & (hsv[..., 0] < 50) & (hsv[..., 1] > 40)
    w = np.clip(1 - np.sqrt((xx - fx) ** 2 + (yy - fy) ** 2) / fr, 0, 1) * 0.6 + 0.4
    hsv[..., 0] = np.where(yellow, hsv[..., 0] - 22 * w, hsv[..., 0])
    hsv[..., 1] = np.where(yellow, np.minimum(255, hsv[..., 1] * 1.25), hsv[..., 1])
    im = np.asarray(_I.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')).astype(np.float32)
A = alpha[..., None]
col = np.where(core[..., None], im, np.clip((im - 255 * (1 - A)) / np.maximum(A, 0.02), 0, 255))
img = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
bb = img.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
img = img.crop(bb)
s = 512 / img.height
img = img.resize((round(img.width * s), 512), Image.LANCZOS)
img.save(out + '.png'); img.save(out + '.webp', quality=88, method=6)
print(out, img.size, bb)
