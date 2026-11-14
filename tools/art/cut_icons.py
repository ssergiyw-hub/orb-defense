"""Cut icon sheets (white background) into separate transparent icons.
Each icon: blobs found automatically and ordered by rows then columns; soft glows kept as transparency,
grey drop shadows under the icons removed. Usage: python3 cut_icons.py  (writes art/icons/<sheet>_<n>.png)"""
import numpy as np, sys
from PIL import Image, ImageDraw
from scipy.spatial import ConvexHull
from scipy.signal import fftconvolve
from scipy import ndimage

NO_GLOW = {'bless', 'elem', 'fam', 'skill'}
SHEETS = {  # name: (upload id, expected count, row tolerance in px)
    'bless': ('224db73c', 9), 'elem': ('7b9892f0', 10), 'fam': ('bb1d6ed5', 6, (3, 2)), 'skill': ('724a5dc6', 16),
    'pass': ('f59f96d8', 12), 'res': ('194f65c7', 7), 'loc': ('8895e720', 5), 'set': ('017bc38b', 3),
}

def hull_body(name, d, s, L, mine):
    if name == 'skill':  # shields: stone + gold frame, without the soft grey shadow under the tip
        dark = ndimage.binary_opening((L < 130) & (s < 60) & (d > 110) & ~((s < 22) & (L > 92)) & mine, iterations=4)
    else:
        dark = ndimage.binary_opening((L < 130) & (d > 90) & mine, iterations=7)
    dl, dn = ndimage.label(dark)
    if dn:
        ds = ndimage.sum(dark, dl, range(1, dn + 1)); dark = dl == (int(np.argmax(ds)) + 1)
    pts = np.argwhere(dark)
    hull = ConvexHull(pts)
    poly = Image.new('L', (dark.shape[1], dark.shape[0]), 0)
    ImageDraw.Draw(poly).polygon([(int(p[1]), int(p[0])) for p in pts[hull.vertices]], fill=1)
    return np.asarray(poly).astype(bool)

