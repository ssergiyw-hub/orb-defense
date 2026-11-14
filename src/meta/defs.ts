// Meta-game tables: gear, gems, runes, prices. Numbers follow the design doc
// (section "Экономика" → "Цены и награды под расчёт").
import { Element, Family, SkillId, SKILLS } from '../core/content';

export type Slot = 'book' | 'mantle' | 'gloves' | 'boots' | 'amulet' | 'ring';
export const SLOTS: readonly Slot[] = ['book', 'mantle', 'gloves', 'boots', 'amulet', 'ring'];
export const SLOT_NAME: Record<Slot, string> = { book: 'Оружие', mantle: 'Мантия', gloves: 'Перчатки', boots: 'Сапоги', amulet: 'Амулет', ring: 'Кольцо' };
export const SLOT_ICON: Record<Slot, string> = { book: '📕', mantle: '🧥', gloves: '🧤', boots: '👢', amulet: '📿', ring: '💍' };

export type SetId = 'guard' | 'wanderer' | 'berserk';
export const SETS: readonly SetId[] = ['guard', 'wanderer', 'berserk'];
export const SET_NAME: Record<SetId, string> = { guard: 'Лес', wanderer: 'Солнце', berserk: 'Пустота' };
export const SET_DESC: Record<SetId, { main: string; b2: string; b4: string; b6: string }> = {
  // правка 155: the percent of attack / health here is real (of the total) — see SET_PCT
  guard: { main: 'защита', b2: '+8% здоровья', b4: '+20% защиты, −10% скорости', b6: '+10% здоровья, +10% защиты' },
  wanderer: { main: 'скорость, скорость атаки', b2: '+10% скорости', b4: '+15% скорости атаки, −5% здоровья, −10% защиты', b6: '+15% скорости атаки, +15% радиуса подбора' },
  berserk: { main: 'шанс крита', b2: '+8% атаки', b4: '+12% атаки, −20% защиты', b6: '+5% шанса крита, +30% урона крита' },
};
/** every set has its own weapon in the weapon slot */
export const WEAPON_NAME: Record<SetId, string> = { guard: 'Книга', wanderer: 'Посох', berserk: 'Жезл' };
export const SET_COLOR: Record<SetId, string> = { guard: '#4fc46a', wanderer: '#ffc23a', berserk: '#a46cff' };

// ---- rarity: 5 tiers, with +1/+2 steps inside epic and +1..+3 inside legendary (as in Archero 2) ----
export const RARITIES = ['Обычное', 'Редкое', 'Эпическое', 'Эпическое +1', 'Эпическое +2', 'Легендарное', 'Легендарное +1', 'Легендарное +2', 'Легендарное +3', 'Мифическое'] as const;
export const EPIC = 2, LEGEND = 5, MYTHIC = 9;
/** colour and picture tier of a step: 0 common, 1 rare, 2 epic, 3 legendary, 4 mythic */
export const R_TIER = [0, 1, 2, 2, 2, 3, 3, 3, 3, 4];
/** the +1/+2/+3 inside a tier */
export const R_PLUS = [0, 0, 0, 1, 2, 0, 1, 2, 3, 0];
export const TIER_COLOR = ['#8f99b0', '#3f8cff', '#a046ff', '#ffbe2e', '#ff3d52']; // правка 105: палитра как в Archero 2
export const RARITY_COLOR = R_TIER.map(t => TIER_COLOR[t]);
export const RARITY_CAP = [20, 30, 40, 45, 50, 60, 70, 80, 90, 100];
export const RARITY_BONUS = [0, 0.15, 0.35, 0.42, 0.5, 0.6, 0.67, 0.74, 0.81, 1.0];
/** one step up takes the item plus n items of the same slot at step `from`;
 *  sameSet: of the item's own set too (common and rare need exact copies) */
