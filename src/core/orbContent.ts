// Orb Defense: Olympus — content of the ball battle (balls, enemies, spirits, walls, stages).
// Numbers here are the first balance pass; the bot (tools/orbbot.ts) checks them.

export const COLS = 9;          // columns of the field
export const ROWS = 11;         // rows from the top of the field to the wall line
export const TICK = 1 / 60;     // one simulation step
export const BALL_V = 0.3;      // cells per tick
export const BALL_R = 0.15;     // ball radius in cells
export const VOLLEY_GAP = 5;    // ticks between two balls of a volley
export const ENEMY_T = 26;      // ticks of the enemy step animation

export type BallId = 'fire' | 'ice' | 'beam' | 'ghost' | 'poison' | 'lightning' | 'quake' | 'cluster' | 'wet' | 'spike';
export const BALL_IDS: readonly BallId[] = ['fire', 'ice', 'beam', 'ghost', 'poison', 'lightning', 'quake', 'cluster', 'wet', 'spike'];
export interface BallDef { id: BallId; name: string; hero: string; color: string; glow: string; book: string; desc: (lv: number) => string }
const pc = (v: number) => Math.round(v * 100) + '%';
export const BALLS: Record<BallId, BallDef> = {
  fire: { id: 'fire', name: 'Огненный шар', hero: 'prometheus', color: '#ff7a2a', glow: '#ffb35a', book: 'fire', desc: L => `Поджигает врага на 3 хода: ${pc(BALL_FX.burn(L))} атаки за ход, до 3 стаков` },
  ice: { id: 'ice', name: 'Ледяной шар', hero: 'skadi', color: '#7fd8ff', glow: '#d8f6ff', book: 'ice', desc: L => `С шансом ${pc(BALL_FX.freezeChance(L))} замораживает на 2 хода: враг получает +10% урона. Мокрый замерзает наверняка` },
  beam: { id: 'beam', name: 'Луч Аполлона', hero: 'apollo', color: '#ffe27a', glow: '#fff6c8', book: 'beam', desc: L => `При ударе бьёт лучом весь ряд или столбец: ${pc(BALL_FX.beam(L))} атаки${L >= 3 ? ', крестом' : ''}` },
  ghost: { id: 'ghost', name: 'Призрачный шар', hero: 'hades', color: '#b48cff', glow: '#e3d4ff', book: 'ghost', desc: () => 'Пролетает врагов насквозь, отскакивает только от стен поля' },
  poison: { id: 'poison', name: 'Ядовитый шар', hero: 'hydra', color: '#7be04a', glow: '#c9ff9a', book: 'poison', desc: L => `Отравляет на 4 хода: ${pc(BALL_FX.poison(L))} атаки за ход, до 5 стаков` },
  lightning: { id: 'lightning', name: 'Шар молнии', hero: 'perun', color: '#ffe23a', glow: '#fffbd0', book: 'lightning', desc: L => `С шансом 70% бьёт молнией ${1 + (L >= 3 ? 1 : 0)} соседних врагов: ${pc(BALL_FX.chain(L))} атаки. По мокрым — на 1 больше` },
  quake: { id: 'quake', name: 'Палица Геракла', hero: 'heracles', color: '#d79a55', glow: '#ffd29a', book: 'quake', desc: L => `Волна 3 × 3 вокруг цели: ${pc(BALL_FX.quake(L))} атаки` },
  cluster: { id: 'cluster', name: 'Граната Ники', hero: 'stribog', color: '#c7c9d6', glow: '#ffffff', book: 'cluster', desc: L => `С шансом ${pc(BALL_FX.shardChance(L))} выпускает осколок: ${pc(BALL_FX.shard(L))} атаки` },
  wet: { id: 'wet', name: 'Мокрый шар', hero: 'poseidon', color: '#3aa8ff', glow: '#bfe6ff', book: 'wet', desc: L => `Враг мокрый 2 хода: с шансом ${pc(BALL_FX.wetSkip(L))} пропускает шаг (кроме боссов)` },
  spike: { id: 'spike', name: 'Шип Деметры', hero: 'veles', color: '#5fd16a', glow: '#c8ffb0', book: 'spike', desc: L => `Оставляет колючий куст на 2 хода: враг, шагнувший в него, получает ${pc(BALL_FX.thorn(L))} атаки` },
};
/** strength of the special effects by the level of the ball in the run (1..3); meta level multiplies through `elemMul` */
export const BALL_FX = {
  burn: (L: number) => 0.22 + 0.11 * (L - 1),
  freezeChance: (L: number) => 0.3 + 0.1 * (L - 1),
  beam: (L: number) => 0.55 + 0.2 * (L - 1),
  poison: (L: number) => 0.12 + 0.05 * (L - 1),
  chain: (L: number) => 0.75 + 0.25 * (L - 1),
  quake: (L: number) => 0.4 + 0.15 * (L - 1),
  shardChance: (L: number) => 0.4 + 0.1 * (L - 1),
  shard: (L: number) => 0.5 + 0.2 * (L - 1),
  wetSkip: (L: number) => 0.15 + 0.05 * (L - 1),
  thorn: (L: number) => 0.8 + 0.3 * (L - 1),
};
/** hit of the ball's element on top of the hero attack: grows with the ball level in the menu (books) */
export const elemHit = (metaLv: number) => 0.5 + 0.034 * (metaLv - 1);
/** the run level of a special ball makes its whole hit stronger */
export const runLvMul = (L: number) => 1 + 0.3 * (L - 1);
export const HERO_BALL: Record<string, BallId> = Object.fromEntries(BALL_IDS.map(b => [BALLS[b].hero, b]));

