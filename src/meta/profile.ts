// Player account: currencies, heroes, gear, gems, runes and every action on them.
// Stage 1 keeps it on the phone (localStorage). On stage 2 the same actions move
// to the server and the phone only shows the result.
import { ELEMENTS, Element, HEROES, SKILLS, SkillId, GearFx, FAMILY_NAME, WALL, WALL_MAPS, dayNumber, wallOfDay, EVENT, EventId } from '../core/content';
import { BASE_MODS, RunMods, Match, Input, MatchConfig } from '../core/sim';
import {
  BIG_COUPON, CR_SEARCH, DROP_ODDS, DUP_PARTICLES, ENERGY, ESS_BIG, ESS_SMALL, GEAR_CHEST_ODDS, GEM, GEM_FEED_XP,
  GEM_STAR_EFF, GEM_TYPES, GOLD_SEARCH, GemType, HERO_MAX_LEVEL, IDLE, PRICE, RARITY_BONUS, RARITY_CAP,
  RUNE_CRAFT, RUNE_CRAFT_TYPE, RUNE_UP, RUNE_K, RUNES, RuneId, RuneType, RUNE_SLOT_TYPE, RUNE_TYPE_NAME, BLESS_RUNES, FAMILY_RUNES, RUNE_SKILLS,
  FAMILY_W, runeDupes, runeWorth, runeTier, SETS, SLOTS, EPIC, LEGEND, MYTHIC, MERGE_RULE, DMG_SLOTS, SET_FX,
  GEAR_MAIN, GEAR_STEP, HERO_STAT, SET_PCT, SET_SECOND, STAT_UNIT, rarityK, gemShare, gemFits, gemSlotsOf,
  SMALL_COUPON, STAR_LEVEL, STAR_PARTICLES, SetId, Slot, gemXpFor, heroXpFor, levelCost, runeSlots, spentTo,
  RARITIES, SLOT_NAME, SET_NAME, WEAPON_NAME, RUNE_RARITY, GEM_LOCATIONS, GEM_FREE_PER_DAY, CHESTS, CHEST_X10, ChestId, HERO_UNLOCK_PARTICLES,
} from './defs';
import { ELEMENT_NAME } from '../core/content';

export interface HeroState { owned: boolean; level: number; xp: number; stars: number; particles: number; runes: (number | null)[] }
export interface Item { uid: number; slot: Slot; set: SetId | null; rarity: number; level: number; gems: (number | null)[] }
export interface Gem { uid: number; type: GemType; stars: number; level: number; xp: number }
/** a rune: its kind (id), rarity step 0..9, and the element or skill for the runes that have one */
export interface Rune { uid: number; id: RuneId; rarity: number; elem?: Element; skill?: SkillId }

export interface Profile {
  v: 1;
  /** 2: gear with +1/+2/+3 steps and runes by type (Archero 2 style) */
  gv?: number;
  gold: number; crystals: number; scrolls: number; essSmall: number; essBig: number; shards: number;
  energy: number; energyAt: number;
  couponsSmall: number; couponsBig: number;
  heroes: Record<string, HeroState>;
  active: string;
  items: Item[]; equipped: Record<Slot, number | null>;
  gems: Gem[];
  /** @deprecated v0.5: gems live in item sockets */ bookGems?: (number | null)[];
  runes: Rune[];
  maxMap: number;
  idleAt: number; fastIdleDay: string;
  pityGem: number; pityGem4?: number; pityCoupon: number; pityLottery: number; lotteryFreeDay: string;
  energyBuys: { day: string; n: number };
  nextUid: number;
  seen: string[];
  runs: number; wins: number;
  pityChest?: Partial<Record<ChestId, number>>;
  daily?: { day: string; bought: string[] };
  explore?: { loc: number; freeDay: string; freeUsed: number };
  tasks?: TaskState;
  login?: { idx: number; last: string };
  market?: { week: string; wb: Record<string, number>; month: string; mb: Record<string, number> };
  bp?: BpState;
  passes?: PassState;
  testPay?: boolean;
  /** правка 172: rewarded ads watched today, by kind */
  ads?: { day: string; n: Partial<Record<AdKind, number>> };
  /** правка 173: crystal packs bought at least once (the first purchase gives ×2); правка 172: the starter pack is bought */
  packs?: string[]; starter?: boolean;
  /** do not ask before spending crystals (79) */
  noConfirm?: boolean;
  /** правки 112, 115: wall defence */
  wall?: WallState;
  /** правки 125, 126: the events «Убийство босса» and «Фраги» */
  events?: Partial<Record<EventId, EvState>>;
  /** правка 120: battle graphics — high (sharp, 60 fps), mid (a bit softer, 60 fps), eco (soft, 30 fps) */
  gfx?: 'high' | 'mid' | 'eco';
  fps?: boolean; // правка 163: счётчик кадров в бою (по умолчанию выключен)
  tut?: number;  // правка 164: сколько обычных боёв сыграно с подсказками (подсказки — в первых 3)
}
export const GFX = {
  high: { name: 'Высокое', dpr: 2, fps: 60, note: 'чётко, 60 кадров' },
  mid: { name: 'Среднее', dpr: 1.5, fps: 60, note: 'чуть мягче, 60 кадров — меньше греется' },
  eco: { name: 'Экономия', dpr: 1.25, fps: 30, note: 'мягче, 30 кадров — бережёт батарею' },
} as const;

/** правка 185: the input record of a best run lives beside the profile (its own key on the phone), not inside it:
 *  the profile goes to the server on every save, and one event run is 40–100 KB of inputs */
export const runKey = (k: 'wall' | EventId) => `mw-run-${k}`;
function keepRun(k: 'wall' | EventId, rec: WallRecord): WallRecord {
  if (!rec.inputs) return rec;
  try { localStorage.setItem(runKey(k), JSON.stringify({ at: rec.at, hash: rec.hash, inputs: rec.inputs })); } catch { /* storage unavailable */ }
  return { ...rec, inputs: '' };
}
/** the inputs of a kept record (for the server), '' if they are gone */
export function runInputs(k: 'wall' | EventId, rec: WallRecord): string {
  try { const r = JSON.parse(localStorage.getItem(runKey(k)) ?? 'null') as { at: number; hash: string; inputs: string } | null; return r && r.at === rec.at && r.hash === rec.hash ? r.inputs : ''; } catch { return ''; }
}
/** a finished wall run, kept for the server: it will replay the inputs and put the result on the leaderboard */
export interface WallRecord {
  day: number; week: string; map: string; wave: number; time: number; hero: string; power: number;
  cfg: MatchConfig; inputs: string; hash: string; ok: boolean; at: number;
  /** the player gave up (the server sets hp to 0 after the replay, as the phone did) */
  quit?: boolean;
}
export interface WallState {
  /** day number (UTC) the counters below belong to */
  day: number; used: number;
  best: number; bestTime: number;
  week: string; bestWeek: number;
  bestAll: number;
  /** best wave on every map */
  byMap: Record<string, number>;
  /** waves (10, 20, 30) whose chest was already taken today (правка 116: every day) */
  chests: number[];
  /** best run of the week and the last run, ready to be sent to the server */
  weekRun?: WallRecord; lastRun?: WallRecord;
}

/** правки 125, 126: one event, one day: tries, the best run, the group of 20 it is ranked in */
export interface EvState {
  day: number; used: number;
  best: number; bestTime: number;
  /** the best run of the day with its inputs, for the server */
  run?: WallRecord;
  /** the other 19 of the group. Until the server (stage 2) they are test players, marked so */
  group: EvOpp[];
  /** the day before: place and reward, shown once */
  last?: { day: number; place: number; score: number; label: string; seen?: boolean };
}
export interface EvOpp { name: string; hero: string; power: number; score: number }

const KEY = 'mw-profile-v1';
const today = () => new Date().toISOString().slice(0, 10);
const rnd = Math.random;
const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const roll = (odds: readonly number[]) => { let r = rnd(); for (let i = 0; i < odds.length; i++) { if (r < odds[i]) return i; r -= odds[i]; } return odds.length - 1; };

export class GameError extends Error {}
const fail = (msg: string): never => { throw new GameError(msg); };

// ---------------- create / save ----------------
export function newProfile(starter: string): Profile {
  const heroes: Record<string, HeroState> = {};
  for (const h of HEROES) heroes[h.id] = { owned: h.id === starter, level: 1, xp: 0, stars: 0, particles: 0, runes: [null, null, null, null, null, null] };
  const p: Profile = {
    v: 1, gold: 2000, crystals: 300, scrolls: 20, essSmall: 3, essBig: 0, shards: 50,
    energy: ENERGY.max, energyAt: Date.now(), couponsSmall: 1, couponsBig: 0,
    heroes, active: starter,
    items: [], equipped: { book: null, mantle: null, gloves: null, boots: null, amulet: null, ring: null },
    gems: [], runes: [],
    maxMap: 0, idleAt: Date.now(), fastIdleDay: '', pityGem: 0, pityCoupon: 0, pityLottery: 0, lotteryFreeDay: '',
    energyBuys: { day: '', n: 0 }, nextUid: 1, seen: [], runs: 0, wins: 0, gv: 2,
  };
  // starter kit: a common book and one gem
  const book = addItem(p, 'book', 'guard', 0); p.equipped.book = book.uid;
  const g = addGem(p, 'ruby', 1); book.gems[0] = g.uid;
  return p;
}

/** правка 191: the save on the phone is there but cannot be read — the game must not start a new account over it */
let broken = false;
export const loadBroken = () => broken;
export function load(): Profile | null {
  broken = false;
  let s: string | null = null;
  try { s = localStorage.getItem(KEY); } catch { return null; }
  if (!s) return null;
  try {
    const p = JSON.parse(s) as Profile;
    if (!p || typeof p !== 'object' || !p.heroes || !p.equipped || !Array.isArray(p.items)) throw new Error('not a profile');
    p.equipped.ring ??= null; // added in v0.4
    for (const it of p.items) if (it.slot === 'book' && !it.set) it.set = 'guard'; // v0.9: books became the Guard set's weapon
    for (const it of p.items) it.gems ??= [null, null, null, null]; // v0.5: sockets in every item
    if (p.bookGems) {
      const book = p.items.find(i => i.uid === p.equipped.book);
      if (book) p.bookGems.filter((x): x is number => x !== null).slice(0, 4).forEach((u, i) => { book.gems[i] = u; });
      delete p.bookGems;
    }
    const ex = p.explore as unknown as { found?: { type: GemType; stars: number }[] } | undefined;
    if (ex?.found?.length) { for (const f of ex.found) addGem(p, f.type, f.stars); ex.found = []; }
    if ((p.gv ?? 1) < 2) { migrateV2(p); save(p); }
    // правка 157: a gem that does not fit its item any more goes back to the Jeweller (the gem itself is kept)
    for (const it of p.items) it.gems = it.gems.map(u => { const g = u === null ? null : p.gems.find(x => x.uid === u); return g && !gemFits(g.type, it.slot) ? null : u; });
    // правка 185: input records move out of the profile
    if (p.wall?.weekRun?.inputs) p.wall.weekRun = keepRun('wall', p.wall.weekRun);
    for (const ev of Object.keys(p.events ?? {}) as EventId[]) { const st = p.events![ev]; if (st?.run?.inputs) st.run = keepRun(ev, st.run); }
    return p;
  } catch (e) {
    broken = true; console.error('profile unreadable', e);
    try { localStorage.setItem(KEY + '-broken', s); } catch { /* */ }
    return null;
  }
}
/** v2: rarity steps (legendary 3 → 5, mythic 4 → 9), levels above the new cap paid back in full,
 *  runes get an id and take typed slots */
function migrateV2(p: Profile): void {
  const step = [0, 1, 2, LEGEND, MYTHIC];
  for (const it of p.items) {
    it.rarity = step[Math.min(4, Math.max(0, it.rarity))];
    const cap = RARITY_CAP[it.rarity];
    if (it.level > cap) {
      const a = spentTo(it.level), b = spentTo(cap);
      p.gold += a.gold - b.gold; p.scrolls += a.scrolls - b.scrolls; it.level = cap;
    }
  }
  for (const r of p.runes as (Rune & { kind?: string })[]) {
    if (r.id) continue;
    r.id = r.kind === 'destroy' ? 'destroy' : r.kind === 'absorb' ? 'absorb' : 'elem';
    r.rarity = [0, 1, 2, LEGEND][Math.min(3, Math.max(0, r.rarity))];
    delete r.kind;
  }
  for (const h of Object.values(p.heroes)) {
    const had = h.runes.filter((x): x is number => x !== null);
    h.runes = [null, null, null, null, null, null];
    for (const uid of had) {
      const r = p.runes.find(x => x.uid === uid); if (!r) continue;
      const i = RUNE_SLOT_TYPE.findIndex((t, k) => t === RUNES[r.id].type && h.runes[k] === null && k < runeSlots(h.stars));
      if (i >= 0) h.runes[i] = uid;
    }
  }
  p.gv = 2;
}
let saveHook: ((json: string) => void) | null = null;
/** Б2: the client sends every saved profile to the game server too (src/client/cloud.ts) */
export function setSaveHook(fn: (json: string) => void): void { saveHook = fn; }
export function save(p: Profile): void {
  const json = JSON.stringify(p);
  try { localStorage.setItem(KEY, json); } catch { /* storage unavailable */ }
  saveHook?.(json);
}
export function reset(): void { try { localStorage.removeItem(KEY); } catch { /* */ } }

