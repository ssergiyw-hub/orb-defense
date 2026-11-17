"""Ш58: drawn heroes — cut Seryoga's pictures (white background) into battle poses and portraits.
Usage: python3 art/orb/heroes.py
  sources: art/orb/src/heroes/<id>.png and art/orb/src/<id>.png (single pictures), sheets of 4 poses in a row
  out:     assets/orb/hero/<hero>_<pose>.webp  (battle: back view; poses up / diag / side, idle and cast)
           art/orb/out/hero/<hero>_front.png   (front view for the hero screen, packed into heroImages.ts by pack step)
           src/client/orbHeroArt.ts            (the list of poses and their feet / height, used by orbRender)
Poses face right (weapon to the right); the game mirrors them for aiming left."""
import json, os, io, base64, re
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'art/orb/src'
OUT = 'assets/orb/hero'
os.makedirs(OUT, exist_ok=True); os.makedirs('art/orb/out/hero', exist_ok=True)

# hero id in the game -> pictures. A sheet is (file, index of the pose on it 0..3, counted left to right)
HEROES = {
    'apollo': {
        'front': '2186',
        'idle': ['2187', '2358', '2359'],
        'cast': ['2188', '2360', '2361'],
    },
    'skadi': {  # the ice goddess
        'front': 'heroes/2221',
        'idle': ['heroes/2222', ('heroes/2377', 0), ('heroes/2377', 1)],
        'cast': ['heroes/2223', ('heroes/2377', 2), ('heroes/2377', 3)],
    },
    'veles': {  # red hair, branch staff (the sheet 2376 is the green dress; 2225/2226 are white — the sheet wins in battle)
        'front': 'heroes/2224',
        'idle': [('heroes/2376', 0), ('heroes/2376', 0), ('heroes/2376', 1)],
        'cast': [('heroes/2376', 2), ('heroes/2376', 2), ('heroes/2376', 3)],
    },
    # Ш80 (18.11): the other six — Seryoga's back views + Meshy (art/orb/src/heroes/mesh/h-*.png): fronts, pose sheets, "up" pairs
    'perun': {  # Zeus
        'front': 'mesh/h-zeus-front',
        'idle': ['heroes/2178', ('heroes/2364', 0), ('heroes/2364', 1)],
        'cast': ['heroes/2179', ('heroes/2364', 2), ('heroes/2364', 3)],
    },
    'heracles': {  # the Spartan
        'front': 'mesh/h-heracles-front',
        'idle': ['heroes/2180', ('heroes/2365', 0), ('heroes/2365', 1)],
        'cast': ['heroes/2181', ('heroes/2365', 2), ('heroes/2365', 3)],
    },
    'stribog': {  # Nike (sheet 2366 redrawn without the big back wings)
        'front': 'mesh/h-nike-front',
        'idle': ['heroes/2182', ('mesh/h-nike-sheet', 0), ('mesh/h-nike-sheet', 1)],
        'cast': ['heroes/2183', ('mesh/h-nike-sheet', 2), ('mesh/h-nike-sheet', 3)],
    },
    'poseidon': {  # the red-haired merman, redrawn in Apollo's style
        'front': 'mesh/h-poseidon-front',
        'idle': [('mesh/h-poseidon-up2', 0, 2), ('mesh/h-poseidon-sheet', 0), ('mesh/h-poseidon-sheet', 1)],
        'cast': [('mesh/h-poseidon-up2', 1, 2), ('mesh/h-poseidon-sheet', 2), ('mesh/h-poseidon-sheet', 3)],
    },
    'hades': {  # Hecate in the hood
        'front': 'mesh/h-hecate-front',
        'idle': [('mesh/h-hecate-up', 0, 2), ('mesh/h-hecate-sheet', 0), ('mesh/h-hecate-sheet', 1)],
        'cast': [('mesh/h-hecate-up', 1, 2), ('mesh/h-hecate-sheet', 2), ('mesh/h-hecate-sheet', 3)],
    },
    'prometheus': {  # Hestia, new
        'front': 'mesh/h-hestia-front',
        'idle': [('mesh/h-hestia-up2', 0, 2), ('mesh/h-hestia-sheet', 0), ('mesh/h-hestia-sheet', 3)],  # her calm side pose holds the torch upright — the aim reads from the thrust
        'cast': [('mesh/h-hestia-up2', 1, 2), ('mesh/h-hestia-sheet', 2), ('mesh/h-hestia-sheet', 3)],
    },
}
POSES = ['up', 'diag', 'side']