export const MERGE_RULE: readonly { n: number; from: number; sameSet: boolean }[] = [
  { n: 2, from: 0, sameSet: true },   // обычное → редкое: 3 одинаковых
  { n: 2, from: 1, sameSet: true },   // редкое → эпическое: 3 одинаковых
  { n: 1, from: 2, sameSet: false },  // → эпическое +1: любой эпический того же слота
  { n: 1, from: 2, sameSet: false },  // → эпическое +2
  { n: 2, from: 2, sameSet: false },  // → легендарное
  { n: 1, from: 2, sameSet: false },  // → легендарное +1
  { n: 2, from: 2, sameSet: false },  // → легендарное +2
  { n: 2, from: 2, sameSet: false },  // → легендарное +3
  { n: 3, from: 2, sameSet: true },   // → мифическое: 3 эпических своего комплекта
];
// in all: 13 epics (117 commons) per mythic, 4 of them of the item's own set — econ/model.py: ≈ a year for a paying player
/** damage side of the gear screen (weapon, amulet, ring); the other side gives health */
export const DMG_SLOTS: readonly Slot[] = ['book', 'amulet', 'ring'];
/** правка 155: attack and health are plain numbers. 100 of each = a level-1 hero with nothing on
 *  (the battle works with ATK / 100 as the damage multiplier and with HP itself as the hero's health). */
export const STAT_UNIT = 100;
export const HERO_STAT = { atk: 100, atkLv: 3.7, hp: 100, hpLv: 2.2 }; // правка 157: was 4 / 2.5 — gems give more now
/** правка 155: the main number of an item — attack on the left side of the gear screen, health on the right.
 *  value = (base + per × level) × rarityK; the rarity steps (rare, legendary) add their own lump (`GEAR_STEP`) */