function addItem(p: Profile, slot: Slot, set: SetId | null, rarity: number, level = 1): Item {
  const it: Item = { uid: p.nextUid++, slot, set: set ?? (slot === 'book' ? 'guard' : null), rarity, level, gems: [null, null, null, null] };
  p.items.push(it); return it;
}
function addGem(p: Profile, type: GemType, stars: number): Gem {
  const g: Gem = { uid: p.nextUid++, type, stars, level: 1, xp: 0 }; p.gems.push(g); return g;
}
export const itemName = (it: Item) => `${it.slot === 'book' && it.set ? WEAPON_NAME[it.set] : SLOT_NAME[it.slot]}${it.set ? ` «${SET_NAME[it.set]}»` : ''}`;

// ---------------- runes: names and lines ----------------
export const runeType = (r: Rune): RuneType => RUNES[r.id].type;
/** what makes two runes the same: kind plus element or skill */
export const runeKey = (r: Rune) => `${r.id}:${r.elem ?? r.skill ?? ''}`;
/** the element or skill the rune is about, for its text */
/** правка 196: what the element rune makes stronger, element by element */
export const ELEM_RUNE_FX: Record<Element, string> = {
  fire: 'поджог', ice: 'замедление', nature: 'лечение от попаданий', light: 'усиление за попадание', dark: 'ослабление защиты',
  lightning: 'шанс перескока молнии', water: 'расширение стрелы', phys: 'отталкивание', air: 'ускорение стрелы', poison: 'отравление',
};
const runeX = (r: Rune) => r.elem ? ELEMENT_NAME[r.elem] : r.skill ? SKILLS[r.skill].name : '';
export function runeName(r: Rune): string {
  const d = RUNES[r.id];
  return r.id === 'elem' ? `Руна стихии: ${runeX(r)}` : r.id === 'skill' ? `Руна: ${runeX(r)}` : d.type === 'bless' ? `Руна «${d.name}»` : d.name;
}
/** percent for a rune line: one decimal under 10%, none above */
export const pctTxt = (v: number) => { const x = v * 100; return (x < 10 ? x.toFixed(1).replace('.0', '') : Math.round(x).toString()).replace('.', ',') + '%'; };
export const runeMain = (r: Rune, s = r.rarity) => RUNES[r.id].base * RUNE_K[s];
export function runeValue(r: Rune, s = r.rarity): string { return RUNES[r.id].line(pctTxt(runeMain(r, s)), runeX(r)); }
/** every line of a rune: the main one, the family card bonus, what opens at epic / legendary / mythic */
export function runeLines(r: Rune): { at: number; text: string; on: boolean }[] {
  const d = RUNES[r.id], s = r.rarity, out: { at: number; text: string; on: boolean }[] = [];
  if (d.family) out.push({ at: 0, text: `карты «${FAMILY_NAME[d.family]}» выпадают в ${String(FAMILY_W[runeTier(s)]).replace('.', ',')} раза чаще`, on: true });
  if (r.skill && SKILLS[r.skill].rune) out.push({ at: 0, text: 'открывает этот навык в бою (без руны его нет)', on: true });
  // правка 196: an element rune names the effect of its own element
  const fx = r.id === 'elem' && r.elem ? ELEM_RUNE_FX[r.elem] : '';
  out.push({ at: EPIC, text: fx ? `${fx} сильнее на 20%` : d.e, on: s >= EPIC }, { at: LEGEND, text: fx ? `${fx} сильнее на 40%` : d.l, on: s >= LEGEND }, { at: MYTHIC, text: fx ? `${fx} сильнее на 60%` : d.m, on: s >= MYTHIC });
  return out;
}
/** a short label: blessing or family name, element, skill */
export function runeShort(r: Rune): string {
  const d = RUNES[r.id];
  return r.id === 'elem' ? runeX(r) : r.id === 'skill' ? runeX(r) : d.family ? FAMILY_NAME[d.family] : d.name;
}
export const runeHolder = (p: Profile, uid: number) => Object.keys(p.heroes).find(id => p.heroes[id].runes.includes(uid)) ?? null;

// ---------------- timers ----------------
export function tick(p: Profile): void {
  const now = Date.now();
  const max = energyMax(p);
  if (p.energy < max) {
    const gained = Math.floor((now - p.energyAt) / 1000 / ENERGY.regenSec);
    if (gained > 0) { p.energy = Math.min(max, p.energy + gained); p.energyAt += gained * ENERGY.regenSec * 1000; }
  } else p.energyAt = now;
}
export function energyNext(p: Profile): number { return p.energy >= energyMax(p) ? 0 : ENERGY.regenSec - Math.floor((Date.now() - p.energyAt) / 1000); }

export function idleHours(p: Profile): number { return Math.min(IDLE.capH, (Date.now() - p.idleAt) / 3600000); }
export function idlePreview(p: Profile, h = idleHours(p)) {
  return { gold: Math.floor(IDLE.gold(Math.max(1, p.maxMap)) * h), scrolls: Math.floor(IDLE.scrollsH * h), gemChance: Math.min(1, IDLE.gemChanceH * h) };
}
function grantIdle(p: Profile, h: number): string[] {
  const r = idlePreview(p, h * (passActive(p, 'hunter') ? 1.2 : 1));
  p.gold += r.gold; p.scrolls += r.scrolls;
  const out = [`+${r.gold} золота`, `+${r.scrolls} свитков`];
  if (rnd() < r.gemChance) { const g = randomGem(p, GOLD_SEARCH.odds); out.push(`гем ${GEM[g.type].name} ★${g.stars}`); }
  return out;
}
export function collectIdle(p: Profile): string[] {
  taskAdd(p, 'idle', 1);
  const h = idleHours(p);
  if (h < 1 / 60) fail('Сундук пуст');
  const out = grantIdle(p, h); p.idleAt = Date.now(); return out;
}
/** quick collection (2 hours of rewards): 1 free, 2 for energy, up to 5 for crystals each day */
export const FAST_IDLE = { free: 1, energy: 2, energyCost: 10, crystals: 5, crystalBase: 50, crystalStep: 25 };
export function fastIdleState(p: Profile) {
  const s = (p as Profile & { fastIdle?: { day: string; f: number; e: number; c: number } });
  if (!s.fastIdle || s.fastIdle.day !== today()) s.fastIdle = { day: today(), f: p.fastIdleDay === today() ? 1 : 0, e: 0, c: 0 };
  const st = s.fastIdle;
  return { st, free: FAST_IDLE.free - st.f, energy: FAST_IDLE.energy - st.e, crystals: passActive(p, 'hunter') ? 99 : FAST_IDLE.crystals - st.c, price: FAST_IDLE.crystalBase + FAST_IDLE.crystalStep * st.c };
}
export function fastIdle(p: Profile, how: 'free' | 'energy' | 'crystals' = 'free'): string[] {
  const f = fastIdleState(p);
  if (how === 'free') { if (f.free <= 0) fail('Бесплатный быстрый сбор уже был сегодня'); f.st.f++; p.fastIdleDay = today(); }
  else if (how === 'energy') {
    if (f.energy <= 0) fail('Сбор за энергию на сегодня закончился');
    if (p.energy < FAST_IDLE.energyCost) fail(`Нужно ${FAST_IDLE.energyCost} энергии`);
    p.energy -= FAST_IDLE.energyCost; f.st.e++;
  } else {
    if (f.crystals <= 0) fail('Сбор за кристаллы на сегодня закончился');
    pay(p, 'crystals', f.price); f.st.c++;
  }
  taskAdd(p, 'idle', 1);
  return grantIdle(p, IDLE.fastH);
}

function pay(p: Profile, cur: 'gold' | 'crystals' | 'scrolls' | 'shards', n: number): void {
  const names = { gold: 'золота', crystals: 'кристаллов', scrolls: 'свитков', shards: 'осколков рун' };
  if (p[cur] < n) fail(`Не хватает ${names[cur]}: нужно ${n}, есть ${Math.floor(p[cur])}`);
  p[cur] -= n;
}

// ---------------- battle ----------------
export function startRun(p: Profile, map: number): void {
  tick(p);
  if (map > p.maxMap + 1) fail('Карта ещё закрыта');
  if (p.energy < ENERGY.run) fail(`Не хватает энергии: нужно ${ENERGY.run}`);
  if (p.energy >= energyMax(p)) p.energyAt = Date.now();
  p.energy -= ENERGY.run;
}

/** правка 145: a won stage gives a chest, opened by a tap in the result window; the first clear of a stage — a golden one */
export type StageChest = 'stone' | 'gold';
export interface RunReward { lines: string[]; levelUp: boolean; chest?: StageChest; gold: number; scrolls: number; shards: number }
/** правка 145: steady farm every fight — gold, scrolls, rune shards and hero xp; lost fights give their share (by time lived, from 2 minutes) */
export const STAGE = { scrolls: (map: number) => 3 + Math.floor(map / 10), shards: (map: number) => 4 + Math.floor(map / 5), minTime: 120 }; // checked with econ/model.py
export function finishRun(p: Profile, m: Match, map: number): RunReward {
  const win = m.phase === 'win';
  const mul = m.rewardMul(); // gold, scrolls, shards, hero xp
  const lines: string[] = [];
  p.runs++;
  if (win) p.wins++;
  const share = win ? 1 : Math.min(1, m.time / 360), lived = win || m.time >= STAGE.minTime;
  if (lived) taskAdd(p, 'runs', 1); // правка 180: бой короче 2 минут не идёт в задания «сыграть забеги»
  taskAdd(p, 'kills', m.kills); if (win) taskAdd(p, 'wins', 1);
  if (!win && m.time < 180) { p.energy = Math.min(energyMax(p) + 10, p.energy + ENERGY.refundEarly); lines.push(`Возврат ${ENERGY.refundEarly} энергии`); }
  const gold = Math.round(((200 + 25 * map) * share + m.kills * 0.3 + m.gold) * mul);
  p.gold += gold; lines.push(`+${gold} золота${mul > 1 ? ` (×${mul.toFixed(1)})` : ''}`);
  let scrolls = (lived ? Math.max(1, Math.round(STAGE.scrolls(map) * share)) : 0) + (m.chests.includes('Малый сундук') ? 1 : 0);
  scrolls = Math.round(scrolls * mul);
  if (scrolls) { p.scrolls += scrolls; lines.push(`+${scrolls} свитков`); }
  const shards = lived ? Math.max(1, Math.round(STAGE.shards(map) * share * mul)) : 0;
  if (shards) { p.shards += shards; lines.push(`+${shards} осколков рун`); }
  // правка 180: опыт героя при поражении — по доле прожитого времени, раньше 2 минут — ничего (сдаваться было выгоднее, чем играть)
  const hxp = lived ? Math.round(((win ? 25 : 15 * share) + m.kills / 50) * mul) : 0;
  const lv = hxp > 0 && addHeroXp(p, p.active, hxp);
  if (hxp > 0) lines.push(`+${hxp} опыта героя${lv ? ' — новый уровень!' : ''}`);
  let chest: StageChest | undefined;
  if (win) {
    chest = map > p.maxMap ? 'gold' : 'stone';
    if (map > p.maxMap) { p.maxMap = map; lines.push(`Открыт этап ${map + 1}`); }
  }
  if (m.rareDrops > 0) { p.essBig += 2; const g = randomGem(p, [0.5, 0.4, 0.1]); lines.push(`Золотой минибосс: 2 большие эссенции, гем ${GEM[g.type].name} ★${g.stars}`); }
  return { lines, levelUp: lv, chest, gold, scrolls, shards };
}
/** правка 145: what the stage chest gives — one prize. Stone: 38% resources, 25% essence, 12% gear, 8% gem, 15% tavern coupon, 2% rune
 *  (coupons stay at the old 15% a win: the free player gets heroes from them; econ/model.py — payer 347 days instead of 360, free 1226 as before).
 *  Gold (first clear of a stage): a rare item or 2 small essences + 30 crystals */
export const STAGE_CHEST = [0.38, 0.25, 0.12, 0.08, 0.15, 0.02];
export function openStageChest(p: Profile, kind: StageChest, runGold: number): void {
  if (kind === 'gold') { if (rnd() < 0.5) addItem(p, pick(SLOTS), pick(SETS), 1); else { p.essSmall += 2; p.crystals += 30; } return; }
  switch (roll(STAGE_CHEST)) {
    case 0: { const k = rnd();
      if (k < 1 / 3) p.gold += Math.max(100, Math.round(runGold * (1 + 0.5 * rnd())));
      else if (k < 2 / 3) p.scrolls += 4 + Math.floor(rnd() * 5);
      else p.shards += 10 + Math.floor(rnd() * 11);
      break; }
    case 1: if (rnd() < 0.12) p.essBig += 1; else p.essSmall += 1 + (rnd() < 0.4 ? 1 : 0); break;
    case 2: addItem(p, pick(SLOTS), pick(SETS), roll([0.82, 0.16, 0.02])); break;
    case 3: randomGem(p, [0.85, 0.15]); break;
    case 4: p.couponsSmall++; break;
    default: randomRune(p, rnd() < 0.7 ? 0 : 1);
  }
}

