# Ш106–Ш111: the reroll, the coupon cards, the event window — new keys → keys.json + src/tr21.txt
import json, re
KJ = 'tools/i18n/keys.json'
keys = json.load(open(KJ, encoding='utf8'))
LET = 'A-Za-zА-Яа-яЁёІіЇїЄєÀ-ÿ'
CORE = re.compile(rf'^([^{LET}{{}}\d]*)([\s\S]*?)([^{LET}{{}}\d]*)$')
def key(t):
    b = re.sub(r'\s+', ' ', CORE.match(t).group(2)).strip()
    return re.sub(r'\d+(?:[.,]\d+)?', '{}', b)
T = [
 ('Открыть', ["Відкрити", "Open", "Öffnen", "Abrir", "Abrir", "Otwórz", "Aç", "Ouvrir", "Apri"]),
 ('бесплатно · 2 из 2', ["безкоштовно · {} з {}", "free · {} of {}", "gratis · {} von {}", "gratis · {} de {}", "grátis · {} de {}", "za darmo · {} z {}", "ücretsiz · {}/{}", "gratuit · {} sur {}", "gratis · {} su {}"]),
 ('за рекламу', ["за рекламу", "for an ad", "für Werbung", "por anuncio", "por anúncio", "za reklamę", "reklamla", "contre une pub", "con pubblicità"]),
 ('бесплатно', ["безкоштовно", "free", "gratis", "gratis", "grátis", "za darmo", "ücretsiz", "gratuit", "gratis"]),
 ('нет купонов', ["немає купонів", "no coupons", "keine Coupons", "sin cupones", "sem cupons", "brak kuponów", "kupon yok", "pas de coupons", "nessun coupon"]),
 ('Сундук за рекламу', ["Скриня за рекламу", "Chest for an ad", "Truhe für Werbung", "Cofre por anuncio", "Baú por anúncio", "Skrzynia za reklamę", "Reklamla sandık", "Coffre contre une pub", "Forziere con pubblicità"]),
 ('Сундук рун за рекламу', ["Скриня рун за рекламу", "Rune chest for an ad", "Runentruhe für Werbung", "Cofre de runas por anuncio", "Baú de runas por anúncio", "Skrzynia run za reklamę", "Reklamla rün sandığı", "Coffre de runes contre une pub", "Forziere di rune con pubblicità"]),
 ('Гарантия героя через', ["Гарантія героя через", "Hero guaranteed in", "Held garantiert in", "Héroe garantizado en", "Herói garantido em", "Gwarantowany bohater za", "Garantili kahraman:", "Héros garanti dans", "Eroe garantito tra"]),
 ('вместо ур. 1', ["замість рів. {}", "instead of lv. {}", "statt Stufe {}", "en lugar de nv. {}", "no lugar do nv. {}", "zamiast poz. {}", "sv. {} yerine", "au lieu du niv. {}", "invece del liv. {}"]),
]
have = set(keys); out = []
for ru, v in T:
    k = key(ru)
    if k in have: continue
    keys.append(k); have.add(k); out.append('|'.join([str(len(keys) - 1)] + v))
json.dump(keys, open(KJ, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
with open('tools/i18n/src/tr22.txt', 'a', encoding='utf8') as o:
    for r in out: o.write(r + '\n')
print('added', len(out))
