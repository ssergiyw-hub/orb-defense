// Orb Defense runes (правки Ш7, Ш37): every gear slot has a rune socket. A rune belongs to one slot; its effect is
// rolled at random from that slot's list (all equally likely), a reroll rolls a new one. Rarity (обычная … мифическая)
// makes the number bigger. The stone is the plain marble rune with the sign of the effect (assets/orb/rune).
import { Slot, RUNE_K, LEGEND, MYTHIC } from './defs';

export type RfxId = 'crit' | 'critdmg' | 'elite' | 'dur' | 'afflicted' | 'repair' | 'wallhp' | 'normal' | 'allballs' | 'plusball'
  | 'spirit' | 'atk' | 'hp' | 'gold' | 'impact' | 'area' | 'beamlight' | 'dot' | 'pierce' | 'wetfrozen';
export interface RfxDef {
  /** short name: list chips, the title of the rune */
  short: string;
  /** sign picture: assets/orb/rune/<img>.webp */
  img: string;
  /** value of a mythic rune (a common one has 1/5 of it); 0 = no number */
  max: number;
  /** the line with the value (v — «+7,5%» or «75%») */
  line: (v: string) => string;
  /** the unique line of a slot */
  unique?: Slot;
}
export const RFX: Record<RfxId, RfxDef> = {
  crit: { short: 'Шанс крита', img: 'crit', max: 0.075, line: v => `Шанс крита +${v}` },
  critdmg: { short: 'Крит-урон', img: 'critdmg', max: 0.75, line: v => `Крит-урон +${v}` },
  elite: { short: 'Элиты и боссы', img: 'boss', max: 0.5, line: v => `Урон по элитам и боссам +${v}` },
  dur: { short: 'Длительность', img: 'dur', max: 1, line: v => `Горение, яд, заморозка, мокрый и куст длятся на 1 ход дольше с шансом ${v}` },
  afflicted: { short: 'По врагам с эффектом', img: 'afflicted', max: 0.45, line: v => `Урон по врагам с эффектом +${v}` },
  repair: { short: 'Починка стены', img: 'repair', max: 0.075, line: v => `Новый уровень забега чинит стену на ${v}` },
  wallhp: { short: 'Здоровье стены', img: 'wallhp', max: 0.4, line: v => `Здоровье стены +${v}` },
  normal: { short: 'Обычные шары', img: 'normal', max: 0.75, line: v => `Урон обычных шаров +${v}` },
  allballs: { short: 'Все шары', img: 'allballs', max: 0.4, line: v => `Урон всех шаров и их эффектов +${v}` },
  plusball: { short: '+1 обычный шар', img: 'plusball', max: 0, line: () => '+1 обычный шар в залпе' },
  spirit: { short: 'Сила духа', img: 'spirit', max: 0.6, line: v => `Сила духа +${v}` },
  atk: { short: 'Атака', img: 'atk', max: 0.25, line: v => `Атака +${v}` },
  hp: { short: 'Здоровье героя', img: 'hp', max: 0.4, line: v => `Здоровье героя +${v}` },
  gold: { short: 'Золото за бой', img: 'gold', max: 0.5, line: v => `Золото за бой +${v}` },
  impact: { short: 'Урон при ударе', img: 'impact', max: 0.8, line: v => `Урон прямого удара шара +${v}`, unique: 'book' },
  area: { short: 'Урон по площади', img: 'area', max: 0.8, line: v => `Урон по площади: Палица и осколки Гранаты +${v}`, unique: 'mantle' },
  beamlight: { short: 'Луч и молния', img: 'beamlight', max: 0.8, line: v => `Урон Луча Аполлона и молнии +${v}`, unique: 'gloves' },
  dot: { short: 'Горение и яд', img: 'dot', max: 0.8, line: v => `Урон горения и яда +${v}`, unique: 'boots' },
  pierce: { short: 'Призрак и шипы', img: 'pierce', max: 0.8, line: v => `Урон Призрачного шара и шипов +${v}`, unique: 'amulet' },
  wetfrozen: { short: 'Мокрые и замёрзшие', img: 'wetfrozen', max: 0.8, line: v => `Урон по мокрым и замороженным +${v}`, unique: 'ring' },
};
/** the lines every slot can roll */
export const RUNE_COMMON: readonly RfxId[] = ['crit', 'critdmg', 'elite', 'dur', 'afflicted', 'repair', 'wallhp', 'normal', 'allballs', 'plusball', 'spirit', 'atk', 'hp', 'gold'];
export const RUNE_UNIQUE: Record<Slot, RfxId> = { book: 'impact', mantle: 'area', gloves: 'beamlight', boots: 'dot', amulet: 'pierce', ring: 'wetfrozen' };
/** «+1 обычный шар» is rare: only legendary and mythic runes can roll it */
export const PLUSBALL_FROM = LEGEND;
export function runeFxList(slot: Slot, rarity: number): RfxId[] {
  return [...RUNE_COMMON.filter(f => f !== 'plusball' || rarity >= PLUSBALL_FROM), RUNE_UNIQUE[slot]];
}
/** the number of a rune line at a rarity: mythic = max, common = max / 5 (RUNE_K) */
export const runeAmount = (fx: RfxId, rarity: number) => RFX[fx].max * RUNE_K[rarity] / RUNE_K[MYTHIC];
/** shards for one reroll, by rarity: cheap — a reroll is the way to get the wanted line (about 14 tries on average) */
export const RUNE_REROLL = [5, 10, 15, 20, 25, 40, 50, 60, 70, 80];
/** «7,5%» — one decimal under 10%, none above */
export const rpct = (v: number) => { const x = v * 100; return (x < 10 ? (Math.round(x * 10) / 10).toString() : Math.round(x).toString()).replace('.', ',') + '%'; };
export const runeLine = (fx: RfxId, rarity: number) => RFX[fx].line(rpct(runeAmount(fx, rarity)));
