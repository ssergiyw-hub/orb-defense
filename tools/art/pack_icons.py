"""Pack the icons cut by cut_icons.py (art/icons/<sheet>_<n>.png) into src/client/iconImages.ts as WebP data URIs."""
import base64, io
from PIL import Image
D = 'art/icons'
NAMES = {
    'bless': ['revive', 'wisdom', 'luck', 'guard', 'destroy', 'absorb', 'regen', 'swift', 'fury'],
    'elem': ['fire', 'ice', 'nature', 'light', 'dark', 'lightning', 'water', 'phys', 'air', 'poison'],
    'fam': ['f_arrow', 'f_orbs', 'f_auras', 'f_blast', 'f_missiles', 'f_storm'],
    'skill': ['fireball', 'iceShards', 'natureAura', 'lightBeam', 'darkOrbs', 'chain', 'waterJet', 'boomerang', 'wind', 'poisonFlask', 'poisonAura', 'fireOrbs', 'iceOrbs', 'boltOrbs', 'meteor', 'sprites'],
    'pass': ['arrow', 'multi', 'double', 'ult', 'pDmg', 'pHp', 'pDef', 'pSpeed', 'pPickup', 'pXp', 'pVamp', 'pGold'],
    'res': ['gold', 'scrolls', 'essSmall', 'essBig', 'energy', 'shards', 'particles'],
    'loc': ['0', '1', '2', '3', '4'],
    'set': ['guard', 'wanderer', 'berserk'],
}
PREF = {'bless': 'r_', 'elem': 'e_', 'fam': 'r_', 'skill': 's_', 'pass': 'p_', 'res': 'res_', 'loc': 'loc_', 'set': 'set_'}
SIZE = {'bless': 144, 'elem': 144, 'fam': 144, 'skill': 144, 'pass': 128, 'res': 112, 'loc': 144, 'set': 112}
out = []
for sh, lst in NAMES.items():
    for i, n in enumerate(lst):
        im = Image.open(f'{D}/{sh}_{i}.png').resize((SIZE[sh], SIZE[sh]), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=80, method=6)
        im.save(f'{D}/{PREF[sh]}{n}.webp', quality=80, method=6)
        out.append(f"  {PREF[sh]}{n}: 'data:image/webp;base64,{base64.b64encode(b.getvalue()).decode()}',")
open('src/client/iconImages.ts', 'w').write('// rune, skill, resource and jeweler-location icons (cut by tools/art/cut_icons.py, packed by pack_icons.py)\nexport const ICONS: Record<string, string> = {\n' + '\n'.join(out) + '\n};\n')
