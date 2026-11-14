// Match simulation. Fixed tick, seeded RNG, deterministic math only.
// The same code runs in the phone and on the server (anti-cheat replay).

import {
  AURA, EXTRA_SKILLS, ORBS, ORB_HIT, BIOMES, BiomeDef, ELEMENT_NAME, ELEMENTS, ELEMENT_SKILL, ENEMIES, EnemyKind, Element, HEROES, RUN, SKILLS,
  SPEED_UNIT, SkillId, Family, GearFx, SKILL_FAMILY, FLYING, WALL, WALL_HIT, WALL_MAPS, WallMap, FRAGS, BOSS_EV, EventId, stageMul,
} from './content';
import { Rng } from './rng';
import { TAU, clamp, fatan2, fcos, fsin, ipow, len } from './fmath';

export const DT = 1 / RUN.tickRate;

/** Permanent bonuses from the account (hero level/stars, gear, gems, runes).
 *  The server computes them from its own inventory before the match. */
export interface RunMods {
  atk: number;       // damage multiplier
  hp: number;        // max hp multiplier
  def: number;       // added defense (0.1 = 10%)
  speed: number;     // move speed multiplier
  atkSpeed: number;  // hero arrow rate multiplier
  crit: number;      // crit chance 0..1
  critDmg: number;   // crit damage multiplier
  pickup: number;    // pickup radius multiplier
  area: number;      // area-of-effect radius multiplier
  regen: number;     // share of max hp healed every 5 s
  vamp: number;      // share of damage healed
  boss: number;      // extra damage to bosses
  rerolls?: number;  // extra free skill rerolls (monthly pass, rune of wisdom)
  elem: Partial<Record<Element, number>>; // extra damage per element
  arrowPower: number; // strength of the hero arrow effect (stars 1-5)
  // ---- runes and gear set effects ----
  xp?: number;        // extra skill xp (0.1 = +10%)
  loot?: number;      // extra run rewards: gold, scrolls, hero xp
  revive?: number;    // chance to come back once with half hp
  iframes?: number;   // extra invulnerability after a hit, s
  bossCut?: number;   // the map boss comes with this share of hp missing
  goldBoss?: number;  // extra chance of the golden miniboss
  fury?: number;      // cap of the damage bonus that grows with kills (+1% per 25 kills)
  lvlHeal?: number;   // share of max hp healed on every level-up
  killHeal?: number;  // share of max hp healed every 20 kills
  elemPow?: Partial<Record<Element, number>>; // stronger element effects (burn, slow, chain...)
  fam?: Partial<Record<Family, number>>;      // extra damage of a skill family
  famLv?: Partial<Record<Family, number>>;    // family rune mechanics: 1 epic, 2 legendary, 3 mythic
  famW?: Partial<Record<Family, number>>;     // how much more often the family's cards come up
  skillDmg?: Partial<Record<SkillId, number>>; // extra damage of one skill
  start?: Partial<Record<SkillId, number>>;   // skills from the first second (skill runes)
  unlock?: SkillId[];                          // rune-only skills allowed in card rolls
  gfx?: Partial<Record<GearFx, number>>;       // gear set effects: 1 epic, 2 mythic
}

export const BASE_MODS: RunMods = {
  atk: 1, hp: 1, def: 0, speed: 1, atkSpeed: 1, crit: 0, critDmg: 1.5, pickup: 1, area: 1,
  regen: 0, vamp: 0, boss: 0, elem: {}, arrowPower: 1,
};

export interface MatchConfig {
  seed: number;
  heroId: string;
  map: number;   // 1, 2, 3 ... (enemies +20% hp, +10% dmg per map)
  god?: boolean; // test mode: huge HP (part of the config so replays match)
  mods?: RunMods;
  /** правка 112: 'wall' = wall defence, 30 waves from the top of the screen; правки 125, 126: the events */
  mode?: 'wall' | EventId;
  /** правка 115: wall map of the day (0..9, WALL_MAPS) */
  wallMap?: number;
}

/** One tick of player input. Joystick is quantized so replays are exact. */
export interface Input {
  mx: number;      // -100..100
  my: number;      // -100..100
  choice: number;  // -1 none, 0..2 card pick
  reroll: boolean;
}

export const NO_INPUT: Input = { mx: 0, my: 0, choice: -1, reroll: false };

export interface Enemy {
  id: number; kind: EnemyKind;
  x: number; y: number; px: number; py: number;
  vx: number; vy: number; // knockback
  hp: number; maxHp: number; dmg: number; speed: number; r: number; armor: number;
  touchCd: number; atkCd: number; atk2Cd: number;
  slowT: number; slowF: number; freezeT: number;
  burnT: number; burnDps: number; poisonT: number; poisonDps: number;
  /** правка 184: poison of the poison aura, apart from the arrow's poison (they used to cap each other) */
  auraPT: number; auraPDps: number;
  shredT: number; shred: number;
  state: number; stateT: number; sumT: number; dx: number; dy: number; // boss dash / exploder fuse / summon timer
  life: number; flash: number; orbHit: number; hitT: number;
  /** правка 114: who set the fire / poison on it (for the damage table) */
  burnSrc?: string; poisonSrc?: string;
}

export interface Shot {
  id: number; kind: 'arrow' | 'fireball' | 'shard' | 'boomerang' | 'wind' | 'jet' | 'flask' | 'meteor' | 'spark';
  x: number; y: number; px: number; py: number; vx: number; vy: number;
  r: number; dmg: number; pierce: number; life: number; age: number;
  effects: Element[]; power: number; hit: number[]; tx: number; ty: number; ult: boolean;
  /** a sure critical hit (gear: Блик) */
  crit?: boolean;
  /** правка 114: skill that fired it */
  src: string;
}

/** enemy shot; lob = an arrow in an arc that only hits where it lands (archer, colossus boulder) */
export interface EShot { x: number; y: number; px: number; py: number; vx: number; vy: number; r: number; dmg: number; life: number; lob?: number; tx?: number; ty?: number; src?: string }
export interface Orb { x: number; y: number; px: number; py: number; v: number; pull: boolean }
export interface Pool { x: number; y: number; r: number; dps: number; life: number; elem: Element; src?: string }

/** Visual events for the client; not part of the deterministic state. */
export type Fx =
  | { t: 'boom'; x: number; y: number; r: number; c: Element | 'enemy' }
  | { t: 'line'; pts: number[]; c: Element }
  | { t: 'ring'; x: number; y: number; r: number; c: Element }
  | { t: 'beam'; x: number; y: number; x2: number; y2: number; w: number }
  | { t: 'text'; x: number; y: number; s: string }
  | { t: 'pulse'; x: number; y: number; r: number; c: Element }
  | { t: 'stage'; s: string };

export interface Card { id: SkillId | 'ult'; ultElem?: Element; title: string; desc: string; level: number }

export type Phase = 'play' | 'choose' | 'win' | 'lose';

/** правка 125: the bear's attack being wound up (the client draws the red zone) */
export interface BearAtk { k: 'swipe' | 'slam' | 'charge'; x: number; y: number; dx: number; dy: number; R: number; t: number; T: number }

/** centre of the event arenas */
const EC = RUN.arena / 2;
/** hexagon with a pointy top: side normals (every 60° from 0°) and corners (every 60° from −90°) */
const HEX_N: [number, number][] = [[1, 0], [0.5, 0.8660254037844386], [-0.5, 0.8660254037844386], [-1, 0], [-0.5, -0.8660254037844386], [0.5, -0.8660254037844386]];
const HEX_C: [number, number][] = [[0, -1], [0.8660254037844386, -0.5], [0.8660254037844386, 0.5], [0, 1], [-0.8660254037844386, 0.5], [-0.8660254037844386, -0.5]];

/** rock (0) or tree/cactus (1): nobody walks through it */
export interface Obstacle { x: number; y: number; r: number; kind: number }
/** swamp / quicksand patch: everyone in it moves slower */
export interface Swamp { x: number; y: number; r: number }
export const SWAMP_SLOW = 0.6;
const PLAYER_R = 14;

/** правка 175: distance between the side-by-side arrows of «+1 стрела» */
const ARROW_GAP = 14;
/** правка 187: ice arrow against a slowed or frozen enemy; share of a nature hit that heals the hero (was 0.01) */
const ICE_ARROW_BONUS = 1.2, NATURE_HEAL = 0.006;
/** правка 193: flight of the skeleton archer's arrow — the red mark stays longer, easier to step off (was 1.2 / 1.3 s) */
const ARCHER_FLIGHT = 1.5, ARCHER_FLIGHT_WALL = 1.6;
/** правка 188: damage growth of the hero's arrow per level of «Стрела героя» (was 0.2 — the arrow outdid every skill) */
const ARROW_GROWTH = 0.15;
/** правка 188: damage of each extra arrow of «+1 / +2 стрела» */
const EXTRA_ARROW = 0.6;
/** правка 188, второй шаг: element skills hit 15% harder — except the orbs (Серёга cut them on purpose) */
const SKILL_BOOST = 1.15, NO_BOOST: ReadonlySet<SkillId> = new Set(['darkOrbs', 'fireOrbs', 'iceOrbs', 'boltOrbs'] as SkillId[]);
const skillBoost = (id: SkillId) => NO_BOOST.has(id) ? 1 : SKILL_BOOST;

export class Match {
  readonly cfg: MatchConfig;
  readonly rng: Rng;
  readonly hero = HEROES[0];
  readonly biome: BiomeDef;
  readonly mods: RunMods;
  tick = 0;
  phase: Phase = 'play';
  // player
  x = RUN.arena / 2; y = RUN.arena / 2; px = this.x; py = this.y;
  faceX = 0; faceY = -1;
  hp = 100; maxHp = 100; level = 1; xp = 0; xpNext = 5;
  upgrades = 0; freeRerolls = 1; rerollsUsed = 0;
  skills = new Map<SkillId, number>();
  ult: Element | null = null;
  lightStacks = 0; lightT = 0;
  xpTotal = 0; kills = 0; gold = 0; dmgDealt = 0; rareDrops = 0; chests: string[] = [];
  // world
  enemies: Enemy[] = [];
  obstacles: Obstacle[] = [];
  swamps: Swamp[] = [];
  /** bushes: only for looks, everyone walks through them */
  bushes: { x: number; y: number; r: number }[] = [];
  shots: Shot[] = [];
  eshots: EShot[] = [];
  orbs: Orb[] = [];
  pools: Pool[] = [];
  cards: Card[] = [];
  fx: Fx[] = [];
  private nextId = 1;
  private cds = new Map<string, number>();
  orbAngle = 0;
  /** angle of every kind of orbiting spheres */
  orbAngles: Partial<Record<SkillId, number>> = {};
  minibossSpawned = false; bossSpawned = false; boss: Enemy | null = null; miniboss: Enemy | null = null;
  goldAt = -1; goldSpawned = false;
  private doubleQueue = -1;
  // runes and gear set effects
  revived = false;
  /** hero attacks so far (gear: every n-th attack is special) */
  atkCount = 0;
  /** time until the bark shield is ready again (0 = ready) */
  shieldT = 0;
  standT = 0; moving = false;
  breathUsed = 0; tailT = 0; frenzyT = 0; frenzyKills = 0; healKills = 0;
  spriteAngle = 0; private spriteNext = 0;
  private blasts: { x: number; y: number; r: number; d: number }[] = [];
  private inBlast = false;
  private grid = new Map<number, Enemy[]>();
  private enemyMul: number; private enemyDmgMul: number; private ramp = 0; private bossMul = 1;
  // ---- правка 114: damage table (not part of the state, does not change the match) ----
  /** damage dealt by every skill / gear effect */
  dmgBy: Record<string, number> = {};
  /** damage the wall took from every kind of monster */
  wallBy: Record<string, number> = {};
  private src = 'arrow';
  /** velocity of the shot that is hitting right now (shield bearers block hits from the front) */
  private hitVel: [number, number] | null = null;
  // ---- правки 112, 115: wall defence ----
  readonly wall: boolean;
  readonly wmap: WallMap | null;
  /** play field: the whole arena, or the strip in front of the wall */
  readonly AW: number; readonly AH: number;
  wallHp = 0; wallMax = 0;
  /** current wave (1..30), 0 before the first */
  wave = 0;
  /** waves fully beaten */
  wavesCleared = 0;
  /** time until the next wave starts */
  waveT = 2;
  private waveLeft = 0; private waveEvery = 1; private waveSpawnT = 0; private wavePool: EnemyKind[] = []; private waveHp = 1;
  /** time the wall stood in the current wave (for the record) */
  waveTime = 0;
  // ---- правки 125, 126: events ----
  readonly ev: EventId | null;
  /** the bear's attack being wound up */
  bearAtk: BearAtk | null = null;
  /** boss event: time until the next skill card */
  cardT = 0;
  /** boss event: rage level shown so far */
  rage = 0;

