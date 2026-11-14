"""frames from tools/shots43.mjs → GIF with real timing. Usage: python3 tools/mkgif.py shots/gif-heracles out.gif"""
import sys, json, glob
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(d + '/*.png')); t = json.load(open(d + '/times.json'))
ims = [Image.open(f).convert('RGB').resize((320, 300), Image.LANCZOS) for f in fs]
dur = [max(20, t[i + 1] - t[i]) for i in range(len(t) - 1)] + [100]
pal = [im.quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for im in ims]
pal[0].save(out, save_all=True, append_images=pal[1:], duration=dur, loop=0, optimize=True)
print(out, len(ims), sum(dur) / 1000, 's')