def path(name):
    for p in (f'{SRC}/{name}.png', f'{SRC}/heroes/{name}.png'):
        if os.path.exists(p): return p
    if name.startswith('apollo/'): return f'{SRC}/{name.split("/")[1]}.png'
    raise FileNotFoundError(name)


def cut(src):
    """white background -> transparent: near-white pixels connected to the border; a soft 1 px edge"""
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.int16)
    mx, mn = im.max(-1), im.min(-1)
    whitish = (mn > 228) & (mx - mn < 26)
    lab, _ = ndimage.label(whitish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # enclosed white pockets bigger than a speck (between arm and body, inside a staff ring) are background too
    lab_in, n_in = ndimage.label(whitish & ~bg)
    if n_in:
        idx = range(1, n_in + 1)
        sizes = ndimage.sum(np.ones_like(lab_in), lab_in, idx)
        mean = ndimage.mean(mn, lab_in, idx); sd = ndimage.standard_deviation(mn, lab_in, idx)
        # only flat paper-white pockets: a white dress is shaded, the background is not
        big = [i + 1 for i, (s, m, v) in enumerate(zip(sizes, mean, sd)) if s > 900 and m > 249 and v < 2.5]
        bg |= np.isin(lab_in, big)
    fg = ~bg
    fg = ndimage.binary_opening(fg, iterations=1)
    lab2, n2 = ndimage.label(fg)
    if n2:
        sizes = ndimage.sum(fg, lab2, range(1, n2 + 1))
        fg = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s > 120])
    alpha = ndimage.gaussian_filter(fg.astype(float), 0.6)
    alpha[fg & ~ndimage.binary_erosion(fg, iterations=1)] *= 0.85
    # pull the white halo out of the edge pixels
    rgb = im.astype(float)
    a = alpha[..., None]
    edge_px = (alpha > 0.02) & (alpha < 0.98)
    rgb[edge_px] = np.clip((rgb[edge_px] - 255 * (1 - a[edge_px])) / np.maximum(a[edge_px], 0.2), 0, 255)
    return Image.fromarray(np.dstack([rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)]), 'RGBA')


def sheet_poses(src, n=4):
    """a row of n poses on one picture: the 4 biggest blobs, small bits (sparks) join the nearest one"""
    im = cut(src)
    a = np.asarray(im)[..., 3] > 40
    for it in (4, 2, 1):  # poses close together (a weapon near the next figure) merge at 4 — then glue bits less
        lab, nl = ndimage.label(ndimage.binary_dilation(a, iterations=it))
        sizes = ndimage.sum(a, lab, range(1, nl + 1))
        if sum(1 for v in sizes if v > 0.3 * max(sizes)) >= n: break
    order = sorted(range(nl), key=lambda i: -sizes[i])[:n]
    cx = {i: ndimage.center_of_mass(a, lab, i + 1)[1] for i in order}
    main = sorted(order, key=lambda i: cx[i])
    owner = np.zeros(lab.shape, np.int16)
    for k, i in enumerate(main): owner[lab == i + 1] = k + 1
    rest = (lab > 0) & (owner == 0)
    if rest.any():  # each stray bit goes to the closest pose by x
        rl, rn = ndimage.label(rest)
        for j in range(1, rn + 1):
            x = ndimage.center_of_mass(rest, rl, j)[1]
            k = min(range(n), key=lambda k: abs(cx[main[k]] - x))
            owner[rl == j] = k + 1
    arr = np.asarray(im)
    out = []
    for k in range(n):
        m = owner == k + 1
        part = arr.copy(); part[..., 3] = np.where(m, part[..., 3], 0)
        out.append(Image.fromarray(part, 'RGBA'))
    return out


_sheets = {}
def pose_img(spec):
    if isinstance(spec, tuple):
        name, k = spec[:2]; n = spec[2] if len(spec) > 2 else 4
        if name not in _sheets: _sheets[name] = sheet_poses(path(name), n)
        return _sheets[name][k]
    return cut(path(spec))


def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    return im.crop(bb)


def feet(im):
    """the feet line and the body's centre column at the feet (the lowest 6% of opaque rows)"""
    a = np.asarray(im)[..., 3] > 60
    ys = np.where(a.any(1))[0]; y1 = ys.max()
    band = a[max(0, y1 - int(0.08 * im.height)):y1 + 1]
    xs = np.where(band.any(0))[0]
    return int(y1), float((xs.min() + xs.max()) / 2)


