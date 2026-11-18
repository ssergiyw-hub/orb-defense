// Content tables. Numbers come from the design doc; later these move to JSON
// that the server can send without a game update.

export type Element =
  | 'fire' | 'ice' | 'nature' | 'light' | 'dark'
  | 'lightning' | 'water' | 'phys' | 'air' | 'poison';

export const ELEMENTS: readonly Element[] = [
  'fire', 'ice', 'nature', 'light', 'dark', 'lightning', 'water', 'phys', 'air', 'poison',
];

export const ELEMENT_NAME: Record<Element, string> = {
  fire: 'Огонь', ice: 'Лёд', nature: 'Природа', light: 'Свет', dark: 'Тьма',
  lightning: 'Молния', water: 'Вода', phys: 'Физика', air: 'Воздух', poison: 'Яд',
};

export const ELEMENT_EFFECT: Record<Element, string> = {
  fire: 'поджог', ice: 'замедление, +20% урона по замедленным', nature: 'вампиризм', light: 'усиление с каждым попаданием',
  dark: 'ослабление защиты', lightning: 'перескок на соседа', water: 'стрела шире',
  phys: 'отталкивание', air: 'скорость стрелы', poison: 'отравление',
};

export interface HeroDef { id: string; name: string; element: Element }

export const HEROES: readonly HeroDef[] = [
  { id: 'prometheus', name: 'Гестия', element: 'fire' },
  { id: 'hydra', name: 'Медуза', element: 'poison' },
  { id: 'hades', name: 'Геката', element: 'dark' },
  { id: 'apollo', name: 'Аполлон', element: 'light' },
  { id: 'heracles', name: 'Геракл', element: 'phys' },
  { id: 'stribog', name: 'Ника', element: 'air' },
  { id: 'poseidon', name: 'Посейдон', element: 'water' },
  { id: 'skadi', name: 'Борей', element: 'ice' },
  { id: 'veles', name: 'Деметра', element: 'nature' },
  { id: 'perun', name: 'Зевс', element: 'lightning' },
];

// ---- enemies (base, map 1). Player: hp 100, arrow 10, speed 1.0 ----
export type EnemyKind =
  | 'grunt' | 'fast' | 'tank' | 'shooter' | 'tank2' | 'exploder' | 'summoner'
  | 'miniboss' | 'goldboss' | 'boss'
  // правка 113: new monsters (normal maps from biome 3 and the wall)
  | 'shield' | 'ram' | 'harpy' | 'healer' | 'archer' | 'slime' | 'slimelet' | 'golem' | 'ghost'
  // wall bosses: waves 10, 20, 30
  | 'ogre' | 'harpyQueen' | 'colossus'
  // правка 125: the event boss
  | 'bear';

export interface EnemyDef {
  name: string; hp: number; dmg: number; speed: number; r: number; xp: number; armor: number;
}

