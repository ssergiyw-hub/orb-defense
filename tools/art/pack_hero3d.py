"""3D heroes (правка 102): atlases rendered from Meshy models (rows = 8 directions, columns = frames)
→ dark cartoon outline like our 2D art, a touch more colour → WebP files assets/h3d/<hero>_<action>.webp (copied to dist/h3d by tools/build.mjs) + table src/client/hero3dImages.ts.
The atlases are too big to inline into index.html (the web artifact has a 20 MB per file limit).
Usage: python3 tools/art/pack_hero3d.py <render dir with her/, hes/>"""
import sys, io, base64, json, os
import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage

HEROES = {'heracles': 'her', 'prometheus': 'hes',  # правка 101: the other heroes (Poseidon redrawn with legs)
          'apollo': 'apo', 'skadi': 'bor', 'veles': 'dem', 'hades': 'hec', 'hydra': 'med', 'stribog': 'nik', 'perun': 'zeu', 'poseidon': 'pos'}
# правка 104: battle keeps only walking (Meshy «Spear Walk», weapon held upright) and a calm stance (legs of an idle, arms of the spear grip)
CLIPS = {'idle': (12, True, 1.0), 'walk': (16, True, 1.0)}
CELL = 240  # rendered at 320, kept at 240: sharp on a phone and ~85 MB of decoded pictures for one hero in battle

def outline(im, px=3, col=(28, 15, 8)):
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3] / 255
    ring = ndimage.grey_dilation(al, footprint=np.fromfunction(lambda y, x: (x - px) ** 2 + (y - px) ** 2 <= px * px + 0.5, (2 * px + 1, 2 * px + 1)))
    ring = np.clip(ring * 1.4, 0, 1)
    out = np.zeros_like(a)
    out[..., :3] = col; out[..., 3] = ring * 255
    # character over the dark ring
    fa = al[..., None]
    out[..., :3] = a[..., :3] * fa + out[..., :3] * (1 - fa)
    out[..., 3] = np.maximum(out[..., 3], a[..., 3])
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    src = sys.argv[1]
    meta = json.load(open(os.path.join(src, 'meta.json')))
    os.makedirs('assets/h3d', exist_ok=True)
    lines = ['// 3D heroes rendered from Meshy models (правка 102): one atlas per action, rows = 8 directions', '// (0 = right, then clockwise every 45°), columns = frames. Made by tools/art/pack_hero3d.py — do not edit.',
             'export const H3D: Record<string, { cell: number; foot: number; stride: number; clips: Record<string, { src: string; n: number; dur: number; loop: boolean; pp: boolean; tips: number[][][] }> }> = {']
    total = 0
    for hid, key in HEROES.items():
        m = meta[key]
        lines.append(f"  {hid}: {{ cell: {CELL}, foot: {m['foot']}, stride: {m['stride']}, clips: {{")
        for clip, (n, loop, _) in CLIPS.items():
            im = Image.open(os.path.join(src, key, clip + '.png')).convert('RGBA')
            rgb = ImageEnhance.Color(im.convert('RGB')).enhance(1.12); rgb.putalpha(im.getchannel('A')); im = rgb
            im = outline(im)
            n0 = im.width // m['cell']; im = im.resize((n0 * CELL, 8 * CELL), Image.LANCZOS)
            fn = f'assets/h3d/{hid}_{clip}.webp'
            im.save(fn, 'WEBP', quality=90, method=5); sz = os.path.getsize(fn); total += sz
            pp = clip in m.get('pp', [])  # played forward and back (a short piece of a long idle)
            tips = json.load(open(os.path.join(src, key, clip + '.tips.json')))  # weapon top per direction and frame, 0..1 of the cell
            tips = [[[round(v, 3) for v in f] for f in row] for row in tips]
            lines.append(f"    {clip}: {{ n: {n}, dur: {m['dur'][clip]:.3f}, loop: {str(loop or pp).lower()}, pp: {str(pp).lower()}, src: 'h3d/{hid}_{clip}.webp',")
            lines.append(f"      tips: {json.dumps(tips, separators=(',', ':'))} }},")
            print(hid, clip, im.size, sz // 1024, 'KB')
        lines.append('  } },')
    lines.append('};')
    open('src/client/hero3dImages.ts', 'w').write('\n'.join(lines) + '\n')
    print('total', total // 1024, 'KB')