  constructor(cfg: MatchConfig) {
    this.cfg = cfg;
    this.rng = new Rng(cfg.seed);
    this.hero = HEROES.find(h => h.id === cfg.heroId) ?? HEROES[0];
    this.biome = BIOMES[(cfg.map - 1) % BIOMES.length];
    this.wall = cfg.mode === 'wall';
    this.ev = cfg.mode === 'frags' || cfg.mode === 'boss' ? cfg.mode : null;
    this.wmap = this.wall || this.ev ? WALL_MAPS[(cfg.wallMap ?? 0) % WALL_MAPS.length] : null;
    this.AW = this.wall ? WALL.fieldW : RUN.arena;
    this.AH = this.wall ? WALL.wallY : RUN.arena;
    { const sm = stageMul(cfg.map); this.enemyMul = sm.hp; this.enemyDmgMul = sm.dmg; this.ramp = this.wall || this.ev ? 0 : sm.ramp; this.bossMul = this.wall || this.ev ? 1 : sm.boss; } // правка 168
    this.mods = cfg.mods ?? BASE_MODS;
    this.hp = this.maxHp = 100 * this.mods.hp;
    this.freeRerolls += this.mods.rerolls ?? 0;
    this.skills.set('arrow', 1);
    for (const [id, l] of Object.entries(this.mods.start ?? {}) as [SkillId, number][]) if (l > 0 && SKILLS[id] && !(this.wall && id in ORBS)) this.skills.set(id, Math.min(SKILLS[id].max, l));
    if (cfg.god) this.hp = this.maxHp = 1e6;
    // golden miniboss: 20% chance, somewhere in minutes 3–6
    if (this.wall) {
      this.x = this.px = WALL.fieldW / 2; this.y = this.py = WALL.wallY + WALL.heroDy; this.faceX = 0; this.faceY = -1;
      this.wallHp = this.wallMax = this.wallMaxHp();
      return; // no golden miniboss, rocks or swamps on the wall
    }
    if (this.ev) { // правки 125, 126: open arena, no rocks, no golden miniboss
      this.x = this.px = EC; this.y = this.py = EC + (this.ev === 'boss' ? 330 : 0);
      if (this.ev === 'boss') { const b = this.spawn('bear'); b.x = b.px = EC; b.y = b.py = EC - 120; b.atkCd = 2.5; this.boss = b; this.cardT = BOSS_EV.cardFirst; }
      return;
    }
    if (this.rng.chance(0.2 + (this.mods.goldBoss ?? 0))) this.goldAt = Math.floor(this.rng.range(195, 320) * RUN.tickRate);
    this.buildTerrain();
  }

  /** wall hp: 1000 grown by the hero's hp bonuses (gear, runes, the +hp card) */
  wallMaxHp(): number { return (this.cfg.god ? 1e6 : WALL.baseHp) * this.mods.hp * (1 + 0.1 * this.lvl('pHp')); }
  /** правка 115: damage multiplier of the wall map of the day */
  mapMul(el: Element): number { return !this.wmap ? 1 : el === this.wmap.strong ? 1.5 : el === this.wmap.weak ? 0.5 : 1; }
  /** wall: the hero shoots further (the monsters come from the far top of the screen) */
  reach(v: number): number { return this.wall ? v * WALL.reach : v; }
  maxUpgrades(): number { return this.wall ? WALL.maxUpgrades : this.ev === 'boss' ? BOSS_EV.maxUpgrades : RUN.maxUpgrades; }
  /** правки 125, 126: score of an event run (kills or damage to the bear) */
  score(): number { return this.ev === 'boss' ? Math.round(this.dmgDealt) : this.kills; }
  /** time limit of an event run */
  timeLimit(): number { return this.ev === 'boss' ? BOSS_EV.time : this.ev === 'frags' ? FRAGS.time : 0; }
  /** keep a circle inside the event arena (hexagon or round) */
  bound(x: number, y: number, r: number): [number, number] {
    if (this.ev === 'frags') {
      for (let pass = 0; pass < 2; pass++) for (const [nx, ny] of HEX_N) {
        const d = (x - EC) * nx + (y - EC) * ny, m = FRAGS.apothem - r;
        if (d > m) { x -= nx * (d - m); y -= ny * (d - m); }
      }
    } else if (this.ev === 'boss') {
      const dx = x - EC, dy = y - EC, d = len(dx, dy), m = BOSS_EV.R - r;
      if (d > m) { x = EC + dx / d * m; y = EC + dy / d * m; }
    }
    return [x, y];
  }
  /** where a sphere is: a circle round the hero, on the wall an ellipse stretched forward */
  orbXY(R: number, a: number, hx = this.x, hy = this.y): [number, number] {
    return this.wall ? [hx + fcos(a) * R * 0.85, hy - R * 0.8 + fsin(a) * R * 1.45] : [hx + fcos(a) * R, hy + fsin(a) * R];
  }
  /** wall: an aura is a strip across the whole width some way in front of the wall [far edge, near edge] */
  auraBand(id: 'natureAura' | 'poisonAura'): [number, number] {
    const L = this.lvl(id), depth = (70 + 20 * L) * this.area() * (this.famL('auras') >= 1 ? 1.15 : 1), y1 = WALL.wallY - WALL.auraGap;
    return [y1 - depth, y1];
  }
  private inAura(id: 'natureAura' | 'poisonAura', out: Enemy[]): Enemy[] {
    if (!this.wall) return this.query(this.x, this.y, this.auraR(id), out).filter(e => !FLYING.includes(e.kind));
    const [y0, y1] = this.auraBand(id); out.length = 0;
    for (const e of this.enemies) if (e.hp > 0 && e.y + e.r > y0 && e.y - e.r < y1 && !FLYING.includes(e.kind)) out.push(e);
    return out;
  }

  /** rocks, trees and swamps: own random stream so the rest of the match is not shifted */
  private buildTerrain(): void {
    const w = new Rng((this.cfg.seed ^ 0x5bd1e995) >>> 0), A = RUN.arena, mid = A / 2;
    const free = (x: number, y: number, r: number) =>
      len(x - mid, y - mid) > 260 + r &&
      this.swamps.every(o => len(x - o.x, y - o.y) > o.r + r + 60) &&
      this.obstacles.every(o => len(x - o.x, y - o.y) > o.r + r + 120);
    for (let i = 0, tries = 0; i < 6 && tries < 200; tries++) {
      const r = w.range(90, 150), x = w.range(160 + r, A - 160 - r), y = w.range(160 + r, A - 160 - r);
      if (free(x, y, r)) { this.swamps.push({ x, y, r }); i++; }
    }
    for (let i = 0, tries = 0; i < 10 && tries < 300; tries++) {
      const kind = w.chance(0.5) ? 0 : 1, r = kind === 0 ? w.range(26, 40) : w.range(22, 30);
      const x = w.range(120, A - 120), y = w.range(120, A - 120);
      if (free(x, y, r)) { this.obstacles.push({ x, y, r, kind }); i++; }
    }
    // drawn after the rest, so rocks and swamps stay where they were
    for (let i = 0, tries = 0; i < 13 && tries < 300; tries++) {
      const r = w.range(18, 26), x = w.range(100, A - 100), y = w.range(100, A - 100);
      if (len(x - mid, y - mid) > 140 && this.swamps.every(o => len(x - o.x, y - o.y) > o.r + r + 10) &&
        this.obstacles.every(o => len(x - o.x, y - o.y) > o.r + r + 40) && this.bushes.every(o => len(x - o.x, y - o.y) > 120)) { this.bushes.push({ x, y, r }); i++; }
    }
  }

  inSwamp(x: number, y: number): boolean {
    for (const o of this.swamps) { const dx = x - o.x, dy = y - o.y; if (dx * dx + dy * dy < o.r * o.r) return true; }
    return false;
  }
  /** push a circle out of rocks and trees */
  private blockOut(x: number, y: number, r: number): [number, number] {
    for (const o of this.obstacles) {
      const dx = x - o.x, dy = y - o.y, m = o.r + r;
      if (dx * dx + dy * dy < m * m) { const d = len(dx, dy) || 0.01; x = o.x + dx / d * m; y = o.y + dy / d * m; }
    }
    return [x, y];
  }
  /** move with walls and obstacles; when blocked, slide along them without losing speed */
  private walk(x: number, y: number, vx: number, vy: number, r: number): [number, number] {
    const A = RUN.arena, lim = (v: number) => clamp(v, r + 6, A - r - 6);
    let [nx, ny] = this.blockOut(lim(x + vx), lim(y + vy), r);
    const want = len(vx, vy), got = len(nx - x, ny - y);
    if (want > 0 && got > 0.05 * want && got < 0.98 * want) {
      const k = want / got;
      [nx, ny] = this.blockOut(lim(x + (nx - x) * k), lim(y + (ny - y) * k), r);
    }
    if (this.ev) [nx, ny] = this.bound(nx, ny, r);
    return [nx, ny];
  }

  get time(): number { return this.tick * DT; }
  lvl(id: SkillId): number { return this.skills.get(id) ?? 0; }

  // ---------------- stats ----------------
  gfx(k: GearFx): number { return this.mods.gfx?.[k] ?? 0; }
  famL(f: Family): number { return this.mods.famLv?.[f] ?? 0; }
  /** damage bonus that grows with kills (rune of fury): +1% per 25 kills */
  furyBonus(): number { return Math.min(this.mods.fury ?? 0, Math.floor(this.kills / 25) * 0.01); }
  dmgMul(): number {
    const hg = this.gfx('hunger');
    return (1 + 0.08 * this.lvl('pDmg')) * this.mods.atk * (1 + this.furyBonus()) * (hg && this.hp < this.maxHp * 0.5 ? (hg === 2 ? 1.35 : 1.2) : 1);
  }
  elemMul(el: Element): number { return (1 + (this.mods.elem[el] ?? 0)) * this.mapMul(el); }
  /** extra damage of one skill: its family rune and its own skill rune */
  skillMul(id: SkillId): number { const f = SKILL_FAMILY[id]; return 1 + (f ? this.mods.fam?.[f] ?? 0 : 0) + (this.mods.skillDmg?.[id] ?? 0); }
  area(): number { return this.mods.area; }
  defense(): number {
    const rt = this.gfx('roots');
    return Math.min(0.75, 0.05 * this.lvl('pDef') + this.mods.def + (rt && this.standT >= 0.6 ? (rt === 2 ? 0.25 : 0.15) : 0));
  }
  speed(): number {
    const tw = this.gfx('tailwind');
    return SPEED_UNIT * 1.15 * (1 + 0.06 * this.lvl('pSpeed')) * this.mods.speed * (tw && this.tailT > 0 ? (tw === 2 ? 1.5 : 1.35) : 1);
  }
  pickup(): number { return 85 * (1 + 0.2 * this.lvl('pPickup')) * this.mods.pickup; }
  /** multiplier for everything the run awards: gold, account xp, chest contents */
  rewardMul(): number { return 1 + 0.2 * this.lvl('pGold') + (this.mods.loot ?? 0); }
  /** spheres on one orbit: level + 1, family rune adds more */
  orbCount(id: SkillId): number { const f = this.famL('orbs'); return this.lvl(id) + 1 + (f >= 2 ? 1 : 0) + (f >= 3 ? 1 : 0); }
  orbSpin(): number { return this.famL('orbs') >= 1 ? 1.3 : 1; }
  auraR(id: 'natureAura' | 'poisonAura'): number {
    const L = this.lvl(id);
    return (id === 'natureAura' ? AURA.natureR(L) : AURA.poisonR(L)) * this.area() * (this.famL('auras') >= 1 ? 1.15 : 1);
  }
  spriteCount(): number { const L = this.lvl('sprites'); return L <= 0 ? 0 : (L <= 2 ? 1 : L <= 4 ? 2 : 3) + (this.famL('storm') >= 1 ? 1 : 0); }
  /** the bark shield is up (gear: Кора) */
  shieldUp(): boolean { return this.gfx('bark') > 0 && this.shieldT <= 0; }
  heroPower(): number { return (1 + 0.25 * (this.lvl('arrow') - 1)) * this.mods.arrowPower; }

