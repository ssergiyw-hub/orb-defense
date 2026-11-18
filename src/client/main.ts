// Client: hub ⇄ battle. Input, game loop and battle HUD live here; the match itself is core/sim.ts.
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import * as sfx from './sfx';
import { Match, Input, DT, replay, MatchConfig, isBoss, RunMods } from '../core/sim';
import { ELEMENT_NAME, RUN, SKILLS, SkillId, WALL, WALL_MAPS, ENEMIES, EventId, EVENT, BOSS_EV } from '../core/content';
import { Renderer, preloadWall, evPic, preloadFloors } from './render';
import { preloadBear, releaseBear } from './bear3d';
import { startI18n, lang, tr } from './i18n';
import { dmgTable, wallTable, dmgDetails } from './stats';
import { ICONS } from './iconImages';
import { preload3D } from './hero3d';
import { Hub, EL_HEX, SKILL_ICON, skillPic, resImg } from './hub';
import * as P from '../meta/profile';
import * as cloud from './cloud';
import { heroPic, loadHeroImgs } from './art';
import { GEM_IMG } from './gemImages';
import { HEROES } from '../core/content';
import { OrbBattle } from './orbBattle';
import { Orb, OrbConfig, Act } from '../core/orb';
import * as OM from '../meta/orbMeta';
import { BALLS } from '../core/orbContent';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>('game');
const renderer = new Renderer(canvas);
const resize = () => renderer.resize();
window.addEventListener('resize', resize);
resize();

const SHORT: Partial<Record<SkillId, string>> = {
  arrow: 'Стрела', multi: 'Мультистрела', double: 'Очередь', fireball: 'Огн. шар', iceShards: 'Осколки', lightBeam: 'Луч',
  darkOrbs: 'Сферы', chain: 'Молния', waterJet: 'Струя', wind: 'Ветер', poisonFlask: 'Склянка', poisonAura: 'Яд. аура', natureAura: 'Аура', fireOrbs: 'Огн. сферы', iceOrbs: 'Лед. сферы', boltOrbs: 'Молн. сферы', meteor: 'Метеоры', sprites: 'Духи', pDmg: 'Урон', pHp: 'Здоровье',
  pDef: 'Защита', pSpeed: 'Скорость', pPickup: 'Подбор', pXp: 'Опыт', pVamp: 'Вампиризм', pGold: 'Награды',
};
if (location.hash.includes('stress')) (RUN as { baseEnemies: number }).baseEnemies = 200; // perf test: #stress

