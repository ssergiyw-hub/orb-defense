# правка 177: the game's launcher icon from a Meshy picture (art/icon/icon_<v>.png, 1024×1024).
# Writes assets/icon/res/... (copied over the Capacitor defaults by tools/android-theme.py) and assets/icon/play_512.png.
#  - legacy icons (Android < 8): the picture with rounded corners / a circle, 48 dp
#  - adaptive icons (Android 8+): background layer = the picture at 83% over a blurred copy of itself on the 108 dp canvas
#    (the launcher shows the middle 72 dp — the picture's central ~80%), foreground layer = transparent
import os, sys
from PIL import Image, ImageDraw, ImageFilter
V = sys.argv[1] if len(sys.argv) > 1 else 'a'
src = Image.open(f'art/icon/icon_{V}.png').convert('RGB')
OUT = 'assets/icon/res'
DPI = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
def mask(size, round_):
    m = Image.new('L', (size * 4, size * 4), 0); d = ImageDraw.Draw(m)
    if round_: d.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    else: d.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * 0.18), fill=255)
    return m.resize((size, size), Image.LANCZOS)
def layer(size):
    bg = src.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(size / 18))
    inner = round(size * 0.83)
    bg.paste(src.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2, (size - inner) // 2))
    return bg
for name, k in DPI.items():
    d = f'{OUT}/mipmap-{name}'; os.makedirs(d, exist_ok=True)
    s48 = round(48 * k)
    for fn, rnd in (('ic_launcher.png', False), ('ic_launcher_round.png', True)):
        im = Image.new('RGBA', (s48, s48), (0, 0, 0, 0)); im.paste(src.resize((s48, s48), Image.LANCZOS), (0, 0), mask(s48, rnd)); im.save(f'{d}/{fn}')
    s108 = round(108 * k)
    layer(s108).save(f'{d}/ic_launcher_background.png')
    Image.new('RGBA', (s108, s108), (0, 0, 0, 0)).save(f'{d}/ic_launcher_foreground.png')
d = f'{OUT}/mipmap-anydpi-v26'; os.makedirs(d, exist_ok=True)
xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
for fn in ('ic_launcher.xml', 'ic_launcher_round.xml'): open(f'{d}/{fn}', 'w').write(xml)
src.resize((512, 512), Image.LANCZOS).save('assets/icon/play_512.png')
open('assets/icon/VARIANT', 'w').write(V + '\n')
print('icon variant', V, '->', OUT)