export const SPEED_UNIT = 120; // world units per second for speed 1.0

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt: { name: 'Рядовой', hp: 20, dmg: 10, speed: 0.8, r: 10.4, xp: 1, armor: 0 },
  fast: { name: 'Быстрый', hp: 14, dmg: 10, speed: 1.05, r: 8.8, xp: 1, armor: 0 },
  tank: { name: 'Танк', hp: 40, dmg: 15, speed: 0.6, r: 15.2, xp: 3, armor: 0 },
  shooter: { name: 'Стрелок', hp: 15, dmg: 8, speed: 0.7, r: 9.6, xp: 2, armor: 0 },
  tank2: { name: 'Танк №2', hp: 40, dmg: 15, speed: 0.6, r: 15.2, xp: 4, armor: 0.3 },
  exploder: { name: 'Взрывной', hp: 10, dmg: 25, speed: 1.0, r: 9.6, xp: 1, armor: 0 },
  summoner: { name: 'Призыватель', hp: 30, dmg: 0, speed: 0.5, r: 12, xp: 3, armor: 0 },
  miniboss: { name: 'Минибосс', hp: 20 * 50, dmg: 20, speed: 0.75, r: 27.2, xp: 40, armor: 0 },
  goldboss: { name: 'Золотой минибосс', hp: 20 * 25, dmg: 0, speed: 1.1, r: 20.8, xp: 60, armor: 0 },
  boss: { name: 'Босс карты', hp: 20 * 500, dmg: 25, speed: 0.7, r: 36.8, xp: 0, armor: 0.1 },
  shield: { name: 'Щитоносец', hp: 34, dmg: 12, speed: 0.7, r: 12.5, xp: 3, armor: 0 },
  ram: { name: 'Таран', hp: 45, dmg: 14, speed: 0.75, r: 14, xp: 3, armor: 0 },
  harpy: { name: 'Гарпия', hp: 16, dmg: 9, speed: 1.0, r: 10, xp: 2, armor: 0 },
  healer: { name: 'Шаман-лекарь', hp: 26, dmg: 0, speed: 0.55, r: 11, xp: 3, armor: 0 },
  archer: { name: 'Скелет-лучник', hp: 18, dmg: 12, speed: 0.65, r: 10, xp: 2, armor: 0 },
  slime: { name: 'Слизень', hp: 30, dmg: 10, speed: 0.6, r: 13, xp: 2, armor: 0 },
  slimelet: { name: 'Слизнёнок', hp: 10, dmg: 6, speed: 0.85, r: 8, xp: 1, armor: 0 },
  golem: { name: 'Каменный голем', hp: 70, dmg: 18, speed: 0.45, r: 17, xp: 5, armor: 0.5 },
  ghost: { name: 'Призрак', hp: 22, dmg: 10, speed: 0.85, r: 10, xp: 2, armor: 0 },
  ogre: { name: 'Осадный огр-таран', hp: 20 * 60, dmg: 30, speed: 0.7, r: 30, xp: 50, armor: 0.1 },
  harpyQueen: { name: 'Королева гарпий', hp: 20 * 80, dmg: 22, speed: 0.9, r: 26, xp: 60, armor: 0 },
  colossus: { name: 'Каменный колосс', hp: 20 * 220, dmg: 35, speed: 0.4, r: 40, xp: 0, armor: 0.35 },
  // правка 125: does not die; hits are a share of the hero's health (see BOSS_EV)
  bear: { name: 'Боевой медведь', hp: 1e9, dmg: 0, speed: 0.72, r: 44, xp: 0, armor: 0 },
};
/** they fly: no auras, pools, swamps or rocks stop them */
export const FLYING: readonly EnemyKind[] = ['harpy', 'harpyQueen'];
/** how much harder than usual a monster hits the wall */
export const WALL_HIT: Partial<Record<EnemyKind, number>> = { ram: 5, golem: 3, ogre: 3, colossus: 3, tank: 1.5, tank2: 1.5 };

export interface BiomeDef {
  name: string; ground: string; detail: string; early: EnemyKind[]; late: EnemyKind[];
  /** look of the props: 0 dry (pebbles, rocks), 1 green (flowers, bushes) */
  style: number;
}

// Biomes 1–2 from the doc, 3–6 bring the new monsters (правка 113).
export const BIOMES: readonly BiomeDef[] = [
  { name: 'Пустыня', style: 0, ground: '#e8d39a', detail: '#d9c07f', early: ['grunt', 'grunt', 'grunt', 'fast'], late: ['grunt', 'fast', 'fast', 'exploder', 'tank'] },
  { name: 'Зелёный луг', style: 1, ground: '#8fc46a', detail: '#7bb257', early: ['grunt', 'grunt', 'fast', 'shooter'], late: ['grunt', 'fast', 'shooter', 'tank', 'summoner', 'exploder'] },
  { name: 'Тёмный лес', style: 1, ground: '#5f9450', detail: '#4f8040', early: ['grunt', 'grunt', 'fast', 'harpy', 'shield'], late: ['grunt', 'shield', 'harpy', 'ram', 'archer', 'healer'] },
  { name: 'Болото', style: 1, ground: '#7a8a52', detail: '#687844', early: ['grunt', 'slime', 'fast', 'harpy'], late: ['slime', 'shield', 'healer', 'exploder', 'ghost', 'tank'] },
  { name: 'Кладбище', style: 0, ground: '#9a998a', detail: '#86857a', early: ['grunt', 'ghost', 'archer', 'fast'], late: ['ghost', 'archer', 'shield', 'summoner', 'healer', 'golem'] },
  { name: 'Горы', style: 0, ground: '#b0a48c', detail: '#9a8e78', early: ['grunt', 'fast', 'ram', 'archer'], late: ['golem', 'ram', 'harpy', 'shield', 'archer', 'tank2'] },
];

