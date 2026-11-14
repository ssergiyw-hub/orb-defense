"""правки 125, 126: event arena floors (Meshy, one per map of the day) → assets/ev/<id>.webp.
Most pictures came as a slab with a margin, so the middle 72% is kept; grotto2 is a flat texture (whole picture)."""
from PIL import Image, ImageEnhance
SRC = {'fire': 'fire', 'glacier': 'glacier', 'swamp': 'swamp', 'ruins': 'ruins', 'sun': 'sun', 'forest': 'forest',
       'storm': 'storm', 'grotto': 'grotto2', 'arena': 'arena', 'sky': 'sky'}
for k, f in SRC.items():
    im = Image.open(f'art/ev/{f}.png').convert('RGB')
    W = im.width
    if f != 'grotto2': m = int(W * 0.14); im = im.crop((m, m, W - m, W - m))
    im = im.resize((900, 900), Image.LANCZOS)
    im.save(f'assets/ev/{k}.webp', 'WEBP', quality=86, method=5)
    print(k, im.size)
