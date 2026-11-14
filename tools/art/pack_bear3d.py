"""правка 125: the event bear — atlases rendered from the Meshy model (tools/h3d/atlas.mjs, rows = 8 directions,
columns = frames) → dark outline like the heroes → assets/h3d/bear_<clip>.webp + src/client/bear3dImages.ts.
Usage: python3 tools/art/pack_bear3d.py /tmp/r3d/out/bear"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageEnhance
from pack_hero3d import outline

# clip: frames, seconds, loop, share of the clip when the blow lands (wind-up frames before it, rest after)
CLIPS = {'idle': (8, 1.667, True, 0), 'walk': (16, 5.5, True, 0), 'swipe': (8, 1.0, False, 0.45), 'slam': (12, 3.0, False, 0.78), 'charge': (8, 0.5, True, 0)}
# правка 138: rendered at 384 and kept crisp — 320 a cell; the walk (16 frames) at 256 so its atlas stays within 4096 px
SRC_CELL, FOOT = 384, 0.2
CELLS = {'walk': 256}

src = sys.argv[1]
lines = ['// The event bear (правка 125): Meshy model rendered to atlases, rows = 8 directions (0 = right, clockwise), columns = frames.',
         '// Made by tools/art/pack_bear3d.py — do not edit.',
         f'export const BEAR3D = {{ foot: {FOOT}, clips: {{']
total = 0
for clip, (n, dur, loop, hit) in CLIPS.items():
    im = Image.open(os.path.join(src, clip + '.png')).convert('RGBA')
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(1.25); rgb = ImageEnhance.Contrast(rgb).enhance(1.08); rgb.putalpha(im.getchannel('A')); im = rgb
    im = outline(im, px=4)
    CELL = CELLS.get(clip, 320)
    im = im.resize((n * CELL, 8 * CELL), Image.LANCZOS)
    fn = f'assets/h3d/bear_{clip}.webp'
    im.save(fn, 'WEBP', quality=88, method=5); sz = os.path.getsize(fn); total += sz
    lines.append(f"  {clip}: {{ n: {n}, cell: {CELL}, dur: {dur}, loop: {str(loop).lower()}, hit: {hit}, src: 'h3d/bear_{clip}.webp' }},")
    print(clip, im.size, sz // 1024, 'KB')
lines.append('} } as const;')
open('src/client/bear3dImages.ts', 'w').write('\n'.join(lines) + '\n')
print('total', total // 1024, 'KB')