export const GEAR_MAIN: Record<Slot, { stat: 'atk' | 'hp'; base: number; per: number }> = {
  book: { stat: 'atk', base: 10, per: 1.0 }, amulet: { stat: 'atk', base: 4, per: 0.4 }, ring: { stat: 'atk', base: 4, per: 0.4 },
  mantle: { stat: 'hp', base: 5, per: 0.56 }, gloves: { stat: 'hp', base: 4, per: 0.45 }, boots: { stat: 'hp', base: 4, per: 0.45 },
};
/** what the rarity steps add to the item's main number: rare, then legendary (were «+4% / +8%» lines) */
export const GEAR_STEP = { rare: { atk: 4, hp: 5 }, legend: { atk: 8, hp: 10 } };
export const rarityK = (r: number) => (1 + RARITY_BONUS[r]) * (r >= 8 ? 1.2 : 1);
/** the second line of an item comes from its set, in percent per level × rarityK (as before правки 155) */
export const SET_SECOND: Record<SetId, { def?: number; speed?: number; atkSpeed?: number; crit?: number }> = {
  guard: { def: 0.001 }, wanderer: { speed: 0.001, atkSpeed: 0.002 }, berserk: { crit: 0.0005 },
};
/** set bonuses for 2 / 4 / 6 worn items: real percent of the total attack / health (правка 155) */
export const SET_PCT = { berserk2: 0.08, berserk4: 0.12, guard2: 0.08, guard6: 0.10, wanderer4Hp: -0.05 };
/** the set effect an item opens at epic and makes stronger at mythic */
export interface SetFx { id: string; name: string; e: string; m: string }
export const SET_FX: Record<SetId, Record<Slot, SetFx>> = {
  guard: {
    book: { id: 'thorn', name: 'Шипы', e: 'каждая 4-я атака: стрелы пробивают ещё 2 врагов', m: 'каждая 3-я атака: пробивают ещё 3 врагов' },
    mantle: { id: 'bark', name: 'Кора', e: 'раз в 12 с щит гасит удар целиком', m: 'щит раз в 7 с' },
    gloves: { id: 'spikes', name: 'Колючки', e: 'получив удар, герой ранит врагов рядом на 200% этого удара', m: '400% удара, радиус больше' },
    boots: { id: 'roots', name: 'Корни', e: 'стоя на месте: защита +15%, лечение 1% в секунду', m: 'защита +25%, лечение 2% в секунду' },
    amulet: { id: 'breath', name: 'Второе дыхание', e: 'при здоровье ниже 30% — лечение 30% (раз за забег)', m: 'лечение 40%, дважды за забег' },
    ring: { id: 'thicket', name: 'Чаща', e: 'враги рядом с героем медленнее на 15%', m: 'медленнее на 25%, радиус больше' },
  },
  wanderer: {
    book: { id: 'volley', name: 'Солнечный залп', e: 'каждая 4-я атака: +2 стрелы веером', m: 'каждая 3-я атака: +3 стрелы' },
    mantle: { id: 'tailwind', name: 'Попутный ветер', e: 'после удара по герою скорость +35% на 2 с', m: 'скорость +50% на 3 с' },
    gloves: { id: 'frenzy', name: 'Азарт', e: 'каждые 10 убийств: скорость атаки +30% на 3 с', m: 'каждые 6 убийств: +45%' },
    boots: { id: 'step', name: 'Лёгкий шаг', e: 'в движении 12% шанс уклониться от удара', m: 'шанс уклониться 22%' },
    amulet: { id: 'insight', name: 'Озарение', e: 'опыт навыков +12%', m: 'опыт навыков +25%' },
    ring: { id: 'glint', name: 'Блик', e: 'каждая 5-я атака — верный крит', m: 'каждая 3-я атака' },
  },
  berserk: {
    book: { id: 'execute', name: 'Казнь', e: 'стрелы добивают врагов, у которых меньше 15% здоровья (не боссов)', m: 'меньше 25% здоровья' },
    mantle: { id: 'hunger', name: 'Голод', e: 'при здоровье ниже 50% урон +20%', m: 'урон +35%' },
    gloves: { id: 'decay', name: 'Распад', e: 'убитые враги взрываются: 25% их здоровья соседям', m: '45% здоровья, радиус больше' },
    boots: { id: 'pulse', name: 'Импульс тьмы', e: 'каждые 5 с волна тьмы вокруг героя', m: 'каждые 3 с, радиус больше' },
    amulet: { id: 'hunter', name: 'Охотник', e: 'урон по боссам и минибоссам +15%', m: 'урон по боссам +30%' },
    ring: { id: 'cruel', name: 'Жестокость', e: 'шанс крита +3%, урон крита +30%', m: 'шанс крита +5%, урон крита +55%' },
  },
};
/** what an item opens with its rarity: [step, text]; set effects at epic and mythic */
export function gearLines(slot: Slot, set: SetId | null): { at: number; text: string; fx?: SetFx }[] {
  const dmg = DMG_SLOTS.includes(slot), fx = set ? SET_FX[set][slot] : null;
  // правка 155: the rarity steps add plain attack / health to the item (GEAR_STEP)
  const out: { at: number; text: string; fx?: SetFx }[] = [{ at: 1, text: dmg ? `атака +${GEAR_STEP.rare.atk}` : `здоровье +${GEAR_STEP.rare.hp}` }];
  if (fx) out.push({ at: EPIC, text: `${fx.name}: ${fx.e}`, fx });
  out.push({ at: LEGEND, text: dmg ? `атака +${GEAR_STEP.legend.atk}` : `здоровье +${GEAR_STEP.legend.hp}` }, { at: 8, text: 'характеристики предмета +20%' });
  if (fx) out.push({ at: MYTHIC, text: `${fx.name} сильнее: ${fx.m}`, fx });
  return out;
}

/** gold and scrolls to raise a gear item from level L to L+1 */
export function levelCost(L: number): { gold: number; scrolls: number } {
  return { gold: Math.round(12 * Math.pow(L, 1.9)), scrolls: Math.ceil(0.6 * Math.pow(L, 1.15)) };
}
export function spentTo(L: number): { gold: number; scrolls: number } {
  let g = 0, s = 0;
  for (let i = 1; i < L; i++) { const c = levelCost(i); g += c.gold; s += c.scrolls; }
  return { gold: g, scrolls: s };
}