// ---------------- правки 112, 115: wall defence ----------------
/** index of today's wall map: one map for the whole day, the next one tomorrow */
export const wallMapToday = () => wallOfDay(dayNumber(Date.now()));
/** time until the map changes (ms) */
export const wallMapLeft = () => 86400000 - (Date.now() % 86400000);
export function wallState(p: Profile): WallState {
  const w = p.wall ??= { day: 0, used: 0, best: 0, bestTime: 0, week: '', bestWeek: 0, bestAll: 0, byMap: {}, chests: [] };
  const d = dayNumber(Date.now());
  if (w.day !== d) { w.day = d; w.used = 0; w.best = 0; w.bestTime = 0; w.chests = []; }
  if (w.week !== weekKey()) { w.week = weekKey(); w.bestWeek = 0; w.weekRun = undefined; }
  return w;
}
export const wallFreeLeft = (p: Profile) => Math.max(0, WALL.freePerDay - wallState(p).used);
// правка 165: разделы открываются по этапам, чтобы новичок не тонул в меню с первой минуты
export const UNLOCK = { jewel: 2, runes: 2, wheel: 3, market: 3, bp: 4, passes: 4 } as const;
export type Feature = keyof typeof UNLOCK;
export const unlocked = (p: Profile, f: Feature) => p.maxMap >= UNLOCK[f];
export const unlockText = (f: Feature) => `Откроется после этапа ${UNLOCK[f]}`;
export const wallUnlocked = (p: Profile) => p.maxMap >= 2;
/** правка 164: номер боя с подсказками (0 — самый первый); старые игроки, уже проходившие этапы, подсказок не видят */
export const tutStep = (p: Profile) => p.tut ?? (p.maxMap > 0 ? 3 : 0);
export const TUT_BATTLES = 3;
/** take an attempt: free ones first, then for crystals */
export function startWall(p: Profile, paid = false): void {
  if (!wallUnlocked(p)) fail('Стена откроется после этапа 2');
  const w = wallState(p);
  if (w.used >= WALL.freePerDay) {
    if (!paid) fail('Бесплатные попытки на сегодня закончились');
    pay(p, 'crystals', WALL.extraCost);
  }
  w.used++;
}
/** gold for beating wave n */
export const wallWaveGold = (n: number) => 30 + 6 * n;
/** правка 116: chests for reaching waves 10, 20 and 30 — once a day each */
export const WALL_CHESTS: { at: number; label: string; give: (p: Profile) => void }[] = [
  { at: 10, label: '300 золота + 10💎', give: p => { p.gold += 300; p.crystals += 10; } },
  { at: 20, label: '600 золота + 20💎 + малая эссенция', give: p => { p.gold += 600; p.crystals += 20; p.essSmall += 1; } },
  { at: 30, label: '1000 золота + 40💎 + большая эссенция', give: p => { p.gold += 1000; p.crystals += 40; p.essBig += 1; } },
];
/** inputs as runs: "mx,my,choice,reroll*count;..." (a wall run is ~18 000 ticks, mostly the same input) */
export function packInputs(log: Input[]): string {
  const out: string[] = []; let last = '', n = 0;
  for (const i of log) {
    const k = `${i.mx},${i.my},${i.choice},${i.reroll ? 1 : 0}`;
    if (k === last) n++; else { if (n) out.push(n > 1 ? `${last}*${n}` : last); last = k; n = 1; }
  }
  if (n) out.push(n > 1 ? `${last}*${n}` : last);
  return out.join(';');
}
export function unpackInputs(s: string): Input[] {
  const out: Input[] = [];
  if (!s) return out;
  for (const part of s.split(';')) {
    const [k, c] = part.split('*'), [mx, my, ch, r] = k.split(',').map(Number);
    for (let i = 0, n = c ? Number(c) : 1; i < n; i++) out.push({ mx, my, choice: ch, reroll: r === 1 });
  }
  return out;
}
export interface WallReward { lines: string[]; record: boolean; chests: string[] }
export function finishWall(p: Profile, m: Match, cfg: MatchConfig, log: Input[], ok: boolean, quit = false): WallReward {
  const w = wallState(p), cleared = m.wavesCleared, mul = m.rewardMul(), lines: string[] = [], chests: string[] = [];
  const map = WALL_MAPS[cfg.wallMap ?? 0].id;
  p.runs++;
  taskAdd(p, 'wall', cleared); taskAdd(p, 'kills', m.kills);
  let gold = 0; for (let i = 1; i <= cleared; i++) gold += wallWaveGold(i);
  gold = Math.round((gold + m.kills * 0.3) * mul);
  if (gold) { p.gold += gold; lines.push(`+${gold} золота`); }
  const scrolls = Math.round(Math.floor(cleared / 5) * 2 * mul);
  if (scrolls) { p.scrolls += scrolls; lines.push(`+${scrolls} свитков`); }
  const hxp = Math.round((10 + cleared) * mul);
  const lv = addHeroXp(p, p.active, hxp); lines.push(`+${hxp} опыта героя${lv ? ' — новый уровень!' : ''}`);
  for (const c of WALL_CHESTS) if (cleared >= c.at && !w.chests.includes(c.at)) { w.chests.push(c.at); c.give(p); chests.push(`Сундук волны ${c.at}: ${c.label}`); }
  const rec: WallRecord = { day: w.day, week: w.week, map, wave: cleared, time: Math.round(m.time), hero: p.active, power: powerScore(p), cfg, inputs: packInputs(log), hash: m.hash(), ok, quit, at: Date.now() };
  const better = (a: number, at: number, b: number, bt: number) => a > b || (a === b && a > 0 && at < bt);
  const record = better(cleared, rec.time, w.bestAll, Infinity) && cleared > w.bestAll;
  if (better(cleared, rec.time, w.best, w.bestTime || Infinity)) { w.best = cleared; w.bestTime = rec.time; }
  if (cleared > w.bestWeek || !w.weekRun || better(cleared, rec.time, w.weekRun.wave, w.weekRun.time)) { if (cleared >= (w.weekRun?.wave ?? -1)) { w.bestWeek = Math.max(w.bestWeek, cleared); w.weekRun = keepRun('wall', rec); } }
  w.bestAll = Math.max(w.bestAll, cleared);
  w.byMap[map] = Math.max(w.byMap[map] ?? 0, cleared);
  w.lastRun = { ...rec, inputs: '' }; // the full input record is kept only for the best run of the week
  return { lines, record, chests };
}

// ---------------- правки 125, 126: events ----------------
/** rewards by place (once the day is over): [last place of the band, label, give] */
export const EV_REWARDS: Record<EventId, [number, string, (p: Profile) => void][]> = {
  boss: [
    [1, '500💎 + легендарная руна', p => { p.crystals += 500; randomRune(p, 5); }],
    [3, '300💎 + эпический предмет', p => { p.crystals += 300; addItem(p, pick(SLOTS), mainSet(p), 2); }],
    [10, '150💎 + 2 большие эссенции', p => { p.crystals += 150; p.essBig += 2; }],
    [20, '50💎 + малая эссенция', p => { p.crystals += 50; p.essSmall += 1; }],
  ],
  frags: [
    [1, '20K золота + самоцвет ★3', p => { p.gold += 20000; addGem(p, pick(GEM_TYPES), 3); }],
    [3, '12K золота + самоцвет ★2', p => { p.gold += 12000; addGem(p, pick(GEM_TYPES), 2); }],
    [10, '6K золота + 3 малые эссенции', p => { p.gold += 6000; p.essSmall += 3; }],
    [20, '2500 золота + малая эссенция', p => { p.gold += 2500; p.essSmall += 1; }],
  ],
};
export const evReward = (ev: EventId, place: number) => EV_REWARDS[ev].find(r => place <= r[0]) ?? EV_REWARDS[ev][EV_REWARDS[ev].length - 1];
export const evUnlocked = (p: Profile) => p.maxMap >= 2;
/** time until the day (and the event day) ends, ms */
export const evDayLeft = () => 86400000 - (Date.now() % 86400000);
const OPP_NAMES = ['Grom', 'Lisa_K', 'Тарас', 'Dima77', 'NightOwl', 'Мирослава', 'Kaiser', 'Ola_P', 'Rex', 'Святослав', 'Hana', 'Bogdan_UA', 'Luca', 'Wolfie', 'Ирина', 'Mehmet', 'Zoe', 'Pavlo', 'Sven', 'Аня', 'Kenji', 'Marta', 'Diego', 'Vova_X', 'Ella', 'Jakub', 'Nika', 'Tomás', 'Елена', 'Brick'];
/** what a player of this power usually scores (from bot runs): kills in 5 min, damage to the bear in 3 min */
export const evExpect = (ev: EventId, power: number) => ev === 'frags' ? 250 * Math.sqrt(power / 100) : 15000 * (power / 100);
function evGroup(p: Profile, ev: EventId, day: number): EvOpp[] {
  let h = (day * 2654435761 + (ev === 'boss' ? 97 : 13)) >>> 0;
  const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return (h >>> 0) / 4294967296; };
  const me = powerScore(p), names = [...OPP_NAMES], out: EvOpp[] = [];
  for (let i = 0; i < EVENT.group - 1; i++) {
    const name = names.splice(Math.floor(r() * names.length), 1)[0];
    const power = Math.round(me * (0.7 + r() * 0.6));
    out.push({ name, hero: HEROES[Math.floor(r() * HEROES.length)].id, power, score: Math.round(evExpect(ev, power) * (0.45 + r() * 1.15)) });
  }
  return out;
}
/** place in the group of 20 (1 = best) for a score */
export function evPlace(st: EvState, score: number): number { return 1 + st.group.filter(o => o.score > score).length; }
/** the state of an event today; on a new day the day before is settled: place and reward */
export function evState(p: Profile, ev: EventId): EvState {
  const all = p.events ??= {};
  const d = dayNumber(Date.now());
  const old = all[ev];
  if (old && old.day === d) return old;
  let last = old?.last;
  if (old && old.used > 0) { // played that day: reward by place
    const place = evPlace(old, old.best), rw = evReward(ev, place);
    rw[2](p); last = { day: old.day, place, score: old.best, label: rw[1] };
  }
  const st = all[ev] = { day: d, used: 0, best: 0, bestTime: 0, group: evGroup(p, ev, d), last };
  if (old) save(p);
  return st;
}
export const evFreeLeft = (p: Profile, ev: EventId) => Math.max(0, EVENT.freePerDay - evState(p, ev).used);
/** правка 142: something to do in an event — a free try left today or yesterday's result not seen yet */
export function evAttention(p: Profile, ev: EventId | 'wall'): boolean {
  if (ev === 'wall') return wallUnlocked(p) && wallFreeLeft(p) > 0;
  if (!evUnlocked(p)) return false;
  const st = evState(p, ev);
  return st.used < EVENT.freePerDay || !!(st.last && !st.last.seen);
}
export const eventsAttention = (p: Profile) => evAttention(p, 'boss') || evAttention(p, 'frags') || evAttention(p, 'wall');
/** take a try: free ones first, then for crystals */
export function startEvent(p: Profile, ev: EventId, paid = false): void {
  if (!evUnlocked(p)) fail('События откроются после этапа 2');
  const st = evState(p, ev);
  if (st.used >= EVENT.freePerDay) {
    if (!paid) fail('Бесплатные попытки на сегодня закончились');
    pay(p, 'crystals', EVENT.extraCost);
  }
  st.used++;
}
export interface EvResult { score: number; best: number; record: boolean; place: number; lines: string[] }
export function finishEvent(p: Profile, ev: EventId, m: Match, cfg: MatchConfig, log: Input[], ok: boolean, quit = false): EvResult {
  const st = evState(p, ev), score = m.score(), mul = m.rewardMul(), lines: string[] = [];
  p.runs++;
  taskAdd(p, 'kills', m.kills);
  // a little gold and hero xp for every run; the real reward is the place at the end of the day
  const gold = Math.round((ev === 'frags' ? m.kills * 0.6 : score / 400) * mul);
  if (gold) { p.gold += gold; lines.push(`+${gold} золота`); }
  const hxp = Math.round((ev === 'frags' ? 10 + m.wave : 10 + m.upgrades) * mul);
  const lv = addHeroXp(p, p.active, hxp); lines.push(`+${hxp} опыта героя${lv ? ' — новый уровень!' : ''}`);
  const record = score > st.best;
  if (record || (score === st.best && Math.round(m.time) < st.bestTime)) {
    st.best = score; st.bestTime = Math.round(m.time);
    st.run = keepRun(ev, { day: st.day, week: weekKey(), map: WALL_MAPS[cfg.wallMap ?? 0].id, wave: score, time: Math.round(m.time), hero: p.active, power: powerScore(p), cfg, inputs: packInputs(log), hash: m.hash(), ok, quit, at: Date.now() });
  }
  return { score, best: st.best, record, place: evPlace(st, st.best), lines };
}

export function addHeroXp(p: Profile, id: string, xp: number): boolean {
  const h = p.heroes[id]; let up = false;
  h.xp += xp;
  while (h.level < HERO_MAX_LEVEL && h.xp >= heroXpFor(h.level)) { h.xp -= heroXpFor(h.level); h.level++; up = true; }
  return up;
}

// ---------------- stats for the run ----------------
/** правка 155: what one item gives. The main number (attack or health, by slot) grows with level and rarity;
 *  rare adds a lump, legendary a bigger one (they were the «+4% / +8%» lines). The set gives a second line in percent. */
export interface ItemStats { atk?: number; hp?: number; def?: number; speed?: number; atkSpeed?: number; crit?: number }
export function itemBase(it: Item): ItemStats {
  const g = GEAR_MAIN[it.slot], k = rarityK(it.rarity), lv = it.level, out: ItemStats = {};
  let v = (g.base + g.per * lv) * k;
  if (it.rarity >= 1) v += GEAR_STEP.rare[g.stat];
  if (it.rarity >= LEGEND) v += GEAR_STEP.legend[g.stat];
  out[g.stat] = v;
  const sec = it.set && it.slot !== 'book' ? SET_SECOND[it.set] : {}; // the weapon gives attack only
  for (const [key, per] of Object.entries(sec) as [keyof ItemStats, number][]) out[key] = per * lv * k;
  return out;
}

/** правка 155: attack and health of a hero with everything on: plain numbers (hero + gear + gems), then the percent bonuses
 *  (sets, runes) on top. computeMods turns them into the battle multipliers (ATK / 100, HP / 100). */
export interface StatSheet { atk: number; hp: number; atkFlat: number; hpFlat: number; atkPct: number; hpPct: number;
  hero: { atk: number; hp: number }; gear: { atk: number; hp: number }; gems: { atk: number; hp: number } }