  // ---------------- main step ----------------
  step(inp: Input): void {
    this.fx.length = 0;
    if (this.phase === 'win' || this.phase === 'lose') return;
    if (this.phase === 'choose') {
      if (inp.reroll) this.reroll();
      else if (inp.choice >= 0 && inp.choice < this.cards.length) this.pick(this.cards[inp.choice]);
      return;
    }
    this.tick++;
    this.savePrev();
    this.movePlayer(inp);
    if (this.ev === 'frags') this.fragWaves(); else if (this.ev === 'boss') this.bossEvent(); else if (this.wall) this.wallWaves(); else this.waves();
    this.buildGrid();
    this.updateEnemies();
    this.weapons();
    this.updateShots();
    this.updateEShots();
    this.updatePools();
    this.updateOrbs();
    this.cleanup();
    if (this.hp <= 0) {
      if (!this.revived && (this.mods.revive ?? 0) > 0 && this.rng.chance(this.mods.revive!)) {
        this.revived = true; this.hp = this.maxHp * 0.5; this.iframes = 2;
        this.fx.push({ t: 'stage', s: 'Руна возрождения: снова в бою!' }, { t: 'pulse', x: this.x, y: this.y, r: 140, c: 'light' });
      } else { this.hp = 0; this.phase = 'lose'; }
    }
    if (this.wall && this.wallHp <= 0 && this.phase === 'play') { this.wallHp = 0; this.phase = 'lose'; this.fx.push({ t: 'stage', s: 'Стена пала' }); }
  }

  private savePrev(): void {
    this.px = this.x; this.py = this.y;
    for (const e of this.enemies) { e.px = e.x; e.py = e.y; }
    for (const s of this.shots) { s.px = s.x; s.py = s.y; }
    for (const s of this.eshots) { s.px = s.x; s.py = s.y; }
    for (const o of this.orbs) { o.px = o.x; o.py = o.y; }
  }

