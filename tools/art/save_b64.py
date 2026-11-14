# usage: python3 save.py name <<< base64 ; repairs a miscounted run of repeated 4-char groups
import sys, base64, re, io
from PIL import Image
name = sys.argv[1]; s = sys.stdin.read().strip()
def ok(t):
    try:
        bb = base64.b64decode(t + '=' * (-len(t) % 4)); im = Image.open(io.BytesIO(bb)); im.load(); return bb
    except Exception: return None
bb = ok(s)
if not bb:
    for m in re.finditer(r'((.{4}))\2{5,}', s):
        unit = m.group(2); cnt = (m.end() - m.start()) // 4
        for d in (1, -1, 2, -2, 3, -3):
            bb = ok(s[:m.start()] + unit * (cnt + d) + s[m.end():])
            if bb: break
        if bb: break
if not bb: print('FAIL', name); sys.exit(1)
open(f'/tmp/gems/{name}.png', 'wb').write(bb); im = Image.open(io.BytesIO(bb)); print('ok', name, im.size, im.mode)
