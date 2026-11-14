import numpy as np, sys
from PIL import Image, ImageFilter
def gemtone(path, out, hue_lo, hue_hi, sat_k, val_k, glow=0, vmin=0.0, smin=0.25, blur=7):
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).astype(float)
    hsv = np.asarray(im.convert('RGB').convert('HSV')).astype(float)
    h = hsv[..., 0] * 360 / 255; s = hsv[..., 1] / 255; v = hsv[..., 2] / 255
    m = (h >= hue_lo) & (h <= hue_hi) & (s > smin) & (v >= vmin) & (a[..., 3] > 0)
    s2 = np.where(m, np.clip(s * sat_k, 0, 1), s); v2 = np.where(m, np.clip(v * val_k + (0.15 if val_k > 1 else 0), 0, 1), v)
    rgb = np.asarray(Image.fromarray(np.dstack([hsv[..., 0], s2 * 255, v2 * 255]).astype(np.uint8), 'HSV').convert('RGB')).astype(float)
    res = Image.fromarray(np.dstack([rgb, a[..., 3]]).astype(np.uint8), 'RGBA')
    if glow:
        mk = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
        col = rgb[m].mean(0)
        g = Image.new('RGBA', res.size, tuple(int(c) for c in col) + (0,)); g.putalpha(mk.point(lambda x: min(255, int(x * glow))))
        base = Image.new('RGBA', res.size); base.alpha_composite(g); base.alpha_composite(res); res = base
    res.save(out + '.png'); res.save(out + '.webp', quality=86, method=6)
gemtone('out/wanderer_book_0.png', 'out/wanderer_book_0', 20, 60, 0.35, 0.65, vmin=0.62)
gemtone('out/wanderer_book_1.png', 'out/wanderer_book_1', 20, 60, 1.1, 1.05, glow=0.8, vmin=0.62)