export function statSheet(p: Profile, heroId = p.active): StatSheet {
  const h = p.heroes[heroId], L = h.level - 1;
  const hero = { atk: HERO_STAT.atk + HERO_STAT.atkLv * L, hp: HERO_STAT.hp + HERO_STAT.hpLv * L };
  const gear = { atk: 0, hp: 0 }, gems = { atk: 0, hp: 0 }, sets: Record<string, number> = {};
  for (const s of SLOTS) {
    const it = equippedItem(p, s); if (!it) continue;
    if (it.set) sets[it.set] = (sets[it.set] ?? 0) + 1;
    const b = itemBase(it); gear.atk += b.atk ?? 0; gear.hp += b.hp ?? 0;
  }
  for (const g of equippedGems(p)) {
    const v = gemAmount(g);
    if (g.type === 'ruby') gems.atk += v; else if (g.type === 'emerald') gems.hp += v;
  }
  let atkPct = 0, hpPct = 0;
  if ((sets.berserk ?? 0) >= 2) atkPct += SET_PCT.berserk2;
  if ((sets.berserk ?? 0) >= 4) atkPct += SET_PCT.berserk4;
  if ((sets.guard ?? 0) >= 2) hpPct += SET_PCT.guard2;
  if ((sets.guard ?? 0) >= 6) hpPct += SET_PCT.guard6;
  if ((sets.wanderer ?? 0) >= 4) hpPct += SET_PCT.wanderer4Hp;
  for (const uid of h.runes.slice(0, runeSlots(h.stars))) {
    const r = p.runes.find(x => x.uid === uid); if (!r) continue;
    if (r.id === 'fury') atkPct += runeMain(r); else if (r.id === 'revive') hpPct += runeMain(r);
  }
  const atkFlat = hero.atk + gear.atk + gems.atk, hpFlat = hero.hp + gear.hp + gems.hp;
  return { atk: atkFlat * (1 + atkPct), hp: Math.max(30, hpFlat * (1 + hpPct)), atkFlat, hpFlat, atkPct, hpPct, hero, gear, gems };
}
/** правка 155: what a gem in a socket gives: ruby — attack, emerald — health (plain numbers), the rest — percent */
export const gemAmount = (g: { type: GemType; stars: number; level: number }) => {
  const d = GEM[g.type], v = d.max * GEM_STAR_EFF[g.stars] * gemShare(g.level);
  return d.pct ? v : v * STAT_UNIT;
};

export function computeMods(p: Profile, heroId = p.active): RunMods {
  const m: RunMods = {
    ...BASE_MODS, elem: {}, rerolls: 0, xp: 0, loot: 0, iframes: 0, goldBoss: 0,
    elemPow: {}, fam: {}, famLv: {}, famW: {}, skillDmg: {}, start: {}, unlock: [], gfx: {},
  };
  const hero = HEROES.find(h => h.id === heroId)!;
  const h = p.heroes[heroId];
  const L = h.level - 1;
  const st = statSheet(p, heroId);
  m.atk = st.atk / STAT_UNIT; m.hp = st.hp / STAT_UNIT; m.def += 0.002 * L;
  m.arrowPower += 0.2 * Math.min(5, h.stars);
  if (h.stars > 5) m.elem[hero.element] = (m.elem[hero.element] ?? 0) + 0.05 * (h.stars - 5);
  // gear: second lines, set effects at epic and mythic (attack and health are in statSheet)
  const sets: Record<string, number> = {};
  for (const s of SLOTS) {
    const it = equippedItem(p, s); if (!it) continue;
    if (it.set) sets[it.set] = (sets[it.set] ?? 0) + 1;
    const b = itemBase(it);
    m.def += b.def ?? 0; m.speed += b.speed ?? 0; m.atkSpeed += b.atkSpeed ?? 0; m.crit += b.crit ?? 0;
    if (it.set && it.rarity >= EPIC) {
      const id = SET_FX[it.set][s].id, lv = it.rarity >= MYTHIC ? 2 : 1;
      if (id === 'insight') m.xp! += lv === 2 ? 0.25 : 0.12;
      else if (id === 'hunter') m.boss += lv === 2 ? 0.3 : 0.15;
      else if (id === 'cruel') { m.crit += lv === 2 ? 0.05 : 0.03; m.critDmg += lv === 2 ? 0.55 : 0.3; }
      else m.gfx![id as GearFx] = lv;
    }
  }
  if ((sets.guard ?? 0) >= 4) { m.def += 0.2; m.speed -= 0.1; }
  if ((sets.wanderer ?? 0) >= 2) m.speed += 0.10;
  if ((sets.wanderer ?? 0) >= 4) { m.atkSpeed += 0.15; m.def -= 0.1; }
  if ((sets.berserk ?? 0) >= 4) m.def -= 0.2;
  // full set of 6, weapon included
  if ((sets.guard ?? 0) >= 6) m.def += 0.1;
  if ((sets.wanderer ?? 0) >= 6) { m.atkSpeed += 0.15; m.pickup += 0.15; }
  if ((sets.berserk ?? 0) >= 6) { m.crit += 0.05; m.critDmg += 0.3; }
  // gems in the sockets of every equipped item
  for (const g of equippedGems(p)) {
    const v = gemAmount(g);
    switch (g.type) {
      case 'sapphire': m.def += v; break;
      case 'topaz': m.pickup += v; break; case 'amethyst': m.area += v; break; case 'diamond': m.crit += v; break;
      case 'garnet': m.critDmg += v; break; case 'jade': m.regen += v; break;
    }
  }
  // runes of this hero: main line by step, more at epic / legendary / mythic
  const mx = (a: number | undefined, b: number) => Math.max(a ?? 0, b);
  for (const uid of h.runes.slice(0, runeSlots(h.stars))) {
    const r = p.runes.find(x => x.uid === uid); if (!r) continue;
    const v = runeMain(r), t = runeTier(r.rarity), d = RUNES[r.id];
    switch (r.id) {
      case 'revive': if (t) m.revive = mx(m.revive, [0, 0.3, 0.6, 1][t]); break;
      case 'wisdom': m.xp! += v; m.rerolls! += t; break;
      case 'luck': m.loot! += v; m.goldBoss! += [0, 0.1, 0.2, 0.35][t]; break;
      case 'guard': m.def += v; m.iframes! += [0, 0.2, 0.35, 0.5][t]; break;
      case 'destroy': m.boss += v; if (t) m.bossCut = mx(m.bossCut, [0, 0.05, 0.1, 0.15][t]); break;
      case 'absorb': m.vamp += v; if (t) m.killHeal = mx(m.killHeal, [0, 0.04, 0.06, 0.08][t]); break;
      case 'regen': m.regen += v; if (t) m.lvlHeal = mx(m.lvlHeal, [0, 0.05, 0.08, 0.12][t]); break;
      case 'swift': m.speed += v; m.pickup += [0, 0.25, 0.5, 0.8][t]; break;
      case 'fury': if (t) m.fury = mx(m.fury, [0, 0.1, 0.2, 0.3][t]); break;
      case 'elem': if (r.elem) { m.elem[r.elem] = (m.elem[r.elem] ?? 0) + v; if (t) m.elemPow![r.elem] = (m.elemPow![r.elem] ?? 0) + [0, 0.2, 0.4, 0.6][t]; } break;
      case 'skill': if (r.skill) {
        m.skillDmg![r.skill] = (m.skillDmg![r.skill] ?? 0) + v;
        if (t) m.start![r.skill] = mx(m.start![r.skill], t);
        if (SKILLS[r.skill].rune) m.unlock!.push(r.skill);
      } break;
      default: if (d.family) { // family runes
        const f = d.family;
        m.fam![f] = (m.fam![f] ?? 0) + v; m.famLv![f] = mx(m.famLv![f], t); m.famW![f] = mx(m.famW![f], FAMILY_W[t]);
      }
    }
  }
  if (passActive(p, 'month')) m.rerolls! += 1;
  return m;
}

export function powerScore(p: Profile): number {
  const m = computeMods(p);
  return Math.round(100 * m.atk * m.hp * (1 + m.def) * (1 + m.crit * (m.critDmg - 1)));
}

// ---------------- gear ----------------
export const equippedItem = (p: Profile, s: Slot) => p.items.find(i => i.uid === p.equipped[s]) ?? null;
export function equip(p: Profile, uid: number): void {
  const it = p.items.find(i => i.uid === uid) ?? fail('Нет предмета');
  p.equipped[it.slot] = it.uid;
}
export function unequip(p: Profile, s: Slot): void {
  if (s === 'book') fail('Без книги в бой нельзя');
  p.equipped[s] = null;
}
export function upgradeItem(p: Profile, uid: number, times = 1): number {
  const it = p.items.find(i => i.uid === uid) ?? fail('Нет предмета');
  let done = 0;
  for (let i = 0; i < times; i++) {
    if (it.level >= RARITY_CAP[it.rarity]) { if (!done) fail(`Предел уровня для редкости «${RARITIES[it.rarity]}». Подними редкость, чтобы качать дальше`); break; }
    const c = levelCost(it.level);
    if (p.gold < c.gold || p.scrolls < c.scrolls) { if (!done) fail(`Нужно ${c.gold} золота и ${c.scrolls} свитков`); break; }
    p.gold -= c.gold; p.scrolls -= c.scrolls; it.level++; done++; taskAdd(p, 'upgrade', 1);
  }
  return done;
}
export const isWorn = (p: Profile, uid: number) => Object.values(p.equipped).includes(uid);
/** what a step up of this item takes, and the items that fit (not worn; other sets first, so own-set epics stay for the mythic step) */
export function mergeNeed(p: Profile, it: Item): { n: number; from: number; sameSet: boolean; have: Item[] } | null {
  if (it.rarity >= MYTHIC) return null;
  const rule = MERGE_RULE[it.rarity];
  const have = p.items.filter(x => x.uid !== it.uid && x.slot === it.slot && x.rarity === rule.from && (!rule.sameSet || x.set === it.set) && !isWorn(p, x.uid))
    .sort((a, b) => (rule.sameSet ? 0 : (a.set === it.set ? 1 : 0) - (b.set === it.set ? 1 : 0)) || a.level - b.level);
  return { ...rule, have };
}
/** "2 эпических предмета «Перчатки» любого комплекта" */
export function mergeNeedText(it: Item): string {
  const r = MERGE_RULE[it.rarity]; if (!r) return '';
  if (r.sameSet && r.from === it.rarity) return `${r.n} ${r.n === 1 ? 'такой же предмет' : 'таких же предмета'}`;
  return `${r.n} ${r.n === 1 ? 'эпический предмет' : 'эпических предмета'} «${SLOT_NAME[it.slot]}» ${r.sameSet && it.set ? `комплекта «${SET_NAME[it.set]}»` : 'любого комплекта'}`;
}
export const canMerge = (p: Profile, it: Item) => { const n = mergeNeed(p, it); return !!n && n.have.length >= n.n; };
/** pick: the exact items to use as material (the player chose them); otherwise the best fitting ones */
export function merge(p: Profile, uid: number, pick?: number[]): string {
  const it = p.items.find(i => i.uid === uid) ?? fail('Нет предмета');
  const need = mergeNeed(p, it) ?? fail('Уже мифическое');
  if (need.have.length < need.n) fail(`Нужно ещё ${mergeNeedText(it)} (не надетых), есть ${need.have.length}`);
  let used = need.have.slice(0, need.n);
  if (pick) {
    if (new Set(pick).size !== need.n || pick.length !== need.n) fail(`Выбери ${mergeNeedText(it)}`);
    used = pick.map(u => need.have.find(x => x.uid === u) ?? fail('Этот предмет не подходит для слияния'));
  }
  // the result keeps the highest level; what was spent on the rest comes back at 90%
  const all = [it, ...used].sort((a, b) => b.level - a.level);
  let gold = 0, scrolls = 0;
  for (const x of all.slice(1)) { const sp = spentTo(x.level); gold += Math.floor(sp.gold * 0.9); scrolls += Math.floor(sp.scrolls * 0.9); }
  it.level = all[0].level;
  it.rarity++;
  p.items = p.items.filter(x => !used.includes(x));
  p.gold += gold; p.scrolls += scrolls;
  return `${itemName(it)}: теперь ${RARITIES[it.rarity]}${gold ? `, вернулось ${gold} золота и ${scrolls} свитков` : ''}`;
}
export function resetItem(p: Profile, uid: number): string {
  const it = p.items.find(i => i.uid === uid) ?? fail('Нет предмета');
  if (it.level <= 1) fail('Уровень и так 1');
  const s = spentTo(it.level), g = Math.floor(s.gold * 0.9), sc = Math.floor(s.scrolls * 0.9);
  it.level = 1; p.gold += g; p.scrolls += sc;
  it.gems = it.gems.map((u, i) => (socketOpen(it, i) ? u : null));
  return `Возвращено ${g} золота и ${sc} свитков (90%)`;
}
export function buyGearChest(p: Profile, slot: Slot, set: SetId | null): Item {
  pay(p, 'crystals', PRICE.gearChest);
  return addItem(p, slot, set ?? 'guard', roll(GEAR_CHEST_ODDS));
}