def body_height(im):
    """the hero's height from the feet to the top of the head, without a raised staff, arm, flame or glow:
    thin parts (staff, arm) are opened away, then the blob that holds the feet gives the head top"""
    a = np.asarray(im)[..., 3] > 60
    w = a.sum(1)
    k = max(3, int(0.045 * w.max()))
    o = ndimage.binary_opening(a, iterations=k)
    lab, n = ndimage.label(o)
    if not n: return im.height
    ys, xs = np.nonzero(o)
    low = lab[ys.max(), xs[ys == ys.max()][0]]  # the blob at the lowest point = the feet / tail
    rows = np.where((lab == low).any(1))[0]
    return int(rows.max() - rows.min())


H_OUT = 360  # px of the body in the saved pose
# hand fixes after a look at all poses side by side: a raised thick arm or a big flame counts into the height
FIX = {('perun', 'idle_diag'): 1.33, ('perun', 'cast_diag'): 1.38, ('stribog', 'idle_diag'): 1.27, ('stribog', 'cast_up'): 1.18,
       ('prometheus', 'cast_up'): 1.25, ('prometheus', 'cast_diag'): 1.15}
meta = {}
for hid, d in HEROES.items():
    m = {'poses': {}}
    for kind in ('idle', 'cast'):
        for pi, spec in enumerate(d[kind]):
            im = trim(pose_img(spec))
            bh = body_height(im)
            k = H_OUT / bh * FIX.get((hid, f'{kind}_{POSES[pi]}'), 1)
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            fy, fx = feet(im)
            name = f'{hid}_{kind}_{POSES[pi]}'
            im.save(f'{OUT}/{name}.webp', 'WEBP', quality=90, method=6)
            a = np.asarray(im)[..., 3] > 100
            ys, xs = np.nonzero(a)
            wx, wy = [(0.35, 1.0), (1.0, 1.0), (1.0, 0.35)][pi]  # the weapon tip: the furthest point towards the aim
            j = int(np.argmax(wx * xs / im.width - wy * ys / im.height))
            m['poses'][f'{kind}_{POSES[pi]}'] = {'w': im.width, 'h': im.height, 'fx': round(fx / im.width, 4), 'fy': round(fy / im.height, 4),
                                                'tx': round(xs[j] / im.width, 4), 'ty': round(ys[j] / im.height, 4)}
    fr = trim(cut(path(d['front'])))
    fr.save(f'art/orb/out/hero/{hid}_front.png')
    meta[hid] = m
    print(hid, 'ok')

ts = ['// Ш58: drawn heroes in battle — poses cut by art/orb/heroes.py (do not edit). Body height of every pose = ' + str(H_OUT) + ' px;',
      '// fx / fy — the feet point as a share of the picture. Poses look right; the game mirrors them for the left side.',
      'export interface HeroPose { w: number; h: number; fx: number; fy: number; tx: number; ty: number }',
      'export const HERO_POSE_H = ' + str(H_OUT) + ';',
      'export const ORB_HERO_ART: Record<string, Record<string, HeroPose>> = ' + json.dumps({h: v['poses'] for h, v in meta.items()}, indent=1) + ';', '']
open('src/client/orbHeroArt.ts', 'w').write('\n'.join(ts))


# ---- the hero screen: the front picture replaces the old one (HERO_IMG, 512 px tall) and the avatar (HERO_FACE) ----
FACE = {'apollo': (0.5, 0.25, 0.46), 'skadi': (0.42, 0.18, 0.36), 'veles': (0.48, 0.19, 0.36),
        'perun': (0.4, 0.25, 0.44), 'heracles': (0.48, 0.25, 0.42), 'stribog': (0.39, 0.24, 0.44),
        'poseidon': (0.41, 0.24, 0.46), 'hades': (0.53, 0.22, 0.44), 'prometheus': (0.62, 0.24, 0.44)}  # centre x, y, side (share of height)

def uri(im, q):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

def patch(file, obj, hid, value):
    s = open(file).read()
    i = s.index(f'export const {obj}')
    m = re.compile(r"^  " + hid + r": '[^']*',", re.M).search(s, i)  # a comment may follow the comma
    s = s[:m.start()] + f"  {hid}: '{value}'," + s[m.end():]
    open(file, 'w').write(s)

for hid in HEROES:
    fr = Image.open(f'art/orb/out/hero/{hid}_front.png')
    big = fr.resize((round(fr.width * 512 / fr.height), 512), Image.LANCZOS)
    patch('src/client/heroImages.ts', 'HERO_IMG', hid, uri(big, 88))
    fx, fy, fs = FACE[hid]; side = fs * fr.height; cx, cy = fx * fr.width, fy * fr.height
    sq = Image.new('RGBA', (round(side), round(side))); sq.paste(fr.crop((round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2))), (0, 0))
    patch('src/client/heroArtImages.ts', 'HERO_FACE', hid, uri(sq.resize((256, 256), Image.LANCZOS), 88))
print('hero screen pictures packed')