// ---------------- enemies ----------------
export type EnemyId = 'base' | 'base2' | 'healer' | 'fast' | 'slime' | 'smallslime' | 'ram' | 'echidna' | 'talos'
  | 'archer' | 'cyclops' | 'summoner' | 'brute' | 'bigslime'
  | 'shield' | 'cannon' | 'bhealer' | 'split1' | 'split2' | 'split3' | 'hydra';
export type Tier = 'normal' | 'mini' | 'boss';
export interface EnemyDef {
  id: EnemyId; name: string; tier: Tier; w: number; h: number;
  hp: number;      // × the stage hp unit
  atk: number;     // × the stage damage unit (hit on the wall)
  step: number;    // cells per turn
  xp: number;
  art: string;     // sprite name inside the enemy set (en/<set>_<art>.webp)
}
export const ENEMY: Record<EnemyId, EnemyDef> = {
  base: { id: 'base', name: 'Страж', tier: 'normal', w: 1, h: 1, hp: 1, atk: 1, step: 1, xp: 1, art: 'base' },
  base2: { id: 'base2', name: 'Страж', tier: 'normal', w: 1, h: 1, hp: 1, atk: 1, step: 1, xp: 1, art: 'base2' },
  healer: { id: 'healer', name: 'Лекарь', tier: 'normal', w: 1, h: 1, hp: 0.9, atk: 0.8, step: 1, xp: 1, art: 'healer' },
  fast: { id: 'fast', name: 'Быстрый', tier: 'normal', w: 1, h: 1, hp: 0.6, atk: 0.8, step: 2, xp: 1, art: 'fast' },
  slime: { id: 'slime', name: 'Слайм', tier: 'normal', w: 1, h: 1, hp: 1, atk: 0.8, step: 1, xp: 1, art: 'slime' },
  smallslime: { id: 'smallslime', name: 'Слаймик', tier: 'normal', w: 1, h: 1, hp: 0.25, atk: 0.5, step: 1, xp: 0, art: 'slime' },
  ram: { id: 'ram', name: 'Таран', tier: 'normal', w: 1, h: 1, hp: 0.7, atk: 2, step: 1, xp: 1, art: 'ram' },
  echidna: { id: 'echidna', name: 'Ехидна', tier: 'normal', w: 1, h: 1, hp: 1.1, atk: 1, step: 1, xp: 1, art: 'echidna' },
  talos: { id: 'talos', name: 'Талос', tier: 'normal', w: 1, h: 1, hp: 2.4, atk: 1.2, step: 1, xp: 2, art: 'talos' },
  archer: { id: 'archer', name: 'Лучник', tier: 'mini', w: 1, h: 1, hp: 6, atk: 0.8, step: 1, xp: 5, art: 'archer' },
  cyclops: { id: 'cyclops', name: 'Циклоп', tier: 'mini', w: 3, h: 2, hp: 14, atk: 3, step: 1, xp: 8, art: 'cyclops' },
  summoner: { id: 'summoner', name: 'Призыватель', tier: 'mini', w: 1, h: 1, hp: 7, atk: 1, step: 1, xp: 6, art: 'summoner' },
  brute: { id: 'brute', name: 'Громила', tier: 'mini', w: 3, h: 2, hp: 16, atk: 2.5, step: 1, xp: 8, art: 'brute' },
  bigslime: { id: 'bigslime', name: 'Большой слайм', tier: 'mini', w: 2, h: 2, hp: 10, atk: 1.5, step: 1, xp: 6, art: 'bigslime' },
  shield: { id: 'shield', name: 'Щитоносец', tier: 'boss', w: 2, h: 2, hp: 22, atk: 4, step: 1, xp: 20, art: 'shield' },
  cannon: { id: 'cannon', name: 'Пушкарь', tier: 'boss', w: 2, h: 2, hp: 20, atk: 4, step: 1, xp: 20, art: 'cannon' },
  bhealer: { id: 'bhealer', name: 'Жрец', tier: 'boss', w: 2, h: 2, hp: 19, atk: 3, step: 1, xp: 20, art: 'bhealer' },
  split1: { id: 'split1', name: 'Колосс', tier: 'boss', w: 2, h: 2, hp: 15, atk: 4, step: 1, xp: 14, art: 'split1' },
  split2: { id: 'split2', name: 'Половина колосса', tier: 'mini', w: 1, h: 1, hp: 8, atk: 2, step: 1, xp: 3, art: 'split2' },
  split3: { id: 'split3', name: 'Осколок колосса', tier: 'normal', w: 1, h: 1, hp: 1.6, atk: 1, step: 1, xp: 1, art: 'split3' },
  hydra: { id: 'hydra', name: 'Гидра', tier: 'boss', w: 3, h: 2, hp: 24, atk: 3, step: 1, xp: 24, art: 'hydra' },
};
export const BOSSES: readonly EnemyId[] = ['shield', 'cannon', 'bhealer', 'split1', 'hydra'];
export const MINIS: readonly EnemyId[] = ['archer', 'cyclops', 'summoner', 'brute', 'bigslime'];
/** flat armor of the echidna: share of the stage hp unit cut from every hit */
export const ECHIDNA_ARMOR = 0.45; // × the expected hero attack of the stage (100 × 1.1^(stage−1))