// ---------------- gems ----------------
export const SOCKET_LEVEL = [1, 20, 40, 60];
export const socketOpen = (it: Item, i: number) => it.level >= SOCKET_LEVEL[i];
export function equippedGems(p: Profile): Gem[] {
  const out: Gem[] = [];
  for (const s of SLOTS) { const it = equippedItem(p, s); if (!it) continue; it.gems.forEach((u, i) => { const g = p.gems.find(x => x.uid === u); if (g && socketOpen(it, i)) out.push(g); }); }
  return out;
}
/** item that holds this gem, if any */
export const gemHolder = (p: Profile, uid: number) => p.items.find(it => it.gems.includes(uid)) ?? null;
export function socketGem(p: Profile, itemUid: number, idx: number, gemUid: number): void {
  const it = p.items.find(i => i.uid === itemUid) ?? fail('Нет предмета');
  if (!socketOpen(it, idx)) fail(`Гнездо откроется на ур. ${SOCKET_LEVEL[idx]}`);
  const g = p.gems.find(x => x.uid === gemUid) ?? fail('Нет гема');
  if (!gemFits(g.type, it.slot)) fail(`${GEM[g.type].name} ставится в: ${gemSlotsOf(g.type).map(s => SLOT_NAME[s].toLowerCase()).join(', ')}`);
  const old = gemHolder(p, gemUid); if (old) old.gems[old.gems.indexOf(gemUid)] = null;
  it.gems[idx] = gemUid;
}
export function unsocket(p: Profile, itemUid: number, idx: number): void {
  const it = p.items.find(i => i.uid === itemUid) ?? fail('Нет предмета');
  it.gems[idx] = null; // taking a gem out is free
}
/** crystal search guarantees: ★3 or better within 30 searches, ★4 within 80 */
function crystalPity(p: Profile, stars: number): number {
  p.pityGem++; p.pityGem4 = (p.pityGem4 ?? 0) + 1;
  if (p.pityGem4 >= CR_SEARCH.pity4) stars = 4; else if (p.pityGem >= CR_SEARCH.pity && stars < 3) stars = 3;
  if (stars >= 3) p.pityGem = 0;
  if (stars === 4) p.pityGem4 = 0;
  return stars;
}
function randomGem(p: Profile, odds: readonly number[], type?: GemType): Gem { return addGem(p, type ?? pick(GEM_TYPES), 1 + roll(odds)); }
export interface SearchResult { gems: Gem[]; spent: number }
export function searchGem(p: Profile, cur: 'gold' | 'crystals', want?: { type?: GemType; stars: number }, max = 1): SearchResult {
  const out: Gem[] = []; let spent = 0;
  for (let i = 0; i < max; i++) {
    const cost = cur === 'gold' ? GOLD_SEARCH.cost : CR_SEARCH.cost;
    if (p[cur] < cost) { if (!i) pay(p, cur, cost); break; }
    p[cur] -= cost; spent += cost;
    let g: Gem;
    if (cur === 'crystals') {
      g = randomGem(p, CR_SEARCH.odds);
      g.stars = crystalPity(p, g.stars);
    } else g = randomGem(p, GOLD_SEARCH.odds);
    out.push(g);
    if (want && g.stars >= want.stars && (!want.type || g.type === want.type)) break;
  }
  return { gems: out, spent };
}
export function gemTotalXp(g: Gem): number { let x = g.xp; for (let l = 1; l < g.level; l++) x += gemXpFor(l); return x; }
function addGemXp(g: Gem, xp: number): void {
  g.xp += xp;
  while (g.level < 100 && g.xp >= gemXpFor(g.level)) { g.xp -= gemXpFor(g.level); g.level++; }
  if (g.level >= 100) g.xp = 0;
}
export function feedEssence(p: Profile, uid: number, big: boolean, n = 1): void {
  const g = p.gems.find(x => x.uid === uid) ?? fail('Нет гема');
  if (g.level >= 100) fail('Гем уже на 100 уровне');
  const have = big ? p.essBig : p.essSmall; if (have < 1) fail('Нет эссенции');
  const k = Math.min(n, have);
  if (big) p.essBig -= k; else p.essSmall -= k;
  addGemXp(g, k * (big ? ESS_BIG : ESS_SMALL));
}
export function feedGem(p: Profile, target: number, food: number): void {
  if (target === food) fail('Нельзя скормить гем самому себе');
  const g = p.gems.find(x => x.uid === target) ?? fail('Нет гема');
  const f = p.gems.find(x => x.uid === food) ?? fail('Нет гема');
  if (gemHolder(p, food)) fail('Сначала выньте этот гем из предмета');
  addGemXp(g, GEM_FEED_XP[f.stars] + gemTotalXp(f));
  p.gems = p.gems.filter(x => x !== f);
}
/** synthesis: the target eats the chosen gems and essence in one go; returns the levels gained */
export function synthesize(p: Profile, target: number, foods: number[], small: number, big: number): number {
  const g = p.gems.find(x => x.uid === target) ?? fail('Нет гема');
  if (!foods.length && !small && !big) fail('Ничего не выбрано');
  if (small > p.essSmall || big > p.essBig) fail('Не хватает эссенции');
  const lv = g.level;
  let xp = small * ESS_SMALL + big * ESS_BIG;
  for (const uid of foods) {
    if (uid === target) fail('Нельзя скормить гем самому себе');
    const f = p.gems.find(x => x.uid === uid) ?? fail('Нет гема');
    if (gemHolder(p, uid)) fail('Сначала выньте гем из предмета');
    xp += GEM_FEED_XP[f.stars] + gemTotalXp(f);
  }
  p.essSmall -= small; p.essBig -= big;
  p.gems = p.gems.filter(x => !foods.includes(x.uid));
  addGemXp(g, xp);
  return g.level - lv;
}
/** xp the synthesis would give (for the preview bar) */
export function synthXp(p: Profile, foods: number[], small: number, big: number): number {
  let xp = small * ESS_SMALL + big * ESS_BIG;
  for (const uid of foods) { const f = p.gems.find(x => x.uid === uid); if (f) xp += GEM_FEED_XP[f.stars] + gemTotalXp(f); }
  return xp;
}
/** level and xp after adding xp, without changing the gem */
export function gemAfter(g: Gem, xp: number): { level: number; xp: number } { const c = { ...g }; addGemXp(c, xp); return { level: c.level, xp: c.xp }; }
/** «+12 атаки» / «+8% защиты»: правка 155 — ruby and emerald give plain numbers */
export function gemValue(g: { type: GemType; stars: number; level: number }): string {
  const d = GEM[g.type], v = gemAmount(g);
  return d.pct ? `+${(v * 100).toFixed(v < 0.1 ? 1 : 0)}% ${d.stat}` : `+${statNum(v)} ${d.stat}`;
}
/** правка 155: a plain stat number for the screen: one decimal below 10, whole above */
export const statNum = (v: number) => (v < 9.95 ? (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '') : String(Math.round(v)));

// ---------------- heroes / tavern ----------------
export function setActive(p: Profile, id: string): void { if (!p.heroes[id].owned) fail('Герой ещё не открыт'); p.active = id; }
export const heroOfDay = () => HEROES[Math.floor(Date.now() / 86400000) % HEROES.length].id;
function rollHero(): string {
  const day = heroOfDay();
  const w = HEROES.map(h => h.id === day ? 5 : 1), tot = w.reduce((a, b) => a + b, 0);
  let r = rnd() * tot;
  for (let i = 0; i < HEROES.length; i++) { if (r < w[i]) return HEROES[i].id; r -= w[i]; }
  return HEROES[0].id;
}
export function useCoupon(p: Profile, big: boolean): string {
  if (big) { if (p.couponsBig < 1) fail('Нет средних купонов'); p.couponsBig--; } else { if (p.couponsSmall < 1) fail('Нет малых купонов'); p.couponsSmall--; }
  const def = big ? BIG_COUPON : SMALL_COUPON;
  let heroHit = rnd() < def.hero;
  if (big) { p.pityCoupon++; if (p.pityCoupon >= BIG_COUPON.pity) heroHit = true; if (heroHit) p.pityCoupon = 0; }
  const id = rollHero(), h = p.heroes[id], name = HEROES.find(x => x.id === id)!.name;
  if (heroHit) {
    if (!h.owned) { h.owned = true; return `Новый герой: ${name}!`; }
    h.particles += DUP_PARTICLES; return `${name} — повтор, +${DUP_PARTICLES} частиц`;
  }
  h.particles += def.particles; return `+${def.particles} частиц: ${name}`;
}
/** hero search in the shop: spends coupons; missing medium coupons are bought for crystals */
export function heroSearch(p: Profile, big: boolean, n: number): void {
  if (!big && p.couponsSmall < n) fail('Нет малых купонов. Они бывают в заданиях, лотерее и на чёрном рынке');
  if (big) { const miss = Math.max(0, n - p.couponsBig); if (miss) buyBigCoupon(p, miss); }
  for (let i = 0; i < n; i++) useCoupon(p, big);
}
export function buyBigCoupon(p: Profile, n = 1): void { pay(p, 'crystals', BIG_COUPON.price * n); p.couponsBig += n; }
export function starUp(p: Profile, id: string): void {
  const h = p.heroes[id];
  if (!h.owned) fail('Герой не открыт');
  if (h.stars >= 10) fail('Максимум звёзд');
  const need = STAR_PARTICLES[h.stars], lvl = STAR_LEVEL[h.stars];
  if (h.level < lvl) fail(`Нужен уровень героя ${lvl}`);
  if (h.particles < need) fail(`Нужно ${need} частиц`);
  h.particles -= need; h.stars++;
}

// ---------------- runes ----------------
/** a new rune of a kind; elem/skill picked at random when the kind needs one */
export function addRune(p: Profile, id: RuneId, rarity: number, x?: { elem?: Element; skill?: SkillId }): Rune {
  const r: Rune = { uid: p.nextUid++, id, rarity };
  if (id === 'elem') r.elem = x?.elem ?? pick(ELEMENTS);
  if (id === 'skill') r.skill = x?.skill ?? pick(RUNE_SKILLS);
  p.runes.push(r); return r;
}
/** a random rune: type 1/3 each (or the one asked), then any kind of that type */
export function randomRune(p: Profile, rarity: number, type?: RuneType): Rune {
  const t = type ?? pick(['bless', 'boost', 'skill'] as RuneType[]);
  if (t === 'bless') return addRune(p, pick(BLESS_RUNES), rarity);
  if (t === 'skill') return addRune(p, 'skill', rarity);
  // boosts: 10 elements and 6 families, each as likely
  const k = Math.floor(rnd() * (ELEMENTS.length + FAMILY_RUNES.length));
  return k < ELEMENTS.length ? addRune(p, 'elem', rarity, { elem: ELEMENTS[k] }) : addRune(p, FAMILY_RUNES[k - ELEMENTS.length], rarity);
}
export function craftRune(p: Profile, type?: RuneType): Rune {
  pay(p, 'shards', type ? RUNE_CRAFT_TYPE : RUNE_CRAFT);
  return randomRune(p, 0, type);
}
export function upgradeRune(p: Profile, uid: number): void {
  const r = p.runes.find(x => x.uid === uid) ?? fail('Нет руны');
  if (r.rarity >= MYTHIC) fail('Руна уже мифическая');
  pay(p, 'shards', RUNE_UP[r.rarity]); r.rarity++;
}
/** identical runes of the same step that are not worn by anyone */
export const runeMates = (p: Profile, r: Rune) => p.runes.filter(x => x.uid !== r.uid && runeKey(x) === runeKey(r) && x.rarity === r.rarity && !runeHolder(p, x.uid));
export const canMergeRune = (p: Profile, r: Rune) => r.rarity < MYTHIC && runeMates(p, r).length >= runeDupes(r.rarity);
export function mergeRune(p: Profile, uid: number, pick?: number[]): void {
  const r = p.runes.find(x => x.uid === uid) ?? fail('Нет руны');
  if (r.rarity >= MYTHIC) fail('Руна уже мифическая');
  const need = runeDupes(r.rarity), mates = runeMates(p, r);
  if (mates.length < need) fail(`Нужно ещё ${need} ${need === 1 ? 'такая же руна' : 'таких же руны'} (${RUNE_RARITY[r.rarity].toLowerCase()}, не вставленные)`);
  let used = mates.slice(0, need);
  if (pick) {
    if (new Set(pick).size !== need || pick.length !== need) fail(`Выбери ${need} ${need === 1 ? 'копию' : 'копии'}`);
    used = pick.map(u => mates.find(x => x.uid === u) ?? fail('Эта руна не подходит: нужна такая же, той же редкости, не вставленная'));
  }
  p.runes = p.runes.filter(x => !used.includes(x));
  r.rarity++;
}
export function dismantleRune(p: Profile, uid: number): number {
  const r = p.runes.find(x => x.uid === uid) ?? fail('Нет руны');
  if (runeHolder(p, uid)) fail('Сначала сними руну с героя');
  const g = Math.floor(runeWorth(r.rarity) / 2);
  p.runes = p.runes.filter(x => x !== r); p.shards += g;
  return g;
}
/** put a rune on (or take it off): a slot of its type; the same kind already on is swapped */
export function toggleRune(p: Profile, heroId: string, uid: number): void {
  const h = p.heroes[heroId];
  const at = h.runes.indexOf(uid);
  if (at >= 0) { h.runes[at] = null; return; }
  const r = p.runes.find(x => x.uid === uid) ?? fail('Нет руны');
  for (const [id, o] of Object.entries(p.heroes)) if (id !== heroId && o.runes.includes(uid)) o.runes[o.runes.indexOf(uid)] = null;
  const ns = runeSlots(h.stars), type = runeType(r);
  const same = h.runes.findIndex((u, i) => i < ns && u !== null && (() => { const o = p.runes.find(x => x.uid === u); return !!o && runeKey(o) === runeKey(r); })());
  if (same >= 0) { h.runes[same] = uid; return; }
  const free = RUNE_SLOT_TYPE.findIndex((t, i) => i < ns && t === type && h.runes[i] === null);
  if (free < 0) {
    const has = RUNE_SLOT_TYPE.some((t, i) => i < ns && t === type);
    fail(has ? `Слоты «${RUNE_TYPE_NAME[type]}» заняты. Сними руну, чтобы вставить эту` : `Слот «${RUNE_TYPE_NAME[type]}» откроется следующей звездой героя`);
  }
  h.runes[free] = uid;
}