// ---- gems ----
export type GemType = 'ruby' | 'emerald' | 'sapphire' | 'topaz' | 'amethyst' | 'diamond' | 'garnet' | 'jade';
export const GEM_TYPES: readonly GemType[] = ['ruby', 'emerald', 'sapphire', 'topaz', 'amethyst', 'diamond', 'garnet', 'jade'];
export const GEM: Record<GemType, { name: string; stat: string; max: number; color: string; pct: boolean }> = {
  ruby: { name: 'Рубин', stat: 'атака', max: 0.60, color: '#e8304a', pct: false },
  emerald: { name: 'Изумруд', stat: 'здоровье', max: 0.75, color: '#2fc46a', pct: false },
  sapphire: { name: 'Сапфир', stat: 'защита', max: 0.04, color: '#3a6cf0', pct: true },
  topaz: { name: 'Топаз', stat: 'радиус подбора', max: 1.00, color: '#f5b83a', pct: true },
  amethyst: { name: 'Аметист', stat: 'радиус урона', max: 0.50, color: '#9b5cf0', pct: true },
  diamond: { name: 'Алмаз', stat: 'шанс крита', max: 0.04, color: '#cfeffd', pct: true },
  garnet: { name: 'Гранат', stat: 'урон крита', max: 0.12, color: '#a8203a', pct: true },
  jade: { name: 'Нефрит', stat: 'автолечение каждые 5 с', max: 0.02, color: '#4fb89a', pct: true },
};
export const GEM_STAR_EFF = [0, 0.15, 0.35, 0.65, 1.0]; // ★1..★4 share of the gem's max effect
/** правка 157: a gem gives 40% of its strength at level 1 and all of it at level 100 (was 1% → 100%) */
export const GEM_LV_BASE = 0.4;
export const gemShare = (level: number) => GEM_LV_BASE + (1 - GEM_LV_BASE) * level / 100;
/** правка 157: each item takes two kinds of gems (ruby and emerald fit two slots each, so at most 8 of them, not 12) */
export const GEM_SLOTS: Record<Slot, readonly GemType[]> = {
  book: ['ruby', 'garnet'], amulet: ['ruby', 'amethyst'], ring: ['diamond', 'garnet'],
  mantle: ['emerald', 'sapphire'], gloves: ['emerald', 'jade'], boots: ['sapphire', 'topaz'],
};
export const gemFits = (t: GemType, s: Slot) => GEM_SLOTS[s].includes(t);
/** the slots a gem goes into, in the screen order */
export const gemSlotsOf = (t: GemType) => SLOTS.filter(s => GEM_SLOTS[s].includes(t));
export const gemXpFor = (L: number) => 100 + 30 * L;
export const GEM_FEED_XP = [0, 50, 250, 1500, 6000];
export const ESS_SMALL = 100, ESS_BIG = 1000;
export const GOLD_SEARCH = { cost: 5000, odds: [0.9, 0.095, 0.005] }; // random gem from chests and drops
/** gem search: a chain of locations. Success moves you on, failure sends you back to the first one.
 *  Average gold per ★3 ≈ 485k — same as the old flat search (5000 at 1%), see econ/model.py */
/** gold search chain. odds = chance of a ★1/★2/★3 gem per search; the rest is gem essence (ess).
 *  No ★4 here: ★4 comes only from the crystal search, events and the battle pass. */
