// Orb Defense: the meta of the new game on top of the «Призванный герой» profile — balls (books), spirits (tavern),
// walls, and what a stage gives. Gear, gems, heroes, shop and tasks stay from the old game.
import * as P from './profile';
import { BallId, BALL_IDS, SpiritId, SPIRIT_IDS, WallId, WALL_IDS, HERO_BALL, stageDef, wallMaxOf } from '../core/orbContent';
import type { OrbConfig, Orb } from '../core/orb';

export interface OrbProfile {
  balls: Record<BallId, { lv: number; cards: number }>;
  spirits: Record<SpiritId, { lv: number; owned: boolean }>;
  spirit: SpiritId | null;
  spiritShards: number;
  walls: Record<WallId, { lv: number; owned: boolean }>;
  wall: WallId;
  wallStones: number;
}
export const NORMALS = 4;
/** rarity 0..9 from the level: every 3 levels one step (обычная → мифическая at level 28) */
export const rarityOf = (lv: number) => Math.min(9, Math.floor((lv - 1) / 3));
export const MAX_LV = 28;

export function orb(p: P.Profile): OrbProfile {
  const pp = p as P.Profile & { orb?: OrbProfile };
  if (!pp.orb) {
    pp.orb = {
      balls: Object.fromEntries(BALL_IDS.map(b => [b, { lv: 1, cards: 0 }])) as OrbProfile['balls'],
      spirits: Object.fromEntries(SPIRIT_IDS.map(s => [s, { lv: 1, owned: s === 'healer' }])) as OrbProfile['spirits'],
      spirit: 'healer', spiritShards: 0,
      walls: Object.fromEntries(WALL_IDS.map(w => [w, { lv: 1, owned: w === 'start' }])) as OrbProfile['walls'],
      wall: 'start', wallStones: 0,
    };
  }
  return pp.orb;
}

// ---------------- balls (books) ----------------
export const ballCost = (lv: number) => ({ cards: Math.round(4 * Math.pow(1.32, lv - 1)), gold: Math.round(120 * Math.pow(1.27, lv - 1)) });
/** правка Ш5: every ball level gives the common crit damage bonus */
export const ballCritStep = (lv: number) => lv <= 5 ? 0.01 : lv <= 12 ? 0.02 : lv <= 20 ? 0.03 : 0.04;
export function ballCritTotal(p: P.Profile): number {
  let t = 0; const o = orb(p);
  for (const b of BALL_IDS) for (let l = 2; l <= o.balls[b].lv; l++) t += ballCritStep(l);
  return t;
}
export function upgradeBall(p: P.Profile, b: BallId): void {
  const o = orb(p), x = o.balls[b], c = ballCost(x.lv);
  if (x.lv >= 30) throw new P.GameError('Максимальный уровень');
  if (x.cards < c.cards) throw new P.GameError(`Нужно ${c.cards} карт`);
  if (p.gold < c.gold) throw new P.GameError(`Нужно ${c.gold} золота`);
  x.cards -= c.cards; p.gold -= c.gold; x.lv++;
}

// ---------------- spirits ----------------
export const SPIRIT_OPEN = 25;
export const spiritCost = (lv: number) => 4 + 2 * lv;
export function openSpirit(p: P.Profile, s: SpiritId): void {
  const o = orb(p);
  if (o.spirits[s].owned) return;
  if (o.spiritShards < SPIRIT_OPEN) throw new P.GameError(`Нужно ${SPIRIT_OPEN} частичек духа`);
  o.spiritShards -= SPIRIT_OPEN; o.spirits[s].owned = true;
}
export function upgradeSpirit(p: P.Profile, s: SpiritId): void {
  const o = orb(p), x = o.spirits[s], c = spiritCost(x.lv);
  if (!x.owned) throw new P.GameError('Дух ещё не открыт');
  if (x.lv >= MAX_LV) throw new P.GameError('Максимальный уровень');
  if (o.spiritShards < c) throw new P.GameError(`Нужно ${c} частичек духа`);
  o.spiritShards -= c; x.lv++;
}

// ---------------- walls ----------------
export const WALL_PRICE: Record<WallId, number> = { start: 0, heal: 300, counter: 300, shield: 400, reinf: 250 };
export const wallCost = (lv: number) => 3 + 2 * lv;
export function buyWall(p: P.Profile, w: WallId): void {
  const o = orb(p);
  if (o.walls[w].owned) return;
  if (p.crystals < WALL_PRICE[w]) throw new P.GameError(`Нужно ${WALL_PRICE[w]} кристаллов`);
  p.crystals -= WALL_PRICE[w]; o.walls[w].owned = true;
}
export function upgradeWall(p: P.Profile, w: WallId): void {
  const o = orb(p), x = o.walls[w], c = wallCost(x.lv);
  if (!x.owned) throw new P.GameError('Стена не куплена');
  if (x.lv >= MAX_LV) throw new P.GameError('Максимальный уровень');
  if (o.wallStones < c) throw new P.GameError(`Нужно ${c} камней стены`);
  o.wallStones -= c; x.lv++;
}