// ---- правки 112, 115: wall defence ----
export interface WallMap { id: string; name: string; strong: Element; weak: Element; ground: string; detail: string; style: number }
/** one map a day, in this order (strong element +50% damage, weak −50%) */
export const WALL_MAPS: readonly WallMap[] = [
  { id: 'fire', name: 'Огненный перевал', strong: 'water', weak: 'fire', ground: '#5a3a2e', detail: '#4a2e24', style: 0 },
  { id: 'glacier', name: 'Ледник', strong: 'fire', weak: 'ice', ground: '#cfe4ee', detail: '#b4d0de', style: 0 },
  { id: 'swamp', name: 'Ядовитые топи', strong: 'phys', weak: 'poison', ground: '#5a6a40', detail: '#4a5834', style: 1 },
  { id: 'ruins', name: 'Тёмные руины', strong: 'light', weak: 'dark', ground: '#5a5466', detail: '#4a4456', style: 0 },
  { id: 'sun', name: 'Солнечный храм', strong: 'dark', weak: 'light', ground: '#e0c890', detail: '#ccb278', style: 0 },
  { id: 'forest', name: 'Зачарованный лес', strong: 'poison', weak: 'nature', ground: '#4f8a46', detail: '#407a3a', style: 1 },
  { id: 'storm', name: 'Грозовой пик', strong: 'nature', weak: 'lightning', ground: '#6a7078', detail: '#585e66', style: 0 },
  { id: 'grotto', name: 'Морской грот', strong: 'lightning', weak: 'water', ground: '#c8b894', detail: '#b0a07c', style: 0 },
  { id: 'arena', name: 'Арена титанов', strong: 'air', weak: 'phys', ground: '#d2b07a', detail: '#bc9a66', style: 0 },
  { id: 'sky', name: 'Небесная твердыня', strong: 'ice', weak: 'air', ground: '#e8eef4', detail: '#d0d8e2', style: 0 },
];
/** day number (UTC): the same map for everyone all day */
export const dayNumber = (ms: number) => Math.floor(ms / 86400000);
export const wallOfDay = (day: number) => ((day % WALL_MAPS.length) + WALL_MAPS.length) % WALL_MAPS.length;
export const WALL = {
  waves: 30, fieldW: 320, wallY: 860, heroDy: 96, baseHp: 1000, repair: 0.05, pause: 3,
  freePerDay: 2, extraCost: 50, auraGap: 0, reach: 1.6, enemySpeedMul: 0.8, maxUpgrades: 29,
};

// ---- правки 125, 126: events ----
export type EventId = 'frags' | 'boss' | 'storm' | 'bossorb'; // Ш98: «Шквал шаров»; Ш101: «Атака на босса»
/** «Фраги»: hexagon arena, waves of 30, next wave when the last one dies; score = kills */
export const FRAGS = {
  time: 300, perWave: 30, spawnEvery: 0.08, hp0: 1.5, hpGrow: 1.12, dmgGrow: 0.04,
  /** hexagon (pointy top): distance from the centre to a side */
  apothem: 620,
};
/** «Убийство босса»: round arena, the bear does not die; score = damage */
export const BOSS_EV = {
  time: 180, R: 650, cardFirst: 3, cardEvery: 15, maxUpgrades: 12,
  /** share of the hero's max health a hit takes */
  swipe: 0.45, slam: 0.55, charge: 0.5, touch: 0.1,
  /** reach of the paw (cone ±60°), the slam circle, the charge */
  swipeR: 190, slamR: 210, chargeLen: 520,
};
/** both events: 2 free tries a day, a group of 20 players, rewards by place once the day is over */
export const EVENT = { freePerDay: 2, extraCost: 50, group: 20 };

// ---- skills ----
export type SkillId =
  | 'arrow' | 'multi' | 'double'
  | 'fireball' | 'iceShards' | 'natureAura' | 'lightBeam' | 'darkOrbs'
  | 'chain' | 'waterJet' | 'boomerang' | 'wind' | 'poisonFlask' | 'poisonAura' | 'fireOrbs' | 'iceOrbs' | 'boltOrbs'
  | 'meteor' | 'sprites'
  | 'pDmg' | 'pHp' | 'pDef' | 'pSpeed' | 'pPickup' | 'pXp' | 'pVamp' | 'pGold';

export type SkillKind = 'arrow' | 'element' | 'passive';

