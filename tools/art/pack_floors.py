# правка 167: полы этапов (Meshy, id в art/floors/tasks.json) -> бесшовные плитки assets/floors/<биом>.webp
# бесшовность: картинка + её копия со сдвигом на полплитки; к краям плитки берётся копия (её середина — бывшие края),
# в центре — оригинал. Тон подгоняется под бой: чуть темнее и спокойнее, чтобы герой и монстры читались.
from PIL import Image, ImageEnhance
import numpy as np, os
SRC, OUT, SIZE = 'art/floors', 'assets/floors', 768
os.makedirs(OUT, exist_ok=True)
TONE = {  # биом: (яркость, насыщенность, контраст) — пёстрые полы приглушены, чтобы монстры не терялись
    'desert': (0.86, 0.80, 0.8), 'meadow': (0.92, 0.85, 0.75), 'forest': (1.45, 0.9, 0.55),
    'swamp': (0.95, 0.85, 0.65), 'grave': (1.08, 0.9, 0.6), 'mount': (1.0, 0.95, 0.6),
}
def seamless(im):
    a = np.asarray(im).astype(np.float32); h, w = a.shape[:2]
    b = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    y = np.abs(np.linspace(-1, 1, h))[:, None]; x = np.abs(np.linspace(-1, 1, w))[None, :]
    d = np.maximum(x, y)  # 0 in the middle, 1 at the edges
    wgt = np.clip((d - 0.72) / 0.26, 0, 1) ** 1.2
    return Image.fromarray((a * (1 - wgt[..., None]) + b * wgt[..., None]).astype(np.uint8))
for n, (br, sat, con) in TONE.items():
    f = f'{SRC}/{n}.png'
    if not os.path.exists(f): print('no', f); continue
    im = Image.open(f).convert('RGB')
    im = seamless(im)
    im = ImageEnhance.Contrast(im).enhance(con); im = ImageEnhance.Brightness(im).enhance(br); im = ImageEnhance.Color(im).enhance(sat)
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    im.save(f'{OUT}/{n}.webp', 'WEBP', quality=84, method=6)
    print(n, os.path.getsize(f'{OUT}/{n}.webp') // 1024, 'KB')
