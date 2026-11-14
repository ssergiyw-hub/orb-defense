"""правка 101: hero avatars (Meshy portraits, transparent) and element backgrounds → src/client/heroArtImages.ts
Usage: python3 tools/art/pack_101.py   (sources: art/heroes/face/<file>.png, art/heroes/bg/<element>.png)"""
import base64, io
from PIL import Image
FILES = {'apollo': 'apollo', 'skadi': 'borey', 'veles': 'demeter', 'hades': 'hecate', 'heracles': 'heracles',
         'prometheus': 'hestia', 'hydra': 'medusa', 'stribog': 'nika', 'poseidon': 'poseidon', 'perun': 'zeus'}
ELEMENTS = ['fire', 'poison', 'dark', 'light', 'phys', 'air', 'water', 'ice', 'nature', 'lightning']

def uri(im, q):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

def face(path):
    im = Image.open(path).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if bb:  # keep the head centred: square around the picture's own centre column, top cropped to the content
        x0, y0, x1, y1 = bb; side = max(x1 - x0, y1 - y0); cx = (x0 + x1) / 2
        sq = Image.new('RGBA', (side, side)); sq.paste(im.crop((int(cx - side / 2), y0, int(cx + side / 2), y0 + side)), (0, 0)); im = sq
    return im.resize((256, 256), Image.LANCZOS)

out = ['// Hero avatars and element backgrounds from Meshy (правка 101). Made by tools/art/pack_101.py — do not edit.']
out.append('export const HERO_FACE: Record<string, string> = {')
for hid, f in FILES.items(): out.append(f"  {hid}: '{uri(face(f'art/heroes/face/{f}.png'), 88)}',")
out.append('};')
out.append('export const EL_BG: Record<string, string> = {')
for e in ELEMENTS: out.append(f"  {e}: '{uri(Image.open(f'art/heroes/bg/{e}.png').convert('RGB').resize((360, 480), Image.LANCZOS), 80)}',")
out.append('};')
s = '\n'.join(out) + '\n'; open('src/client/heroArtImages.ts', 'w').write(s); print(len(s) // 1024, 'KB')
