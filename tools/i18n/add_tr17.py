# правки Ш73–Ш77 (pause, graphics, tasks): new keys → keys.json + src/tr17.txt. Run once, then python3 tools/i18n/build.py
import json
KJ = 'tools/i18n/keys.json'
keys = json.load(open(KJ, encoding='utf8'))
T = {
 'Точно сдаться?': ["Точно здатися?", "Give up for sure?", "Wirklich aufgeben?", "¿Seguro que te rindes?", "Desistir mesmo?", "Na pewno się poddać?", "Gerçekten pes mi?", "Abandonner vraiment ?", "Arrendersi davvero?"],
 'Наград не будет': ["Нагород не буде", "There will be no rewards", "Es gibt keine Belohnungen", "No habrá recompensas", "Não haverá recompensas", "Nie będzie nagród", "Ödül olmayacak", "Aucune récompense", "Nessuna ricompensa"],
 'Нет': ["Ні", "No", "Nein", "No", "Não", "Nie", "Hayır", "Non", "No"],
 'Сдаться': ["Здатися", "Give up", "Aufgeben", "Rendirse", "Desistir", "Poddaj się", "Pes et", "Abandonner", "Arrendersi"],
 'чётко, {} кадров — меньше греется': ["чітко, {} кадрів — менше гріється", "sharp, {} fps — runs cooler", "scharf, {} FPS — wird weniger warm", "nítido, {} fps — se calienta menos", "nítido, {} fps — esquenta menos", "ostro, {} kl./s — mniej się grzeje", "net, {} fps — daha az ısınır", "net, {} ips — chauffe moins", "nitido, {} fps — scalda meno"],
 'Закрыть день ({} очков': ["Закрити день ({} очок", "Complete the day ({} points", "Tag abschließen ({} Punkte", "Completa el día ({} puntos", "Conclua o dia ({} pontos", "Zamknij dzień ({} pkt", "Günü tamamla ({} puan", "Terminer la journée ({} points", "Completa la giornata ({} punti"],
}
have = set(keys); out = []
for k, v in T.items():
    if k in have: continue
    keys.append(k); have.add(k); out.append('|'.join([str(len(keys) - 1)] + v))
json.dump(keys, open(KJ, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
with open('tools/i18n/src/tr17.txt', 'a', encoding='utf8') as o:
    for r in out: o.write(r + '\n')
print('added', len(out))
