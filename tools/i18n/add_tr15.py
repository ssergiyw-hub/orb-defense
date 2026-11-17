# правки Ш46–Ш48 (marble UI, 8 equipment cells, floating spirit): new keys → keys.json + src/tr15.txt. Run once, then python3 tools/i18n/build.py
import json
KJ = 'tools/i18n/keys.json'
keys = json.load(open(KJ, encoding='utf8'))
T = {
 'Скоро': ["Скоро", "Soon", "Bald", "Pronto", "Em breve", "Wkrótce", "Yakında", "Bientôt", "Presto"],
 'Призови духа': ["Приклич духа", "Summon a spirit", "Rufe einen Geist", "Invoca un espíritu", "Invoque um espírito", "Przywołaj ducha", "Bir ruh çağır", "Invoque un esprit", "Evoca uno spirito"],
}
have = set(keys); out = []
for k, v in T.items():
    if k in have: continue
    keys.append(k); have.add(k); out.append('|'.join([str(len(keys) - 1)] + v))
json.dump(keys, open(KJ, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
with open('tools/i18n/src/tr15.txt', 'a', encoding='utf8') as o:
    for r in out: o.write(r + '\n')
print('added', len(out))
