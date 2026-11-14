# правка 170: экран входа «Призванный герой» — art/entry/*.png (Meshy, id в art/entry/tasks.json) -> assets/entry/*.webp
# фон 9:16, три героя без фона (обрезка по альфе), логотипы на 10 языков (обрезка по альфе)
from PIL import Image
import os
SRC, OUT = 'art/entry', 'assets/entry'
os.makedirs(OUT, exist_ok=True)
def save(im, name, q):
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=q, method=6)
    print(name, im.size, os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB')
bg = Image.open(f'{SRC}/bg.png').convert('RGB')
save(bg, 'bg', 86)
for h in ['zeus', 'medusa', 'hestia']:
    im = Image.open(f'{SRC}/{h}.png').convert('RGBA')
    a = im.getchannel('A').point(lambda v: 0 if v < 8 else v)  # soft halo of the cut -> clean
    im.putalpha(a)
    im = im.crop(a.getbbox())
    save(im, h, 88)
for l in ['ru', 'uk', 'en', 'de', 'es', 'pt', 'pl', 'tr', 'fr', 'it']:
    f = f'{SRC}/logo_{l}.png'
    if not os.path.exists(f): print('no', f); continue
    im = Image.open(f).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 0 if v < 10 else 255).getbbox())
    if im.width > 1000: im = im.resize((1000, round(im.height * 1000 / im.width)), Image.LANCZOS)
    save(im, 'logo_' + l, 90)