def cut(name, uid, count, grid=None, out='art/icons'):
    src = np.asarray(Image.open(f'art/icons/sheets/{uid}.jpg').convert('RGB')).astype(float)
    bg = np.array([255.0, 255.0, 255.0])
    diff = (bg - src).max(-1)                      # how far from white
    sat = src.max(-1) - src.min(-1)
    lum = src.mean(-1)
    # find icons by their solid ink (not glow, not the grey shadow), then give every pixel to the nearest icon
    shadow_all = (sat < 22) & (lum > 70) & (diff < 150)
    ink = ndimage.binary_dilation((diff > 70) & ~shadow_all, iterations=10)
    if grid:  # icons whose glows touch: cut the ink along an even grid first
        gc, gr = grid; H, W = ink.shape
        for c in range(1, gc): ink[:, int(W * c / gc) - 2:int(W * c / gc) + 2] = False
        for r in range(1, gr): ink[int(H * r / gr) - 2:int(H * r / gr) + 2, :] = False
    lab0, n = ndimage.label(ink)
    sizes = ndimage.sum(ink, lab0, range(1, n + 1))
    idx = sorted(range(n), key=lambda i: -sizes[i])[:count]
    keep = np.zeros(n + 1, int); 
    for j, i in enumerate(idx): keep[i + 1] = i + 1
    lab = keep[lab0]
    dist, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
    lab = np.where((lab == 0) & (dist < 90), lab[iy, ix], lab)
    objs = ndimage.find_objects(lab)
    boxes = [objs[i] for i in idx]
    # order: rows by centre y (cluster), then x
    cy = [(b[0].start + b[0].stop) / 2 for b in boxes]
    h = np.median([b[0].stop - b[0].start for b in boxes])
    order = sorted(range(len(boxes)), key=lambda k: (round(cy[k] / (h * 0.8)), boxes[k][1].start))
    T = None
    if name == 'skill':  # template shield from the cleanest one (boomerang)
        sl = boxes[order[7]]; li = idx[order[7]] + 1
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        b = hull_body(name, diff[y0:y1, x0:x1], sat[y0:y1, x0:x1], lum[y0:y1, x0:x1], lab[y0:y1, x0:x1] == li)
        r0, c0 = np.argwhere(b).min(0); r1, c1 = np.argwhere(b).max(0) + 1
        T = b[r0:r1, c0:c1]
    res = []
    for k, bi in enumerate(order):
        sl = boxes[bi]; li = idx[bi] + 1
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        d = diff[y0:y1, x0:x1]; s = sat[y0:y1, x0:x1]; L = lum[y0:y1, x0:x1]; c = src[y0:y1, x0:x1]
        mine = lab[y0:y1, x0:x1] == li
        # solid core: strong ink that is not a pale grey shadow
        shadowish = (s < 22) & (L > 70) & (d < 150)
        core = (d > 70) & ~shadowish & mine
        cl, cn = ndimage.label(ndimage.binary_closing(core, iterations=2))
        if cn:
            cs = ndimage.sum(core, cl, range(1, cn + 1))
            core = np.isin(cl, [i + 1 for i, v in enumerate(cs) if v > 0.004 * cs.max()])
        core = ndimage.binary_fill_holes(core)
        if name in NO_GLOW:  # stones are convex: their hull is the body; pale rims and shadows go, saturated flames stay
            if name == 'skill' and T is not None:  # all shields are one shape: place the clean template where the stone is
                M = ((L < 130) & (s < 60) & (d > 110) & ~((s < 22) & (L > 92)) & mine).astype(float)
                cc = fftconvolve(M, T[::-1, ::-1].astype(float), mode='full')
                py, px = np.unravel_index(int(np.argmax(cc)), cc.shape); ty, tx = py - T.shape[0] + 1, px - T.shape[1] + 1
                body = np.zeros_like(M, bool)
                yy0, xx0 = max(0, ty), max(0, tx); yy1, xx1 = min(M.shape[0], ty + T.shape[0]), min(M.shape[1], tx + T.shape[1])
                body[yy0:yy1, xx0:xx1] = T[yy0 - ty:yy1 - ty, xx0 - tx:xx1 - tx]
                pts = np.argwhere(body)
            else:
                body = hull_body(name, d, s, L, mine); pts = np.argwhere(body)
            flame = (s > 90) & (d > 70) & mine & ndimage.binary_dilation(body, iterations=40)
            fl, fn = ndimage.label(flame | body)
            core = fl == fl[tuple(pts[len(pts) // 2])]
        near = ndimage.binary_dilation(core, iterations=3)
        # colour-to-alpha against white; grey pixels outside the core are shadow -> gone
        a = np.clip((d / 255 * 1.25 - 0.06) * 0.85, 0, 1)  # glow a bit softer than on white
        a = np.where(core, 1.0, a)
        if name in NO_GLOW: a = a * ndimage.binary_dilation(core, iterations=2)  # stones: glow comes from the game (rarity)
        grey = (s < 26) & ~near
        a = np.where(grey, 0, a) * mine
        a = ndimage.gaussian_filter(a, 0.5)
        A = a[..., None]
        col = np.where(core[..., None], c, np.clip((c - bg * (1 - A)) / np.maximum(A, 0.04), 0, 255))
        img = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), 'RGBA')
        bb = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        img = img.crop(bb)
        w, hh = img.size; side = int(max(w, hh) * 1.04)
        sq = Image.new('RGBA', (side, side)); sq.paste(img, ((side - w) // 2, (side - hh) // 2))
        sq = sq.resize((160, 160), Image.LANCZOS)
        sq.save(f'{out}/{name}_{k}.png')
        res.append(sq)
    return res

if __name__ == '__main__':
    only = sys.argv[1:] or list(SHEETS)
    for nm in only:
        uid, cnt, *g = SHEETS[nm]
        r = cut(nm, uid, cnt, g[0] if g else None)
        print(nm, len(r))