// ---------------- spirits ----------------
export type SpiritId = 'healer' | 'fire' | 'storm' | 'frost' | 'curse';
export const SPIRIT_IDS: readonly SpiritId[] = ['healer', 'fire', 'storm', 'frost', 'curse'];
export const SPIRITS: Record<SpiritId, { name: string; color: string; desc: string }> = {
  healer: { name: 'Дух-целитель', color: '#7be07a', desc: 'Лечит героя и стену' },
  fire: { name: 'Огненный дух', color: '#ff8a3a', desc: 'Поджигает 5 случайных врагов' },
  storm: { name: 'Грозовой дух', color: '#ffe23a', desc: 'Бьёт молнией 3 самых слабых врагов' },
  frost: { name: 'Морозный дух', color: '#8fdcff', desc: 'Замораживает ближайший к стене ряд' },
  curse: { name: 'Проклинающий дух', color: '#b07cff', desc: 'Проклинает 3 врагов: их удары по стене на 30% слабее' },
};
/** rarity 0..9 (обычная … мифическая): every how many turns the spirit acts (правка Ш17) */
export const spiritEvery = (r: number) => r >= 9 ? 1 : r >= 6 ? 2 : r >= 3 ? 3 : r >= 1 ? 4 : 5;
/** the look of a spirit / wall by rarity (1..3) */
export const lookOf = (r: number) => r >= 9 ? 3 : r >= 6 ? 2 : 1;