export const GEM_LOCATIONS = [
  { name: 'Пещера', icon: '🕳️', cost: 1250, odds: [0.05, 0.008, 0], next: 0.5, ess: [{ p: 0.942, small: 1, big: 0 }] },
  { name: 'Лес', icon: '🌲', cost: 1750, odds: [0.05, 0.02, 0.0025], next: 0.45, ess: [{ p: 0.9275, small: 1, big: 0 }] },
  { name: 'Вулкан', icon: '🌋', cost: 2250, odds: [0.04, 0.035, 0.0075], next: 0.40, ess: [{ p: 0.865, small: 2, big: 0 }, { p: 0.0525, small: 0, big: 1 }] },
  { name: 'Руины', icon: '🏛️', cost: 3125, odds: [0.03, 0.05, 0.02], next: 0.35, ess: [{ p: 0.845, small: 2, big: 0 }, { p: 0.055, small: 0, big: 1 }] },
  { name: 'Замок', icon: '🏰', cost: 4500, odds: [0.03, 0.06, 0.04], next: 0, ess: [{ p: 0.745, small: 3, big: 0 }, { p: 0.125, small: 0, big: 1 }] },
];
export const GEM_FREE_PER_DAY = 12;
/** crystal search (straight to the Ruins): the only search with ★4; pity ★3 at 30 and ★4 at 60 */
export const CR_SEARCH = { cost: 150, odds: [0.44, 0.35, 0.17, 0.04], pity: 30, pity4: 60 };

// ---- runes (as in Archero 2): blessings, boosts of a skill family or element, skill runes ----
export type RuneType = 'bless' | 'boost' | 'skill';
export const RUNE_TYPES: readonly RuneType[] = ['bless', 'boost', 'skill'];
export const RUNE_TYPE_NAME: Record<RuneType, string> = { bless: 'Благословение', boost: 'Усиление', skill: 'Навык' };
export const RUNE_TYPE_PL: Record<RuneType, string> = { bless: 'Благословения', boost: 'Усиления', skill: 'Навыки' };
/** slot i of a hero takes this type; slots open with stars: two at ★0, then one per star */
export const RUNE_SLOT_TYPE: readonly RuneType[] = ['bless', 'boost', 'skill', 'bless', 'boost', 'skill'];
export const runeSlots = (stars: number) => Math.min(6, 2 + stars);
export const RUNE_RARITY = ['Обычная', 'Редкая', 'Эпическая', 'Эпическая +1', 'Эпическая +2', 'Легендарная', 'Легендарная +1', 'Легендарная +2', 'Легендарная +3', 'Мифическая'] as const;
/** strength of a rune's main line by step (times its base) */
export const RUNE_K = [1, 1.4, 1.9, 2.2, 2.5, 3.1, 3.4, 3.7, 4.0, 5.0];
/** shards for one step up */
export const RUNE_UP = [40, 80, 150, 200, 260, 400, 480, 560, 640];
/** identical copies a merge takes: two up to epic, then one */
export const runeDupes = (s: number) => (s < EPIC ? 2 : 1);
export const RUNE_CRAFT = 40, RUNE_CRAFT_TYPE = 100;
/** shards a rune is worth: craft + every step; taking it apart gives half back */
export const runeWorth = (s: number) => RUNE_CRAFT + RUNE_UP.slice(0, s).reduce((a, b) => a + b, 0);
/** 0 below epic, 1 epic, 2 legendary, 3 mythic */
export const runeTier = (s: number) => (s >= MYTHIC ? 3 : s >= LEGEND ? 2 : s >= EPIC ? 1 : 0);

export type RuneId = 'revive' | 'wisdom' | 'luck' | 'guard' | 'destroy' | 'absorb' | 'regen' | 'swift' | 'fury'
  | 'elem' | 'f_arrow' | 'f_orbs' | 'f_auras' | 'f_blast' | 'f_missiles' | 'f_storm' | 'skill';