// ---------------- shop ----------------
export function buy(p: Profile, what: 'scrolls' | 'gold' | 'essBig' | 'essSmall' | 'energy'): string {
  switch (what) {
    case 'scrolls': pay(p, 'crystals', PRICE.scrolls100); p.scrolls += 100; return '+100 свитков';
    case 'gold': pay(p, 'crystals', PRICE.gold100k); p.gold += 100000; return '+100 000 золота';
    case 'essBig': pay(p, 'crystals', PRICE.essBig); p.essBig++; return '+1 большая эссенция';
    case 'essSmall': pay(p, 'crystals', PRICE.essSmall); p.essSmall++; return '+1 малая эссенция';
    case 'energy': {
      if (p.energyBuys.day !== today()) p.energyBuys = { day: today(), n: 0 };
      if (p.energyBuys.n >= 3) fail('Энергию можно купить 3 раза в день');
      pay(p, 'crystals', PRICE.energy30); p.energyBuys.n++; p.energy += 30; return '+30 энергии';
    }
  }
}
// ---------------- wheel of fortune ----------------
export interface Prize { icon: string; label: string; qty: string; w: number; tier: number; give: (p: Profile) => void }
const gem = (stars: number) => (p: Profile) => { randomGem(p, [1, 2, 3, 4].map(s => s === stars ? 1 : 0)); };
export const WHEELS: Record<'adv' | 'super', { name: string; price: number; price10: number; best: number; prizes: Prize[] }> = {
  adv: { name: 'Улучшенное', price: PRICE.lottery, price10: PRICE.lottery10, best: 11, prizes: [
    { icon: '🪙', label: 'Золото', qty: '×5000', w: 25, tier: 0, give: p => { p.gold += 5000; } },
    { icon: '📜', label: 'Свитки', qty: '×30', w: 10, tier: 1, give: p => { p.scrolls += 30; } },
    { icon: '⚡', label: 'Энергия', qty: '×10', w: 15, tier: 0, give: p => { p.energy += 10; } },
    { icon: '💠', label: 'Большая эссенция', qty: '×1', w: 4, tier: 2, give: p => { p.essBig++; } },
    { icon: '🎫', label: 'Малый купон', qty: '×1', w: 9, tier: 1, give: p => { p.couponsSmall++; } },
    { icon: '◆', label: 'Гем ★3', qty: '×1', w: 0.6, tier: 3, give: gem(3) },
    { icon: '✨', label: 'Малая эссенция', qty: '×3', w: 20, tier: 0, give: p => { p.essSmall += 3; } },
    { icon: '◇', label: 'Гем ★2', qty: '×1', w: 3, tier: 2, give: gem(2) },
    { icon: 'ᚱ', label: 'Осколки рун', qty: '×30', w: 9, tier: 1, give: p => { p.shards += 30; } },
    { icon: '🎟️', label: 'Средний купон', qty: '×1', w: 0.8, tier: 3, give: p => { p.couponsBig++; } },
    { icon: '🧩', label: 'Частицы героя дня', qty: '×15', w: 3, tier: 2, give: p => { p.heroes[heroOfDay()].particles += 15; } },
    { icon: '🔶', label: 'Легендарная руна', qty: '×1', w: 0.6, tier: 3, give: p => { randomRune(p, LEGEND); } },
  ] },
  super: { name: 'Супер', price: 300, price10: 2700, best: 4, prizes: [
    { icon: '📜', label: 'Свитки', qty: '×100', w: 14, tier: 1, give: p => { p.scrolls += 100; } },
    { icon: '💠', label: 'Большая эссенция', qty: '×2', w: 14, tier: 2, give: p => { p.essBig += 2; } },
    { icon: '🎟️', label: 'Средний купон', qty: '×1', w: 12, tier: 2, give: p => { p.couponsBig++; } },
    { icon: 'ᚱ', label: 'Осколки рун', qty: '×150', w: 10, tier: 2, give: p => { p.shards += 150; } },
    { icon: '◈', label: 'Гем ★4', qty: '×1', w: 1.5, tier: 3, give: gem(4) },
    { icon: '◆', label: 'Гем ★3', qty: '×1', w: 8, tier: 3, give: gem(3) },
    { icon: '🛡️', label: 'Эпический предмет', qty: '×1', w: 8, tier: 3, give: p => { addItem(p, pick(SLOTS), pick(SETS), 2); } },
    { icon: '🔶', label: 'Легендарная руна', qty: '×1', w: 3, tier: 3, give: p => { randomRune(p, LEGEND); } },
    { icon: '🧩', label: 'Частицы героя дня', qty: '×50', w: 4, tier: 3, give: p => { p.heroes[heroOfDay()].particles += 50; } },
    // правка 93: 12 prizes like the picture of the wheel; the old common prizes gave their share, rare odds unchanged
    { icon: '🪙', label: 'Золото', qty: '×50K', w: 7, tier: 1, give: p => { p.gold += 50000; } },
    { icon: '⚡', label: 'Энергия', qty: '×30', w: 7, tier: 2, give: p => { p.energy += 30; } },
    { icon: '🎫', label: 'Малые купоны', qty: '×3', w: 6, tier: 2, give: p => { p.couponsSmall += 3; } },
  ] },
};
/** returns the indices of the prizes that came out (the wheel animates to the last one) */
export function spin(p: Profile, wheel: 'adv' | 'super', n: 1 | 10, ad = false): number[] {
  const W = WHEELS[wheel];
  const free = !ad && wheel === 'adv' && n === 1 && p.lotteryFreeDay !== today();
  if (ad) adUse(p, 'wheel'); else if (free) p.lotteryFreeDay = today(); else pay(p, 'crystals', n === 1 ? W.price : W.price10);
  const tot = W.prizes.reduce((a, x) => a + x.w, 0);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let r = rnd() * tot, k = 0;
    for (; k < W.prizes.length - 1; k++) { if (r < W.prizes[k].w) break; r -= W.prizes[k].w; }
    if (wheel === 'adv') {
      p.pityLottery++;
      if (p.pityLottery >= 40 && W.prizes[k].tier < 3) k = W.prizes.findIndex(x => x.tier === 3);
      if (W.prizes[k].tier === 3) p.pityLottery = 0;
    }
    W.prizes[k].give(p); out.push(k);
  }
  return out;
}
export const lotteryFree = (p: Profile) => p.lotteryFreeDay !== today();
export const lotteryAttention = (p: Profile) => unlocked(p, 'wheel') && lotteryFree(p);
export const fastIdleFree = (p: Profile) => fastIdleState(p).free > 0;
/** test button until payments exist (stage 4) */
export function testCrystals(p: Profile): void { p.crystals += 1000; }
export { RUNE_RARITY };


// ---------------- gear chests ----------------
export function openChest(p: Profile, id: ChestId, n: 1 | 10, set: SetId, free = false): Item[] {
  const c = CHESTS[id];
  if (!free) pay(p, 'crystals', c.price * (n === 10 ? CHEST_X10 : 1));
  p.pityChest ??= {};
  const out: Item[] = [];
  for (let i = 0; i < n; i++) {
    let rarity = roll(c.odds);
    if (c.pity) {
      const k = (p.pityChest[id] ?? 0) + 1;
      if (k >= c.pity.every && rarity < c.pity.rarity) rarity = c.pity.rarity;
      p.pityChest[id] = rarity >= c.pity.rarity ? 0 : k;
    }
    if (id === 'runes') { randomRune(p, rarity); continue; }
    out.push(addItem(p, pick(SLOTS), id === 'set' ? set : pick(SETS), rarity));
  }
  return out;
}
export const chestPity = (p: Profile, id: ChestId) => { const c = CHESTS[id]; return c.pity ? c.pity.every - (p.pityChest?.[id] ?? 0) : 0; };

/** smith window: every group that can merge now, without sharing items. keep: the item that stays and goes up;
 *  auto: common and rare steps are ticked by default, epic and higher are left to the player */
export interface SmithGroup { keep: number; mats: number[]; rarity: number; auto: boolean }
export function smithPlan(p: Profile): SmithGroup[] {
  const used = new Set<number>(), out: SmithGroup[] = [];
  const sorted = [...p.items].sort((a, b) => b.rarity - a.rarity || (isWorn(p, b.uid) ? 1 : 0) - (isWorn(p, a.uid) ? 1 : 0) || b.level - a.level || a.uid - b.uid);
  for (const it of sorted) {
    if (used.has(it.uid)) continue;
    const need = mergeNeed(p, it); if (!need) continue;
    const mats = need.have.filter(x => !used.has(x.uid)).slice(0, need.n);
    if (mats.length < need.n) continue;
    used.add(it.uid); mats.forEach(x => used.add(x.uid));
    out.push({ keep: it.uid, mats: mats.map(x => x.uid), rarity: it.rarity, auto: it.rarity < EPIC });
  }
  return out;
}
/** members that may stay instead of the keeper: same rarity, not worn unless it is the keeper */
export function smithKeepers(p: Profile, g: SmithGroup): number[] {
  const k = p.items.find(x => x.uid === g.keep)!;
  if (isWorn(p, g.keep)) return [g.keep]; // the worn one always stays
  return [g.keep, ...g.mats].filter(u => p.items.find(i => i.uid === u)!.rarity === k.rarity);
}
/** run the chosen groups; a group may name another keeper from smithKeepers. Returns the items that went up. */
export function smithRun(p: Profile, groups: { keep: number; mats: number[] }[]): Item[] {
  if (!groups.length) fail('Отметь, что сливать');
  const out: Item[] = [];
  for (const g of groups) { merge(p, g.keep, g.mats); out.push(p.items.find(x => x.uid === g.keep)!); }
  return out;
}

/** smith: every triple of the same common or rare item; the worn / highest-level one is kept.
 *  Steps from epic up use other items as material, so the player does those by hand. */
export function mergeAll(p: Profile): number {
  let done = 0, again = true;
  while (again) {
    again = false;
    const sorted = [...p.items].sort((a, b) => (isWorn(p, b.uid) ? 1 : 0) - (isWorn(p, a.uid) ? 1 : 0) || b.level - a.level);
    for (const it of sorted) {
      if (it.rarity >= EPIC || !canMerge(p, it)) continue;
      merge(p, it.uid); done++; again = true; break;
    }
  }
  return done;
}

export function unlockHero(p: Profile, id: string): void {
  const h = p.heroes[id];
  if (h.owned) fail('Уже открыт');
  if (h.particles < HERO_UNLOCK_PARTICLES) fail(`Нужно ${HERO_UNLOCK_PARTICLES} частиц`);
  h.particles -= HERO_UNLOCK_PARTICLES; h.owned = true;
}