// ---------------- walls ----------------
export type WallId = 'start' | 'heal' | 'counter' | 'shield' | 'reinf';
export const WALL_IDS: readonly WallId[] = ['start', 'heal', 'counter', 'shield', 'reinf'];
export const WALLS: Record<WallId, { name: string; desc: (r: number) => string }> = {
  start: { name: 'Простая стена', desc: () => 'Без особых свойств' },
  heal: { name: 'Самолечащаяся стена', desc: r => `Чинится на ${pc(wallFx.heal(r))} здоровья за ход${r >= 9 ? '. Раз за бой, упав ниже 20%, восстанавливает 30%' : ''}` },
  counter: { name: 'Контратакующая стена', desc: r => `Каждый удар врага возвращает ему ${pc(wallFx.counter(r))} атаки героя${r >= 9 ? '. Ответный удар бьёт весь ряд' : ''}` },
  shield: { name: 'Стена с энергощитом', desc: r => `Щит ${pc(wallFx.shield(r))} здоровья стены, обновляется каждый ход${r >= 9 ? '. При полном щите удар отражается во врага' : ''}` },
  reinf: { name: 'Укреплённая стена', desc: r => `Здоровье стены +${pc(wallFx.reinf(r))}${r >= 9 ? '. Первый удар каждого хода гасится полностью' : ''}` },
};
const lerp3 = (r: number, a: number, b: number, c: number) => r <= 6 ? a + (b - a) * r / 6 : b + (c - b) * (r - 6) / 3;
export const wallFx = {
  heal: (r: number) => lerp3(r, 0.01, 0.03, 0.05),
  counter: (r: number) => lerp3(r, 0.2, 0.6, 1),
  shield: (r: number) => lerp3(r, 0.05, 0.15, 0.25),
  reinf: (r: number) => lerp3(r, 0.2, 0.5, 0.8),
};
export const RARITY_NAME = ['обычная', 'необычная', 'редкая', 'эпическая', 'эпическая +1', 'эпическая +2', 'легендарная', 'легендарная +1', 'легендарная +2', 'мифическая'];
export const RARITY_COLOR = ['#b8b8b8', '#5fd16a', '#4ea3ff', '#b46cff', '#b46cff', '#b46cff', '#ffb43a', '#ffb43a', '#ffb43a', '#ff4a4a'];

// ---------------- stages ----------------
export type Biome = 'nature' | 'earth' | 'water' | 'ice' | 'air' | 'fire' | 'poison' | 'dark' | 'lightning' | 'light';
export const BIOMES: readonly Biome[] = ['nature', 'earth', 'water', 'ice', 'air', 'fire', 'poison', 'dark', 'lightning', 'light'];
export const BIOME_NAME: Record<Biome, string> = { nature: 'Священная роща', earth: 'Пустыня', water: 'Морской берег', ice: 'Снежный перевал', air: 'Небесные башни', fire: 'Огненные недра', poison: 'Ядовитые топи', dark: 'Царство теней', lightning: 'Грозовой утёс', light: 'Олимп' };
/** правка Ш30: white Olympus enemies on dark floors, stone ones on light floors */
export const BIOME_SET: Record<Biome, 'olymp' | 'stone'> = { nature: 'stone', earth: 'stone', water: 'stone', ice: 'stone', air: 'stone', fire: 'olymp', poison: 'olymp', dark: 'olymp', lightning: 'olymp', light: 'stone' };
export const stageBiome = (s: number): Biome => BIOMES[(s - 1) % BIOMES.length];
export interface StageDef { stage: number; biome: Biome; turns: number; hpUnit: number; dmgUnit: number; miniAt: number[]; boss: EnemyId; pool: EnemyId[] }
export function stageDef(s: number): StageDef {
  const k = Math.pow(1.17, s - 1);
  const pool: EnemyId[] = ['base', 'base2', 'fast'];
  if (s >= 2) pool.push('slime', 'healer');
  if (s >= 3) pool.push('ram', 'echidna');
  if (s >= 4) pool.push('talos');
  return {
    stage: s, biome: stageBiome(s), turns: Math.min(34, 22 + 2 * Math.floor((s - 1) / 2)),
    hpUnit: Math.round(800 * k * (s === 1 ? 0.55 : s === 2 ? 0.8 : 1)), dmgUnit: Math.round(22 * Math.pow(1.12, s - 1)),
    miniAt: s <= 1 ? [12] : [9, 17], boss: BOSSES[(s - 1) % BOSSES.length], pool,
  };
}
export const BASE_WALL_HP = 1200;
