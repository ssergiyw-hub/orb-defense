# Ш103–Ш105: the «Лес» effects for the ball game, wall health on items, the marble windows — new keys → keys.json + src/tr21.txt
import json, re
KJ = 'tools/i18n/keys.json'
keys = json.load(open(KJ, encoding='utf8'))
LET = 'A-Za-zА-Яа-яЁёІіЇїЄєÀ-ÿ'
CORE = re.compile(rf'^([^{LET}{{}}\d]*)([\s\S]*?)([^{LET}{{}}\d]*)$')
def key(t):
    b = re.sub(r'\s+', ' ', CORE.match(t).group(2)).strip()
    return re.sub(r'\d+(?:[.,]\d+)?', '{}', b)
T = [
 ('Ловкость рук', ["Спритність рук", "Sleight of Hand", "Fingerfertigkeit", "Juego de manos", "Destreza", "Zręczne ręce", "El Çabukluğu", "Tour de main", "Destrezza"]),
 ('обычный шар с шансом 15% пробивает врага насквозь и бьёт ×2', ["звичайна куля з шансом {}% пробиває ворога наскрізь і б'є ×{}", "a normal orb has a {}% chance to pierce the enemy and hit ×{}", "eine normale Kugel durchbohrt den Gegner mit {}% Chance und trifft ×{}", "un orbe normal tiene un {}% de probabilidad de atravesar al enemigo y golpear ×{}", "um orbe normal tem {}% de chance de atravessar o inimigo e acertar ×{}", "zwykła kula z szansą {}% przebija wroga na wylot i bije ×{}", "normal küre %{} şansla düşmanı delip geçer ve ×{} vurur", "un orbe normal a {} % de chances de transpercer l'ennemi et frappe ×{}", "una sfera normale ha il {}% di probabilità di trapassare il nemico e colpisce ×{}"]),
 ('шанс 22%, удар ×3', ["шанс {}%, удар ×{}", "{}% chance, hit ×{}", "{}% Chance, Treffer ×{}", "{}% de probabilidad, golpe ×{}", "{}% de chance, golpe ×{}", "szansa {}%, cios ×{}", "%{} şans, vuruş ×{}", "{} % de chances, coup ×{}", "probabilità {}%, colpo ×{}"]),
 ('раз в 6 ходов — ход неуязвимости: удары по стене и герою не проходят', ["раз на {} ходів — хід невразливості: удари по стіні й герою не проходять", "every {} turns — a turn of immunity: no blows reach the wall or the hero", "alle {} Züge — ein Zug Unverwundbarkeit: kein Treffer erreicht Mauer oder Helden", "cada {} turnos, un turno de inmunidad: ningún golpe alcanza el muro ni al héroe", "a cada {} turnos — um turno de imunidade: nenhum golpe atinge a muralha nem o herói", "co {} tur — tura nietykalności: ciosy nie trafiają w mur ani bohatera", "her {} turda bir dokunulmazlık turu: sura ve kahramana vuruş geçmez", "tous les {} tours, un tour d'immunité : aucun coup n'atteint le mur ni le héros", "ogni {} turni, un turno di immunità: nessun colpo raggiunge le mura o l'eroe"]),
 ('раз в 4 хода', ["раз на {} ходи", "every {} turns", "alle {} Züge", "cada {} turnos", "a cada {} turnos", "co {} tury", "her {} turda", "tous les {} tours", "ogni {} turni"]),
 ('особый шар с шансом 10% вылетает дважды', ["особлива куля з шансом {}% вилітає двічі", "a special orb has a {}% chance to fly twice", "eine Spezialkugel fliegt mit {}% Chance doppelt", "un orbe especial tiene un {}% de probabilidad de salir dos veces", "um orbe especial tem {}% de chance de sair duas vezes", "specjalna kula z szansą {}% wylatuje dwa razy", "özel küre %{} şansla iki kez fırlar", "un orbe spécial a {} % de chances de partir deux fois", "una sfera speciale ha il {}% di probabilità di partire due volte"]),
 ('шанс 18%', ["шанс {}%", "{}% chance", "{}% Chance", "{}% de probabilidad", "{}% de chance", "szansa {}%", "%{} şans", "{} % de chances", "probabilità {}%"]),
 ('стена чинится на 1,5% за ход', ["стіна лагодиться на {}% за хід", "the wall repairs {}% each turn", "die Mauer repariert sich um {}% pro Zug", "el muro se repara un {}% por turno", "a muralha se repara {}% por turno", "mur naprawia się o {}% na turę", "sur her tur %{} onarılır", "le mur se répare de {} % par tour", "le mura si riparano del {}% a turno"]),
 ('на 3% за ход', ["на {}% за хід", "{}% each turn", "um {}% pro Zug", "un {}% por turno", "{}% por turno", "o {}% na turę", "tur başına %{}", "de {} % par tour", "del {}% a turno"]),
 ('павшая стена поднимается с 30% здоровья — раз за бой', ["зруйнована стіна піднімається з {}% здоров'я — раз за бій", "a fallen wall rises with {}% health — once a battle", "eine gefallene Mauer erhebt sich mit {}% Leben — einmal pro Kampf", "un muro caído se levanta con un {}% de vida, una vez por batalla", "uma muralha caída se ergue com {}% de vida — uma vez por batalha", "upadły mur podnosi się z {}% zdrowia — raz na bitwę", "yıkılan sur %{} canla yeniden yükselir — savaşta bir kez", "un mur tombé se relève avec {} % de vie, une fois par combat", "le mura cadute si rialzano con il {}% di vita, una volta per battaglia"]),
 ('с 40% здоровья, дважды за бой', ["з {}% здоров'я, двічі за бій", "with {}% health, twice a battle", "mit {}% Leben, zweimal pro Kampf", "con un {}% de vida, dos veces por batalla", "com {}% de vida, duas vezes por batalha", "z {}% zdrowia, dwa razy na bitwę", "%{} canla, savaşta iki kez", "avec {} % de vie, deux fois par combat", "con il {}% di vita, due volte per battaglia"]),
 ('удар врага с шансом 12% промахивается', ["удар ворога з шансом {}% промахується", "an enemy blow has a {}% chance to miss", "ein gegnerischer Treffer verfehlt mit {}% Chance", "un golpe enemigo tiene un {}% de probabilidad de fallar", "um golpe inimigo tem {}% de chance de errar", "cios wroga z szansą {}% chybia", "düşman vuruşu %{} şansla ıskalar", "un coup ennemi a {} % de chances de rater", "un colpo nemico ha il {}% di probabilità di mancare"]),
 ('+10% здоровья стены', ["{}% здоров'я стіни", "{}% wall health", "{}% Mauerleben", "{}% de vida del muro", "{}% de vida da muralha", "{}% zdrowia muru", "%{} sur canı", "{} % de vie du mur", "{}% vita delle mura"]),
 ('здоровье стены +144', ["здоров'я стіни +{}", "wall health +{}", "Mauerleben +{}", "vida del muro +{}", "vida da muralha +{}", "zdrowie muru +{}", "sur canı +{}", "vie du mur +{}", "vita delle mura +{}"]),
 ('стена 1200', ["стіна {}", "wall {}", "Mauer {}", "muro {}", "muralha {}", "mur {}", "sur {}", "mur {}", "mura {}"]),
 ('промах', ["промах", "miss", "verfehlt", "fallo", "errou", "pudło", "ıska", "raté", "mancato"]),
 ('Второе дыхание — стена поднялась!', ["Друге дихання — стіна піднялася", "Second Wind — the wall rises again", "Zweiter Atem — die Mauer erhebt sich", "Segundo aliento: el muro se levanta", "Segundo fôlego — a muralha se ergueu", "Drugi oddech — mur się podniósł", "İkinci Nefes — sur yeniden yükseldi", "Second souffle : le mur se relève", "Secondo respiro: le mura si rialzano"]),
]
have = set(keys); out = []
for ru, v in T:
    k = key(ru)
    if k in have: continue
    keys.append(k); have.add(k); out.append('|'.join([str(len(keys) - 1)] + v))
json.dump(keys, open(KJ, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
with open('tools/i18n/src/tr21.txt', 'a', encoding='utf8') as o:
    for r in out: o.write(r + '\n')
print('added', len(out))
