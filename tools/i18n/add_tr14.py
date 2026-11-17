# правки Ш44–Ш45 (battle HUD and the pause): new keys → keys.json + src/tr14.txt. Run once, then python3 tools/i18n/build.py
import json
KJ = 'tools/i18n/keys.json'
keys = json.load(open(KJ, encoding='utf8'))
T = {
 'Шаров в залпе': ["Куль у залпі", "Orbs per volley", "Kugeln pro Salve", "Orbes por ráfaga", "Orbes por rajada", "Kul w salwie", "Yaylımdaki küre", "Orbes par salve", "Sfere per raffica"],
 'Урон всех шаров': ["Шкода всіх куль", "Damage of all orbs", "Schaden aller Kugeln", "Daño de todos los orbes", "Dano de todos os orbes", "Obrażenia wszystkich kul", "Tüm kürelerin hasarı", "Dégâts de tous les orbes", "Danni di tutte le sfere"],
 'Свободных мест для шаров': ["Вільних місць для куль", "Free orb slots", "Freie Kugelplätze", "Huecos libres para orbes", "Espaços livres para orbes", "Wolne miejsca na kule", "Boş küre yeri", "Places libres pour orbes", "Posti liberi per sfere"],
}
have = set(keys); out = []
for k, v in T.items():
    if k in have: continue
    keys.append(k); have.add(k); out.append('|'.join([str(len(keys) - 1)] + v))
json.dump(keys, open(KJ, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
with open('tools/i18n/src/tr14.txt', 'a', encoding='utf8') as o:
    for r in out: o.write(r + '\n')
print('added', len(out))