  private movePlayer(inp: Input): void {
    let mx = clamp(inp.mx, -100, 100) / 100, my = clamp(inp.my, -100, 100) / 100;
    const l = len(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    if (l > 0.05) { this.faceX = mx / Math.max(l, 1e-6); this.faceY = my / Math.max(l, 1e-6); }
    const sp = this.speed() * DT * (this.inSwamp(this.x, this.y) ? SWAMP_SLOW : 1);
    if (this.wall) { // on the wall: only left and right
      my = 0;
      this.x = clamp(this.x + mx * sp, 18, WALL.fieldW - 18);
      if (Math.abs(mx) > 0.05) { this.faceX = Math.sign(mx); this.faceY = 0; } else { this.faceX = 0; this.faceY = -1; }
    } else [this.x, this.y] = this.walk(this.x, this.y, mx * sp, my * sp, PLAYER_R);
    this.moving = this.wall ? Math.abs(mx) > 0.05 : l > 0.05;
    this.standT = this.moving ? 0 : this.standT + DT;
    if (this.shieldT > 0) this.shieldT -= DT;
    if (this.tailT > 0) this.tailT -= DT;
    if (this.frenzyT > 0) this.frenzyT -= DT;
    const rt = this.gfx('roots');
    if (rt && this.standT >= 0.6) this.heal(this.maxHp * (rt === 2 ? 0.02 : 0.01) * DT);
    if (this.iframes > 0) this.iframes -= DT;
    if (this.mods.regen > 0 && this.tick % (5 * RUN.tickRate) === 0) this.heal(this.maxHp * this.mods.regen);
    if (this.lightT > 0) { this.lightT -= DT; if (this.lightT <= 0) this.lightStacks = 0; }
  }

  // ---------------- waves & bosses ----------------
  private waves(): void {
    const t = this.time;
    if (!this.minibossSpawned && t >= RUN.minibossAt) {
      this.minibossSpawned = true;
      this.miniboss = this.spawn('miniboss');
      this.fx.push({ t: 'stage', s: 'Минута 3: минибосс' });
    }
    if (this.goldAt > 0 && !this.goldSpawned && this.tick >= this.goldAt) {
      this.goldSpawned = true;
      const g = this.spawn('goldboss');
      g.life = 30;
      this.fx.push({ t: 'stage', s: 'Золотой минибосс! 30 секунд' });
    }
    if (!this.bossSpawned && t >= RUN.duration) {
      this.bossSpawned = true;
      this.boss = this.spawn('boss');
      if (this.bossMul !== 1) { this.boss.hp *= this.bossMul; this.boss.maxHp *= this.bossMul; } // правка 168: босс первых этапов слабее
      if (this.mods.bossCut) this.boss.hp *= 1 - this.mods.bossCut;
      this.fx.push({ t: 'stage', s: 'Минута 6: босс карты. Волны остановлены' });
    }
    if (this.bossSpawned) return; // waves stop during the boss fight
    const steps = Math.floor(t / 30);
    let target = Math.min(RUN.maxEnemies, Math.floor(RUN.baseEnemies * ipow(1.15, steps) * (1 + (t % 30) / 30 * 0.15)));
    if (this.ramp > 0 && t < this.ramp) target = Math.floor(target * (0.5 + 0.5 * t / this.ramp)); // правка 168: начало первых этапов — вдвое меньше врагов, к 2-й минуте — как обычно
    let alive = 0;
    for (const e of this.enemies) if (!isBoss(e.kind)) alive++;
    let n = Math.min(3, target - alive);
    const list = t < RUN.minibossAt ? this.biome.early : this.biome.late;
    while (n-- > 0) this.spawn(this.rng.pick(list));
  }

  // ---------------- правка 112: wall waves ----------------
  /** monsters of a wave: new kinds join step by step, every 5th wave is strong */
  static wavePool(w: number): EnemyKind[] {
    const p: EnemyKind[] = ['grunt', 'grunt', 'fast'];
    if (w >= 3) p.push('fast', 'slime');
    if (w >= 5) p.push('tank', 'shield');
    if (w >= 6) p.push('shooter', 'harpy');
    if (w >= 8) p.push('archer', 'exploder');
    if (w >= 11) p.push('ram', 'healer', 'ghost');
    if (w >= 13) p.push('summoner', 'shield', 'harpy');
    if (w >= 16) p.push('golem', 'tank2', 'ram');
    if (w >= 21) p.push('golem', 'ghost', 'archer', 'healer');
    if (w >= 26) p.push('ram', 'golem', 'shield');
    return p;
  }
  static waveBoss(w: number): EnemyKind | null { return w === 10 ? 'ogre' : w === 20 ? 'harpyQueen' : w === 30 ? 'colossus' : null; }
  static waveCount(w: number): number {
    const strong = w % 5 === 0 && !Match.waveBoss(w);
    return Math.round((7 + 1.5 * w) * (strong ? 1.5 : 1) * (Match.waveBoss(w) ? 0.5 : 1));
  }

  private startWave(w: number): void {
    this.wave = w; this.waveTime = 0;
    const strong = w % 5 === 0;
    this.waveHp = (1 + 0.11 * (w - 1)) * (strong ? 1.25 : 1);
    this.wavePool = Match.wavePool(w);
    this.waveLeft = Match.waveCount(w);
    this.waveEvery = Math.min(8, 3.5 + 0.15 * w) / this.waveLeft;
    this.waveSpawnT = 0;
    const b = Match.waveBoss(w);
    this.fx.push({ t: 'stage', s: b ? `Волна ${w}/${WALL.waves}: ${ENEMIES[b].name}!` : `Волна ${w}/${WALL.waves}${strong ? ' — сильная!' : ''}` });
    if (b) {
      this.waveHp = 1 + 0.04 * (w - 1);
      const e = this.spawn(b);
      if (b === 'colossus' && this.mods.bossCut) e.hp *= 1 - this.mods.bossCut;
      this.boss = e;
      this.waveHp = (1 + 0.11 * (w - 1));
    }
  }

  private wallWaves(): void {
    if (this.wave === 0 || this.waveT > 0) {
      this.waveT -= DT;
      if (this.waveT <= 0) { this.waveT = 0; this.startWave(this.wave + 1); }
      return;
    }
    this.waveTime += DT;
    if (this.waveLeft > 0) {
      this.waveSpawnT -= DT;
      while (this.waveSpawnT <= 0 && this.waveLeft > 0) {
        this.waveSpawnT += this.waveEvery; this.waveLeft--;
        this.spawn(this.rng.pick(this.wavePool));
      }
      return;
    }
    for (const e of this.enemies) if (e.hp > 0) return;
    // wave beaten
    this.wavesCleared = this.wave;
    this.boss = null;
    if (this.wave >= WALL.waves) { this.phase = 'win'; this.fx.push({ t: 'stage', s: 'Стена выстояла!' }); return; }
    const fix = this.wallMax * WALL.repair;
    this.wallHp = Math.min(this.wallMax, this.wallHp + fix);
    this.heal(this.maxHp * 0.1);
    this.fx.push({ t: 'text', x: this.x, y: WALL.wallY - 30, s: `Стена +${Math.round(fix)}` });
    this.waveT = WALL.pause;
    if (this.upgrades < this.maxUpgrades()) { this.cards = this.rollCards(); if (this.cards.length) this.phase = 'choose'; }
  }

  // ---------------- правка 126: «Фраги» ----------------
  private fragWaves(): void {
    if (this.time >= FRAGS.time) { this.phase = 'win'; this.fx.push({ t: 'stage', s: 'Время вышло!' }); return; }
    if (this.waveLeft > 0) {
      this.waveSpawnT -= DT;
      while (this.waveSpawnT <= 0 && this.waveLeft > 0) {
        this.waveSpawnT += FRAGS.spawnEvery; this.waveLeft--;
        const e = this.spawn(this.rng.pick(this.wavePool)); e.flash = 0.2;
      }
      return;
    }
    if (this.wave > 0) { for (const e of this.enemies) if (e.hp > 0) return; this.wavesCleared = this.wave; }
    const w = this.wave + 1;
    this.wave = w;
    this.waveHp = FRAGS.hp0 * ipow(FRAGS.hpGrow, w - 1);
    this.wavePool = Match.wavePool(Math.min(30, 3 * w));
    this.waveLeft = FRAGS.perWave; this.waveSpawnT = 0;
    this.fx.push({ t: 'stage', s: `Волна ${w}` });
  }

  // ---------------- правка 125: «Убийство босса» ----------------
  private bossEvent(): void {
    if (this.time >= BOSS_EV.time) { this.phase = 'win'; this.fx.push({ t: 'stage', s: 'Время вышло!' }); return; }
    const rg = Math.floor(this.time / 60);
    if (rg > this.rage) { this.rage = rg; this.fx.push({ t: 'stage', s: 'Медведь в ярости!' }); }
    this.cardT -= DT;
    if (this.cardT <= 0) {
      this.cardT += BOSS_EV.cardEvery;
      if (this.upgrades < this.maxUpgrades()) { this.cards = this.rollCards(); if (this.cards.length) this.phase = 'choose'; }
    }
  }

  /** the bear: walks after the hero, winds up a paw, a slam or a charge (red zone first), then rests. Returns its speed */
  private bearAI(e: Enemy, ux: number, uy: number, d: number): number {
    const rage = 1 + 0.15 * this.rage, wind = (T: number) => Math.max(0.7, T / rage);
    e.vx = 0; e.vy = 0;
    const hit = (pct: number, src: string) => this.damagePlayer(this.maxHp * pct, src);
    switch (e.state) {
      case 0: { // walk after the hero
        e.dx = ux; e.dy = uy;
        if (e.touchCd <= 0 && d < e.r + 14) { e.touchCd = 1; hit(BOSS_EV.touch, 'bear'); }
        if (e.atkCd > 0) return e.speed * rage;
        let k: BearAtk['k'] | null = null;
        if (d < BOSS_EV.swipeR - 20) k = this.rng.chance(0.6) ? 'swipe' : 'slam';
        else if (d < 330) k = this.rng.chance(0.5) ? 'slam' : 'charge';
        else if (d < BOSS_EV.chargeLen) k = 'charge';
        if (!k) return e.speed * rage;
        const T = wind(k === 'slam' ? 1.2 : 1.0);
        this.bearAtk = { k, x: e.x, y: e.y, dx: ux, dy: uy, R: k === 'swipe' ? BOSS_EV.swipeR : k === 'slam' ? BOSS_EV.slamR : BOSS_EV.chargeLen, t: 0, T };
        e.state = k === 'swipe' ? 10 : k === 'slam' ? 11 : 12; e.stateT = T;
        return 0;
      }
      case 10: case 11: case 12: { // wind-up: stands still, the zone grows
        const a = this.bearAtk!;
        a.t += DT; e.stateT -= DT;
        if (e.stateT > 0) return 0;
        const hx = this.x - a.x, hy = this.y - a.y, hd = len(hx, hy);
        if (e.state === 10) {
          this.fx.push({ t: 'boom', x: a.x + a.dx * a.R * 0.55, y: a.y + a.dy * a.R * 0.55, r: a.R * 0.6, c: 'enemy' });
          if (hd < a.R + 14 && (hd < e.r || (hx * a.dx + hy * a.dy) / (hd || 1) > 0.5)) hit(BOSS_EV.swipe, 'bearSwipe');
          this.bearAtk = null; e.state = 14; e.stateT = 0.7; return 0;
        }
        if (e.state === 11) {
          this.fx.push({ t: 'ring', x: a.x, y: a.y, r: a.R, c: 'phys' }, { t: 'boom', x: a.x, y: a.y, r: a.R, c: 'enemy' });
          if (hd < a.R + 14) hit(BOSS_EV.slam, 'bearSlam');
          this.bearAtk = null; e.state = 14; e.stateT = 0.8; return 0;
        }
        e.state = 13; e.stateT = a.R / (e.speed * 5); e.dx = a.dx; e.dy = a.dy; e.orbHit = 0; this.bearAtk = null;
        return e.speed * 5;
      }
      case 13: { // charge along the line
        e.stateT -= DT;
        if (!e.orbHit && d < e.r + 22) { e.orbHit = 1; hit(BOSS_EV.charge, 'bearCharge'); }
        const [bx, by] = this.bound(e.x + e.dx * e.speed * 5 * DT, e.y + e.dy * e.speed * 5 * DT, e.r);
        if (e.stateT <= 0 || len(bx - e.x - e.dx * e.speed * 5 * DT, by - e.y - e.dy * e.speed * 5 * DT) > 1) { e.state = 14; e.stateT = 0.9; return 0; }
        return e.speed * 5;
      }
      default: // 14: rests after an attack
        e.stateT -= DT;
        if (e.stateT <= 0) { e.state = 0; e.atkCd = (1.4 + this.rng.next() * 0.6) / rage; }
        return 0;
    }
  }

  /** a monster hits the wall (or its shot lands on it) */
  private hitWall(d: number, kind: string): void {
    if (this.wallHp <= 0) return;
    d *= 1 - this.defense();
    this.wallHp -= d;
    this.wallBy[kind] = (this.wallBy[kind] ?? 0) + d;
  }

  spawn(kind: EnemyKind): Enemy {
    const d = ENEMIES[kind];
    let a = this.rng.next() * TAU;
    const dist = isBoss(kind) ? 340 : this.rng.range(460, 560);
    let x = clamp(this.x + fcos(a) * dist, 30, RUN.arena - 30);
    let y = clamp(this.y + fsin(a) * dist, 30, RUN.arena - 30);
    // правка 183: у стены арены точка после обрезки оказывалась прямо на герое — берём другое направление
    if (!this.wall && !this.ev) {
      const need = isBoss(kind) ? 260 : 320;
      for (let k = 0; k < 10 && len(x - this.x, y - this.y) < need; k++) {
        a = this.rng.next() * TAU;
        x = clamp(this.x + fcos(a) * dist, 30, RUN.arena - 30); y = clamp(this.y + fsin(a) * dist, 30, RUN.arena - 30);
      }
      if (len(x - this.x, y - this.y) < need) { // a deep corner: towards the middle of the arena
        const cx = RUN.arena / 2 - this.x, cy = RUN.arena / 2 - this.y, l = len(cx, cy) || 1;
        x = clamp(this.x + cx / l * dist, 30, RUN.arena - 30); y = clamp(this.y + cy / l * dist, 30, RUN.arena - 30);
      }
    }
    if (this.wall) { x = isBoss(kind) ? WALL.fieldW / 2 : 26 + (a / TAU) * (WALL.fieldW - 52); y = isBoss(kind) ? -70 : -20 - this.rng.next() * 50; }
    if (this.ev === 'frags') { // правка 126: from the six corners
      const [cx, cy] = HEX_C[this.rng.int(6)], Rc = FRAGS.apothem / 0.8660254037844386 - 70;
      x = EC + cx * Rc + this.rng.range(-40, 40); y = EC + cy * Rc + this.rng.range(-40, 40);
    }
    const hp = d.hp * this.enemyMul;
    const e: Enemy = {
      id: this.nextId++, kind, x, y, px: x, py: y, vx: 0, vy: 0,
      hp: hp * this.waveHp, maxHp: hp * this.waveHp, dmg: d.dmg * this.enemyDmgMul * (this.wall ? 1 + 0.03 * Math.max(0, this.wave - 1) : this.ev === 'frags' ? 1 + FRAGS.dmgGrow * Math.max(0, this.wave - 1) : 1),
      speed: d.speed * SPEED_UNIT * (isBoss(kind) ? (this.wall ? 0.55 : 1) : this.wall ? WALL.enemySpeedMul : RUN.enemySpeedMul), r: d.r, armor: d.armor,
      touchCd: 0, atkCd: 2 + this.rng.next() * 2, atk2Cd: 4,
      slowT: 0, slowF: 0, freezeT: 0, burnT: 0, burnDps: 0, poisonT: 0, poisonDps: 0, auraPT: 0, auraPDps: 0, shredT: 0, shred: 0,
      state: 0, stateT: 0, sumT: kind === 'ghost' ? this.rng.next() * 3 : 0, dx: 0, dy: 1, life: -1, flash: 0, orbHit: 0, hitT: 0,
    };
    this.enemies.push(e);
    return e;
  }

  // ---------------- spatial grid ----------------
  private static CELL = 64;
  private key(cx: number, cy: number): number { return cx * 4096 + cy; }
  private buildGrid(): void {
    this.grid.clear();
    for (const e of this.enemies) {
      const k = this.key(Math.floor(e.x / Match.CELL), Math.floor(e.y / Match.CELL));
      const c = this.grid.get(k);
      if (c) c.push(e); else this.grid.set(k, [e]);
    }
  }
  /** enemies whose centers are within r (+their radius) of x,y */
  query(x: number, y: number, r: number, out: Enemy[] = []): Enemy[] {
    out.length = 0;
    const C = Match.CELL, R = r + 50;
    const x0 = Math.floor((x - R) / C), x1 = Math.floor((x + R) / C);
    const y0 = Math.floor((y - R) / C), y1 = Math.floor((y + R) / C);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const c = this.grid.get(this.key(cx, cy));
      if (!c) continue;
      for (const e of c) {
        if (e.hp <= 0) continue;
        const dx = e.x - x, dy = e.y - y, rr = r + e.r;
        if (dx * dx + dy * dy <= rr * rr) out.push(e);
      }
    }
    return out;
  }
  nearest(x: number, y: number, maxR: number, skip?: number[]): Enemy | null {
    let best: Enemy | null = null, bd = maxR * maxR;
    for (const e of this.enemies) {
      if (e.hp <= 0 || (skip && skip.includes(e.id))) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------------- enemies ----------------
  private tmp: Enemy[] = [];
  private updateEnemies(): void {
    const px = this.x, py = this.y;
    const th = this.gfx('thicket'), thR = th === 2 ? 140 : 110, thF = th === 2 ? 0.75 : 0.85;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - DT);
      // damage over time
      if (e.burnT > 0) { e.burnT -= DT; this.src = e.burnSrc ?? 'arrow'; this.hurt(e, e.burnDps * DT, null, true); }
      if (e.poisonT > 0) { e.poisonT -= DT; this.src = e.poisonSrc ?? 'arrow'; this.hurt(e, e.poisonDps * DT, null, true); }
      if (e.auraPT > 0) { e.auraPT -= DT; this.src = 'poisonAura'; this.hurt(e, e.auraPDps * DT, null, true); if (e.auraPT <= 0) e.auraPDps = 0; }
      if (e.shredT > 0) e.shredT -= DT;
      if (e.hp <= 0) continue;
      if (e.life > 0) { e.life -= DT; if (e.life <= 0) { e.hp = 0; e.maxHp = -1; this.fx.push({ t: 'text', x: e.x, y: e.y, s: 'Убежал!' }); continue; } }
      let slow = 1;
      if (e.slowT > 0) { e.slowT -= DT; slow = 1 - e.slowF; }
      if (e.freezeT > 0) { e.freezeT -= DT; slow = 0; }
      if (e.hitT > 0) { e.hitT -= DT; slow = 0; } // hit-stop after a hit
      const dx = px - e.x, dy = py - e.y, d = len(dx, dy) || 1;
      if (th && d < thR + e.r) slow *= thF; // gear: Чаща
      let mvx = dx / d, mvy = dy / d, sp = e.speed;
      e.touchCd -= DT; e.atkCd -= DT; e.atk2Cd -= DT;
      const fly = FLYING.includes(e.kind);
      if (this.wall) { // правка 112: everyone walks straight down to the wall
        this.wallAI(e, dx / d, dy / d, d);
        mvx = e.dx; mvy = e.dy; sp = e.state === -1 ? 0 : e.speed * (e.state === 4 ? 2.6 : 1);
      } else switch (e.kind) {
        case 'shield': e.dx = dx / d; e.dy = dy / d; break; // the shield always faces the hero
        case 'ram': // charges when close: the dash hits twice as hard
          if (d < 300 || e.state !== 0) this.dashLogic(e, dx / d, dy / d, 4.5);
          if (e.state === 2) sp = 0;
          break;
        case 'harpy': { const z = fsin(this.time * 2.6 + e.id) * 0.9; mvx = dx / d - dy / d * z; mvy = dy / d + dx / d * z; break; } // zigzag
        case 'healer':
          if (d < 280) { mvx = -mvx; mvy = -mvy; } else if (d < 340) sp = 0;
          this.healerAI(e);
          break;
        case 'archer':
          if (d < 280) { mvx = -mvx; mvy = -mvy; } else if (d < 360) sp = 0;
          if (e.atkCd <= 0 && d < 520) { e.atkCd = 3.4; this.lob(e.x, e.y, px, py, ARCHER_FLIGHT, e.dmg, 'archer'); }
          break;
        case 'ghost': e.sumT += DT; break;
        case 'shooter':
          if (d < 260) { mvx = -mvx; mvy = -mvy; } else if (d < 330) sp = 0;
          if (e.atkCd <= 0 && d < 480) { e.atkCd = 3; this.eshoot(e.x, e.y, dx / d, dy / d, 190, e.dmg); }
          break;
        case 'summoner':
          if (d < 320) { mvx = -mvx; mvy = -mvy; }
          if (e.atkCd <= 0) {
            e.atkCd = 6;
            for (let i = 0; i < 3; i++) { const g = this.spawnAt('grunt', e.x + this.rng.range(-30, 30), e.y + this.rng.range(-30, 30)); g.flash = 0.3; }
          }
          break;
        case 'exploder':
          if (e.state === 0 && d < 50) { e.state = 1; e.stateT = 0.6; }
          if (e.state === 1) {
            sp = 0; e.stateT -= DT;
            if (e.stateT <= 0) {
              e.hp = 0; e.maxHp = -1; // dies without xp drop marker handled in cleanup
              this.fx.push({ t: 'boom', x: e.x, y: e.y, r: 70, c: 'enemy' });
              if (len(px - e.x, py - e.y) < 70 + 14) this.damagePlayer(e.dmg, 'explode');
            }
          }
          break;
        case 'goldboss':
          mvx = -mvx; mvy = -mvy;
          break;
        case 'miniboss': this.minibossAI(e, dx / d, dy / d, d); if (e.state === 2) sp = 0; break;
        case 'boss': this.bossAI(e, dx / d, dy / d, d); if (e.state === 2) sp = 0; break;
        case 'bear': sp = this.bearAI(e, dx / d, dy / d, d); mvx = e.dx; mvy = e.dy; break;
      }
      if (e.state === 3) { mvx = e.dx; mvy = e.dy; sp = e.speed * 4.5; } // dash
      // separation from neighbours
      let sx = 0, sy = 0;
      if (e.kind === 'ghost' && !this.wall) { /* passes through everyone */ } else if (!isBoss(e.kind)) {
        const near = this.query(e.x, e.y, e.r, this.tmp);
        for (const o of near) {
          if (o === e) continue;
          const ox = e.x - o.x, oy = e.y - o.y, od = len(ox, oy) || 0.01, min = e.r + o.r;
          if (od < min) { const f = (min - od) / min; sx += ox / od * f; sy += oy / od * f; }
        }
      }
      if (!fly && this.inSwamp(e.x, e.y)) slow *= SWAMP_SLOW;
      e.x += (mvx * sp * slow + sx * 60 + e.vx) * DT;
      e.y += (mvy * sp * slow + sy * 60 + e.vy) * DT;
      e.vx *= 0.85; e.vy *= 0.85;
      if (this.wall) { e.x = clamp(e.x, e.r, WALL.fieldW - e.r); e.y = clamp(e.y, -160, WALL.wallY - e.r * 0.7); continue; }
      e.x = clamp(e.x, 10, RUN.arena - 10); e.y = clamp(e.y, 10, RUN.arena - 10);
      if (this.ev) [e.x, e.y] = this.bound(e.x, e.y, e.r);
      if (!isBoss(e.kind) && !fly && e.kind !== 'ghost') [e.x, e.y] = this.blockOut(e.x, e.y, e.r);
      // contact damage
      if (e.dmg > 0 && e.kind !== 'exploder' && e.touchCd <= 0) {
        const rr = e.r + 14;
        if ((px - e.x) * (px - e.x) + (py - e.y) * (py - e.y) < rr * rr) { e.touchCd = 0.6; this.damagePlayer(e.dmg * (e.kind === 'ram' && e.state === 3 ? 2 : 1), e.kind); }
      }
    }
  }