export interface SkillDef {
  id: SkillId; name: string; kind: SkillKind; max: number; element?: Element; desc: string;
  /** only in card rolls when the hero wears this skill's rune */
  rune?: boolean;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  arrow: { id: 'arrow', name: 'Стрела героя', kind: 'arrow', max: 5, desc: '+15% урона и сила эффекта стихии героя' },
  multi: { id: 'multi', name: 'Двойная / тройная стрела', kind: 'arrow', max: 2, desc: '+1 стрела' },
  double: { id: 'double', name: 'Двойной выстрел', kind: 'arrow', max: 1, desc: 'Стрела летит очередью из 2 выстрелов' },
  fireball: { id: 'fireball', name: 'Огненный шар', kind: 'element', element: 'fire', max: 5, desc: 'Снаряд взрывается по площади' },
  iceShards: { id: 'iceShards', name: 'Ледяные осколки', kind: 'element', element: 'ice', max: 5, desc: 'Веер осколков, замедление' },
  natureAura: { id: 'natureAura', name: 'Аура природы', kind: 'element', element: 'nature', max: 5, desc: 'Зелёное кольцо вокруг героя ранит всех врагов внутри' },
  lightBeam: { id: 'lightBeam', name: 'Луч света', kind: 'element', element: 'light', max: 5, desc: 'Луч насквозь через линию врагов' },
  darkOrbs: { id: 'darkOrbs', name: 'Тёмные сферы', kind: 'element', element: 'dark', max: 5, desc: 'Сферы кружат вокруг героя' },
  chain: { id: 'chain', name: 'Цепная молния', kind: 'element', element: 'lightning', max: 5, desc: 'Перескакивает между 3–7 врагами' },
  waterJet: { id: 'waterJet', name: 'Водяная струя', kind: 'element', element: 'water', max: 5, desc: 'Струя вперёд, отталкивает' },
  boomerang: { id: 'boomerang', name: 'Бумеранг', kind: 'element', element: 'phys', max: 5, desc: 'Летит и возвращается, пробивает' },
  wind: { id: 'wind', name: 'Режущий ветер', kind: 'element', element: 'air', max: 5, desc: 'Волна-полумесяц, пробивает' },
  poisonFlask: { id: 'poisonFlask', name: 'Ядовитая склянка', kind: 'element', element: 'poison', max: 5, desc: 'Ядовитая лужа' },
  poisonAura: { id: 'poisonAura', name: 'Ядовитая аура', kind: 'element', element: 'poison', max: 5, desc: 'Облако вокруг героя отравляет врагов, яд накапливается' },
  fireOrbs: { id: 'fireOrbs', name: 'Огненные сферы', kind: 'element', element: 'fire', max: 5, desc: 'Сферы кружат вокруг героя и поджигают врагов' },
  iceOrbs: { id: 'iceOrbs', name: 'Ледяные сферы', kind: 'element', element: 'ice', max: 5, desc: 'Сферы кружат вокруг героя, замедляют и замораживают' },
  boltOrbs: { id: 'boltOrbs', name: 'Молниевые сферы', kind: 'element', element: 'lightning', max: 5, desc: 'Сферы кружат вокруг героя и бьют разрядом соседа' },
  meteor: { id: 'meteor', name: 'Метеоры', kind: 'element', element: 'fire', max: 5, rune: true, desc: 'С неба падают метеоры: взрыв по площади, поджог и отбрасывание' },
  sprites: { id: 'sprites', name: 'Духи света', kind: 'element', element: 'light', max: 5, rune: true, desc: 'Духи кружат вокруг героя и стреляют искрами' },
  pDmg: { id: 'pDmg', name: '+ Урон', kind: 'passive', max: 5, desc: '+8% урона' },
  pHp: { id: 'pHp', name: '+ Здоровье', kind: 'passive', max: 5, desc: '+10% макс. здоровья' },
  pDef: { id: 'pDef', name: '+ Защита', kind: 'passive', max: 5, desc: '+5% защиты' },
  pSpeed: { id: 'pSpeed', name: '+ Скорость', kind: 'passive', max: 5, desc: '+6% скорости' },
  pPickup: { id: 'pPickup', name: 'Радиус подбора', kind: 'passive', max: 5, desc: '+20% радиуса подбора' },
  pXp: { id: 'pXp', name: 'Опыт навыков', kind: 'passive', max: 5, desc: '+10% опыта' },
  pVamp: { id: 'pVamp', name: 'Вампиризм', kind: 'passive', max: 5, desc: '+1% лечения от урона' },
  pGold: { id: 'pGold', name: 'Умножитель наград', kind: 'passive', max: 5, desc: '+20% к золоту, свиткам и опыту героя (×2 на 5 ур.)' },
};

