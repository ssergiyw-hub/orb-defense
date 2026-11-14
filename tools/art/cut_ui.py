"""Cut Meshy UI sheets (white background) into transparent parts (правки 87–91).
Background = white region connected to the image border; inside it soft glows become partial transparency
(colour-to-alpha against white), everything enclosed by an outline stays opaque.
Usage: python3 tools/art/cut_ui.py  → art/ui/<name>.png"""
import numpy as np
from PIL import Image
from scipy import ndimage

def alpha_cut(src, glow=False):
    a = np.asarray(src.convert('RGB')).astype(float)
    d = (255 - a).max(-1)                          # distance from white
    near = d < (60 if glow else 28)
    lab, _ = ndimage.label(near)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    if glow:  # whole glow halo: anything light and low-saturation-ish touching the background
        alpha = np.where(bg, np.clip(d / 60, 0, 1), 1.0)
    else:
        alpha = np.where(bg, np.clip((d - 6) / 22, 0, 1), 1.0)
    alpha = ndimage.gaussian_filter(alpha, 0.6) * (~bg) + alpha * bg
    al = np.clip(alpha, 1e-3, 1)[..., None]
    rgb = np.where(bg[..., None], np.clip((a - 255 * (1 - al)) / al, 0, 255), a)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def parts(img, n, min_area=4000):
    """split by the opaque blobs; returns crops ordered rows then columns"""
    al = np.asarray(img)[..., 3] > 30
    lab, k = ndimage.label(ndimage.binary_dilation(al, iterations=4))
    sizes = ndimage.sum(al, lab, range(1, k + 1))
    idx = [i for i in np.argsort(-sizes)[:n] if sizes[i] > min_area]
    boxes = [ndimage.find_objects(lab)[i] for i in idx]
    h = np.median([b[0].stop - b[0].start for b in boxes])
    boxes.sort(key=lambda b: (round(((b[0].start + b[0].stop) / 2) / (h * 0.9)), b[1].start))
    res = []
    for b in boxes:
        m = (lab[b] == lab[b][lab[b] > 0][0])
        c = np.asarray(img)[b].copy()
        res.append(Image.fromarray(c, 'RGBA'))
    return res, boxes

def trim(im, pad=2):
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))

def cut_chests():
    """3 chests side by side: keep only the chest inside its dark outline; glow and rays are dropped
    (they turned into a pale haze on dark screens, правка 95) — the game draws the glow itself"""
    a = np.asarray(Image.open('art/ui/sheets/chest.png').convert('RGB')).astype(float)
    W = a.shape[1]
    for i in range(3):
        sub = a[:, i * W // 3:(i + 1) * W // 3]
        lab, _ = ndimage.label(sub.min(-1) > 120)          # white background, pale glow and rays
        edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); edge = edge[edge > 0]
        obj = ndimage.binary_opening(ndimage.binary_fill_holes(~np.isin(lab, edge)), iterations=2)
        lb, n = ndimage.label(obj); sz = ndimage.sum(obj, lb, range(1, n + 1))
        obj = ndimage.binary_fill_holes(lb == (np.argmax(sz) + 1))
        alpha = ndimage.gaussian_filter(ndimage.binary_erosion(obj, iterations=1).astype(float), 0.8)
        trim(Image.fromarray(np.dstack([sub, alpha * 255]).astype(np.uint8), 'RGBA')).save(f'art/ui/chest{i}.png')

def cut_tasks():
    """quest icons 4×2 in reading order"""
    names = ['login', 'runs', 'wins', 'kills', 'idle', 'upgrade', 'search', 'days']
    t = alpha_cut(Image.open('art/ui/sheets/tasks.png'), glow=True)
    W, H = t.size
    for i, n in enumerate(names):
        c, r = i % 4, i // 4
        trim(t.crop((c * W // 4, r * H // 2, (c + 1) * W // 4, (r + 1) * H // 2))).save(f'art/ui/task_{n}.png')

def pack():
    """resize, WebP, write src/client/ui2Images.ts"""
    import base64, io, glob, os
    SIZE = {'banner': 600, 'octframe': 220, 'plate': 300, 'lavabtn': 360, 'trough': 520, 'sqbtn': 120, 'wheel': 640,
            'chest0': 300, 'chest1': 300, 'chest2': 300, 'cave': 560,
            'hall': 768}
    lines = ['// Meshy UI art (правки 87–91): lava-stone kit, wheel, rune chest, cave background, quest icons.',
             '// Sources: art/ui (cut by tools/art/cut_ui.py). Do not edit by hand.', 'export const UI2: Record<string, string> = {']
    total = 0
    for f in sorted(glob.glob('art/ui/*.png')):
        n = os.path.basename(f)[:-4]
        im = Image.open(f)
        w = SIZE.get(n, 140)
        if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=72 if n == 'cave' else 84 if n == 'hall' else 82, method=6)
        total += b.tell()
        lines.append(f"  {n}: 'data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()}',")
    lines.append('};')
    open('src/client/ui2Images.ts', 'w').write('\n'.join(lines) + '\n')
    print('packed', total // 1024, 'KB')

if __name__ == '__main__':
    S = 'art/ui/sheets/'
    kit = alpha_cut(Image.open(S + 'kit.png'))
    ps, bx = parts(kit, 6)
    # name each part by its place on the 1024² sheet
    EXP = {'banner': (510, 170), 'octframe': (270, 550), 'plate': (760, 425), 'lavabtn': (760, 635), 'trough': (385, 890), 'sqbtn': (865, 880)}
    for p, b in zip(ps, bx):
        cx, cy = (b[1].start + b[1].stop) / 2, (b[0].start + b[0].stop) / 2
        name = min(EXP, key=lambda k: (EXP[k][0] - cx) ** 2 + (EXP[k][1] - cy) ** 2)
        trim(p).save(f'art/ui/{name}.png'); print(name, trim(p).size)
    w = alpha_cut(Image.open(S + 'wheel.png'))  # crop to the solid disc and centre it on a square
    w = w.crop(w.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox())
    n = max(w.size); sq = Image.new('RGBA', (n, n)); sq.paste(w, ((n - w.width) // 2, (n - w.height) // 2)); sq.save('art/ui/wheel.png')
    cut_chests()
    Image.open(S + 'cave.png').convert('RGB').save('art/ui/cave.png')
    cut_tasks(); pack()
    print('ok')