  private spawnAt(kind: EnemyKind, x: number, y: number): Enemy {
    const e = this.spawn(kind); e.x = e.px = clamp(x, 10, this.AW - 10); e.y = e.py = this.wall ? clamp(y, -160, WALL.wallY - 40) : clamp(y, 10, RUN.arena - 10); return e;
  }

  private ring(e: Enemy, n: number, speed: number, offset: number): void {
    for (let i = 0; i < n; i++) { const a = offset + i * TAU / n; this.eshoot(e.x, e.y, fcos(a), fsin(a), speed, e.dmg * 0.6); }
  }

  /** state 0 chase, 2 telegraph, 3 dash */
  private dashLogic(e: Enemy, ux: number, uy: number, every: number): void {
    if (e.state === 0 && e.atk2Cd <= 0) { e.state = 2; e.stateT = 0.7; e.dx = ux; e.dy = uy; e.atk2Cd = every; }
    else if (e.state === 2) { e.stateT -= DT; if (e.stateT <= 0) { e.state = 3; e.stateT = 0.45; } }
    else if (e.state === 3) { e.stateT -= DT; if (e.stateT <= 0) e.state = 0; }
  }

  private minibossAI(e: Enemy, ux: number, uy: number, _d: number): void {
    this.dashLogic(e, ux, uy, 4);
    if (e.atkCd <= 0 && e.state === 0) { e.atkCd = 5; this.ring(e, 16, 170, this.rng.next()); }
  }