// ---------------- daily shop ----------------
export interface Offer { id: string; label: string; icon: string; price: number; cur: 'crystals' | 'gold' | 'free'; old?: number; give: (p: Profile) => void }
const OFFER_POOL: Omit<Offer, 'id'>[] = [
  { label: '50 свитков', icon: '📜', price: 35, old: 50, cur: 'crystals', give: p => { p.scrolls += 50; } },
  { label: '5 малых эссенций', icon: '✨', price: 30, old: 50, cur: 'crystals', give: p => { p.essSmall += 5; } },
  { label: 'Большая эссенция', icon: '💠', price: 50, old: 80, cur: 'crystals', give: p => { p.essBig += 1; } },
  { label: 'Средний купон', icon: '🎟️', price: 210, old: 300, cur: 'crystals', give: p => { p.couponsBig += 1; } },
  { label: '60 осколков рун', icon: 'ᚱ', price: 60, old: 100, cur: 'crystals', give: p => { p.shards += 60; } },
  { label: '3 малых купона', icon: '🎫', price: 20000, cur: 'gold', give: p => { p.couponsSmall += 3; } },
  { label: '20 осколков рун', icon: 'ᚱ', price: 15000, cur: 'gold', give: p => { p.shards += 20; } },
  { label: '30 свитков', icon: '📜', price: 12000, cur: 'gold', give: p => { p.scrolls += 30; } },
];
function dayHash(d: string): number { let h = 7; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
export function dailyOffers(): Offer[] {
  const d = today(); let h = dayHash(d);
  const pool = [...OFFER_POOL], out: Offer[] = [];
  out.push({ id: 'free', label: h % 2 ? '10 энергии' : '3 000 золота', icon: h % 2 ? '⚡' : '🪙', price: 0, cur: 'free', give: h % 2 ? (p => { p.energy += 10; }) : (p => { p.gold += 3000; }) });
  for (let i = 0; i < 5; i++) { h = (h * 1103515245 + 12345) >>> 0; const o = pool.splice(h % pool.length, 1)[0]; out.push({ ...o, id: 'o' + i }); }
  return out;
}
export function buyOffer(p: Profile, id: string): string {
  if (p.daily?.day !== today()) p.daily = { day: today(), bought: [] };
  if (p.daily.bought.includes(id)) fail('Уже куплено сегодня');
  const o = dailyOffers().find(x => x.id === id) ?? fail('Нет предложения');
  if (o.cur !== 'free') pay(p, o.cur, o.price);
  o.give(p); p.daily.bought.push(id);
  return `+${o.label}`;
}
export const offerBought = (p: Profile, id: string) => p.daily?.day === today() && p.daily.bought.includes(id);


// ---------------- gem search: chain of locations ----------------
export function exploreState(p: Profile) {
  p.explore ??= { loc: 0, freeDay: '', freeUsed: 0 };
  if (p.explore.freeDay !== today()) { p.explore.freeDay = today(); p.explore.freeUsed = 0; }
  return p.explore;
}
export const exploreFreeLeft = (p: Profile) => GEM_FREE_PER_DAY - exploreState(p).freeUsed;
/** one search at the current location; returns whether we moved on */
export function explore(p: Profile, cur: 'gold' | 'crystals'): { stars: number; type: GemType; moved: boolean; loc: number; uid: number; ess?: { small: number; big: number } } {
  const e = exploreState(p);
  let odds: number[];
  if (cur === 'crystals') {
    pay(p, 'crystals', CR_SEARCH.cost);
    e.loc = Math.max(e.loc, 3); // straight to the Ruins
    odds = CR_SEARCH.odds;
  } else {
    const L = GEM_LOCATIONS[e.loc];
    if (e.freeUsed < GEM_FREE_PER_DAY) e.freeUsed++; else pay(p, 'gold', L.cost);
    odds = L.odds;
  }
  let stars = 1, ess: { small: number; big: number } | undefined;
  if (cur === 'crystals') {
    stars = crystalPity(p, 1 + roll(odds));
  } else {
    // a gem (★3, ★2 or ★1) or, most of the time, gem essence
    const L = GEM_LOCATIONS[e.loc];
    let r = rnd();
    if (r < L.odds[2]) stars = 3; else if ((r -= L.odds[2]) < L.odds[1]) stars = 2; else if ((r -= L.odds[1]) < L.odds[0]) stars = 1;
    else { r -= L.odds[0]; ess = L.ess[L.ess.length - 1]; for (const x of L.ess) { if (r < x.p) { ess = x; break; } r -= x.p; } ess = { small: ess.small, big: ess.big }; }
  }
  const type = pick(GEM_TYPES);
  let uid = -1;
  if (ess) { p.essSmall += ess.small; p.essBig += ess.big; } else uid = addGem(p, type, stars).uid;
  taskAdd(p, 'search', 1);
  const from = e.loc;
  const moved = e.loc < 4 && rnd() < GEM_LOCATIONS[e.loc].next;
  e.loc = moved ? e.loc + 1 : 0;
  return { stars, type, moved, loc: from, uid, ess };
}


// ================= tasks: daily, weekly, login calendar =================
export type TaskKey = 'login' | 'runs' | 'wins' | 'kills' | 'idle' | 'upgrade' | 'search' | 'days' | 'wall';
export interface TaskState { day: string; week: string; d: Partial<Record<TaskKey, number>>; w: Partial<Record<TaskKey, number>>; dDone: string[]; wDone: string[]; dChest: number[]; wChest: number[]; dayClosed?: boolean }
export interface TaskDef { id: string; key: TaskKey; need: number; pts: number; text: string }
export interface ChestDef { at: number; label: string; give: (p: Profile) => void }
export const DAILY: TaskDef[] = [
  { id: 'login', key: 'login', need: 1, pts: 10, text: 'Войти в игру' },
  { id: 'runs', key: 'runs', need: 3, pts: 20, text: 'Сыграть 3 забега' },
  { id: 'wins', key: 'wins', need: 1, pts: 20, text: 'Пройти 1 этап' },
  { id: 'kills', key: 'kills', need: 500, pts: 20, text: 'Убить 500 врагов' },
  { id: 'idle', key: 'idle', need: 1, pts: 10, text: 'Забрать сундук накопления' },
  { id: 'upgrade', key: 'upgrade', need: 1, pts: 10, text: 'Прокачать предмет' },
  { id: 'search', key: 'search', need: 1, pts: 10, text: 'Поиск гема' },
  { id: 'wall', key: 'wall', need: 10, pts: 10, text: 'Защити стену 10 волн' },
];
export const DAILY_CHESTS: ChestDef[] = [
  { at: 20, label: '2 000 золота', give: p => { p.gold += 2000; } },
  { at: 40, label: '10💎 + 10 свитков', give: p => { p.crystals += 10; p.scrolls += 10; } },
  { at: 60, label: '2 малые эссенции', give: p => { p.essSmall += 2; } },
  { at: 80, label: '10💎 + малый купон', give: p => { p.crystals += 10; p.couponsSmall++; } },
  { at: 100, label: '10💎 + 5 энергии', give: p => { p.crystals += 10; p.energy += 5; } },
];
export const WEEKLY: TaskDef[] = [
  { id: 'days', key: 'days', need: 7, pts: 20, text: 'Закрыть день (100 очков) — +20 за каждый' },
  { id: 'wruns', key: 'runs', need: 15, pts: 30, text: 'Сыграть 15 забегов' },
  { id: 'wwins', key: 'wins', need: 5, pts: 30, text: 'Пройти 5 этапов' },
  { id: 'wkills', key: 'kills', need: 5000, pts: 30, text: 'Убить 5 000 врагов' },
  { id: 'wsearch', key: 'search', need: 10, pts: 30, text: 'Сделать 10 поисков гемов' },
];
export const WEEKLY_CHESTS: ChestDef[] = [
  { at: 50, label: '20 000 золота', give: p => { p.gold += 20000; } },
  { at: 100, label: '50 свитков', give: p => { p.scrolls += 50; } },
  { at: 150, label: 'Средний купон', give: p => { p.couponsBig++; } },
  { at: 200, label: '100 осколков рун', give: p => { p.shards += 100; } },
];
export const LOGIN: { label: string; icon: string; give: (p: Profile) => void; special?: boolean }[] = Array.from({ length: 28 }, (_, i) => {
  const d = i + 1;
  if (d === 7) return { label: 'Средний купон', icon: '🎟️', special: true, give: (p: Profile) => { p.couponsBig++; } };
  if (d === 14) return { label: 'Гем ★2', icon: '◇', special: true, give: (p: Profile) => { randomGem(p, [0, 1, 0]); } };
  if (d === 21) return { label: '50 частиц героя дня', icon: '🧩', special: true, give: (p: Profile) => { p.heroes[heroOfDay()].particles += 50; } };
  if (d === 28) return { label: 'Гем ★4', icon: '◈', special: true, give: (p: Profile) => { randomGem(p, [0, 0, 0, 1]); } };
  const k = i % 5;
  if (k === 0) return { label: `${(2 + Math.floor(i / 7)) * 1000} золота`, icon: '🪙', give: (p: Profile) => { p.gold += (2 + Math.floor(i / 7)) * 1000; } };
  if (k === 1) return { label: '15 свитков', icon: '📜', give: (p: Profile) => { p.scrolls += 15; } };
  if (k === 2) return { label: '3 малые эссенции', icon: '✨', give: (p: Profile) => { p.essSmall += 3; } };
  if (k === 3) return { label: '10 энергии', icon: '⚡', give: (p: Profile) => { p.energy += 10; } };
  return { label: '20 осколков рун', icon: '🔮', give: (p: Profile) => { p.shards += 20; } };
});

/** правка 179: Monday of the current week, all by UTC (the local weekday with a UTC date made the key flip every night) */
function weekKey(): string { const d = new Date(); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); }
export function taskState(p: Profile): TaskState {
  const t = p.tasks ??= { day: '', week: '', d: {}, w: {}, dDone: [], wDone: [], dChest: [], wChest: [] };
  if (t.week !== weekKey()) { t.week = weekKey(); t.w = {}; t.wDone = []; t.wChest = []; }
  if (t.day !== today()) { t.day = today(); t.d = { login: 1 }; t.dDone = []; t.dChest = []; t.dayClosed = false; }
  return t;
}
export function taskAdd(p: Profile, k: TaskKey, n: number): void {
  const t = taskState(p);
  t.d[k] = (t.d[k] ?? 0) + n; t.w[k] = (t.w[k] ?? 0) + n;
}
export const dailyPoints = (p: Profile) => { const t = taskState(p); return DAILY.filter(d => t.dDone.includes(d.id)).reduce((a, d) => a + d.pts, 0); };
export const weeklyPoints = (p: Profile) => { const t = taskState(p); return WEEKLY.filter(d => t.wDone.includes(d.id)).reduce((a, d) => a + (d.key === 'days' ? 0 : d.pts), 0) + 20 * Math.min(7, t.w.days ?? 0); };
export function claimTask(p: Profile, weekly: boolean, id: string): void {
  const t = taskState(p), defs = weekly ? WEEKLY : DAILY, done = weekly ? t.wDone : t.dDone;
  const d = defs.find(x => x.id === id) ?? fail('Нет задания');
  if (done.includes(id)) fail('Уже получено');
  if (((weekly ? t.w : t.d)[d.key] ?? 0) < d.need) fail('Задание ещё не выполнено');
  done.push(id);
  if (d.key !== 'days') bpAdd(p, d.pts);
  if (!weekly && !t.dayClosed && dailyPoints(p) >= 100) { t.dayClosed = true; t.w.days = (t.w.days ?? 0) + 1; bpAdd(p, 20); }
}
export function claimTaskChest(p: Profile, weekly: boolean, at: number): void {
  const t = taskState(p), list = weekly ? WEEKLY_CHESTS : DAILY_CHESTS, got = weekly ? t.wChest : t.dChest;
  const c = list.find(x => x.at === at) ?? fail('Нет сундука');
  if (got.includes(at)) fail('Уже получено');
  if ((weekly ? weeklyPoints(p) : dailyPoints(p)) < at) fail(`Нужно ${at} очков`);
  got.push(at); c.give(p);
}
export function loginState(p: Profile) { return p.login ??= { idx: 0, last: '' }; }
export const loginClaimable = (p: Profile) => loginState(p).last !== today();
export function claimLogin(p: Profile): void {
  const l = loginState(p);
  if (l.last === today()) fail('Сегодняшняя награда уже получена');
  LOGIN[l.idx % 28].give(p); l.idx = (l.idx + 1) % 28; l.last = today();
}
/** правка 165: задание про закрытый раздел — подпись «Откроется после этапа N» вместо кнопки */
export function taskLock(p: Profile, key: TaskKey): string | null {
  if (key === 'search' && !unlocked(p, 'jewel')) return unlockText('jewel');
  if (key === 'wall' && !wallUnlocked(p)) return `Откроется после этапа 2`;
  return null;
}
export function tasksAttention(p: Profile): boolean {
  const t = taskState(p);
  if (loginClaimable(p)) return true;
  if (DAILY.some(d => !t.dDone.includes(d.id) && (t.d[d.key] ?? 0) >= d.need)) return true;
  if (WEEKLY.some(d => d.key !== 'days' && !t.wDone.includes(d.id) && (t.w[d.key] ?? 0) >= d.need)) return true;
  if (DAILY_CHESTS.some(c => !t.dChest.includes(c.at) && dailyPoints(p) >= c.at)) return true;
  return WEEKLY_CHESTS.some(c => !t.wChest.includes(c.at) && weeklyPoints(p) >= c.at);
}

// ================= black market: day / week / month =================
export interface MarketOffer { id: string; icon: string; label: string; desc: string; price: number; old: number; limit: number; pick?: 'set' | 'hero' | 'elem' | 'setElem'; give: (p: Profile, choice: { set: SetId; hero: string; elem: Element }) => void }
export const WEEK_OFFERS: MarketOffer[] = [
  { id: 'wScroll', icon: '📜', label: 'Набор свитков', desc: '300 свитков', price: 210, old: 300, limit: 3, give: p => { p.scrolls += 300; } },
  { id: 'wRune', icon: '🔮', label: 'Набор рун', desc: '300 осколков рун', price: 300, old: 500, limit: 3, give: p => { p.shards += 300; } },
  { id: 'wTavern', icon: '🎟️', label: 'Набор таверны', desc: '5 малых купонов + 1 средний', price: 400, old: 610, limit: 2, give: p => { p.couponsSmall += 5; p.couponsBig += 1; } },
  { id: 'wEss', icon: '💠', label: 'Набор эссенции', desc: '10 больших эссенций', price: 560, old: 800, limit: 2, give: p => { p.essBig += 10; } },
  { id: 'wChest', icon: '🏆', label: 'Сундуки комплекта ×5', desc: '5 сундуков выбранного комплекта', price: 1360, old: 1700, limit: 1, pick: 'set', give: (p, c) => { p.crystals += CHESTS.set.price * 5; openChestN(p, 5, c.set); } },
];
export const MONTH_OFFERS: MarketOffer[] = [
  { id: 'mGem', icon: '◆', label: '«Гемовый»', desc: '1 гем ★4 + 2 гема ★3 случайного типа + 20 больших эссенций', price: 3500, old: 6900, limit: 1, give: p => { randomGem(p, [0, 0, 0, 1]); for (let i = 0; i < 2; i++) randomGem(p, [0, 0, 1]); p.essBig += 20; } },
  { id: 'mHero', icon: '🦸', label: '«Героический»', desc: '10 средних купонов + 100 частиц выбранного героя', price: 2400, old: 4000, limit: 1, pick: 'hero', give: (p, c) => { p.couponsBig += 10; p.heroes[c.hero].particles += 100; } },
  { id: 'mLegend', icon: '🔶', label: '«Легендарный»', desc: '2 легендарные руны выбранной стихии + эпический предмет выбранного комплекта', price: 3000, old: 5000, limit: 1, pick: 'setElem', give: (p, c) => { for (let i = 0; i < 2; i++) addRune(p, 'elem', LEGEND, { elem: c.elem }); addItem(p, pick(SLOTS), c.set, EPIC); } },
];
function openChestN(p: Profile, n: number, set: SetId): void { for (let i = 0; i < n; i++) openChest(p, 'set', 1, set); }
function monthKey(): string { return today().slice(0, 7); }
export function marketState(p: Profile) {
  const m = p.market ??= { week: '', wb: {}, month: '', mb: {} };
  if (m.week !== weekKey()) { m.week = weekKey(); m.wb = {}; }
  if (m.month !== monthKey()) { m.month = monthKey(); m.mb = {}; }
  return m;
}
export function buyMarket(p: Profile, monthly: boolean, id: string, choice: { set: SetId; hero: string; elem: Element }): void {
  const m = marketState(p), list = monthly ? MONTH_OFFERS : WEEK_OFFERS, bought = monthly ? m.mb : m.wb;
  const o = list.find(x => x.id === id) ?? fail('Нет предложения');
  if ((bought[id] ?? 0) >= o.limit) fail('Лимит покупок исчерпан');
  pay(p, 'crystals', o.price);
  o.give(p, choice); bought[id] = (bought[id] ?? 0) + 1;
}
export const marketLeft = (p: Profile, monthly: boolean, o: MarketOffer) => o.limit - ((monthly ? marketState(p).mb : marketState(p).wb)[o.id] ?? 0);
export const marketAttention = (p: Profile) => unlocked(p, 'market') && !offerBought(p, 'free');
export const giftAttention = (p: Profile) => !offerBought(p, 'free'); // правка 165: подарок дня — первым в Магазине


