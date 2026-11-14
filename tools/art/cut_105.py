"""правки 103/105/109: hero screen background (temple with a dais); earlier cuts kept as functions.
Usage: python3 tools/art/cut_105.py  (then it re-packs ui2Images.ts via cut_ui.pack)"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, 'tools/art')
from cut_ui import alpha_cut, trim, pack
S = 'art/ui/sheets/'

def frame_cut(path):
    """white outside AND white window inside → transparent (the tile shows through the frame)"""
    im = alpha_cut(Image.open(path))
    a = np.asarray(im).astype(float)
    rgb = a[..., :3]; d = (255 - rgb).max(-1)
    lab, _ = ndimage.label(d < 28)
    h, w = d.shape
    c = lab[h // 2, w // 2]
    win = lab == c if c else np.zeros_like(d, bool)
    alpha = a[..., 3] / 255
    soft = np.clip((d - 6) / 22, 0, 1)
    alpha = np.where(ndimage.binary_dilation(win, iterations=3), np.minimum(alpha, soft), alpha)
    alpha[win] = 0
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return trim(Image.fromarray(out, 'RGBA'), 0)

def glow_cut(path):
    """black background → alpha by brightness, colour un-premultiplied (additive-looking glow)"""
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    al = np.clip((a.max(-1) - 10) / 200, 0, 1)
    rgb = np.clip(a / np.maximum(al, 1e-3)[..., None], 0, 255)
    return trim(Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8), 'RGBA'), 0)

if __name__ == '__main__':
    # правка 109: the hero screen background is the temple with the dais (temple2); the 103 pedestal / rune circle are gone
    Image.open(S + 'temple2.png').convert('RGB').save('art/ui/hall.png')
    pack()
