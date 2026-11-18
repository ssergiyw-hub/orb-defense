"""Ш107: the picture of the «Шквал шаров» event, put together from the game's own art (Meshy credits are out):
the storm field, a row of enemies on top, the hero on the wall from behind, a fan of glowing orbs flying up, lightning at the sides.
-> assets/orb/ui/ev_storm.webp (600 × 340). Usage: python3 art/orb/evart.py"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, '../../assets/orb')
W, H = 600, 340
random.seed(7)


def img(p): return Image.open(os.path.join(A, p)).convert('RGBA')


def fit(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def glow(im, r, col, k=1.0):
    """a soft halo of the image's own shape in one colour"""
    a = im.split()[3].filter(ImageFilter.GaussianBlur(r))
    a = a.point(lambda v: min(255, int(v * k)))
    g = Image.new('RGBA', im.size, col); g.putalpha(a); return g


def main():
    # 1. the field: the storm floor, darker towards the edges and the top
    bg = img('bg/lightning.webp')
    bg = bg.resize((W, round(bg.height * W / bg.width)), Image.LANCZOS).crop((0, 260, W, 260 + H))
    bg = ImageEnhance.Brightness(bg).enhance(0.85)
    out = Image.new('RGBA', (W, H)); out.alpha_composite(bg)
    # 2. lightning at the sides
    d = ImageDraw.Draw(out, 'RGBA')
    for x0, sgn in ((40, 1), (W - 40, -1)):
        pts, x, y = [], x0, 0
        while y < H * 0.75: pts.append((x, y)); y += random.randint(18, 34); x += sgn * random.randint(-14, 20)
        for w_, col in ((12, (90, 160, 255, 60)), (6, (150, 210, 255, 140)), (2, (240, 250, 255, 255))): d.line(pts, fill=col, width=w_, joint='curve')
    # 3. a row of enemies on top (and a second, smaller one behind)
    row = ['olymp_brute', 'olymp_slime', 'olymp_cyclops', 'olymp_talos', 'olymp_fast', 'olymp_bigslime', 'olymp_archer']
    for i, n in enumerate(row):
        e = fit(img(f'en/{n}.webp'), 58)
        x = 32 + i * 80 - e.width // 2 + 20; y = 28 + (i % 2) * 10
        sh = Image.new('RGBA', (e.width, 12), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse((4, 2, e.width - 4, 11), fill=(0, 0, 0, 110))
        out.alpha_composite(sh, (x, y + e.height - 8)); out.alpha_composite(e, (x, y))
    # 4. the wall and the hero from behind
    wall = img('wall/start.webp'); wall = wall.resize((W, round(wall.height * W / wall.width)), Image.LANCZOS)
    out.alpha_composite(wall, (0, H - 62))
    hero = fit(img('hero/apollo_cast_up.webp'), 130)
    hx, hy = W // 2 - hero.width // 2, H - hero.height + 6
    # 5. the fan of orbs from the staff up to the enemies, with light trails
    kinds = ['fire', 'ice', 'lightning', 'poison', 'beam', 'normal', 'ghost', 'wet', 'normal', 'fire', 'normal', 'quake']
    sx, sy = W // 2 + 6, H - 118
    trail = Image.new('RGBA', (W, H)); td = ImageDraw.Draw(trail)
    balls = []
    for i, k in enumerate(kinds):
        ang = math.radians(-152 + i * (124 / (len(kinds) - 1)))
        dist = 70 + (i * 37) % 120
        bx, by = sx + math.cos(ang) * dist, sy + math.sin(ang) * dist
        td.line([(sx, sy), (bx, by)], fill=(255, 240, 190, 70), width=7)
        td.line([(sx, sy), (bx, by)], fill=(255, 255, 255, 120), width=2)
        balls.append((k, bx, by, 34 if k != 'normal' else 26))
    out.alpha_composite(trail.filter(ImageFilter.GaussianBlur(2)))
    for k, bx, by, s in balls:
        b = img(f'ball/{k}.webp').resize((s, s), Image.LANCZOS)
        pad = Image.new('RGBA', (s * 3, s * 3)); pad.alpha_composite(b, (s, s))
        g = glow(pad, 5, (255, 236, 160, 255), 1.3)
        out.alpha_composite(g, (round(bx - 1.5 * s), round(by - 1.5 * s))); out.alpha_composite(b, (round(bx - s / 2), round(by - s / 2)))
    hp = Image.new('RGBA', (hero.width + 40, hero.height + 40)); hp.alpha_composite(hero, (20, 20))
    out.alpha_composite(glow(hp, 8, (255, 220, 120, 255), 0.7), (hx - 20, hy - 20)); out.alpha_composite(hero, (hx, hy))
    # 6. vignette
    v = Image.new('L', (W, H), 0); vd = ImageDraw.Draw(v)
    for i in range(40): vd.rectangle((i, i, W - i, H - i), outline=int(150 * (1 - i / 40) ** 2))
    dark = Image.new('RGBA', (W, H), (8, 6, 20, 255)); dark.putalpha(v.filter(ImageFilter.GaussianBlur(6)))
    out.alpha_composite(dark)
    out.convert('RGB').save(os.path.join(A, 'ui/ev_storm.webp'), quality=92, method=6)
    print('ev_storm', out.size)


if __name__ == '__main__':
    main()
