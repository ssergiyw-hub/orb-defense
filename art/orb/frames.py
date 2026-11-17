"""Ш46 (сборка 2): marble-and-gold 9-slice frames that replace the old lava-stone kit (--u-oct, --u-plate, --u-lavab,
--u-trough). Same slice sizes as the old pictures, so every rule that uses them keeps working.
Usage: python3 art/orb/frames.py  ->  assets/orb/ui/f_*.webp"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
OUT = '../../assets/orb/ui/'
SS = 4  # supersampling


def slate(w, h, k=0.34, tint=(0.92, 1.0, 0.96)):
    """dark grey-green marble from the marble floor of the library picture"""
    src = Image.open('src/meshy-library.png').convert('L').crop((60, 1010, 708, 1370))
    src = src.resize((max(w, 648), max(h, 360)), Image.LANCZOS).crop((0, 0, w, h))
    a = np.asarray(src).astype(float) / 255
    a = (a - a.mean()) * 1.6 + 0.5  # stronger veins
    rgb = np.stack([np.clip(a * k * t + 0.05, 0, 1) for t in tint], -1)
    return Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').convert('RGBA')


def gold_ring(size, box, r, width, d):
    """a gold band with a dark outline, drawn on a supersampled layer"""
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0, y0, x1, y1), r, fill=None, outline=(42, 26, 6, 255), width=width + 4 * SS)
    for i in range(width):
        t = i / max(1, width - 1)
        c = (int(255 - 60 * t), int(236 - 80 * t), int(150 - 110 * t), 255) if t < 0.5 else (int(200 - 50 * (t - .5)), int(150 - 40 * (t - .5)), int(40 - 20 * (t - .5)), 255)
        d.rounded_rectangle((x0 + i + 2 * SS, y0 + i + 2 * SS, x1 - i - 2 * SS, y1 - i - 2 * SS), max(1, r - i - 2 * SS), outline=c, width=1)
    d.rounded_rectangle((x0 + width + 2 * SS, y0 + width + 2 * SS, x1 - width - 2 * SS, y1 - width - 2 * SS), max(1, r - width - 2 * SS), outline=(255, 246, 200, 160), width=SS)


def diamond(d, cx, cy, s):
    pts = [(cx, cy - s), (cx + s * .72, cy), (cx, cy + s), (cx - s * .72, cy)]
    d.polygon([(x + (2 if x > cx else -2) * SS, y + (2 if y > cy else -2) * SS) for x, y in pts], fill=(42, 26, 6, 255))
    d.polygon(pts, fill=(240, 196, 74, 255))
    inner = [(cx, cy - s * .7), (cx + s * .5, cy), (cx, cy + s * .7), (cx - s * .5, cy)]
    d.polygon(inner, fill=(16, 154, 80, 255))
    d.polygon([(cx, cy - s * .7), (cx + s * .5, cy), (cx, cy)], fill=(125, 255, 176, 255))


def frame(w, h, r, band, fill, diamonds=False, name='x'):
    W, H = w * SS, h * SS
    mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), r * SS, fill=255)
    base = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if fill is not None:
        f = fill.resize((W, H), Image.LANCZOS); base.paste(f, (0, 0), mask)
        sh = Image.new('L', (W, H), 0)  # inner shade along the rim
        ImageDraw.Draw(sh).rounded_rectangle((band * SS, band * SS, W - band * SS, H - band * SS), r * SS, outline=255, width=6 * SS)
        sh = sh.filter(ImageFilter.GaussianBlur(5 * SS))
        base = Image.composite(Image.new('RGBA', (W, H), (0, 0, 0, 255)), base, sh.point(lambda v: v * 0.45))
        base.putalpha(mask)
    d = ImageDraw.Draw(base)
    gold_ring((W, H), (0, 0, W - 1, H - 1), r * SS, band * SS, d)
    if diamonds:
        o = int(r * 0.42 + band * 0.5) * SS
        for cx, cy in ((o, o), (W - o, o), (o, H - o), (W - o, H - o)): diamond(d, cx, cy, (band + 4) * SS)
    im = base.resize((w, h), Image.LANCZOS)
    im.save(OUT + name, 'WEBP', quality=92, method=6); print(name, im.size)


def emerald(w, h, r, band, name):
    W, H = w * SS, h * SS
    g = np.zeros((H, W, 4), np.uint8)
    t = np.linspace(0, 1, H)[:, None]
    top, mid, bot = np.array([93, 255, 160]), np.array([18, 160, 80]), np.array([6, 80, 31])
    col = np.where(t < .5, top + (mid - top) * (t / .5), mid + (bot - mid) * ((t - .5) / .5))  # (H, 3)
    g[..., :3] = np.broadcast_to(col[:, None, :], (H, W, 3)).astype(np.uint8); g[..., 3] = 255
    base = Image.fromarray(g, 'RGBA')
    mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), r * SS, fill=255)
    gl = Image.new('L', (W, H), 0)  # glossy top half
    ImageDraw.Draw(gl).rounded_rectangle(((band + 6) * SS, (band + 3) * SS, W - (band + 6) * SS, H * 0.45), (r - band) * SS, fill=90)
    gl = gl.filter(ImageFilter.GaussianBlur(3 * SS))
    base = Image.composite(Image.new('RGBA', (W, H), (255, 255, 255, 255)), base, gl)
    base.putalpha(mask)
    d = ImageDraw.Draw(base)
    gold_ring((W, H), (0, 0, W - 1, H - 1), r * SS, band * SS, d)
    im = base.resize((w, h), Image.LANCZOS)
    im.save(OUT + name, 'WEBP', quality=92, method=6); print(name, im.size)


frame(256, 256, 30, 9, slate(256, 256), diamonds=True, name='f_oct.webp')       # slice 64
frame(96, 96, 14, 4, slate(96, 96, 0.38), name='f_plate.webp')                  # slice 18
frame(120, 80, 20, 5, slate(120, 80, 0.12), name='f_trough.webp')               # slice 24 30
emerald(300, 120, 38, 6, 'f_btn.webp')                                          # slice 40 52