export interface RuneDef {
  id: RuneId; type: RuneType; name: string; color: string; family?: Family;
  /** main line: value at the first step (times RUNE_K), and how it reads; x = element or skill name */
  base: number; line: (v: string, x: string) => string;
  /** what opens at epic, legendary and mythic */
  e: string; l: string; m: string;
}
const rd = (id: RuneId, type: RuneType, name: string, color: string, base: number, line: RuneDef['line'], e: string, l: string, m: string, family?: Family): RuneDef => ({ id, type, name, color, base, line, e, l, m, family });
export const RUNES: Record<RuneId, RuneDef> = {
  revive: rd('revive', 'bless', 'Возрождение', '#ffe27a', 0.02, v => `здоровье +${v}`, 'раз за забег: 30% шанс воскреснуть с половиной здоровья', 'шанс воскреснуть 60%', 'воскрешение наверняка'),
  wisdom: rd('wisdom', 'bless', 'Мудрость', '#7fd6ff', 0.03, v => `опыт навыков +${v}`, '+1 бесплатное обновление навыков в бою', '+2 обновления', '+3 обновления'),
  luck: rd('luck', 'bless', 'Удача', '#7be07a', 0.02, v => `награды забега +${v}`, 'золотой минибосс приходит чаще (+10%)', 'чаще на 20%', 'чаще на 35%'),
  guard: rd('guard', 'bless', 'Стойкость', '#9ab8ff', 0.015, v => `защита +${v}`, 'неуязвимость после удара дольше на 0,2 с', 'дольше на 0,35 с', 'дольше на 0,5 с'),
  destroy: rd('destroy', 'bless', 'Разрушение', '#ff7a4a', 0.05, v => `урон по боссам +${v}`, 'босс карты приходит без 5% здоровья', 'без 10% здоровья', 'без 15% здоровья'),
  absorb: rd('absorb', 'bless', 'Поглощение', '#ff5a7a', 0.006, v => `вампиризм ${v}`, 'каждые 20 убийств — лечение 4% здоровья', 'лечение 6%', 'лечение 8%'),
  regen: rd('regen', 'bless', 'Родник', '#5ad6c8', 0.004, v => `лечение ${v} здоровья каждые 5 с`, 'новый уровень в бою лечит 5% здоровья', 'лечит 8%', 'лечит 12%'),
  swift: rd('swift', 'bless', 'Ветер', '#cfe8ff', 0.015, v => `скорость +${v}`, 'радиус подбора +25%', 'радиус подбора +50%', 'радиус подбора +80%'),
  fury: rd('fury', 'bless', 'Ярость', '#ff6a3a', 0.015, v => `урон +${v}`, '+1% урона за каждые 25 убийств в забеге (до 10%)', 'до 20%', 'до 30%'),
  elem: rd('elem', 'boost', 'Руна стихии', '#ffcf4a', 0.10, (v, x) => `урон стихии «${x}» +${v}`, 'эффект своей стихии сильнее на 20%', 'сильнее на 40%', 'сильнее на 60%'),
  f_arrow: rd('f_arrow', 'boost', 'Руна стрелы', '#ffcf4a', 0.06, v => `урон стрелы героя +${v}`, 'стрелы пробивают ещё 1 врага', 'скорость атаки +15%', 'каждая 4-я атака — двойной выстрел', 'arrow'),
  f_orbs: rd('f_orbs', 'boost', 'Руна сфер', '#b48cff', 0.06, v => `урон сфер +${v}`, 'сферы вращаются на 30% быстрее', '+1 сфера на каждой орбите', 'ещё +1 сфера', 'orbs'),
  f_auras: rd('f_auras', 'boost', 'Руна аур', '#7be07a', 0.06, v => `урон аур +${v}`, 'радиус аур +15%', 'враги в ауре медленнее на 20%', 'урон аур ×1,4', 'auras'),
  f_blast: rd('f_blast', 'boost', 'Руна взрывов', '#ff8a3a', 0.06, v => `урон огненного шара, склянки и метеоров +${v}`, 'площадь +20%', 'перезарядка −25%', 'площадь +40%, перезарядка −40%', 'blast'),
  f_missiles: rd('f_missiles', 'boost', 'Руна снарядов', '#8fd6ff', 0.06, v => `урон осколков, бумеранга, ветра и струи +${v}`, '+1 снаряд (осколков +2)', 'снаряды крупнее на 30%', 'ещё +1 снаряд', 'missiles'),
  f_storm: rd('f_storm', 'boost', 'Руна грозы', '#fff27a', 0.06, v => `урон молнии, луча и духов +${v}`, 'молния +2 прыжка, луч шире, +1 дух', 'перезарядка −25%', 'перезарядка −40%, молния ещё +2 прыжка', 'storm'),
  skill: rd('skill', 'skill', 'Руна навыка', '#ffcf4a', 0.08, (v, x) => `урон навыка «${x}» +${v}`, 'забег начинается с этим навыком (ур. 1)', 'с навыком 2-го уровня', 'с навыком 3-го уровня'),
};
export const BLESS_RUNES: readonly RuneId[] = ['revive', 'wisdom', 'luck', 'guard', 'destroy', 'absorb', 'regen', 'swift', 'fury'];
export const FAMILY_RUNES: readonly RuneId[] = ['f_arrow', 'f_orbs', 'f_auras', 'f_blast', 'f_missiles', 'f_storm'];
/** skills that have a skill rune: every attack skill except the hero arrow */
export const RUNE_SKILLS: readonly SkillId[] = (Object.keys(SKILLS) as SkillId[]).filter(k => SKILLS[k].kind === 'element');
/** how much more often the cards of a family come up, by rune tier */
export const FAMILY_W = [1.5, 2, 2.5, 3];