export const ELEMENT_SKILL: Record<Element, SkillId> = {
  fire: 'fireball', ice: 'iceShards', nature: 'natureAura', light: 'lightBeam', dark: 'darkOrbs',
  lightning: 'chain', water: 'waterJet', phys: 'boomerang', air: 'wind', poison: 'poisonFlask',
};

/** second skills of an element (the first one is ELEMENT_SKILL) */
export const EXTRA_SKILLS: [SkillId, Element][] = [['poisonAura', 'poison'], ['fireOrbs', 'fire'], ['iceOrbs', 'ice'], ['boltOrbs', 'lightning'], ['meteor', 'fire'], ['sprites', 'light']];

/** skill families: family runes make their skills stronger and their cards come up more often */
export type Family = 'arrow' | 'orbs' | 'auras' | 'blast' | 'missiles' | 'storm';
export const FAMILIES: readonly Family[] = ['arrow', 'orbs', 'auras', 'blast', 'missiles', 'storm'];
export const FAMILY_NAME: Record<Family, string> = { arrow: 'Стрела', orbs: 'Сферы', auras: 'Ауры', blast: 'Взрывы', missiles: 'Снаряды', storm: 'Свет и гроза' };
export const SKILL_FAMILY: Partial<Record<SkillId, Family>> = {
  arrow: 'arrow', multi: 'arrow', double: 'arrow',
  darkOrbs: 'orbs', fireOrbs: 'orbs', iceOrbs: 'orbs', boltOrbs: 'orbs',
  natureAura: 'auras', poisonAura: 'auras',
  fireball: 'blast', poisonFlask: 'blast', meteor: 'blast',
  iceShards: 'missiles', boomerang: 'missiles', wind: 'missiles', waterJet: 'missiles',
  chain: 'storm', lightBeam: 'storm', sprites: 'storm',
};
/** gear set effects that work inside the battle (1 epic, 2 mythic) */
export type GearFx = 'thorn' | 'bark' | 'spikes' | 'roots' | 'breath' | 'thicket' | 'volley' | 'tailwind' | 'frenzy' | 'step' | 'glint'
  | 'execute' | 'hunger' | 'decay' | 'pulse';
/** orbiting spheres: each element on its own orbit, alternating direction */
export const ORBS: Partial<Record<SkillId, { el: Element; R: number; sp: number }>> = {
  darkOrbs: { el: 'dark', R: 72, sp: 3.2 }, fireOrbs: { el: 'fire', R: 94, sp: -2.8 },
  iceOrbs: { el: 'ice', R: 116, sp: 2.5 }, boltOrbs: { el: 'lightning', R: 138, sp: -2.3 },
};
/** one hit of a sphere at skill level L (every enemy at most twice a second per kind of sphere) */
export const ORB_HIT = (L: number) => 6 + 3 * L;
/** auras around the hero: radius and damage per second at skill level L (before area and damage bonuses) */
export const AURA = { natureR: (L: number) => 65 + 10 * L, natureDps: (L: number) => 6 + 3.2 * L, poisonR: (L: number) => 60 + 10 * L, poisonDps: (L: number) => 6 + 3 * L };

/** правка 168: первые два этапа мягче — новичок с одной книгой должен доживать до босса */
export function stageMul(map: number): { hp: number; dmg: number; ramp: number; boss: number } {
  if (map <= 1) return { hp: 0.8, dmg: 0.7, ramp: 120, boss: 0.65 };
  if (map === 2) return { hp: 0.9, dmg: 0.85, ramp: 90, boss: 0.8 };
  // правка 186: между 2-м и 3-м этапом был обрыв (здоровье +56%, босс почти вдвое) — этапы 3–5 поднимаются ровными шагами
  if (map === 3) return { hp: 1.15, dmg: 1.0, ramp: 0, boss: 0.9 };
  if (map === 4) return { hp: 1.4, dmg: 1.15, ramp: 0, boss: 1 };
  if (map === 5) return { hp: 1.7, dmg: 1.3, ramp: 0, boss: 1 };
  return { hp: 1 + 0.2 * (map - 1), dmg: 1 + 0.1 * (map - 1), ramp: 0, boss: 1 };
}
export const RUN = {
  tickRate: 30,
  duration: 360,          // boss at minute 6
  minibossAt: 180,        // minute 3
  maxUpgrades: 20,
  maxElementSkills: 3,
  maxPassives: 4,
  maxEnemies: 200,
  baseEnemies: 12,        // on screen at start, +15% every 30 s
  arena: 2400,
  enemySpeedMul: 0.5,     // playtests: regular enemies at half speed (bosses unchanged)
};
