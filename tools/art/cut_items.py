import numpy as np, json
from PIL import Image
from scipy import ndimage
F2 = {'guard': {'book': (32,60,187,217), 'amulet': (204,64,302,203), 'ring': (327,98,411,192), 'mantle': (431,57,577,246), 'gloves': (230,239,387,375), 'boots': (411,247,561,382)},
      'wanderer': {'book': (23,481,163,822), 'amulet': (163,480,273,607), 'ring': (309,489,392,581), 'mantle': (418,470,569,631), 'gloves': (245,665,360,790), 'boots': (432,669,567,797)},
      'berserk': {'book': (34,932,140,1219), 'amulet': (155,938,257,1038), 'ring': (289,931,377,1023), 'mantle': (424,925,563,1072), 'gloves': (212,1063,386,1188), 'boots': (426,1075,555,1195)}}
F3 = {'guard': {'book': (14,40,194,231), 'amulet': (205,64,315,210), 'ring': (327,82,424,192), 'mantle': (431,57,577,240), 'gloves': (230,239,387,375), 'boots': (402,239,588,383)},
      'wanderer': {'book': (14,436,168,835), 'amulet': (178,476,273,612), 'ring': (309,489,392,581), 'mantle': (418,469,569,631), 'gloves': (245,672,358,806), 'boots': (431,682,567,811)},
      'berserk': {'book': (34,932,140,1219), 'amulet': (155,938,257,1038), 'ring': (289,931,377,1032), 'mantle': (424,925,563,1072), 'gloves': (212,1063,386,1188), 'boots': (426,1075,555,1195)}}
F = {'guard': {'book': (33,62,186,232), 'amulet': (205,62,302,203), 'ring': (328,97,410,188), 'mantle': (429,56,580,245), 'gloves': (232,240,386,375), 'boots': (412,247,562,382)},
     'berserk': {'book': (35,928,140,1215), 'amulet': (153,925,260,1035), 'ring': (287,932,378,1025), 'mantle': (428,910,560,1072), 'gloves': (213,1063,385,1188), 'boots': (426,1075,556,1195)}}
SUN = [ {'book': (27,485,133,778), 'amulet': (163,482,272,608), 'ring': (312,503,386,575), 'mantle': (431,469,556,633), 'gloves': (252,627,408,758), 'boots': (435,657,556,768)},
        {'book': (25,527,132,793), 'amulet': (145,535,268,652), 'ring': (305,548,378,620), 'mantle': (432,520,556,636), 'gloves': (252,622,410,770), 'boots': (434,667,554,790)},
        {'book': (25,486,121,778), 'amulet': (165,484,262,608), 'ring': (310,490,392,582), 'mantle': (420,472,568,618), 'gloves': (252,624,410,758), 'boots': (433,644,568,768)} ]
SHEETS = ['0f658ecf', '101af214', '550cda2c', '0f82f4c3']
out = {}
import sys
only = [int(x) for x in sys.argv[1:]] or [0, 1, 2, 3]
for tier, sh in enumerate(SHEETS):
    if tier not in only: continue
    im = np.asarray(Image.open(f'/mnt/user-data/uploads/{sh}-image.jpg').convert('RGB')).astype(float)
    bg = np.median(im[5:60, 5:60].reshape(-1, 3), 0)
    boxes = F3 if tier == 3 else F2 if tier == 2 else {'guard': F['guard'], 'wanderer': SUN[tier], 'berserk': F['berserk']}
    for st, bx in boxes.items():
        for slot, (x0, y0, x1, y1) in bx.items():
            x0, y0, x1, y1 = [v * 2 for v in (x0, y0, x1, y1)]
            x0 -= 10; y0 -= 10; x1 += 10; y1 += 10
            c = im[max(0, y0):y1, max(0, x0):x1].copy()
            if tier == 2 and st == 'wanderer' and slot == 'book': c[(650-481)*2+10:, (112-23)*2+10:] = bg
            if tier == 3 and st == 'wanderer' and slot == 'book': c[(655-436)*2+10:, (112-14)*2+10:] = bg  # cape next to the staff
            if tier == 3 and st == 'wanderer' and slot == 'gloves':
                ox, oy = 245 * 2 - 10, 672 * 2 - 10
                yy, xx = np.mgrid[0:c.shape[0], 0:c.shape[1]]; X, Y = xx + ox, yy + oy
                c[((X > 655) & (Y < 1455)) | (X > 703) | (Y > 1598)] = bg
            elif tier >= 2 and st == 'wanderer' and slot == 'gloves': c[:150, 165:] = bg; c[:, 232:] = bg; c[252:] = bg  # only the lion glove
            diff = np.abs(c - bg).max(-1)
            strong = diff > 40
            lab, n = ndimage.label(strong)
            sizes = ndimage.sum(strong, lab, range(1, n + 1))
            big = sizes.max()
            keep = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz >= 0.03 * big])
            junk = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz < 0.03 * big])
            keep = ndimage.binary_closing(keep, iterations=3)
            holes = ndimage.binary_fill_holes(keep) & ~keep
            hl, hn = ndimage.label(holes)
            if hn:
                hs = ndimage.sum(holes, hl, range(1, hn + 1))
                keep |= np.isin(hl, [i + 1 for i, v in enumerate(hs) if v < 400])  # only pinholes, not the inside of rings
            near = ndimage.binary_dilation(keep, iterations=40 if tier == 3 else 22) & ~ndimage.binary_dilation(junk & ~ndimage.binary_dilation(keep, iterations=2), iterations=3)
            a = np.clip((diff - 7) / 55, 0, 1)
            alpha = np.where(keep, 1.0, a * near)
            alpha = ndimage.gaussian_filter(alpha, 0.6) * (near | keep)
            A = alpha[..., None]
            col = np.where(keep[..., None], c, np.clip((c - bg * (1 - A)) / np.maximum(A, 0.05), 0, 255))
            img = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
            bb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
            img = img.crop(bb)
            if slot == 'book' and st != 'guard': img = img.rotate(-38, expand=True, resample=Image.BICUBIC); img = img.crop(img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
            w, h = img.size; side = int(max(w, h) * 1.06)
            sq = Image.new('RGBA', (side, side)); sq.paste(img, ((side - w) // 2, (side - h) // 2))
            sq = sq.resize((128, 128), Image.LANCZOS)
            name = f'{st}_{slot}_{tier}'; sq.save(f'out/{name}.png'); sq.save(f'out/{name}.webp', quality=86, method=6)
