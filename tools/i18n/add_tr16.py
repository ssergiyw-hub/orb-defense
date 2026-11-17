# правки Ш61–Ш67 (wheel, tasks, idle chest): new keys → keys.json + src/tr16.txt. Run once, then python3 tools/i18n/build.py
import json
KJ = 'tools/i18n/keys.json'
keys = json.load(open(KJ, encoding='utf8'))
T = {
 'Лучше': ["Краще", "Better", "Besser", "Mejor", "Melhor", "Lepsze", "Daha iyi", "Mieux", "Migliore"],
 'За рекламу': ["За рекламу", "For an ad", "Für Werbung", "Por anuncio", "Por anúncio", "Za reklamę", "Reklamla", "Pour une pub", "Con pubblicità"],
}
have = set(keys); out = []
for k, v in T.items():
    if k in have: continue
    keys.append(k); have.add(k); out.append('|'.join([str(len(keys) - 1)] + v))
json.dump(keys, open(KJ, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
with open('tools/i18n/src/tr16.txt', 'a', encoding='utf8') as o:
    for r in out: o.write(r + '\n')
print('added', len(out))