// ================= battle pass: points from daily and weekly tasks =================
export interface BpState { season: number; pts: number; free: number[]; paid: number[]; bought: boolean }
export interface BpPrize { icon: string; label: string; give: (p: Profile) => void }
export const BP = { levels: 30, perLevel: 100, days: 30, epoch: Date.UTC(2026, 10, 1), usd: '$9.99' };
const bpFree = (i: number): BpPrize => {
  if (i % 5 === 0) return { icon: '💎', label: '50 кристаллов', give: p => { p.crystals += 50; } };
  switch (i % 4) {
    case 1: return { icon: '🪙', label: `${fmtK(2000 + 200 * i)} золота`, give: p => { p.gold += 2000 + 200 * i; } };
    case 2: return { icon: '📜', label: '20 свитков', give: p => { p.scrolls += 20; } };
    case 3: return { icon: '✨', label: '3 малые эссенции', give: p => { p.essSmall += 3; } };
    default: return { icon: '🎫', label: 'Малый купон', give: p => { p.couponsSmall++; } };
  }
};
const bpPaid = (i: number): BpPrize => {
  if (i === 30) return { icon: '◈', label: 'Гем ★4', give: p => { randomGem(p, [0, 0, 0, 1]); } };
  if (i === 24) return { icon: '📕', label: 'Эпическое оружие комплекта', give: p => { addItem(p, 'book', mainSet(p), 2); } };
  if (i % 5 === 0) return { icon: '💎', label: '200 кристаллов', give: p => { p.crystals += 200; } };
  if ([2, 8, 14, 22, 28].includes(i)) return { icon: '💎', label: '60 кристаллов', give: p => { p.crystals += 60; } };
  if ([7, 17, 27].includes(i)) return { icon: '🎟️', label: 'Средний купон', give: p => { p.couponsBig++; } };
  switch (i % 3) {
    case 0: return { icon: '🔮', label: '50 осколков рун', give: p => { p.shards += 50; } };
    case 1: return { icon: '💠', label: '2 большие эссенции', give: p => { p.essBig += 2; } };
    default: return { icon: '📜', label: '50 свитков', give: p => { p.scrolls += 50; } };
  }
};
/** the set the player wears most (for gifts of a set item) */
function mainSet(p: Profile): SetId {
  const n: Partial<Record<SetId, number>> = {};
  for (const sl of SLOTS) { const it = p.items.find(i => i.uid === p.equipped[sl]); if (it?.set) n[it.set] = (n[it.set] ?? 0) + 1; }
  return SETS.reduce((a, b) => (n[b] ?? 0) > (n[a] ?? 0) ? b : a, 'guard' as SetId);
}
const fmtK = (n: number) => n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'K' : String(n);
export const BP_PRIZES = Array.from({ length: BP.levels }, (_, k) => ({ free: bpFree(k + 1), paid: bpPaid(k + 1) }));
const seasonNow = () => Math.max(0, Math.floor((Date.now() - BP.epoch) / (BP.days * 864e5)));
export const bpSeasonEnd = () => BP.epoch + (seasonNow() + 1) * BP.days * 864e5;
export function bpState(p: Profile): BpState {
  const s = seasonNow();
  if (!p.bp || p.bp.season !== s) p.bp = { season: s, pts: 0, free: [], paid: [], bought: false };
  return p.bp;
}
export const bpLevel = (p: Profile) => Math.min(BP.levels, Math.floor(bpState(p).pts / BP.perLevel));
function bpAdd(p: Profile, n: number): void { bpState(p).pts += n; }
export function bpClaimable(p: Profile): number[][] {
  const b = bpState(p), L = bpLevel(p), out: number[][] = [[], []];
  for (let i = 1; i <= L; i++) { if (!b.free.includes(i)) out[0].push(i); if (b.bought && !b.paid.includes(i)) out[1].push(i); }
  return out;
}
export function bpClaim(p: Profile, paid: boolean, lvl: number): void {
  const b = bpState(p);
  if (lvl > bpLevel(p)) fail(`Нужен ${lvl}-й уровень пропуска`);
  if (paid && !b.bought) fail('Нужен батл пасс');
  const got = paid ? b.paid : b.free;
  if (got.includes(lvl)) fail('Уже получено');
  got.push(lvl); BP_PRIZES[lvl - 1][paid ? 'paid' : 'free'].give(p);
}
export function bpClaimAll(p: Profile): number {
  const [f, q] = bpClaimable(p);
  for (const i of f) bpClaim(p, false, i);
  for (const i of q) bpClaim(p, true, i);
  return f.length + q.length;
}
export function bpBuy(p: Profile): void {
  payGate(p);
  const b = bpState(p); if (b.bought) fail('Батл пасс уже куплен'); b.bought = true;
}
export const bpAttention = (p: Profile) => unlocked(p, 'bp') && bpClaimable(p).some(x => x.length > 0);

// ================= passes: monthly, hunter card, permanent card =================
export type PassId = 'perm' | 'month' | 'hunter';
export interface PassState { month: number; hunter: number; perm: boolean; got: Partial<Record<PassId, string>>; permFrom?: string }
export interface PassDef { id: PassId; name: string; usd: string; now: number; day: number; perks: string[]; days: number }
export const PASSES: PassDef[] = [
  { id: 'perm', name: 'Постоянная карта припасов', usd: '$19.99', now: 2000, day: 100, days: 0,
    perks: ['Покупается один раз — навсегда', 'Награды за рекламу — сразу, без ролика', 'Максимум энергии +5', 'Не зашёл — награда копится (до 30 дней)'] },
  { id: 'month', name: 'Месячный пропуск', usd: '$4.99', now: 300, day: 70, days: 30,
    perks: ['Каждый день: кристаллы, 5 свитков и 10 осколков рун', '+1 бесплатное обновление навыков в каждом бою'] },
  { id: 'hunter', name: 'Карта охотника', usd: '$2.99', now: 200, day: 20, days: 30,
    perks: ['Быстрый сбор за кристаллы без дневного лимита', 'Максимум энергии +20', 'Награды сундука накопления +20%'] },
];
const dayNum = (d: string) => Math.floor(Date.parse(d) / 864e5);
export function passState(p: Profile): PassState { return p.passes ??= { month: 0, hunter: 0, perm: false, got: {} }; }
export function passActive(p: Profile, id: PassId): boolean {
  const s = p.passes; if (!s) return false;
  return id === 'perm' ? s.perm : s[id] > Date.now();
}
export const passDaysLeft = (p: Profile, id: 'month' | 'hunter') => Math.max(0, Math.ceil((passState(p)[id] - Date.now()) / 864e5));
export const energyMax = (p: Profile) => ENERGY.max + (passActive(p, 'hunter') ? 20 : 0) + (passActive(p, 'perm') ? PERM_ENERGY : 0);
/** правка 173: the permanent card — +5 max energy, missed days pile up to 30 */
export const PERM_ENERGY = 5, PERM_PILE = 30;
/** days of reward waiting: the permanent card keeps every missed day, the 30-day ones only today */
export function passPending(p: Profile, id: PassId): number {
  if (!passActive(p, id)) return 0;
  const s = passState(p), last = s.got[id];
  if (last === today()) return 0;
  if (id !== 'perm') return 1;
  const from = last ? dayNum(last) : dayNum(s.permFrom ?? today()) - 1;
  return Math.min(PERM_PILE, Math.max(1, dayNum(today()) - from));
}
export function passBuy(p: Profile, id: PassId): void {
  payGate(p);
  const s = passState(p), d = PASSES.find(x => x.id === id)!;
  if (id === 'perm') { if (s.perm) fail('Карта уже куплена'); s.perm = true; s.permFrom = today(); }
  else s[id] = Math.max(s[id], Date.now()) + d.days * 864e5;
  p.crystals += d.now;
}
export function passClaim(p: Profile, id: PassId): number {
  const n = passPending(p, id); if (!n) return 0;
  const d = PASSES.find(x => x.id === id)!;
  p.crystals += d.day * n;
  if (id === 'month') { p.scrolls += 5 * n; p.shards += 10 * n; }
  passState(p).got[id] = today();
  return n;
}
export const passClaimAll = (p: Profile) => PASSES.reduce((a, d) => a + passClaim(p, d.id), 0);
export const passAttention = (p: Profile) => unlocked(p, 'passes') && PASSES.some(d => passPending(p, d.id) > 0);

// ================= правка 173: real money — crystal packs; правка 172: starter pack and rewarded ads =================
/** правка 195: «Тест: покупки» is gone from the game — the switch works only in the #debug mode (set by the client) */
let payTestAllowed = false;
export function allowPayTest(on: boolean): void { payTestAllowed = on; }
export const payTest = (p: Profile) => payTestAllowed && !!p.testPay;
/** until Google Play Billing (stage Г) every real-money purchase is closed for players */
export function payGate(p: Profile): void {
  if (!payTest(p)) fail('Оплата появится вместе с Google Play');
}
export interface CrystalPack { id: string; usd: string; n: number }
export const CRYSTAL_PACKS: CrystalPack[] = [
  { id: 'c1', usd: '$0.99', n: 80 }, { id: 'c5', usd: '$4.99', n: 500 }, { id: 'c10', usd: '$9.99', n: 1100 },
  { id: 'c20', usd: '$19.99', n: 2400 }, { id: 'c50', usd: '$49.99', n: 6500 }, { id: 'c100', usd: '$99.99', n: 14000 },
];
export const packFirst = (p: Profile, id: string) => !(p.packs ?? []).includes(id);
export function buyPack(p: Profile, id: string): string {
  payGate(p);
  const k = CRYSTAL_PACKS.find(x => x.id === id);
  if (!k) return fail('Нет такого набора');
  const first = packFirst(p, id), n = k.n * (first ? 2 : 1);
  p.crystals += n; (p.packs ??= []).push(id);
  return first ? `+${n} кристаллов (первая покупка ×2)` : `+${n} кристаллов`;
}
/** правка 172: one-time starter pack, offered after stage 1 until bought */
export const STARTER = { usd: '$1.99', crystals: 300, energy: 30, scrolls: 100 };
export const starterOffered = (p: Profile) => p.maxMap >= 1 && !p.starter;
export function buyStarter(p: Profile): string {
  if (p.starter) fail('Стартовый набор уже куплен');
  payGate(p);
  p.crystals += STARTER.crystals; p.energy += STARTER.energy; p.scrolls += STARTER.scrolls;
  addItem(p, pick(SLOTS), mainSet(p), 2);
  p.starter = true;
  return 'Стартовый набор';
}
export type AdKind = 'double' | 'energy' | 'chest' | 'wheel' | 'hero' | 'runes';
/** правка 172: how many rewarded ads of each kind a day; energy per ad */
export const AD_LIMIT: Record<AdKind, number> = { double: 3, energy: 3, chest: 1, wheel: 1, hero: 1, runes: 1 };
export const AD_ENERGY = 10;
function adState(p: Profile): NonNullable<Profile['ads']> {
  if (!p.ads || p.ads.day !== today()) p.ads = { day: today(), n: {} };
  return p.ads;
}
export const adLeft = (p: Profile, k: AdKind) => Math.max(0, AD_LIMIT[k] - (adState(p).n[k] ?? 0));
export const adUsed = (p: Profile, k: AdKind) => AD_LIMIT[k] - adLeft(p, k);
/** the permanent card gives the ad rewards right away, without the video */
export const adSkip = (p: Profile) => passActive(p, 'perm');
function adUse(p: Profile, k: AdKind): void {
  if (adLeft(p, k) <= 0) fail('На сегодня реклама здесь закончилась. Завтра снова');
  const s = adState(p); s.n[k] = (s.n[k] ?? 0) + 1;
}
export function adEnergy(p: Profile): string { adUse(p, 'energy'); p.energy += AD_ENERGY; return `+${AD_ENERGY} энергии`; }
export function adChest(p: Profile, set: SetId): Item[] { adUse(p, 'chest'); return openChest(p, 'set', 1, set, true); }
/** правка 197: the rune chest ×1 for an ad, once a day (same odds, the pity counter runs too) */
export function adRuneChest(p: Profile): void { adUse(p, 'runes'); openChest(p, 'runes', 1, 'guard', true); }
export function adHero(p: Profile): string { adUse(p, 'hero'); p.couponsSmall++; return useCoupon(p, false); }
/** «удвоить награду за бой»: gold, scrolls and rune shards of the fight once more (not the hero xp and not the stage chest) */
export function adDouble(p: Profile, r: Pick<RunReward, 'gold' | 'scrolls' | 'shards'>): void {
  adUse(p, 'double'); p.gold += r.gold; p.scrolls += r.scrolls; p.shards += r.shards;
}

// ================= правка 202: in-game mail =================
/** what a letter from the developer may give and how much at most (the server checks the same list) */
export const MAIL_CAP = {
  gold: 10_000_000, crystals: 100_000, scrolls: 100_000, shards: 100_000, energy: 999,
  essSmall: 1_000, essBig: 1_000, couponsSmall: 1_000, couponsBig: 1_000,
} as const;
export type MailKey = keyof typeof MAIL_CAP;
export type MailReward = Partial<Record<MailKey, number>>;
/** adds the reward of a letter to the account (anything unknown or out of range is skipped) */
export function applyMail(p: Profile, r: MailReward): void {
  for (const k of Object.keys(MAIL_CAP) as MailKey[]) {
    const n = r[k];
    if (typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= MAIL_CAP[k]) p[k] += n;
  }
}