// ---------------- wall gems (правка Ш9) ----------------
/** topaz — wall health, sapphire — wall armor: plain numbers from the gems in the sockets */
export function wallGems(p: P.Profile): { hp: number; armor: number } {
  const out = { hp: 0, armor: 0 };
  for (const g of P.equippedGems(p)) { if (g.type === 'topaz') out.hp += P.gemAmount(g); else if (g.type === 'sapphire') out.armor += P.gemAmount(g); }
  return { hp: Math.round(out.hp), armor: Math.round(out.armor * 10) / 10 };
}
const wallNow = (p: P.Profile) => { const o = orb(p), w = o.walls[o.wall].owned ? o.wall : 'start'; return { id: w, rarity: w === 'start' ? 0 : rarityOf(o.walls[w].lv), lv: o.walls[w].lv }; };
/** what the wall has in battle: health (level, gems, reinforced wall, rune) and armor */
export function wallStats(p: P.Profile): { hp: number; armor: number } {
  const g = wallGems(p);
  return { hp: wallMaxOf(wallNow(p), g.hp, P.runeTotals(p).wallhp ?? 0), armor: g.armor };
}

// ---------------- a battle from the profile ----------------
export function makeConfig(p: P.Profile, stage: number, heroId: string, seed: number): OrbConfig {
  const o = orb(p), st = P.statSheet(p, heroId), mods = P.computeMods(p, heroId), rt = P.runeTotals(p), wg = wallGems(p);
  const sp = o.spirit && o.spirits[o.spirit].owned ? { id: o.spirit, rarity: rarityOf(o.spirits[o.spirit].lv), lv: o.spirits[o.spirit].lv } : undefined;
  // правка Ш7: the rune lines go to the battle; attack and hero health are already in the stat sheet
  const rune: OrbConfig['rune'] = {
    normal: rt.normal, allBalls: rt.allballs, afflicted: rt.afflicted, dur: rt.dur, plusBall: rt.plusball, spirit: rt.spirit,
    impact: rt.impact, area: rt.area, beamLight: rt.beamlight, pierce: rt.pierce, dot: rt.dot, wetFrozen: rt.wetfrozen,
    repair: rt.repair, gold: rt.gold, elite: rt.elite, wallPct: rt.wallhp,
  };
  for (const k of Object.keys(rune) as (keyof typeof rune)[]) if (!rune[k]) delete rune[k];
  return {
    seed, stage, heroId, heroBall: HERO_BALL[heroId] ?? 'fire',
    atk: Math.round(st.atk), hp: Math.round(st.hp * 3),
    crit: Math.min(0.75, 0.05 + mods.crit + (rt.crit ?? 0)), critDmg: mods.critDmg + ballCritTotal(p) + (rt.critdmg ?? 0), boss: mods.boss,
    ballLv: Object.fromEntries(BALL_IDS.map(b => [b, o.balls[b].lv])),
    normals: NORMALS, spirit: sp, wall: wallNow(p),
    ...(wg.hp ? { wallHp: wg.hp } : {}), ...(wg.armor ? { wallArmor: wg.armor } : {}),
    ...(Object.keys(rune).length ? { rune } : {}),
  };
}

export interface OrbReward { lines: string[]; gold: number; chest?: P.StageChest; levelUp: boolean; cards: Partial<Record<BallId, number>>; spiritShards: number; stones: number; scrolls: number; shards: number }
export function finishOrb(p: P.Profile, m: Orb, stage: number, quit: boolean): OrbReward {
  const s = m.s, win = s.phase === 'win', o = orb(p);
  const share = win ? 1 : Math.min(1, m.progress);
  const lines: string[] = [];
  p.runs++; if (win) p.wins++;
  P.taskAdd(p, 'kills', s.kills); if (share > 0.3) P.taskAdd(p, 'runs', 1); if (win) P.taskAdd(p, 'wins', 1);
  const gold = Math.round(((140 + 25 * stage) * share + s.kills * 1.5) * (1 + (s.cfg.rune?.gold ?? 0))); // правка Ш7: rune «золото за бой»
  p.gold += gold;
  const scrolls = share > 0.3 ? Math.max(1, Math.round(P.STAGE.scrolls(stage) * share)) : 0;
  p.scrolls += scrolls;
  const shards = share > 0.3 ? Math.max(1, Math.round(P.STAGE.shards(stage) * share)) : 0;
  p.shards += shards;
  // ball cards: a few for random owned balls, more for a won stage
  const cards: Partial<Record<BallId, number>> = {};
  const nCards = quit ? 0 : Math.round((win ? 10 + 2 * stage : 4 * share + 1));
  for (let i = 0; i < nCards; i++) { const b = BALL_IDS[Math.floor(Math.random() * BALL_IDS.length)]; cards[b] = (cards[b] ?? 0) + 1; o.balls[b].cards++; }
  const spiritShards = win ? 3 + Math.floor(stage / 3) : share > 0.5 ? 1 : 0;
  o.spiritShards += spiritShards;
  const stones = win ? 2 + Math.floor(stage / 4) : 0;
  o.wallStones += stones;
  const hxp = share > 0.3 ? Math.round((win ? 25 : 15 * share) + s.kills / 10) : 0;
  const levelUp = hxp > 0 && P.addHeroXp(p, p.active, hxp);
  let chest: P.StageChest | undefined;
  if (win) { chest = stage > p.maxMap ? 'gold' : 'stone'; if (stage > p.maxMap) { p.maxMap = stage; lines.push(`Открыт этап ${stage + 1}`); } }
  void stageDef;
  return { lines, gold, chest, levelUp, cards, spiritShards, stones, scrolls, shards };
}