  private bossAI(e: Enemy, ux: number, uy: number, _d: number): void {
    const f = e.hp / e.maxHp;
    const phase = f > 0.6 ? 1 : f > 0.3 ? 2 : 3;
    const rage = phase === 3 ? 1 / 1.3 : 1;
    if (e.orbHit !== phase) { e.orbHit = phase; if (phase > 1) this.fx.push({ t: 'stage', s: phase === 2 ? 'Босс: призыв и рывки' : 'Босс в ярости!' }); }
    if (phase >= 2) this.dashLogic(e, ux, uy, 5 * rage);
    if (e.state !== 0) return;
    if (e.atkCd <= 0) {
      e.atkCd = 1.5 * rage;
      const a = fatan2(uy, ux);
      for (let i = -2; i <= 2; i++) this.eshoot(e.x, e.y, fcos(a + i * 0.18), fsin(a + i * 0.18), 210, e.dmg * 0.6);
    }
    if (phase === 1 && e.atk2Cd <= 0) { e.atk2Cd = 4; this.ring(e, 20, 150, this.rng.next()); }
    if (phase >= 2) {
      e.sumT += DT;
      if (e.sumT >= 6 * rage) {
        e.sumT = 0;
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; this.spawnAt('grunt', e.x + fcos(a) * 70, e.y + fsin(a) * 70); }
        if (phase === 3) this.ring(e, 24, 160, this.rng.next());
      }
    }
  }

  /** heals hurt allies around (bosses only a little) */
  private healerAI(e: Enemy): void {
    if (e.atk2Cd > 0) return;
    e.atk2Cd = 3;
    let any = false;
    for (const o of this.query(e.x, e.y, 130, [])) {
      if (o === e || o.hp >= o.maxHp) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (isBoss(o.kind) ? 0.02 : 0.12)); any = true;
    }
    if (any) this.fx.push({ t: 'pulse', x: e.x, y: e.y, r: 130, c: 'nature' });
  }

  /** an arrow (or a boulder) in an arc: it hurts only where it lands, so the hero can step away */
  private lob(x: number, y: number, tx: number, ty: number, T: number, dmg: number, src: string, r = 30): void {
    this.eshots.push({ x, y, px: x, py: y, vx: (tx - x) / T, vy: (ty - y) / T, r, dmg, life: T, lob: T, tx, ty, src });
  }

  /** правка 112: monsters on the wall map. Sets e.dx/e.dy (way to go); e.state -1 = stands and works, 4 = rush */
  private wallAI(e: Enemy, ux: number, uy: number, d: number): void {
    const WY = WALL.wallY, atWall = e.y >= WY - e.r * 0.7 - 2;
    e.dx = 0; e.dy = 1;
    if (e.state === -1 || e.state === 4) e.state = 0;
    const stopAt = (y: number) => { if (e.y >= y) e.state = -1; };
    switch (e.kind) {
      case 'shooter': stopAt(WY - 330 - (e.id % 4) * 25);
        if (e.atkCd <= 0 && e.y > -10) { e.atkCd = 3; this.eshoot(e.x, e.y, ux, uy, 200, e.dmg); }
        break;
      case 'archer': stopAt(WY - 400 - (e.id % 4) * 25);
        if (e.atkCd <= 0 && e.y > -10) { e.atkCd = 3.4; this.lob(e.x, e.y, this.x, this.y, ARCHER_FLIGHT_WALL, e.dmg, 'archer'); }
        break;
      case 'summoner': stopAt(WY - 460);
        if (e.atkCd <= 0 && e.y > 0) { e.atkCd = 6; for (let i = 0; i < 3; i++) this.spawnAt('grunt', e.x + this.rng.range(-30, 30), e.y + this.rng.range(0, 30)).flash = 0.3; }
        break;
      case 'healer': stopAt(WY - 280); this.healerAI(e); break;
      case 'harpy': e.dx = fsin(this.time * 2.6 + e.id) * 1.1; break;
      case 'ghost': e.sumT += DT; break;
      case 'ram': if (e.y > WY - 260 && !atWall) e.state = 4; break;
      case 'harpyQueen': // hovers in front of the wall, calls harpies, shoots fans at the hero
        e.dx = fsin(this.time * 0.9) * 1.3; stopAt(WY - 420); if (e.state === -1) { e.state = 0; e.dy = 0; }
        if (e.atkCd <= 0) { e.atkCd = 2.2; const a = fatan2(uy, ux); for (let i = -1; i <= 1; i++) this.eshoot(e.x, e.y, fcos(a + i * 0.22), fsin(a + i * 0.22), 210, e.dmg * 0.6); }
        if (e.atk2Cd <= 0) { e.atk2Cd = 5; for (let i = 0; i < 3; i++) this.spawnAt('harpy', e.x + (i - 1) * 40, e.y - 20); this.fx.push({ t: 'text', x: e.x, y: e.y - 40, s: 'Ко мне!' }); }
        break;
      case 'colossus':
        if (e.atkCd <= 0 && e.y > 0) { e.atkCd = 3.5; this.lob(e.x, e.y, this.x, this.y, 1.5, e.dmg * 0.8, 'colossus', 44); }
        if (e.orbHit === 0 && e.hp < e.maxHp * 0.5) { e.orbHit = 1; for (const sd of [-1, 1]) this.spawnAt('golem', e.x + sd * 60, e.y); this.fx.push({ t: 'stage', s: 'Колосс зовёт големов!' }); }
        break;
    }
    void d;
    if (e.kind === 'exploder' && (atWall || e.state === 1)) {
      e.state = 1; e.stateT = e.stateT > 0 ? e.stateT - DT : 0.6;
      if (e.stateT <= DT) {
        e.hp = 0; e.maxHp = -1;
        this.fx.push({ t: 'boom', x: e.x, y: e.y, r: 70, c: 'enemy' });
        this.hitWall(e.dmg * 2, 'exploder');
        if (len(this.x - e.x, this.y - e.y) < 70 + 14) this.damagePlayer(e.dmg, 'explode');
      }
      e.dx = 0; e.dy = 0; return;
    }
    if (atWall) { // at the wall: stand and hit it
      e.dx = 0; e.dy = 0;
      if (e.touchCd <= 0 && e.dmg > 0) {
        const boss = e.kind === 'ogre' || e.kind === 'colossus';
        e.touchCd = boss ? 2.5 : 1;
        this.hitWall(e.dmg * (WALL_HIT[e.kind] ?? 1), e.kind);
        if (boss) this.fx.push({ t: 'boom', x: e.x, y: WY, r: 50, c: 'enemy' });
      }
    }
  }

  private eshoot(x: number, y: number, ux: number, uy: number, speed: number, dmg: number): void {
    this.eshots.push({ x, y, px: x, py: y, vx: ux * speed, vy: uy * speed, r: 7, dmg, life: 4 });
  }

  iframes = 0;
  dmgTaken: Record<string, number> = {};
  damagePlayer(d: number, src = '?'): void {
    if (this.iframes > 0) return;
    const ifr = 0.5 + (this.mods.iframes ?? 0);
    const st = this.gfx('step'); // gear: Лёгкий шаг
    if (st && this.moving && this.rng.chance(st === 2 ? 0.22 : 0.12)) { this.iframes = 0.25; this.fx.push({ t: 'text', x: this.x, y: this.y - 20, s: 'Уклон' }); return; }
    if (this.shieldUp()) { // gear: Кора
      this.shieldT = this.gfx('bark') === 2 ? 7 : 12; this.iframes = ifr;
      this.fx.push({ t: 'text', x: this.x, y: this.y - 20, s: 'Щит' }, { t: 'pulse', x: this.x, y: this.y, r: 46, c: 'nature' });
      return;
    }
    this.dmgTaken[src] = (this.dmgTaken[src] ?? 0) + d;
    this.iframes = ifr;
    this.hp -= d * (1 - this.defense());
    this.fx.push({ t: 'text', x: this.x, y: this.y - 20, s: '-' + Math.round(d * (1 - this.defense())) });
    const sk = this.gfx('spikes'); // gear: Колючки
    if (sk) {
      const R = sk === 2 ? 110 : 70;
      this.fx.push({ t: 'ring', x: this.x, y: this.y, r: R, c: 'nature' });
      const was = this.src; this.src = 'spikes';
      for (const e of this.query(this.x, this.y, R, [])) this.hurt(e, d * (sk === 2 ? 4 : 2) * this.mods.atk, ['phys']);
      this.src = was;
    }
    const tw = this.gfx('tailwind'); if (tw) this.tailT = tw === 2 ? 3 : 2;
    const br = this.gfx('breath'); // gear: Второе дыхание
    if (br && this.breathUsed < br && this.hp > 0 && this.hp < this.maxHp * 0.3) {
      this.breathUsed++; this.heal(this.maxHp * (br === 2 ? 0.4 : 0.3));
      this.fx.push({ t: 'text', x: this.x, y: this.y - 34, s: 'Второе дыхание' }, { t: 'pulse', x: this.x, y: this.y, r: 70, c: 'nature' });
    }
  }

  heal(v: number): void { this.hp = Math.min(this.maxHp, this.hp + v); }

  // ---------------- damage ----------------
  /** apply damage; returns damage dealt */
  hurt(e: Enemy, dmg: number, effects: Element[] | null, dot = false, power = 1, ult = false, crit = false): number {
    if (e.hp <= 0) return 0;
    if (e.kind === 'ghost' && e.sumT % 3 < 1) return 0; // правка 113: the ghost fades out for 1 s every 3 s
    let d = dmg * (1 - e.armor) * (e.shredT > 0 ? 1 + e.shred : 1);
    // правка 113: the shield bearer blocks 70% of shots that hit his front
    if (e.kind === 'shield' && this.hitVel && this.hitVel[0] * e.dx + this.hitVel[1] * e.dy < 0) d *= 0.3;
    if (!dot && this.lightStacks > 0) d *= 1 + 0.03 * this.lightStacks * (1 + (this.mods.elemPow?.light ?? 0)); // правка 196: the light rune counts
    if (!dot && (crit || (this.mods.crit > 0 && this.rng.chance(this.mods.crit)))) d *= this.mods.critDmg;
    if (isBoss(e.kind)) d *= 1 + this.mods.boss;
    if (e.kind === 'goldboss' && !dot) d = Math.min(d, e.maxHp * 0.06);
    this.dmgBy[this.src] = (this.dmgBy[this.src] ?? 0) + Math.min(d, e.hp);
    e.hp -= d; this.dmgDealt += d;
    if (!dot) {
      e.flash = 0.08;
      // every direct hit stops the enemy for a moment
      // (bosses only flash: with fast attacks a stop would pin them in place for the whole fight)
      if (!isBoss(e.kind)) e.hitT = 0.1;
    }
    const vamp = 0.01 * this.lvl('pVamp') + this.mods.vamp;
    if (vamp > 0) this.heal(d * vamp);
    if (effects) for (const el of effects) this.applyEffect(e, el, d, power, ult);
    if (e.hp <= 0) this.kill(e);
    return d;
  }

  private applyEffect(e: Enemy, el: Element, d: number, p: number, ult: boolean): void {
    p *= 1 + (this.mods.elemPow?.[el] ?? 0);
    switch (el) {
      case 'fire': e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, d * 0.1 * p); e.burnT = 3; e.burnSrc = this.src; break; // 30%·p of the hit over 3 s
      case 'poison': e.poisonT = 4; e.poisonDps = Math.min(e.poisonDps + d * 0.08 * p, d * 0.6 * p); e.poisonSrc = this.src; break;
      case 'dark': e.shredT = 3; e.shred = Math.max(e.shred, 0.1 * p); break;
      case 'light': this.lightStacks = Math.min(10, this.lightStacks + 1); this.lightT = 2; break;
      case 'phys': { const dx = e.x - this.x, dy = e.y - this.y, l = len(dx, dy) || 1, k = isBoss(e.kind) ? 0.1 : 1; e.vx += dx / l * 140 * p * k; e.vy += dy / l * 140 * p * k; break; }
      case 'ice':
        e.slowT = 1.5; e.slowF = Math.min(0.7, 0.25 + 0.05 * p);
        if (ult && !isBoss(e.kind) && this.rng.chance(0.25)) e.freezeT = 1;
        break;
      case 'nature': this.heal(d * NATURE_HEAL * p); break;
      case 'lightning':
        if (this.rng.chance(Math.min(0.6, 0.2 * p))) {
          const n = this.nearest(e.x, e.y, 160, [e.id]);
          if (n) { this.fx.push({ t: 'line', pts: [e.x, e.y, n.x, n.y], c: 'lightning' }); this.hurt(n, d * 0.5, null); }
        }
        break;
      case 'water': case 'air': break; // applied on the projectile itself
    }
  }

  private kill(e: Enemy): void {
    this.kills++;
    const def = ENEMIES[e.kind];
    const fz = this.gfx('frenzy'); // gear: Азарт
    if (fz && ++this.frenzyKills >= (fz === 2 ? 6 : 10)) { this.frenzyKills = 0; this.frenzyT = 3; }
    const dc = this.gfx('decay'); // gear: Распад
    if (dc && !this.inBlast && !isBoss(e.kind) && e.maxHp > 0) this.blasts.push({ x: e.x, y: e.y, r: dc === 2 ? 80 : 60, d: e.maxHp * (dc === 2 ? 0.45 : 0.25) });
    if (this.mods.killHeal && ++this.healKills >= 20) { this.healKills = 0; this.heal(this.maxHp * this.mods.killHeal); }
    this.gold += isBoss(e.kind) ? 50 : (this.rng.chance(0.05) ? 1 : 0);
    if (def.xp > 0 && !this.wall) this.dropOrbs(e.x, e.y, def.xp);
    if (e.kind === 'slime') for (const sd of [-1, 1]) { const k = this.spawnAt('slimelet', e.x + sd * 12, e.y + 4); k.vx = sd * 90; k.hitT = 0.2; } // правка 113: splits in two
    if (this.wall && isBoss(e.kind)) { this.chests.push(ENEMIES[e.kind].name); this.fx.push({ t: 'stage', s: `${ENEMIES[e.kind].name} повержен!` }); }
    if (e.kind === 'miniboss') {
      this.freeRerolls++; this.chests.push('Малый сундук');
      this.fx.push({ t: 'stage', s: 'Минибосс убит: малый сундук + бесплатный рерол' });
    }
    if (e.kind === 'goldboss') { this.rareDrops++; this.chests.push('Редкий материал'); this.fx.push({ t: 'stage', s: 'Золотой минибосс: редкая награда!' }); }
    if (e.kind === 'boss') { this.chests.push('Сундук карты'); this.phase = 'win'; this.fx.push({ t: 'stage', s: 'Победа!' }); }
  }

  private dropOrbs(x: number, y: number, v: number): void {
    if (this.orbs.length > 350) { // merge into the oldest orb to keep the count low
      this.orbs[this.rng.int(this.orbs.length)].v += v; return;
    }
    if (v > 10) {
      for (let i = 0; i < 6; i++) this.orbs.push({ x: x + this.rng.range(-30, 30), y: y + this.rng.range(-30, 30), px: x, py: y, v: v / 6, pull: false });
    } else this.orbs.push({ x, y, px: x, py: y, v, pull: false });
  }

  // ---------------- weapons ----------------
  private cd(key: string, every: number): boolean {
    const v = (this.cds.get(key) ?? 0) - DT;
    if (v <= 0) { this.cds.set(key, v + every); return true; }
    this.cds.set(key, v); return false;
  }

  arrowEffects(): Element[] {
    const fx: Element[] = [this.hero.element];
    if (this.ult && this.ult !== this.hero.element) fx.push(this.ult);
    return fx;
  }

  /** main: a regular attack (not the second shot of a double) — gear effects count these */
  private fireArrows(target: Enemy, main = true): void {
    this.src = 'arrow';
    const fx = this.arrowEffects();
    const has = (el: Element) => fx.includes(el);
    const p = this.heroPower() * (this.ult ? 1.5 : 1);
    const lanes = 1 + this.lvl('multi'); // правка 175: «+1 стрела» летит рядом, параллельно
    let n = lanes + (this.ult ? 2 : 0);
    const base = fatan2(target.y - this.y, target.x - this.x);
    // правка 196: the element rune (epic and up) makes the water and air effects of the arrow stronger, as it does for the others
    const pw = p * (1 + (this.mods.elemPow?.water ?? 0)), pa = p * (1 + (this.mods.elemPow?.air ?? 0));
    const speed = 520 * (has('air') ? 1 + 0.25 * pa : 1) * (this.ult ? 1.3 : 1);
    const dmg = 10 * (1 + ARROW_GROWTH * (this.lvl('arrow') - 1)) * this.dmgMul() * this.elemMul(this.hero.element) * this.skillMul('arrow') * (this.ult ? 2 : 1) * (has('air') ? 1.05 : 1);
    const r = 5 * (has('water') ? 1 + 0.35 * pw : 1);
    let pierce = (has('water') ? 2 : 1) + (this.famL('arrow') >= 1 ? 1 : 0);
    let crit = false, spread = 0.14;
    if (main) {
      const k = this.atkCount, every = (lv: number, a: number, b: number) => lv > 0 && k % (lv === 2 ? b : a) === 0;
      const vo = this.gfx('volley'); if (every(vo, 4, 3)) { n += vo === 2 ? 3 : 2; spread = 0.12; } // Солнечный залп
      const th = this.gfx('thorn'); if (every(th, 4, 3)) pierce += th === 2 ? 3 : 2;      // Шипы
      if (every(this.gfx('glint'), 5, 3)) crit = true;                                  // Блик
      if (this.famL('arrow') >= 3 && k % 4 === 0 && this.lvl('double') === 0) this.doubleQueue = 4;
    }
    const shoot = (a: number, off: number, k = 1) => {
      const sh = this.mkShot('arrow', fcos(a) * speed, fsin(a) * speed, r, dmg * k, pierce, 1.1, fx, p, this.ult !== null);
      if (off) { sh.x += -fsin(a) * off; sh.y += fcos(a) * off; sh.px = sh.x; sh.py = sh.y; }
      if (crit) sh.crit = true;
      this.shots.push(sh);
    };
    // the skill's arrows fly side by side, ARROW_GAP apart, all straight at the target
    // правка 188: the extra arrows of «+1 / +2 стрела» hit at EXTRA_ARROW of the main one (all at full power made the arrow ×3)
    const mid = (lanes - 1) / 2;
    for (let i = 0; i < lanes; i++) shoot(base, (i - mid) * ARROW_GAP, lanes > 1 && i !== Math.round(mid) ? EXTRA_ARROW : 1);
    // extra arrows of the awakening and of Солнечный залп still fan out to both sides
    for (let j = 0; j < n - lanes; j++) shoot(base + (j % 2 ? -1 : 1) * (Math.floor(j / 2) + 1) * spread, 0);
  }

  private mkShot(kind: Shot['kind'], vx: number, vy: number, r: number, dmg: number, pierce: number, life: number, effects: Element[], power: number, ult = false): Shot {
    if (this.wall && (kind === 'arrow' || kind === 'shard' || kind === 'jet' || kind === 'wind' || kind === 'spark' || kind === 'fireball')) life *= WALL.reach;
    return { id: this.nextId++, kind, x: this.x, y: this.y, px: this.x, py: this.y, vx, vy, r, dmg, pierce, life, age: 0, effects, power, hit: [], tx: 0, ty: 0, ult, src: this.src };
  }

  private weapons(): void {
    const dm = this.dmgMul();
    // corpses that blow up (gear: Распад): blasts from blasts do not chain
    if (this.blasts.length) {
      this.inBlast = true; this.src = 'decay';
      for (const b of this.blasts) {
        this.fx.push({ t: 'boom', x: b.x, y: b.y, r: b.r, c: 'dark' });
        for (const e of this.query(b.x, b.y, b.r, [])) this.hurt(e, b.d, ['dark'], true);
      }
      this.blasts.length = 0; this.inBlast = false;
    }
    // wave of darkness around the hero (gear: Импульс тьмы)
    const pl = this.gfx('pulse');
    if (pl && this.cd('g_pulse', pl === 2 ? 3 : 5)) {
      this.src = 'pulse';
      const R = (pl === 2 ? 125 : 90) * this.area();
      this.fx.push({ t: 'pulse', x: this.x, y: this.y, r: R, c: 'dark' });
      for (const e of this.query(this.x, this.y, R, [])) this.hurt(e, 25 * dm * this.elemMul('dark'), ['dark']);
    }
    // hero arrow
    const fz = this.gfx('frenzy');
    const rate = 0.45 / (this.mods.atkSpeed * (fz && this.frenzyT > 0 ? (fz === 2 ? 1.45 : 1.3) : 1) * (this.famL('arrow') >= 2 ? 1.15 : 1));
    if (this.cd('arrow', rate)) {
      const t = this.nearest(this.x, this.y, this.reach(480));
      if (t) {
        this.atkCount++;
        this.fireArrows(t, true);
        if (this.lvl('double') > 0) this.doubleQueue = 4;
      } else this.cds.set('arrow', 0);
    }
    if (this.doubleQueue > 0 && --this.doubleQueue === 0) {
      const t = this.nearest(this.x, this.y, this.reach(480));
      if (t) this.fireArrows(t, false);
    }
    // element skills
    for (const el of ELEMENTS) {
      const id = ELEMENT_SKILL[el], L = this.lvl(id);
      if (L === 0) continue;
      this.elementSkill(id, el, L, dm * this.elemMul(el) * this.skillMul(id) * skillBoost(id));
    }
    for (const [id, el] of EXTRA_SKILLS) { // second skills of an element
      const L = this.lvl(id);
      if (L > 0) this.elementSkill(id, el, L, dm * this.elemMul(el) * this.skillMul(id) * skillBoost(id));
    }
  }

  private elementSkill(id: SkillId, el: Element, L: number, dm: number): void {
    this.src = id;
    const near = () => this.nearest(this.x, this.y, this.reach(460));
    const aim = (t: Enemy | null) => t ? fatan2(t.y - this.y, t.x - this.x) : fatan2(this.faceY, this.faceX);
    // family runes: 1 epic, 2 legendary, 3 mythic
    const bl = this.famL('blast'), ms = this.famL('missiles'), stm = this.famL('storm'), au = this.famL('auras');
    const blastR = bl >= 3 ? 1.4 : bl >= 1 ? 1.2 : 1, blastCd = bl >= 3 ? 0.6 : bl >= 2 ? 0.75 : 1;
    const nMis = 1 + (ms >= 1 ? 1 : 0) + (ms >= 3 ? 1 : 0), misR = ms >= 2 ? 1.3 : 1;
    const stormCd = stm >= 3 ? 0.6 : stm >= 2 ? 0.75 : 1;
    const fan = (a: number, k: number, step: number) => a + (k - (nMis - 1) / 2) * step;
    switch (id) {
      case 'fireball': if (this.cd(id, 2.0 * blastCd)) {
        const t = near(); if (!t) { this.cds.set(id, 0); break; }
        const a = aim(t), s = this.mkShot('fireball', fcos(a) * 330, fsin(a) * 330, 9, (20 + 10 * L) * dm, 1, 1.6, ['fire'], 1 + 0.2 * L);
        s.tx = (55 + 10 * L) * this.area() * blastR; this.shots.push(s);
      } break;
      case 'meteor': if (this.cd(id, 3.2 * blastCd)) { // rune-only skill: falls from the sky on a random enemy nearby
        const n = L >= 4 ? 2 : 1, near2 = this.query(this.x, this.y, this.wall ? 640 : 330, []); // only where the player can see it
        for (let k = 0; k < n; k++) {
          const t = near2.length ? near2[this.rng.int(near2.length)] : null;
          if (!t) { if (k === 0) this.cds.set(id, 0.3); break; }
          const s = this.mkShot('meteor', 0, 0, 12, (25 + 12 * L) * dm, 0, 0.7, ['fire', 'phys'], 1 + 0.15 * L);
          s.x = s.px = t.x; s.y = s.py = t.y; s.tx = (60 + 8 * L) * this.area() * blastR;
          this.shots.push(s);
        }
      } break;
      case 'iceShards': if (this.cd(id, 1.8)) {
        const t = near(); if (!t) { this.cds.set(id, 0); break; }
        const a = aim(t), n = 3 + L + 2 * (nMis - 1);
        for (let i = 0; i < n; i++) { const b = a + (i - (n - 1) / 2) * 0.16; this.shots.push(this.mkShot('shard', fcos(b) * 420, fsin(b) * 420, 5 * misR, (8 + 4 * L) * dm, 1, 0.8, ['ice'], 1 + 0.2 * L)); }
      } break;
      case 'natureAura': if (this.cd(id, 0.5)) { // steady damage to everyone inside the ring
        const r = this.auraR(id), dps = AURA.natureDps(L) * (au >= 3 ? 1.4 : 1);
        void r; for (const e of this.inAura(id, [])) { this.hurt(e, dps * 0.5 * dm, null, true); if (au >= 2) this.auraSlow(e); }
      } break;
      case 'poisonAura': if (this.cd(id, 0.5)) { // poison builds up while they stay in the cloud
        const r = this.auraR(id), cap = AURA.poisonDps(L) * dm * (au >= 3 ? 1.4 : 1);
        void r; for (const e of this.inAura(id, [])) { e.auraPT = Math.max(e.auraPT, 1.5); e.auraPDps = Math.min(cap, e.auraPDps + cap * 0.25); if (au >= 2) this.auraSlow(e); }
      } break;
      case 'lightBeam': if (this.cd(id, 3.0 * stormCd)) {
        const t = near(); if (!t) { this.cds.set(id, 0); break; }
        const a = aim(t), ux = fcos(a), uy = fsin(a), L2 = this.reach(620), w = (14 + 3 * L) * this.area() * (stm >= 1 ? 1.3 : 1);
        this.fx.push({ t: 'beam', x: this.x, y: this.y, x2: this.x + ux * L2, y2: this.y + uy * L2, w });
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const rx = e.x - this.x, ry = e.y - this.y, proj = rx * ux + ry * uy;
          if (proj < 0 || proj > L2) continue;
          const perp = Math.abs(rx * uy - ry * ux);
          if (perp < w + e.r) this.hurt(e, (20 + 10 * L) * dm, ['light']);
        }
      } break;
      case 'sprites': { // rune-only skill: spirits circle the hero and shoot sparks in turn
        const n = this.spriteCount();
        this.spriteAngle += 2.2 * DT;
        if (n > 0 && this.cd(id, (1.5 - 0.1 * L) * stormCd / n)) {
          const i = this.spriteNext++ % n, a0 = this.spriteAngle + i * TAU / n;
          const sx = this.x + fcos(a0) * 46, sy = this.y + fsin(a0) * 46;
          const t = this.nearest(sx, sy, this.reach(420)); if (!t) { this.cds.set(id, 0.2); break; }
          const a = fatan2(t.y - sy, t.x - sx), s = this.mkShot('spark', fcos(a) * 480, fsin(a) * 480, 5, (9 + 4 * L) * dm, 1, 1.0, ['light'], 1);
          s.x = s.px = sx; s.y = s.py = sy; this.shots.push(s);
        }
      } break;
      case 'darkOrbs': case 'fireOrbs': case 'iceOrbs': case 'boltOrbs': {
        const o = ORBS[id]!, n = this.orbCount(id);
        const ang = (this.orbAngles[id] ?? 0) + o.sp * this.orbSpin() * DT; this.orbAngles[id] = ang;
        if (id === 'darkOrbs') this.orbAngle = ang;
        const tick = this.tick;
        for (let i = 0; i < n; i++) {
          const a = ang + i * TAU / n, [ox, oy] = this.orbXY(o.R, a);
          for (const e of this.query(ox, oy, 11, this.tmp)) {
            const key = 'o:' + id + e.id;
            if ((this.cds.get(key) ?? 0) > tick) continue;
            this.cds.set(key, tick + 15);
            const d = ORB_HIT(L) * dm;
            this.hurt(e, d, [o.el]);
            if (id === 'iceOrbs' && e.hp > 0 && !isBoss(e.kind) && e.slowT > 0.5 && this.rng.chance(0.2)) e.freezeT = 0.8;
            if (id === 'boltOrbs') {
              const nb = this.nearest(e.x, e.y, 140, [e.id]);
              if (nb) { this.fx.push({ t: 'line', pts: [e.x, e.y, nb.x, nb.y], c: 'lightning' }); this.hurt(nb, d * 0.35, null); }
            }
          }
        }
      } break;
      case 'chain': if (this.cd(id, 2.0 * stormCd)) {
        let cur = near(); if (!cur) { this.cds.set(id, 0); break; }
        const hits: number[] = []; const pts = [this.x, this.y];
        const n = Math.min(7, 2 + L) + (stm >= 1 ? 2 : 0) + (stm >= 3 ? 2 : 0);
        for (let i = 0; i < n && cur; i++) {
          hits.push(cur.id); pts.push(cur.x, cur.y);
          this.hurt(cur, (15 + 8 * L) * dm, ['lightning']);
          cur = this.nearest(cur.x, cur.y, 170, hits);
        }
        this.fx.push({ t: 'line', pts, c: 'lightning' });
      } break;
      case 'waterJet': if (this.cd(id, 2.2)) {
        const t = near(); if (!t) { this.cds.set(id, 0); break; }
        const a = aim(t);
        for (let k = 0; k < nMis; k++) { const b = fan(a, k, 0.22); this.shots.push(this.mkShot('jet', fcos(b) * 380, fsin(b) * 380, (16 + 2 * L) * this.area() * misR, (10 + 6 * L) * dm, 99, 0.9, ['water', 'phys'], 1 + 0.2 * L)); }
      } break;
      case 'boomerang': if (this.cd(id, 2.0)) {
        const t = near(); const a = aim(t);
        for (let k = 0; k < nMis; k++) { const b = fan(a, k, 0.35); this.shots.push(this.mkShot('boomerang', fcos(b) * 420, fsin(b) * 420, 12 * misR, (15 + 7 * L) * dm, 99, 2.0, ['phys'], 0.6)); }
      } break;
      case 'wind': if (this.cd(id, 1.8)) {
        const a = aim(near());
        for (let k = 0; k < nMis; k++) { const b = fan(a, k, 0.25); this.shots.push(this.mkShot('wind', fcos(b) * 360, fsin(b) * 360, (24 + 3 * L) * this.area() * misR, (12 + 6 * L) * dm, 99, 1.0, ['air'], 1)); }
      } break;
      case 'poisonFlask': if (this.cd(id, 3.0 * blastCd)) {
        const t = this.enemies.length ? this.enemies[this.rng.int(this.enemies.length)] : null;
        if (!t || t.hp <= 0 || len(t.x - this.x, t.y - this.y) > this.reach(480)) { this.cds.set(id, 0.3); break; }
        const s = this.mkShot('flask', 0, 0, 7, 0, 0, 0.6, ['poison'], 1);
        s.tx = t.x; s.ty = t.y; s.dmg = (10 + 5 * L) * dm; s.r = (60 + 8 * L) * this.area() * blastR; // r = pool radius
        s.vx = (t.x - this.x) / 0.6; s.vy = (t.y - this.y) / 0.6;
        this.shots.push(s);
      } break;
    }
    void el;
  }

  /** family rune of auras (legendary): everyone inside is slowed */
  private auraSlow(e: Enemy): void {
    e.slowF = e.slowT > 0 ? Math.max(e.slowF, 0.2) : 0.2;
    e.slowT = Math.max(e.slowT, 0.6);
  }

  // ---------------- projectiles ----------------
  private updateShots(): void {
    for (const s of this.shots) {
      if (s.life <= 0) continue;
      s.age += DT; s.life -= DT;
      if (s.kind === 'boomerang' && s.age > 0.7) { // return
        const dx = this.x - s.x, dy = this.y - s.y, d = len(dx, dy) || 1;
        s.vx += dx / d * 1400 * DT; s.vy += dy / d * 1400 * DT;
        const v = len(s.vx, s.vy); if (v > 520) { s.vx *= 520 / v; s.vy *= 520 / v; }
        if (d < 20 && s.age > 0.9) { s.life = 0; continue; }
        if (s.hit.length > 0 && s.age > 0.7 && s.age - DT <= 0.7) s.hit = [];
      }
      s.x += s.vx * DT; s.y += s.vy * DT;
      if (s.kind === 'flask') {
        if (s.life <= 0) { this.pools.push({ x: s.tx, y: s.ty, r: s.r, dps: s.dmg, life: 3, elem: 'poison', src: s.src }); }
        continue;
      }
      this.src = s.src;
      if (s.kind === 'meteor') { if (s.life <= 0) this.explode(s, ['fire', 'phys']); continue; } // falling: hits only on landing
      const hitR = s.kind === 'shard' || s.kind === 'arrow' ? s.r : s.r;
      for (const e of this.query(s.x, s.y, hitR, this.tmp)) {
        if (s.pierce <= 0) break;
        if (s.hit.includes(e.id)) continue;
        s.hit.push(e.id);
        if (s.kind === 'fireball') { this.explode(s); s.pierce = 0; break; }
        this.hitVel = [s.vx, s.vy];
        // правка 187: ледяная стрела бьёт замедленных и замороженных на 20% сильнее
        const chill = s.kind === 'arrow' && (e.slowT > 0 || e.freezeT > 0) && s.effects.includes('ice') ? ICE_ARROW_BONUS : 1;
        this.hurt(e, s.dmg * chill, s.effects, false, s.power, s.ult, s.crit);
        this.hitVel = null;
        const ex = s.kind === 'arrow' ? this.gfx('execute') : 0; // gear: Казнь
        if (ex && e.hp > 0 && !isBoss(e.kind) && e.hp < e.maxHp * (ex === 2 ? 0.25 : 0.15)) { this.fx.push({ t: 'text', x: e.x, y: e.y, s: '✖' }); this.src = 'execute'; this.hurt(e, e.hp + 1, null, true); this.src = s.src; }
        if (s.kind === 'jet' || s.kind === 'wind') { const d = len(s.vx, s.vy) || 1; const k = isBoss(e.kind) ? 0.05 : 1; e.vx += s.vx / d * 90 * k; e.vy += s.vy / d * 90 * k; }
        if (s.kind !== 'boomerang' && s.pierce < 90) s.pierce--;
      }
      if (s.pierce <= 0) s.life = 0;
      if (s.kind === 'fireball' && s.life <= 0 && s.pierce > 0) this.explode(s);
    }
  }

  private explode(s: Shot, effects: Element[] = ['fire']): void {
    this.fx.push({ t: 'boom', x: s.x, y: s.y, r: s.tx, c: 'fire' });
    for (const e of this.query(s.x, s.y, s.tx, [])) this.hurt(e, s.dmg, effects, false, s.power);
    s.life = 0; s.pierce = 0;
  }

  private updateEShots(): void {
    for (const b of this.eshots) {
      if (b.life <= 0) continue;
      b.life -= DT; b.x += b.vx * DT; b.y += b.vy * DT;
      if (b.lob) { // arc: lands at its target, hurts only there
        if (b.life > 0) continue;
        const rr = b.r + 12;
        if ((b.tx! - this.x) ** 2 + (b.ty! - this.y) ** 2 < rr * rr) this.damagePlayer(b.dmg, b.src ?? 'archer');
        else if (this.wall) this.hitWall(b.dmg * 0.6, b.src ?? 'archer');
        this.fx.push({ t: 'boom', x: b.tx!, y: b.ty!, r: b.r, c: 'enemy' });
        continue;
      }
      const rr = b.r + 12;
      if ((b.x - this.x) * (b.x - this.x) + (b.y - this.y) * (b.y - this.y) < rr * rr) { this.damagePlayer(b.dmg, 'bullet'); b.life = 0; }
      else if (this.wall && b.y >= WALL.wallY - 4) { this.hitWall(b.dmg * 0.5, 'shooter'); b.life = 0; }
    }
  }

  private updatePools(): void {
    for (const p of this.pools) {
      p.life -= DT; this.src = p.src ?? 'poisonFlask';
      for (const e of this.query(p.x, p.y, p.r, this.tmp)) if (!FLYING.includes(e.kind)) this.hurt(e, p.dps * DT, null, true);
      // also refresh poison status so the tint shows
      for (const e of this.tmp) { e.poisonT = Math.max(e.poisonT, 0.2); }
    }
  }

  private updateOrbs(): void {
    const pr = this.pickup(), xpMul = 1 + 0.1 * this.lvl('pXp') + (this.mods.xp ?? 0);
    for (const o of this.orbs) {
      if (o.v <= 0) continue;
      const dx = this.x - o.x, dy = this.y - o.y, d = len(dx, dy);
      if (d < pr) o.pull = true;
      if (o.pull) {
        const sp = 520 * DT;
        if (d < 16 || d < sp) { this.gainXp(o.v * xpMul); this.xpTotal += o.v * xpMul; o.v = 0; continue; }
        o.x += dx / d * sp; o.y += dy / d * sp;
      }
    }
  }

  // ---------------- level-ups ----------------
  private gainXp(v: number): void {
    if (this.upgrades >= this.maxUpgrades()) return;
    this.xp += v;
    if (this.xp >= this.xpNext && this.phase === 'play') {
      this.xp -= this.xpNext;
      this.level++;
      // curve: ~20 upgrades in 6 minutes
      this.xpNext = Math.floor(3 + this.level * 2 + this.level * this.level * 0.22);
      if (this.mods.lvlHeal) this.heal(this.maxHp * this.mods.lvlHeal);
      this.cards = this.rollCards();
      if (this.cards.length) this.phase = 'choose';
    }
  }

  private eligible(): Card[] {
    const out: Card[] = [];
    const owned = (k: string) => [...this.skills.entries()].filter(([id, l]) => l > 0 && SKILLS[id].kind === k).length;
    const elemOwned = owned('element'), passOwned = owned('passive');
    for (const def of Object.values(SKILLS)) {
      const L = this.lvl(def.id);
      if (L >= def.max) continue;
      if (def.rune && L === 0 && !this.mods.unlock?.includes(def.id)) continue; // needs its rune
      if (def.kind === 'element' && L === 0 && elemOwned >= RUN.maxElementSkills) continue;
      if (def.kind === 'passive' && L === 0 && passOwned >= RUN.maxPassives) continue;
      if ((this.wall || this.ev === 'boss') && (def.id === 'pXp' || def.id === 'pPickup')) continue; // no xp gems on the wall and at the bear
      if (this.wall && def.id in ORBS) continue; // правка 117: no circling spheres on the wall
      out.push({ id: def.id, title: def.name, desc: def.desc, level: L + 1 });
    }
    if (!this.ult && this.lvl('arrow') >= 5) {
      for (const el of ELEMENTS) {
        if (this.lvl(ELEMENT_SKILL[el]) >= 5 || EXTRA_SKILLS.some(([x, e2]) => e2 === el && this.lvl(x) >= 5)) out.push({ id: 'ult', ultElem: el, title: 'Ультимейт: стрела + ' + ELEMENT_NAME[el], desc: 'Стрела ×2 урона, +2 стрелы, быстрее, эффект второй стихии', level: 1 });
      }
    }
    return out;
  }

  private rollCards(): Card[] {
    const pool = this.eligible();
    const ult = pool.filter(c => c.id === 'ult');
    const rest = pool.filter(c => c.id !== 'ult');
    const out: Card[] = [];
    if (ult.length) out.push(ult[0]); // the ultimate is always offered once available
    // attack skills already taken come up three times as often: easier to finish a build
    // family runes make their cards come up more often
    const weight = (c: Card) => {
      const d = SKILLS[c.id as SkillId], f = SKILL_FAMILY[c.id as SkillId];
      return (d && d.kind !== 'passive' && this.lvl(c.id as SkillId) > 0 ? 3 : 1) * (f ? this.mods.famW?.[f] ?? 1 : 1);
    };
    while (out.length < 3 && rest.length) {
      let r = this.rng.next() * rest.reduce((a, c) => a + weight(c), 0), k = 0;
      while (k < rest.length - 1 && (r -= weight(rest[k])) >= 0) k++;
      out.push(rest.splice(k, 1)[0]);
    }
    return out;
  }

  rerollCost(): number { return this.freeRerolls > 0 ? 0 : 10 + 10 * this.rerollsUsed; }

  private reroll(): void {
    if (this.freeRerolls > 0) this.freeRerolls--; else this.rerollsUsed++; // crystals: charged by the server
    this.cards = this.rollCards();
  }

  private pick(c: Card): void {
    if (c.id === 'ult') { this.ult = c.ultElem ?? null; this.upgrades++; }
    else {
      this.skills.set(c.id, this.lvl(c.id) + 1);
      this.upgrades++;
      if (c.id === 'pHp') {
        const old = this.maxHp; this.maxHp = 100 * this.mods.hp * (1 + 0.1 * this.lvl('pHp')); this.hp += this.maxHp - old;
        if (this.wall) { const w0 = this.wallMax; this.wallMax = this.wallMaxHp(); this.wallHp += this.wallMax - w0; }
      }
    }
    this.cards = [];
    this.phase = 'play';
  }

  // ---------------- housekeeping ----------------
  private cleanup(): void {
    if (this.tick % 15 === 0) {
      this.enemies = this.enemies.filter(e => e.hp > 0);
      this.shots = this.shots.filter(s => s.life > 0);
      this.eshots = this.eshots.filter(s => s.life > 0);
      this.orbs = this.orbs.filter(o => o.v > 0);
      this.pools = this.pools.filter(p => p.life > 0);
      if (this.boss && this.boss.hp <= 0) this.boss = this.phase === 'win' ? this.boss : null;
      if (this.miniboss && this.miniboss.hp <= 0) this.miniboss = null;
      for (const k of [...this.cds.keys()]) if (k.startsWith('o:') && (this.cds.get(k) ?? 0) < this.tick) this.cds.delete(k);
    }
  }

  /** Compact state hash: the server compares this after replaying the inputs. */
  hash(): string {
    let h = 2166136261 >>> 0;
    const mix = (v: number) => { h ^= Math.round(v * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
    mix(this.tick); mix(this.x); mix(this.y); mix(this.hp); mix(this.kills); mix(this.level); mix(this.rng.state());
    for (const e of this.enemies) { mix(e.id); mix(e.x); mix(e.y); mix(e.hp); }
    if (this.wall) { mix(this.wallHp); mix(this.wave); }
    if (this.ev) { mix(this.wave); mix(this.dmgDealt); }
    return h.toString(16).padStart(8, '0');
  }
}

export function isBoss(k: EnemyKind): boolean {
  return k === 'miniboss' || k === 'boss' || k === 'goldboss' || k === 'ogre' || k === 'harpyQueen' || k === 'colossus' || k === 'bear';
}

/** Replay a recorded match (what the server does). */
export function replay(cfg: MatchConfig, inputs: Input[]): Match {
  const m = new Match(cfg);
  for (const i of inputs) m.step(i);
  return m;
}