// ---------------- input ----------------
const keys = new Set<string>();
window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.key === ' ') togglePause(); });
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
const joy = { id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
const joyBase = $('joyBase'), joyKnob = $('joyKnob');
const JOY_R = 55;
canvas.addEventListener('pointerdown', e => {
  if (joy.id !== -1 || !m) return;
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
  canvas.setPointerCapture(e.pointerId);
  joyBase.style.display = joyKnob.style.display = 'block';
  joyBase.style.left = joy.ox + 'px'; joyBase.style.top = joy.oy + 'px';
  joyKnob.style.left = joy.ox + 'px'; joyKnob.style.top = joy.oy + 'px';
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const l = Math.hypot(dx, dy);
  if (l > JOY_R) { // the base follows the finger, so turning back is instant
    dx *= JOY_R / l; dy *= JOY_R / l; joy.ox = e.clientX - dx; joy.oy = e.clientY - dy;
    joyBase.style.left = joy.ox + 'px'; joyBase.style.top = joy.oy + 'px';
  }
  joy.dx = dx / JOY_R; joy.dy = dy / JOY_R;
  joyKnob.style.left = joy.ox + dx + 'px'; joyKnob.style.top = joy.oy + dy + 'px';
});
const joyEnd = (e: PointerEvent) => {
  if (e.pointerId !== joy.id) return;
  joy.id = -1; joy.dx = joy.dy = 0;
  joyBase.style.display = joyKnob.style.display = 'none';
};
canvas.addEventListener('pointerup', joyEnd);
canvas.addEventListener('pointercancel', joyEnd);

function readInput(): Input {
  // joystick is "digital": any clear push means full speed (half-pushed finger used to feel like mud)
  let mx = 0, my = 0;
  const jl = Math.hypot(joy.dx, joy.dy);
  if (jl > 10 / JOY_R) { mx = joy.dx / jl; my = joy.dy / jl; }
  if (keys.has('a') || keys.has('arrowleft') || keys.has('ф')) mx -= 1;
  if (keys.has('d') || keys.has('arrowright') || keys.has('в')) mx += 1;
  if (keys.has('w') || keys.has('arrowup') || keys.has('ц')) my -= 1;
  if (keys.has('s') || keys.has('arrowdown') || keys.has('ы')) my += 1;
  if (m?.wall) { // правка 112: on the wall the hero only walks left and right — any clear sideways push is full speed
    my = 0; mx = Math.abs(joy.dx) > 8 / JOY_R ? Math.sign(joy.dx) : Math.sign(mx);
    return { mx: Math.round(mx * 100), my: 0, choice: -1, reroll: false };
  }
  const l = Math.hypot(mx, my);
  if (l > 1) { mx /= l; my /= l; }
  return { mx: Math.round(mx * 100), my: Math.round(my * 100), choice: -1, reroll: false };
}

// ---------------- hub ----------------
const hub = new Hub($('ui'), (map, _mods, heroId) => startOrbBattle(map, heroId));
void startBattle;
startI18n(); // правка 121: translate the page into the chosen language
(window as unknown as { __hub: Hub }).__hub = hub; // screenshot scripts open windows directly

// ---------------- boot screen: prepare pictures while the title shows ----------------
const TIPS = [
  'Шары отскакивают от стен поля — бей за спину врагам',
  'Враги у стены бьют её каждый ход — добивай их первыми',
  'Карты шаров падают за этапы — улучшай книги на вкладке «Шары»',
  'Сундук накопления копит золото, пока тебя нет',
  'Гемы в снаряжении усиливают стихии — синтезируй их в ювелирной',
  'Задания дня дают очки батл пасса',
];
// правка 170: искры над порталом и чашами огня, пока виден экран входа
function bootSparks(cv: HTMLCanvasElement): () => void {
  const g = cv.getContext('2d'); if (!g) return () => {};
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, run = true, last = performance.now();
  const fit = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
  fit();
  type Sp = { x: number; y: number; vx: number; vy: number; life: number; age: number; r: number; c: string };
  const sp: Sp[] = [];
  // sources in screen share: portal centre and the two braziers (the scene keeps 768:1376 and covers the screen)
  const src = () => {
    const sw = Math.max(W, H * 0.558), sh = sw / 0.558, ox = (W - sw) / 2, oy = (H - sh) / 2;
    const at = (x: number, y: number) => [ox + x * sw, oy + y * sh];
    return { portal: at(0.5, 0.52), fl: at(0.14, 0.575), fr: at(0.86, 0.575), sw };
  };
  const spawn = () => {
    const s = src(), r = Math.random();
    if (r < 0.55) { const [x, y] = s.portal; sp.push({ x: x + (Math.random() - 0.5) * s.sw * 0.3, y: y + (Math.random() - 0.3) * s.sw * 0.25, vx: (Math.random() - 0.5) * 14, vy: -18 - Math.random() * 30, life: 2 + Math.random() * 2, age: 0, r: 0.8 + Math.random() * 1.6, c: Math.random() < 0.7 ? '150,230,255' : '255,255,255' }); }
    else { const [x, y] = r < 0.78 ? s.fl : s.fr; sp.push({ x: x + (Math.random() - 0.5) * s.sw * 0.05, y, vx: (Math.random() - 0.5) * 18, vy: -30 - Math.random() * 40, life: 1 + Math.random() * 1.4, age: 0, r: 0.7 + Math.random() * 1.3, c: Math.random() < 0.5 ? '255,200,90' : '255,140,40' }); }
  };
  const frame = (now: number) => {
    if (!run) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (cv.clientWidth !== W || cv.clientHeight !== H) fit();
    for (let i = 0; i < 3; i++) if (sp.length < 90 && Math.random() < 0.8) spawn();
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (let i = sp.length - 1; i >= 0; i--) {
      const p = sp[i]; p.age += dt; if (p.age >= p.life) { sp.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin((p.age + i) * 3) * 6) * dt; p.y += p.vy * dt;
      const k = p.age / p.life, a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      g.fillStyle = `rgba(${p.c},${(a * 0.9).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r * 2.2, 0, 6.283); g.fill();
      g.fillStyle = `rgba(255,255,255,${(a * 0.8).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r * 0.7, 0, 6.283); g.fill();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return () => { run = false; };
}
function boot(): void {
  { const t: Record<string, [string, string]> = { ru: ['Защита шарами', 'Олимп'], uk: ['Захист кулями', 'Олімп'] }; const n = t[lang]; if (n) $('bootLogo').innerHTML = `<b>${n[0]}</b><span>${n[1]}</span>`; } // Orb Defense: название на языке игры
  const stopSparks = bootSparks($('bootFx') as HTMLCanvasElement);
  preloadFloors(); // правка 167
  const jobs: (() => void)[] = [];
  let imgsReady = false; void loadHeroImgs().then(() => { imgsReady = true; });
  for (const h of HEROES) for (const [mode, px] of [['face', 120], ['full', 256], ['full', 236], ['full', 220], ['full', 180]] as const) jobs.push(() => { heroPic(h.id, h.element, mode, px); });
  for (const set of Object.values(GEM_IMG)) for (const src of set) jobs.push(() => { const i = new Image(); i.src = src; void i.decode?.().catch(() => {}); });
  const total = jobs.length, t0 = performance.now(), minMs = 3200; // правка 170: экран входа виден хотя бы ~3 с
  $('bootTip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  let tipT = t0;
  // Б2: the game needs the server — the profile comes from it before the Portal opens
  let net: 'wait' | 'ok' | 'fail' = cloud.online ? 'wait' : 'ok';
  const connect = () => {
    net = 'wait'; $('bootNet').hidden = true; $('bootPct').hidden = false;
    cloud.boot().then(() => { net = 'ok'; hub.reloadProfile(); }, e => { console.warn('server:', e); net = 'fail'; });
  };
  if (cloud.online) connect();
  $('bootRetry').onclick = () => { connect(); requestAnimationFrame(stepBoot); };
  const stepBoot = () => {
    const until = performance.now() + 12;
    while (imgsReady && jobs.length && performance.now() < until) jobs.shift()!();
    const now = performance.now();
    const share = Math.min((total - jobs.length) / total, (now - t0) / minMs);
    $('bootFill').style.width = (100 * share).toFixed(0) + '%';
    $('bootPct').textContent = `Загрузка… ${Math.round(100 * share)}%`;
    if (now - tipT > 1400) { tipT = now; $('bootTip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)]; }
    if (share < 1) { requestAnimationFrame(stepBoot); return; }
    if (net === 'wait') { $('bootPct').textContent = 'Подключение к серверу…'; requestAnimationFrame(stepBoot); return; }
    if (net === 'fail') { $('bootPct').hidden = true; $('bootNet').hidden = false; return; }
    if (P.loadBroken()) { // правка 191: the save cannot be read — no new account over it
      $('bootPct').hidden = true; $('bootNet').hidden = false;
      $('bootNet').querySelector('b')!.textContent = 'Сохранение не читается'; $('bootNet').querySelector('span')!.textContent = 'Прогресс не удалён. Попробуй ещё раз';
      $('bootRetry').onclick = () => { if (cloud.online) connect(); else hub.reloadProfile(); requestAnimationFrame(stepBoot); };
      return;
    }
    hub.show(hub.p ? 'hub' : 'start');
    const b = $('boot'); b.classList.add('out'); setTimeout(() => { stopSparks(); b.remove(); }, 500);
  };
  requestAnimationFrame(stepBoot);
}
boot();

// ---------------- match ----------------
let m: Match | null = null;
let cfg: MatchConfig | null = null;
let log: Input[] = [];
let acc = 0, last = 0, speed = 1, paused = false;
let pendingChoice = -1, pendingReroll = false;
let fxAtk = 0, fxHp = 0; // правка 159: what the sounds and the buzz compare with
let shownCards = '';
let frames = 0, fpsT = 0;
let finished = false;
cloud.setHold(() => !!m && !finished); // правка 181: no restart in the middle of a fight
P.allowPayTest(location.hash.includes('debug')); // правка 195: «Тест: покупки» only in the #debug mode

// ---------------- правка 164: обучение в первых боях ----------------
let tut: { step: number; waitMove: boolean; shown: Set<string>; tipT: number } | null = null;
function tutTip(key: string, text: string): void {
  if (!tut || tut.shown.has(key)) return;
  tut.shown.add(key);
  const el = $('tutTip'); el.textContent = tr(text); el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  tut.tipT = 5;
}
function tutFrame(dt: number): void {
  if (!tut || !m) return;
  if (tut.tipT > 0) { tut.tipT -= dt; if (tut.tipT <= 0) $('tutTip').hidden = true; }
  if (tut.waitMove || m.phase !== 'play') return;
  if (m.time > 4) tutTip('xp', 'Собирай кристаллы опыта — с каждым новым уровнем выбираешь навык');
  if (m.miniboss && m.miniboss.hp > 0) tutTip('mini', 'Минибосс бьёт больно — не стой на месте, води его по кругу');
  if (m.hp < 0.35 * m.maxHp && m.time > 8) tutTip('hp', 'Мало здоровья — уходи от толпы, пусть враги догоняют по одному');
}
function startBattle(map: number, mods: RunMods, heroId: string, wallMap?: number, ev?: EventId): void {
  $('fps').hidden = !hub.p?.fps; // правка 163: только если включён в Настройках
  preload3D(heroId);
  cfg = { seed: (Math.random() * 2 ** 31) >>> 0, heroId, map, mods, god: location.hash.includes('god') };
  if (ev) { cfg.mode = ev; cfg.wallMap = wallMap ?? 0; evPic(WALL_MAPS[cfg.wallMap].id); evPic('brazier'); if (ev === 'boss') preloadBear(); } // правки 125, 126
  else if (wallMap !== undefined) { cfg.mode = 'wall'; cfg.wallMap = wallMap; preloadWall(wallMap); }
  m = new Match(cfg);
  if (location.hash.includes('auratest')) for (const k of ['natureAura', 'poisonAura'] as SkillId[]) m.skills.set(k, 3);
  { const e = /edge(\d+),(\d+)/.exec(location.hash); if (e) { m.x = m.px = +e[1]; m.y = m.py = +e[2]; } } // look check only: start near a wall
  { const wv = /wv(\d+)/.exec(location.hash); if (wv && m.wall) m.wave = +wv[1] - 1; } // look check only: start the wall at wave N
  if (location.hash.includes('winnow') && wallMap === undefined && !ev) { const mm = m; setTimeout(() => { if (m === mm && m.phase === 'play') { (m as { phase: string }).phase = 'win'; setTimeout(finish, 300); } }, 1200); } // look check only: the result window of a won stage
  if (location.hash.includes('multitest')) m.skills.set('multi' as SkillId, 2); // look check only (правка 175): replay will not match
  if (location.hash.includes('skilltest')) for (const k of ['darkOrbs', 'fireOrbs', 'iceOrbs', 'boltOrbs', 'boomerang', 'fireball'] as SkillId[]) m.skills.set(k, 3); // look check only: replay will not match
  log = [];
  acc = 0; speed = 1; paused = false; quitted = false; pendingChoice = -1; pendingReroll = false; shownCards = ''; finished = false;
  fxAtk = m.atkCount; fxHp = m.hp;
  $('speedBtn').textContent = '×1'; $('pauseBtn').textContent = 'II';
  lastLvl = 1; lastGold = lastScroll = -1;
  $('hud').hidden = false; $('cards').hidden = true; $('dmgWin').hidden = true;
  hudCache.clear(); hudT = 1; wakeLoop();
  const g = P.GFX[hub.p?.gfx ?? 'mid']; fpsCap = g.fps; if (renderer.dprCap !== g.dpr) { renderer.dprCap = g.dpr; renderer.resize(); }
  $('hud').classList.toggle('wallmode', m.wall); $('wallHud').hidden = !m.wall && !m.ev; ($('wallBar') as HTMLElement).style.display = m.wall ? '' : 'none'; wallLag = 1;
  if (m.wmap) {
    const w = m.wmap, ic = (e: string) => `<img src="${ICONS['e_' + e]}" alt="">`;
    $('wallEl').innerHTML = `<span class="we up">${ic(w.strong)}${ELEMENT_NAME[w.strong]} +50%</span><span class="we dn">${ic(w.weak)}${ELEMENT_NAME[w.weak]} −50%</span>`;
    banner(m.ev === 'boss' ? `${w.name}. Убийство босса: 3 минуты` : m.ev === 'frags' ? `${w.name}. Фраги: 5 минут` : `${w.name}. Защити стену: ${WALL.waves} волн`);
  } else banner(`${m.biome.name} · карта ${map}. Продержись 6 минут`);
  // правка 164: подсказки — только в обычных боях, в первых трёх; в самом первом бой ждёт, пока игрок сдвинет героя
  const step = hub.p && !m.wall && !m.ev ? P.tutStep(hub.p) : P.TUT_BATTLES;
  tut = step < P.TUT_BATTLES ? { step, waitMove: step === 0, shown: new Set(), tipT: 0 } : null;
  $('tutMove').hidden = !tut?.waitMove; $('tutTip').hidden = true; $('cardTip').hidden = true;
}
$('speedBtn').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('speedBtn').textContent = '×' + speed; };
$('pauseBtn').onclick = () => togglePause();
// правка 158: the phone's «Back»: in a fight — the damage table closes, else pause / go on; outside — the hub decides
function onBack(): void {
  if (m && !finished) { if (!$('dmgWin').hidden) { $('dmgWin').hidden = true; return; } togglePause(); return; }
  hub.back();
}
if (Capacitor.isNativePlatform()) void App.addListener('backButton', onBack);
if (location.hash.includes('backtest')) (window as unknown as { __back: () => void }).__back = onBack; // look check only: tools/sh158.mjs
$('resumeBtn').onclick = () => togglePause();
$('quitBtn').onclick = () => { if (m && paused) { m.hp = 0; m.phase = 'lose'; paused = false; quitted = true; finish(); } };
/** the player gave up: the replay applies the same surrender before comparing */
let quitted = false;
function togglePause(): void {
  if (!m) return; paused = !paused;
  $('pauseBtn').textContent = paused ? '▶' : 'II';
  $('pauseMenu').hidden = !paused;
  if (!paused) $('dmgWin').hidden = true;
}
// правка 114: damage by skill (and, on the wall, damage the wall took by monster)
let dmgTab: 'skills' | 'wall' = 'skills';
function showDmg(): void {
  if (!m) return;
  $('dmgWin').hidden = false;
  $('dmgTabs').innerHTML = m.wall ? `<button class="${dmgTab === 'skills' ? 'on' : ''}" data-t="skills">По навыкам</button><button class="${dmgTab === 'wall' ? 'on' : ''}" data-t="wall">По стене</button>` : '';
  $('dmgTitle').textContent = dmgTab === 'wall' && m.wall ? 'Урон по стене' : 'Урон по навыкам';
  $('dmgBody').innerHTML = dmgTab === 'wall' && m.wall ? wallTable(m) : dmgTable(m);
}
$('dmgBtn').onclick = () => { dmgTab = 'skills'; showDmg(); };
$('dmgClose').onclick = () => { $('dmgWin').hidden = true; };
$('dmgTabs').onclick = e => { const t = (e.target as HTMLElement).closest('[data-t]') as HTMLElement | null; if (t) { dmgTab = t.dataset.t as 'skills' | 'wall'; showDmg(); } };

let bannerT = 0;
function banner(s: string): void { const b = $('banner'); b.textContent = s; b.hidden = false; bannerT = 3; }

function showCards(): void {
  if (!m) return;
  const key = m.cards.map(c => c.id + c.level + (c.ultElem ?? '')).join(',') + m.rerollsUsed + m.freeRerolls;
  if (key === shownCards) return;
  if (!shownCards && tut && !tut.shown.has('card')) { tut.shown.add('card'); const ct = $('cardTip'); ct.textContent = tr(tut.step === 0 ? 'Навык работает до конца забега. Бери то, что усиливает твою стихию' : 'Уже взятые атакующие навыки выпадают чаще — прокачивай их'); ct.hidden = false; } // правка 164
  if (!shownCards) sfx.vibrate('level'); // правка 159: a new level — a buzz (правка 160: no sound when the cards come up)
  shownCards = key;
  const box = $('cardList');
  box.innerHTML = '';
  m.cards.forEach((c, i) => {
    const d = document.createElement('button');
    const def = c.id === 'ult' ? null : SKILLS[c.id as SkillId];
    const el = c.id === 'ult' ? c.ultElem : def!.kind === 'arrow' ? m!.hero.element : def!.element;
    const tag = c.id === 'ult' ? 'ультимейт' : def!.kind === 'passive' ? 'пассивный' : def!.kind === 'arrow' ? 'стрела' : ELEMENT_NAME[def!.element!];
    d.className = 'sk' + (c.id === 'ult' ? ' ult' : '') + (el ? '' : ' passive');
    if (el && c.id !== 'ult') d.style.setProperty('--c', EL_HEX[el]);
    if (m!.wall && (c.id === 'natureAura' || c.id === 'poisonAura')) c.desc = c.id === 'natureAura' ? 'Зелёная полоса перед стеной ранит всех врагов в ней' : 'Ядовитая полоса перед стеной, яд накапливается';
    const wm = m!.wmap, mark = wm && el && c.id !== 'ult' && def?.kind !== 'passive' ? (el === wm.strong ? '<b class="emark up">+50%</b>' : el === wm.weak ? '<b class="emark dn">−50%</b>' : '') : '';
    const lv = def ? `<span class="pips">${Array.from({ length: def.max }, (_, k) => `<i class="${k < c.level - 1 ? 'on' : k === c.level - 1 ? 'on nw' : ''}"></i>`).join('')}</span>` : '';
    d.innerHTML = `<div class="skin">${mark}<div class="skh">${c.title}</div><span class="ski">${skillPic(c.id) ?? SKILL_ICON[c.id]}</span><small class="skt">${tag}</small><span class="skd">${c.desc}</span>${lv}</div>`;
    d.onclick = () => { pendingChoice = i; };
    box.appendChild(d);
  });
  const cost = m.rerollCost();
  $('rerollInfo').textContent = cost === 0 ? `Обновлений: ${m.freeRerolls}` : `за ${cost}💎`;
  $('upgCount').textContent = m.wall ? `Волна ${m.wave} отбита! Улучшение ${m.upgrades + 1} из ${m.maxUpgrades()}` : `Улучшение ${m.upgrades + 1} из ${m.maxUpgrades()}`;
  $('cards').querySelector('.ribbon span')!.textContent = m.wall ? 'Волна отбита' : m.ev === 'boss' ? 'Навык' : 'Новый уровень';
  $('cards').hidden = false;
}
let rerollSure = 0;
$('rerollBtn').onclick = () => {
  if (!m) return;
  const cost = m.rerollCost();
  if (cost > 0 && hub.p) {
    if (hub.p.crystals < cost) { banner(`Нужно ${cost}💎`); return; }
    // 79: a second tap confirms a crystal reroll (can be turned off in the settings)
    if (!hub.p.noConfirm && Date.now() - rerollSure > 3000) {
      rerollSure = Date.now(); $('rerollInfo').textContent = `Потратить ${cost}💎? Нажми ещё раз`; $('rerollBtn').classList.add('sure');
      return;
    }
    rerollSure = 0; $('rerollBtn').classList.remove('sure');
    hub.p.crystals -= cost; P.save(hub.p);
  }
  pendingReroll = true;
};

function fmt(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const COIN_IC = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f7c531" stroke="#a8740a" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#c98f12" stroke-width="1.6"/></svg>';
let lastLvl = 1, lastGold = -1, lastScroll = -1;
/** what the run has earned so far, the same formula the reward screen uses */
function runLoot(mm: Match, map: number): { gold: number; scrolls: number } {
  const mul = mm.rewardMul();
  if (mm.ev) return { gold: Math.round((mm.ev === 'frags' ? mm.kills * 0.6 : mm.score() / 400) * mul), scrolls: 0 }; // правки 125, 126 (as P.finishEvent)
  if (mm.wall) { let g = 0; for (let i = 1; i <= mm.wavesCleared; i++) g += P.wallWaveGold(i); return { gold: Math.round((g + mm.kills * 0.3) * mul), scrolls: Math.round(Math.floor(mm.wavesCleared / 5) * 2 * mul) }; }
  const gold = Math.round(((200 + 25 * map) * Math.min(1, mm.time / RUN.duration) + mm.kills * 0.3 + mm.gold) * mul);
  const scrolls = Math.round((mm.chests.filter(c => c === 'Малый сундук').length) * mul);
  return { gold, scrolls };
}
function bump(id: string): void { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

let wallLag = 1;
// правка 120: the HUD writes into the page only what changed (each write makes the phone recompute and repaint the page)
const hudCache = new Map<string, string>();
function setT(id: string, v: string): void { if (hudCache.get(id) !== v) { hudCache.set(id, v); $(id).textContent = v; } }
function setH(id: string, v: string): void { const k = id + '#h'; if (hudCache.get(k) !== v) { hudCache.set(k, v); $(id).innerHTML = v; } }
function setW(id: string, pct: number): void { const v = (Math.round(pct * 2) / 2).toFixed(1) + '%', k = id + '#w'; if (hudCache.get(k) !== v) { hudCache.set(k, v); ($(id) as HTMLElement).style.width = v; } }
function setC(id: string, v: string): void { const k = id + '#c'; if (hudCache.get(k) !== v) { hudCache.set(k, v); $(id).className = v; } }
function setHid(id: string, v: boolean): void { const k = id + '#v'; const s = v ? '1' : '0'; if (hudCache.get(k) !== s) { hudCache.set(k, s); $(id).hidden = v; } }
function hud(): void {
  if (!m) return;
  if (m.wall) {
    setT('timer', m.wave === 0 || m.waveT > 0 ? `${m.wave}/${WALL.waves} · ${Math.ceil(m.waveT)}` : `${m.wave}/${WALL.waves}`);
    const f = Math.max(0, m.wallHp / m.wallMax);
    wallLag = wallLag > f ? Math.max(f, wallLag - 0.004) : f;
    setW('wallFill', 100 * f); setW('wallLag', 100 * wallLag);
    setC('wallFill', f > 0.5 ? '' : f > 0.25 ? 'mid' : 'low');
    setT('wallText', `Стена ${Math.ceil(m.wallHp)}/${Math.round(m.wallMax)}`);
  } else if (m.ev) setT('timer', m.ev === 'frags' && m.wave > 0 ? `${fmt(m.timeLimit() - m.time)} · ${m.wave}` : fmt(m.timeLimit() - m.time));
  else setT('timer', m.bossSpawned ? 'БОСС' : fmt(RUN.duration - m.time));
  setT('lvl', String(m.ev === 'boss' ? m.upgrades : m.level));
  if (m.level !== lastLvl) { lastLvl = m.level; const l = $('lvl'), x = $('xpbar'); l.classList.remove('up'); x.classList.remove('flash'); void l.offsetWidth; l.classList.add('up'); x.classList.add('flash'); }
  setT('kills', m.ev === 'boss' ? `⚔ ${fmtN(m.score())}` : `☠ ${m.kills}`);
  const maxed = m.upgrades >= m.maxUpgrades();
  if (m.ev === 'boss') { // правка 125: no xp at the bear — the bar counts down to the next skill card
    setW('xpFill', maxed ? 100 : 100 * (1 - Math.max(0, m.cardT) / BOSS_EV.cardEvery));
    setT('xpText', maxed ? 'макс.' : `${Math.ceil(Math.max(0, m.cardT))} с`);
  } else {
  setW('xpFill', maxed ? 100 : 100 * m.xp / m.xpNext);
  setT('xpText', maxed ? 'макс.' : `${Math.floor(m.xp)}/${m.xpNext}`);
  }
  const lt = runLoot(m, cfg!.map);
  if (lt.gold !== lastGold) { if (lastGold >= 0 && lt.gold - lastGold >= 5) bump('lootGold'); lastGold = lt.gold; $('lootGold').innerHTML = COIN_IC + lt.gold; }
  if (lt.scrolls !== lastScroll) { if (lastScroll >= 0) bump('lootScroll'); lastScroll = lt.scrolls; $('lootScroll').innerHTML = `${resImg('scrolls')} ${lt.scrolls}`; }
  const b = m.enemies.find(e => isBoss(e.kind) && e.hp > 0);
  if (b && b.kind === 'bear') { // правка 125: the bear does not die — the bar shows the time left
    setHid('bossBar', false);
    setT('bossName', `${ENEMIES.bear.name}${m.rage ? ' · ярость ' + m.rage : ''}`);
    setW('bossFill', 100 * Math.max(0, 1 - m.time / m.timeLimit()));
  } else if (b) {
    setHid('bossBar', false);
    setT('bossName', b.kind === 'boss' ? 'Босс карты' : b.kind === 'goldboss' ? `Золотой минибосс · ${Math.ceil(b.life)} с` : b.kind === 'miniboss' ? 'Минибосс' : ENEMIES[b.kind].name);
    setW('bossFill', 100 * b.hp / b.maxHp);
  } else setHid('bossBar', true);
  const sk = [...m.skills.entries()].filter(([, l]) => l > 0).map(([id, l]) => {
    const el = SKILLS[id].element ?? (SKILLS[id].kind === 'arrow' ? m!.hero.element : null);
    return `<i style="--c:${el ? EL_HEX[el] : '#aaa'}">${skillPic(id, 'hsk') ?? SKILL_ICON[id]} ${SHORT[id] ?? SKILLS[id].name} ${l}</i>`;
  });
  if (m.ult) sk.unshift(`<i class="ult">${skillPic('ult', 'hsk')} ${ELEMENT_NAME[m.ult]}</i>`);
  setH('skills', sk.join(''));
}

const fmtN = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.floor(n / 1000) + 'k' : String(Math.floor(n));
function finish(): void {
  if (!m || !cfg || finished) return;
  finished = true;
  $('hud').hidden = true; $('cards').hidden = true; $('pauseMenu').hidden = true;
  if (tut && hub.p) { hub.p.tut = tut.step + 1; } // правка 164: сохраняется вместе с итогами боя
  tut = null; $('tutMove').hidden = true; $('tutTip').hidden = true;
  const win = m.phase === 'win';
  const done = m;
  // правка 182: the whole fight used to be played again here (seconds of a frozen screen on a phone) just for this mark;
  // the server replays the record itself, so the phone does it only in the #debug mode
  let ok = true;
  if (location.hash.includes('debug')) { const r = replay(cfg, log); if (quitted) { r.hp = 0; r.phase = 'lose'; } ok = r.hash() === m.hash(); }
  // run stats on one stone plate (правка 87)
  const st = (k: string, v: string) => `<span><small>${k}</small><b>${v}</b></span>`;
  const note = `<div class="rstats">${m.wall ? st('Волна', `${m.wavesCleared}/${WALL.waves}`) : m.ev === 'frags' ? st('Волна', String(m.wave)) : ''}${st('Время', fmt(m.time))}${m.ev === 'boss' ? st('Урон', fmtN(m.score())) : st('Убито', String(m.kills))}${st('Улучшений', `${m.upgrades}/${m.maxUpgrades()}`)}${location.hash.includes('debug') ? st('Запись', ok ? '<i class="okc">✓</i>' : '<i class="bad">✗</i>') : ''}</div>` + dmgDetails(m);
  m = null;
  if (done.ev === 'boss') releaseBear(); // правка 192
  hub.show('hub');
  if (done.ev && hub.p) { // правки 125, 126: event result — score, best of the day, place in the group
    const before = hub.snap(), ev = done.ev;
    const rw = P.finishEvent(hub.p, ev, done, cfg, log, ok, quitted); P.save(hub.p);
    const head = ev === 'boss' ? `Урон: ${fmtN(rw.score)}` : `Убийств: ${rw.score}`;
    const extra = [rw.record ? 'Лучший результат дня!' : '', `Место: ${rw.place} из ${EVENT.group}`].filter(Boolean).join(' · ');
    hub.showReward(head, hub.diff(before), `<div class="rextra wallmap">${ev === 'boss' ? 'Убийство босса' : 'Фраги'} · ${WALL_MAPS[cfg.wallMap ?? 0].name}</div>` + note + `<div class="rextra">${extra}</div>`);
    return;
  }
  if (done.wall && hub.p) { // правка 112: wall result
    const before = hub.snap();
    const rw = P.finishWall(hub.p, done, cfg, log, ok, quitted); P.save(hub.p);
    const head = win ? 'Стена выстояла!' : `Стена пала, волна ${done.wave}`;
    const nw = done.wavesCleared, word = nw % 10 === 1 && nw % 100 !== 11 ? 'волна' : nw % 10 >= 2 && nw % 10 <= 4 && (nw % 100 < 12 || nw % 100 > 14) ? 'волны' : 'волн';
    const extra = [rw.record ? `Новый рекорд: ${nw} ${word}` : '', ...rw.chests].filter(Boolean).join(' · ');
    hub.showReward(head, hub.diff(before), `<div class="rextra wallmap">${WALL_MAPS[cfg.wallMap ?? 0].name}</div>` + note + (extra ? `<div class="rextra">${extra}</div>` : ''));
    return;
  }
  if (hub.p) {
    const before = hub.snap();
    const rw = P.finishRun(hub.p, done, cfg.map);
    const items = hub.diff(before);
    // правка 145: the stage chest is opened right away (nothing is lost if the game closes), its prize shown when the player taps it
    let chest: { kind: P.StageChest; items: ReturnType<typeof hub.diff>; open: boolean } | undefined;
    if (rw.chest) { const b2 = hub.snap(); P.openStageChest(hub.p, rw.chest, rw.gold); chest = { kind: rw.chest, items: hub.diff(b2), open: false }; }
    P.save(hub.p);
    const extra = rw.lines.filter(l => l.startsWith('Открыт') || l.startsWith('Возврат')).join(' · ');
    hub.showReward(win ? 'Этап пройден!' : 'Поражение', items, note + (extra ? `<div class="rextra">${extra}</div>` : ''), chest,
      win && rw.gold > 0 ? { gold: rw.gold, scrolls: rw.scrolls, shards: rw.shards, done: false } : undefined); // правки 172, 176: только за победу
  }
  void done;
}

// ---------------- loop ----------------
/** правка 120: frames per second we draw at most (phones with 120 Hz screens would otherwise draw twice as often) */
let fpsCap = 60, hudT = 0;
function frame(now: number): void {
  if (last && now - last < 1000 / fpsCap - 2) { requestAnimationFrame(frame); return; }
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  frames++; fpsT += dt;
  if (fpsT >= 1) { $('fps').textContent = `${frames} fps · ${m ? m.enemies.length : 0} врагов`; frames = 0; fpsT = 0; }
  if (m && !paused && m.phase !== 'win' && m.phase !== 'lose') {
    if (m.phase === 'choose') {
      showCards();
      if (pendingChoice >= 0 || pendingReroll) {
        const inp: Input = { mx: 0, my: 0, choice: pendingChoice, reroll: pendingReroll };
        pendingChoice = -1; pendingReroll = false;
        log.push(inp); m.step(inp);
        if (inp.choice >= 0) sfx.play('pick');
        if (m.phase !== 'choose') $('cards').hidden = true;
        shownCards = '';
      }
      acc = 0;
    } else if (tut?.waitMove) { // правка 164: первый бой стоит, пока игрок не сдвинет героя
      const i = readInput(); acc = 0;
      if (i.mx !== 0 || i.my !== 0) { tut.waitMove = false; $('tutMove').hidden = true; }
    } else {
      acc += dt * speed;
      let n = 0;
      while (acc >= DT && n < 12 && m.phase === 'play') {
        const inp = readInput();
        log.push(inp); m.step(inp);
        renderer.addFx(m.fx);
        for (const f of m.fx) if (f.t === 'stage') banner(f.s);
        acc -= DT; n++;
      }
      // правка 159: the hero's shot, a hit on the hero (a big one buzzes harder), death
      if (m.atkCount !== fxAtk) { fxAtk = m.atkCount; sfx.play('shot'); }
      if (m.hp < fxHp - 0.01) sfx.vibrate(fxHp - m.hp >= 0.12 * m.maxHp ? 'heavy' : 'hit');
      fxHp = m.hp;
      const ph = m.phase as string;
      if (ph === 'lose') sfx.vibrate('death');
      if (ph === 'win' || ph === 'lose') setTimeout(finish, 700);
    }
    hudT += dt;
    if (m && (hudT >= 1 / 15 || m.phase !== 'play')) { hudT = 0; hud(); } // the HUD 15 times a second is plenty
  }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').hidden = true; }
  if (!paused) tutFrame(dt);
  if (m) renderer.draw(m, m.phase === 'play' ? Math.min(1, acc / DT) : 1, paused ? 0 : dt);
  // правка 120б: no battle — the loop sleeps until the next one starts
  if (m || bannerT > 0) requestAnimationFrame(frame); else { looping = false; last = 0; }
}
let looping = true;
function wakeLoop(): void { if (!looping) { looping = true; requestAnimationFrame(frame); } }
requestAnimationFrame(frame);

// ================= Orb Defense: the ball battle =================
const orbBattle = new OrbBattle(canvas, (o, cfg, acts, quit) => orbDone(o, cfg, acts, quit));
function startOrbBattle(stage: number, heroId: string): void {
  if (!hub.p) return;
  const cfg = OM.makeConfig(hub.p, stage, heroId, (Math.random() * 2 ** 31) >>> 0);
  if (location.hash.includes('god')) cfg.god = true;
  const g = P.GFX[hub.p.gfx ?? 'mid'];
  orbBattle.start(cfg, g.dpr);
}
function orbDone(o: Orb, cfg: OrbConfig, acts: Act[], quit: boolean): void {
  if (!hub.p) return;
  void acts;
  const win = o.s.phase === 'win';
  const before = hub.snap();
  const rw = OM.finishOrb(hub.p, o, cfg.stage, quit);
  const items = hub.diff(before);
  for (const [b, n] of Object.entries(rw.cards)) items.push({ icon: `<img class="ri" src="orb/book/${BALLS[b as keyof typeof BALLS].book}.webp" alt="">`, name: BALLS[b as keyof typeof BALLS].name, count: '×' + n }); // Ш83: no «карты шара» line under every book
  if (rw.spiritShards) items.push({ icon: '<span class="ri" style="font-size:26px">✨</span>', name: 'Частички духа', count: '×' + rw.spiritShards });
  if (rw.stones) items.push({ icon: '<span class="ri" style="font-size:26px">🧱</span>', name: 'Камни стены', count: '×' + rw.stones });
  let chest: { kind: P.StageChest; items: ReturnType<typeof hub.diff>; open: boolean } | undefined;
  if (rw.chest) { const b2 = hub.snap(); P.openStageChest(hub.p, rw.chest, rw.gold); chest = { kind: rw.chest, items: hub.diff(b2), open: false }; }
  P.save(hub.p);
  const st = (k: string, v: string) => `<span><small>${k}</small><b>${v}</b></span>`;
  const note = `<div class="rstats">${st('Ходов', String(o.s.turn))}${st('Убито', String(o.s.kills))}${st('Уровень', String(o.s.level))}${st('Стена', Math.max(0, Math.round(100 * o.s.wallHp / o.s.wallMax)) + '%')}</div>` + (rw.lines.length ? `<div class="rextra">${rw.lines.join(' · ')}</div>` : '');
  hub.show('hub');
  hub.showReward(win ? 'Этап пройден!' : quit ? 'Бой окончен' : 'Стена пала', items, note, chest);
}