// ---- heroes ----
export const STAR_PARTICLES = [20, 30, 50, 80, 110, 140, 170, 200, 240, 300];
export const STAR_LEVEL = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const HERO_MAX_LEVEL = 100;
export const heroXpFor = (L: number) => 20 + 5 * L;
export const DUP_PARTICLES = 20;
export const SMALL_COUPON = { hero: 0.03, particles: 5 };
export const BIG_COUPON = { hero: 0.20, particles: 30, price: 300, pity: 50 };

// ---- shop (crystals) ----
export const PRICE = {
  gearChest: 500, scrolls100: 100, gold100k: 150, essBig: 80, essSmall: 10, energy30: 50,
  lottery: 50, lottery10: 450, revive: 50, double: 30,
};
export const GEAR_CHEST_ODDS = [0.70, 0.25, 0.05];
export const DROP_ODDS = [0.85, 0.14, 0.01];

// ---- energy and idle chest ----
export const ENERGY = { max: 30, regenSec: 360, run: 5, refundEarly: 4 };
export const IDLE = { capH: 12, scrollsH: 1, gemChanceH: 0.05, gold: (map: number) => 100 + 20 * map, fastH: 2 };

export function elemOf(x: string): Element { return x as Element; }

// ---- gear chests in the shop ----
export type ChestId = 'set' | 'obsidian' | 'runes';
export const CHESTS: Record<ChestId, { name: string; desc: string; price: number; odds: number[]; pity?: { rarity: number; every: number } }> = {
  set: { name: 'Сундук комплекта снаряжения', desc: '1 предмет выбранного комплекта: обычный 70%, редкий 25%, эпический 5%', price: 340, odds: [0.70, 0.25, 0.05], pity: { rarity: 2, every: 20 } },
  obsidian: { name: 'Эпический сундук снаряжения', desc: '1 редкий (80%) или эпический (20%) предмет', price: 800, odds: [0, 0.8, 0.2], pity: { rarity: 2, every: 7 } },
  runes: { name: 'Сундук рун', desc: '1 руна: редкая 30%, эпическая 9%, легендарная 1%', price: 200, odds: [0.60, 0.30, 0.09, 0, 0, 0.01], pity: { rarity: 2, every: 15 } },
};
export const CHEST_X10 = 9; // ten chests for the price of nine
export const HERO_UNLOCK_PARTICLES = 50;
