"""Ш103, Ш105: the light marble kit from Seryoga's sheets (purple background, no Meshy):
  ref/2537.png — the rating window: the laurel title plaque, the panel with columns and green banners
  ref/2538.png — rating rows (gold / silver / bronze / plain), medals 1–3, chests, the place tile, ×, i
  ref/2540.png — the item window: the big panel with emerald corners, the panel with a header band, the plain panel
  ref/2541.png — the hex title plaque, the rarity ribbon, gem sockets, the square frame, ×, the lock, rarity diamonds, buttons
-> assets/orb/ui/m_*.webp. Usage: python3 art/orb/marble.py [--show]"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../assets/orb/ui')
REF = os.path.join(HERE, 'src/ref')


def key(path):
    """purple background -> alpha; the edge colour is un-mixed from the purple (no violet fringe)"""
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    h, w, _ = im.shape
    corners = np.concatenate([im[:12, :12].reshape(-1, 3), im[:12, -12:].reshape(-1, 3), im[-12:, :12].reshape(-1, 3), im[-12:, -12:].reshape(-1, 3)])
    bg = np.median(corners, 0)
    d = np.sqrt(((im - bg) ** 2).sum(2))
    a = np.clip((d - 26) / 60, 0, 1)
    # purple-ish pixels far from the art are background even when a little brighter (glow)
    a = ndimage.grey_closing(a, size=3)
    rgb = (im - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-3)
    rgb = np.clip(rgb, 0, 255)
    out = np.dstack([rgb, a * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def solid(path, img):
    """dark stone close to the purple goes half transparent — inside the outer outline everything is opaque, original colour"""
    raw = np.asarray(Image.open(path).convert('RGB'))
    arr = np.asarray(img).copy()
    filled = ndimage.binary_fill_holes(arr[..., 3] > 128)
    inner = ndimage.binary_erosion(filled, iterations=3)
    arr[inner, :3] = raw[inner]; arr[inner, 3] = 255
    return Image.fromarray(arr, 'RGBA')


def blobs(img, min_area=400):
    a = np.asarray(img)[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=4))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl is None: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        if (y1 - y0) * (x1 - x0) < min_area: continue
        out.append((x0, y0, x1, y1))
    return out


def save(img, box, name, pad=2, q=95):
    x0, y0, x1, y1 = box
    part = img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))
    bb = part.getbbox(); part = part.crop(bb)
    part.save(os.path.join(OUT, name + '.webp'), quality=q, method=6)
    print(f'{name:14s} {part.size}')
    return part


def near(bl, x, y):
    """the blob that contains the point (x, y) — sheet positions are stable, so names go by where the art is"""
    for b in bl:
        if b[0] <= x <= b[2] and b[1] <= y <= b[3]: return b
    raise SystemExit(f'no blob at {x},{y}')


def erase(img, box):
    """paint over a baked-in sign with the surrounding stone (cv2 inpaint), keep the alpha"""
    import cv2
    arr = np.asarray(img).copy()
    mask = np.zeros(arr.shape[:2], np.uint8); x0, y0, x1, y1 = box; mask[y0:y1, x0:x1] = 255
    rgb = cv2.inpaint(np.ascontiguousarray(arr[..., :3]), mask, 7, cv2.INPAINT_TELEA)
    arr[..., :3] = rgb
    return Image.fromarray(arr, 'RGBA')


def main():
    # --- 2537: the rating window ---
    im = key(os.path.join(REF, '2537.png')); bl = blobs(im)
    save(im, (90, 20, 775, 262), 'm_laurel')        # the title plaque in laurels (its lower emerald touches the panel)
    save(im, (20, 268, 846, 1470), 'm_hall')        # the panel with columns and banners
    # --- 2538: the rating rows ---
    im = key(os.path.join(REF, '2538.png')); bl = blobs(im)
    for i, n in enumerate(('m_row1', 'm_row2', 'm_row3', 'm_row')): save(im, near(bl, 300, 190 + 190 * i), n)
    for i, (y0, y1) in enumerate(((88, 285), (282, 470), (472, 662))): save(im, (590, y0, 785, y1), f'm_medal{i + 1}')
    for i, n in enumerate(('m_chest1', 'm_chest2', 'm_chest3')): save(im, near(bl, 890, 185 + 190 * i), n)
    tile = save(im, (610, 668, 765, 860), 'm_place_src')
    w, h = tile.size  # the «4» in the middle of the tile — painted over, the game writes the number
    erase(tile, (int(w * 0.27), int(h * 0.3), int(w * 0.73), int(h * 0.7))).save(os.path.join(OUT, 'm_place.webp'), quality=95, method=6)
    os.remove(os.path.join(OUT, 'm_place_src.webp'))
    save(im, near(bl, 834, 768), 'm_x')
    save(im, near(bl, 954, 768), 'm_info')
    # --- 2540: the item window panels ---
    im = key(os.path.join(REF, '2540.png')); bl = blobs(im)
    save(im, near(bl, 432, 480), 'm_panel')
    save(im, near(bl, 432, 1060), 'm_box')
    save(im, near(bl, 432, 1335), 'm_plate')
    # --- 2541: the item window details ---
    im = key(os.path.join(REF, '2541.png')); bl = blobs(im)
    sol = solid(os.path.join(REF, '2541.png'), im)  # the stone sockets: opaque inside
    save(im, near(bl, 512, 110), 'm_hex')
    save(im, near(bl, 512, 272), 'm_ribbon')
    save(im, near(bl, 160, 480), 'm_sock_gem')
    lock = save(sol, near(bl, 432, 480), 'm_sock_lock')
    w, h = lock.size  # the empty open socket: the same stone ring without the lock
    erase(lock, (int(w * 0.3), int(h * 0.27), int(w * 0.7), int(h * 0.7))).save(os.path.join(OUT, 'm_sock.webp'), quality=95, method=6)
    save(im, near(bl, 700, 480), 'm_frame')
    save(im, near(bl, 922, 400), 'm_x2')
    save(im, near(bl, 918, 540), 'm_lock')
    for i, n in enumerate(('m_dia_blue', 'm_dia_violet', 'm_dia_gold', 'm_dia_red')): save(im, near(bl, 160 + 222 * i, 684), n)
    save(im, near(bl, 265, 860), 'm_btn_gold')
    save(im, near(bl, 757, 860), 'm_btn_stone')
    if '--show' in sys.argv: print(bl)


if __name__ == '__main__':
    main()
