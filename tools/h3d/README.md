# 3D-герои (правки 102, 104, 107, 101)

Модели из Meshy → скелет и анимации в Meshy → рендер в атласы спрайтов здесь → игра рисует кадры (`src/client/hero3d.ts`).

## Файлы
- `art/h3d/*.glb` — модели. `heracles.glb`, `hestia.glb` — без скелета (Т-поза); `her_act.glb`, `hes_act.glb` — со скелетом и 5 анимациями
  (стойка, атака, удар, смерть, победа); `*_walk.glb`, `*_run.glb` — ходьба и бег; `her_idle.glb` — спокойная стойка Геракла (Idle, Idle_03);
  `club.glb`, `staff.glb` — оружие. Исходные картинки: `*-src.png`, `club.png`, `staff.png`.
- Задачи Meshy: модели 01a1c71f-368a… (Геракл), 01a1c71f-4ca5… (Гестия); скелеты 01a1c721-b561… / 01a1c721-c3c5…;
  анимации 01a1c722-37a1… / 01a1c722-4257… / 01a1c72f-dc1f…; оружие 01a1c725-f893… (дубина), 01a1c725-fca9… (посох).

## Остальные герои (правка 101)
Конвейер на героя (≈35 кредитов): `meshy_image_to_image` (nano-banana-pro) — тот же герой в Т-позе с пустыми руками на белом
→ `meshy_image_to_3d` (meshy-t2.5, smart-topology, 15000, texture meshy-n1, pose t-pose) → `meshy_rig` → `meshy_animate` action_ids [11, 560]
(Idle_02 + Spear_Walk одним файлом) → скачать через встроенный браузер. Оружие: `meshy_text_to_image` (3:4, белый фон, вертикально) → `meshy_image_to_3d` (5000).
Файлы: `art/h3d/<key>_anim.glb` (меш + 2 клипа: 0 Idle_02 1,867 с, 1 Spear_Walk 1,1 с), `art/h3d/wpn_<hero>.glb`, исходники `art/h3d/src101/`, все id задач — `art/h3d/tasks101.json`.
Рендер: `node atlas.mjs "base=<key>_anim&w=wpn_<hero>&wl=1.45&wg=0.38&gp=palm&span=2.05&rz=0&el=40&size=320&wpose=1" out/<key> '[{"key":"idle","ci":0,"mix":[1,0],"n":12,"loop":true},{"key":"walk","ci":1,"n":16,"loop":true}]'`
(у Медузы лук: `wl=1.25&wg=0.5`). Ключи: apo — apollo, bor — skadi (Борей), dem — veles (Деметра), hec — hades (Геката), med — hydra (Медуза), nik — stribog (Ника), zeu — perun (Зевс), pos — poseidon (Посейдон).
Посейдон (pos — poseidon) перерисован с ногами (2D для меню — `art/heroes/poseidon.png`, оружие — трезубец).

## Как забрать файлы анимаций
Песочница не может скачать с assets.meshy.ai, а `meshy_download_model` для скелетов и анимаций отдаёт только ссылки, `meshy_convert` теряет скелет.
Рабочий путь: открыть ссылку во встроенном браузере (`Claude_Browser__preview_start`, ошибка «load failed» — это нормально, файл скачался)
→ в `Загрузках` Серёги появляется `<uuid>.tmp` → `device_stage_files` → проверить `node tools/h3d/inspect.mjs файл` (имена анимаций).

## Рендер (правка 104: только ходьба с оружием и стойка)
```
mkdir /tmp/r3d && cd /tmp/r3d && npm i three@0.170.0 && ln -s /opt/npm-tools/node_modules/playwright* node_modules/
cp <repo>/tools/h3d/*.{html,mjs} . && mkdir m && cp <repo>/art/h3d/*.glb m/ && python3 -m http.server 8765 &
node atlas.mjs "h=her&w=club&wl=0.95&wg=0.25&gp=palm&span=2.05&rz=0&el=40&size=320&extra=her_idle,her_spear&wpose=9" out/her '[{"key":"idle","ci":7,"mix":[9,0],"n":12,"t0":0,"t1":1.3},{"key":"walk","ci":9,"n":16,"loop":true}]'
node atlas.mjs "h=hes&w=staff&wl=1.45&wg=0.38&gp=palm&span=2.05&rz=0&el=40&size=320&extra=hes_spear&wpose=7" out/hes '[{"key":"idle","ci":0,"mix":[7,0],"n":12,"loop":true},{"key":"walk","ci":7,"n":16,"loop":true}]'
cp <repo>/tools/h3d/meta.json out/ && cd <repo> && python3 tools/art/pack_hero3d.py /tmp/r3d/out
```
- `*_spear.glb` — Meshy «Spear Walk» (action 560): идёт, держа оружие вертикально. Оружие крепится к руке в позе первого кадра этой анимации (`wpose` = номер клипа), поэтому стоит ровно, как копьё.
- Хват (правка 107): кость `RightHand` — это запястье, поэтому `gp=palm` ставит хват в центр нарисованной ладони (среднее вершин кожи, которые идут за кистью). `wg` — доля оружия ниже кулака: дубина 0,25 (снизу торчит рукоять), посох 0,38. Пальцев у Meshy нет — кулак не сжимается, но древко проходит сквозь ладонь и читается как хват. Крупный план для проверки: `mixprev.mjs` с `span=0.9&foot=-0.3&el=20`.
- Стойка (`mix`): ноги и таз (позиция) — из спокойной стойки (`ci`), руки и корпус — первый кадр «Spear Walk». Поворот таза берётся из «Spear Walk», иначе стойка смотрит вбок.
- Номера клипов: 0–4 из `*_act.glb`, 5 ходьба, 6 бег, дальше `extra` по порядку (у Геракла her_idle = 7, 8, her_spear = 9; у Гестии hes_spear = 7).
- Атлас пишет и `*.tips.json` — где верх оружия в каждом кадре и направлении (0..1 клетки); из этого рождаются стрелы (`weaponTip3D`).
- Шаг: кадры ходьбы идут по пройденному пути, `stride` в `meta.json` — путь за цикл в высотах клетки (0.66). Полное совпадение ног с землёй — 0.4, но тогда шаги частят в 5 раз быстрее живой ходьбы и выглядит смешно; 0.66 — компромисс.
- Проверки: `stride.mjs` (движение ступней), `yaw.mjs` (куда смотрит корпус), `mixprev.mjs` (кадры с точкой верха оружия).
- GIF из боя: `node tools/shots43.mjs heracles` → `python3 tools/mkgif.py shots/gif-heracles out.gif`.

## В игре
`H3D` в `src/client/hero3dImages.ts` (таблица + точки верха оружия), картинки `assets/h3d/*.webp` (только idle и walk) → `dist/h3d/`.
Бой (`render.ts` `player()` → `drawHero3D`): идёт — ходьба, стоит — стойка лицом к ближайшему врагу (до 480). Атаки, удара, смерти нет.
Стрела рождается у верха посоха/дубины (`weaponTip3D` в `shot()`), там же вспышка цвета стихии.
Экран героя — только 2D (правка 103).
