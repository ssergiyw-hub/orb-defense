// Orb Defense: Olympus — the ball battle. Turn based and deterministic: the same config and the same list of
// actions (aim angles and card choices) always give the same battle. Only + - * / sqrt and fmath are used.
import { Rng } from './rng';
import { fsin, fcos, fatan2, PI } from './fmath';
import {
  wallMaxOf, COLS, ROWS, LAUNCH_DY, STORM, BOSS_EV, BALL_V, BALL_R, VOLLEY_GAP, ENEMY_T, BallId, BALLS, BALL_FX, elemHit, runLvMul, BALL_IDS,
  EnemyId, ENEMY, ECHIDNA_ARMOR, SpiritId, spiritEvery, WallId, wallFx, stageDef, StageDef, MINIS, BASE_WALL_HP, GEAR_FX, GearFxId,
} from './orbContent';

export interface OrbConfig {
  seed: number; stage: number; heroId: string; heroBall: BallId;
  /** Ш98: «Шквал шаров» — balls fly without a stop, enemies step on a timer, survival without a limit */
  storm?: boolean;
  /** Ш101: «Атака на босса» (with storm): one boss of the day that does not die, shoots the wall, steps once a minute */
  bossEv?: EnemyId;
  /** Ш70: hero stars — ★1–5: the hero's ball +15% a star (★3: it grows to level 4 in the run) */
  stars?: number;
  atk: number; hp: number; crit: number; critDmg: number; boss: number;
  /** level of every ball in the menu (books); 0 = not owned */
  ballLv: Partial<Record<BallId, number>>;
  normals: number;
  spirit?: { id: SpiritId; rarity: number; lv: number };
  wall: { id: WallId; rarity: number; lv: number };
  /** flat wall stats from gems and runes */
  wallHp?: number; wallArmor?: number;
  /** runes of the new system (fractions): dmg vs boss, normal ball, every ball, effect duration … */
  rune?: Partial<Record<RuneFx, number>>;
  /** Ш104: the «Лес» set effects of the worn items: 1 — epic, 2 — mythic */
  gear?: Partial<Record<GearFxId, number>>;
  god?: boolean;
}
/** правка Ш7: what the runes in the sockets give (fractions): elite — minibosses and bosses; dur — chance of +1 turn;
 *  allBalls — every ball and its effects; impact — the direct hit; area — the club wave and the grenade shards;
 *  pierce — the ghost ball and the thorn bushes; wallPct — wall health */
export type RuneFx = 'normal' | 'allBalls' | 'afflicted' | 'dur' | 'plusBall' | 'spirit' | 'impact' | 'area' | 'beamLight' | 'pierce' | 'dot' | 'wetFrozen' | 'repair' | 'gold' | 'elite' | 'wallPct';
export type Phase = 'aim' | 'fly' | 'enemy' | 'choose' | 'win' | 'lose';
/** at: the tick an aim was given (Ш98, storm: the aim can change any time — a replay applies it at the same tick) */
export interface Act { aim?: number; choice?: number; at?: number; /** Ш111: new three cards (ad / crystals — the client pays) */ reroll?: boolean }

export interface Enemy {
  id: number; kind: EnemyId; c: number; r: number; w: number; h: number;
  hp: number; max: number; shield: number; shieldMax: number;
  burnN: number; burnT: number; poisonN: number; poisonT: number;
  freeze: number; wet: number; skipped: boolean; curse: number;
  pr: number; pc: number; cd: number; flash: number; atk: number;
}
export interface Ball {
  kind: BallId | 'normal' | 'shard'; lv: number;
  x: number; y: number; vx: number; vy: number; age: number; alive: boolean; bounces: number;
  hit: Record<number, number>;
  /** Ш104: «Ловкость рук» — a copy of a special ball that leaves after the volley */
  copy?: boolean;
}
export interface Bush { c: number; r: number; t: number; dmg: number }
export interface Card { k: 'new' | 'up' | 'normal' | 'power' | 'repair'; ball?: BallId; title: string; desc: string; lv?: number }
export type Fx =
  | { t: 'hit'; x: number; y: number; dmg: number; crit: boolean; kind: string }
  | { t: 'die'; x: number; y: number; w: number; h: number; kind: EnemyId }
  | { t: 'beam'; dir: 'row' | 'col'; at: number; from: number; color: string }
  | { t: 'chain'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'quake'; c: number; r: number }
  | { t: 'dot'; x: number; y: number; dmg: number; kind: 'burn' | 'poison' }
  | { t: 'wall'; c: number; dmg: number; kind: 'hit' | 'shot' | 'rock' }
  | { t: 'hero'; dmg: number; from: { x: number; y: number } }
  | { t: 'wallFall' }
  | { t: 'phase'; n: number }
  | { t: 'bossShot'; x: number; y: number }
  | { t: 'spirit'; id: SpiritId; targets: { x: number; y: number }[] }
  | { t: 'heal'; x: number; y: number; amt: number }
  | { t: 'wallHeal'; amt: number }
  | { t: 'counter'; x: number; y: number }
  | { t: 'shard'; x: number; y: number }
  | { t: 'freeze'; x: number; y: number }
  | { t: 'thorn'; c: number; r: number }
  | { t: 'summon'; x: number; y: number }
  | { t: 'block'; x: number; kind: 'immune' | 'miss' }
  | { t: 'breath' }
  | { t: 'pierce'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'twin' }
  | { t: 'level' }
  | { t: 'launch' };

export interface OrbState {
  cfg: OrbConfig; sd: StageDef; rng: number;
  phase: Phase; turn: number; tick: number; phaseT: number;
  /** Ш96: hits on enemies in this volley (every touch, ray, chain, shard, splash) and the best volley of the run */
  hits?: number; bestHits?: number;
  /** Ш98 storm: ticks since the last enemy step; the tick of the next boss */
  stormT?: number; nextBoss?: number;
  /** Ш101: the boss's phases (every full health bar), the boss tick timer */
  bossPhase?: number; bossT?: number;
  /** Ш104: «Кора» — this enemy turn (or until a tick in the storm) nothing hurts; «Второе дыхание» used */
  immune?: boolean; immuneUntil?: number; breathUsed?: number;
  enemies: Enemy[]; balls: Ball[]; bushes: Bush[]; nextId: number;
  queue: (BallId | 'normal')[]; launchT: number; aim: number;
  specials: { id: BallId; lv: number }[]; normals: number; power: number;
  wallHp: number; wallMax: number; wallShield: number; wallSaved: boolean;
  heroHp: number; heroMax: number;
  xp: number; level: number; xpNext: number; pendingLv: number; cards: Card[];
  kills: number; dealt: number; spawned: number; bossSpawned: boolean; bossDead: boolean;
  spiritT: number; healThisTurn: number;
  dmgBy: Record<string, number>;
}

const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;

export class Orb {
  s: OrbState;
  fx: Fx[] = [];
  private rng: Rng;
  constructor(cfg: OrbConfig | OrbState) {
    if ('cfg' in cfg) { this.s = cfg; this.rng = new Rng(cfg.rng); return; }
    const sd = stageDef(cfg.stage);
    const wallMax = wallMaxOf(cfg.wall, cfg.wallHp ?? 0, cfg.rune?.wallPct ?? 0);
    this.rng = new Rng(cfg.seed);
    this.s = {
      cfg, sd, rng: 0, phase: 'aim', turn: 0, tick: 0, phaseT: 0,
      enemies: [], balls: [], bushes: [], nextId: 1, queue: [], launchT: 0, aim: -PI / 2,
      specials: [{ id: cfg.heroBall, lv: 1 }], normals: cfg.normals + Math.round(cfg.rune?.plusBall ?? 0), power: 0,
      wallHp: wallMax, wallMax, wallShield: 0, wallSaved: false,
      heroHp: cfg.god ? 1e9 : cfg.hp, heroMax: cfg.god ? 1e9 : cfg.hp,
      xp: 0, level: 1, xpNext: 4, pendingLv: 0, cards: [],
      kills: 0, dealt: 0, spawned: 0, bossSpawned: false, bossDead: false,
      spiritT: 0, healThisTurn: 0, dmgBy: {},
    };
    if (cfg.wall.id === 'shield') this.s.wallShield = Math.round(wallMax * wallFx.shield(cfg.wall.rarity));
    if (cfg.bossEv) this.bossStart();
    // the first rows: the field starts with three rows of enemies
    else for (let i = 0; i < 3; i++) { this.spawnRow(); for (const e of this.s.enemies) { e.r += 1; e.pr = e.r; } }
    this.s.rng = this.rng.state();
  }
  clone(): Orb { const o = new Orb(structuredClone({ ...this.s, rng: this.rng.state() })); return o; }

  // ---------------- input ----------------
  act(a: Act): void {
    const s = this.s;
    if (s.cfg.storm && s.phase === 'fly' && a.aim !== undefined) { s.aim = clamp(a.aim / 1000, -PI + 0.12, -0.12); } // Ш98: re-aim while the stream flies
    else if (s.phase === 'aim' && a.aim !== undefined) {
      s.aim = clamp(a.aim / 1000, -PI + 0.12, -0.12);
      s.queue = [...s.specials.map(x => x.id), ...Array.from({ length: s.normals }, () => 'normal' as const)];
      s.launchT = 0; s.phase = 'fly'; s.phaseT = 0; s.hits = 0;
    } else if (s.phase === 'choose' && a.reroll) { // Ш111: three new cards, the ones just shown left out when there are enough others
      this.rollCards(s.cards.map(c => c.k + (c.ball ?? '')));
    } else if (s.phase === 'choose' && a.choice !== undefined && s.cards[a.choice]) {
      this.applyCard(s.cards[a.choice]);
      s.pendingLv--; s.cards = [];
      if (s.pendingLv > 0) this.rollCards(); else s.phase = s.cfg.storm ? 'fly' : 'aim';
      if (s.cfg.storm) this.stormRefill();
    }
    this.s.rng = this.rng.state();
  }

  /** one simulation tick (only 'fly' and 'enemy' phases move) */
  step(): void {
    const s = this.s; this.fx = [];
    s.tick++; s.phaseT++;
    if (s.phase === 'fly' && s.cfg.storm) this.stormTick();
    else if (s.phase === 'fly') this.flyTick();
    else if (s.phase === 'enemy') { if (s.phaseT >= ENEMY_T) this.afterEnemies(); }
    for (const e of s.enemies) if (e.flash > 0) e.flash--;
    s.rng = this.rng.state();
  }
  get busy(): boolean { return this.s.phase === 'fly' || this.s.phase === 'enemy'; }

  // ---------------- balls ----------------
  private flyTick(): void {
    const s = this.s;
    if (s.queue.length && s.launchT <= 0) {
      const k = s.queue.shift()!;
      const lv = k === 'normal' ? 0 : s.specials.find(x => x.id === k)!.lv;
      s.balls.push({ kind: k, lv, x: COLS / 2, y: ROWS + LAUNCH_DY, vx: BALL_V * fcos(s.aim), vy: BALL_V * fsin(s.aim), age: 0, alive: true, bounces: 0, hit: {} });
      if (k !== 'normal' && s.cfg.gear?.spikes && this.rng.chance(this.gx('spikes', GEAR_FX.twin))) { // Ш104: «Ловкость рук» — the special ball flies twice
        const a = clamp(s.aim + 0.09, -PI + 0.12, -0.12);
        s.balls.push({ kind: k, lv, x: COLS / 2, y: ROWS + LAUNCH_DY, vx: BALL_V * fcos(a), vy: BALL_V * fsin(a), age: 0, alive: true, bounces: 0, hit: {}, copy: true });
        this.fx.push({ t: 'twin' });
      }
      s.launchT = s.cfg.storm ? STORM.gap : VOLLEY_GAP; this.fx.push({ t: 'launch' });
    }
    s.launchT--;
    for (const b of s.balls) if (b.alive) this.moveBall(b);
    if (s.cfg.storm) for (const b of s.balls) if (!b.alive && b.kind !== 'shard' && !b.copy) s.queue.push(b.kind as BallId | 'normal'); // Ш98: a ball back in the queue
    s.balls = s.balls.filter(b => b.alive);
    if (!s.cfg.storm && !s.queue.length && !s.balls.length) this.endVolley();
  }
  private moveBall(b: Ball): void {
    const s = this.s, SUB = 3;
    b.age++;
    if (b.age > 3600) { b.alive = false; return; } // a ball locked behind a packed field comes home after 60 s (the replay limit is 20 000 ticks)
    if (b.age > 1080) b.vy += 0.001; // no endless loops — after 18 s the ball sinks back (Ш74: slower balls, ×2 time)
    for (let k = 0; k < SUB && b.alive; k++) {
      b.x += b.vx / SUB; b.y += b.vy / SUB;
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); b.bounces++; }
      if (b.x > COLS - BALL_R) { b.x = COLS - BALL_R; b.vx = -Math.abs(b.vx); b.bounces++; }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); b.bounces++; }
      if (b.y > ROWS + LAUNCH_DY + 0.2) { b.alive = false; return; } // Ш95: back below the launch point
      if (b.kind === 'shard' && b.bounces > 2) { b.alive = false; return; }
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        const x0 = e.c + 0.04, x1 = e.c + e.w - 0.04, y0 = e.r + 0.04, y1 = e.r + e.h - 0.04;
        const nx = clamp(b.x, x0, x1), ny = clamp(b.y, y0, y1);
        const dx = b.x - nx, dy = b.y - ny, d2 = dx * dx + dy * dy;
        if (d2 >= BALL_R * BALL_R) continue;
        // Ш104: «Шипы» — now and then a normal ball's hit goes through: this enemy and the one behind it take ×N.
        // The ball itself still bounces: a ball let through behind the rows bounces there for the whole volley (the bot: +50% wins)
        const fresh = (b.hit[e.id] ?? -99) <= b.age - 6, vx0 = b.vx, vy0 = b.vy;
        const thorn = fresh && b.kind === 'normal' && !!s.cfg.gear?.thorn && this.rng.chance(this.gx('thorn', GEAR_FX.thorn));
        const pierce = b.kind === 'ghost';
        if (!pierce) {
          // push out and reflect along the normal
          let ux = dx, uy = dy, d = Math.sqrt(d2);
          if (d < 1e-6) { // centre inside: leave by the nearest side
            const l = b.x - x0, r = x1 - b.x, t = b.y - y0, bo = y1 - b.y, m = Math.min(l, r, t, bo);
            ux = m === l ? -1 : m === r ? 1 : 0; uy = m === t ? -1 : m === bo ? 1 : 0; d = 1;
            if (ux !== 0 && uy !== 0) uy = 0;
          } else { ux /= d; uy /= d; }
          const vn = b.vx * ux + b.vy * uy;
          if (vn < 0) { b.vx -= 2 * vn * ux; b.vy -= 2 * vn * uy; }
          b.x = nx + ux * (BALL_R + 0.001); b.y = ny + uy * (BALL_R + 0.001);
          b.bounces++;
          this.keepAngle(b);
        }
        if ((b.hit[e.id] ?? -99) > b.age - (pierce ? 80 : 6)) continue;
        b.hit[e.id] = b.age;
        this.ballHit(b, e, thorn ? this.gx('thorn', GEAR_FX.thornMul) : 1);
        if (thorn) this.thornThrough(e, vx0, vy0);
        if (b.kind === 'shard') { b.alive = false; return; }
        if (!pierce) break;
      }
    }
  }
  /** Ш104: «Шипы» — the hit goes on along the flight: the first enemy behind (up to 2.5 cells) takes the same ×N hit */
  private thornThrough(e: Enemy, vx: number, vy: number): void {
    const s = this.s, l = Math.sqrt(vx * vx + vy * vy) || 1, ux = vx / l, uy = vy / l;
    const x0 = e.c + e.w / 2, y0 = e.r + e.h / 2;
    for (let k = 1; k <= 6; k++) {
      const x = x0 + ux * (e.w / 2 + 0.4 * k), y = y0 + uy * (e.h / 2 + 0.4 * k);
      const o = s.enemies.find(t => t !== e && t.hp > 0 && x >= t.c && x < t.c + t.w && y >= t.r && y < t.r + t.h);
      if (!o) continue;
      this.fx.push({ t: 'pierce', x1: x0, y1: y0, x2: o.c + o.w / 2, y2: o.r + o.h / 2 });
      this.damage(o, this.atkOf('normal', 0) * (1 + (s.cfg.rune?.impact ?? 0)) * this.gx('thorn', GEAR_FX.thornMul), 'normal', true, 'normal');
      return;
    }
    this.fx.push({ t: 'pierce', x1: x0, y1: y0, x2: x0 + ux * 1.2, y2: y0 + uy * 1.2 });
  }
  /** no near-horizontal flights: they bore the player and never come back */
  private keepAngle(b: Ball): void {
    const min = BALL_V * 0.18;
    if (Math.abs(b.vy) < min) { b.vy = b.vy < 0 ? -min : min; const vx = Math.sqrt(Math.max(0, BALL_V * BALL_V - min * min)); b.vx = b.vx < 0 ? -vx : vx; }
  }

  // ---------------- damage ----------------
  /** Ш70: the hero's own ball hits harder with the hero's stars 1–5 */
  /** Ш104: the value of a set effect for the worn rarity (epic / mythic), 0 when not worn */
  private gx(k: GearFxId, v: readonly number[]): number { const l = this.s.cfg.gear?.[k]; return l ? v[l - 1] : 0; }
  private heroMul(kind: string): number { const c = this.s.cfg; return kind === c.heroBall ? 1 + 0.15 * Math.min(5, c.stars ?? 0) : 1; }
  /** Ш72: the hit of a ball for the level-up cards (no crit) */
  hitOf(kind: BallId, lv: number): number { return this.atkOf(kind, lv); }
  /** the highest level a ball reaches in this run (the hero's ball goes to 4 with ★3) */
  maxLv(id: BallId): number { return id === this.s.cfg.heroBall && (this.s.cfg.stars ?? 0) >= 3 ? 4 : 3; }
  private atkOf(kind: Ball['kind'], lv: number): number {
    const c = this.s.cfg, p = 1 + this.s.power;
    if (kind === 'normal') return c.atk * p * (1 + (c.rune?.normal ?? 0) + (c.rune?.allBalls ?? 0));
    if (kind === 'shard') return c.atk * p * BALL_FX.shard(lv) * (1 + (c.rune?.area ?? 0)) * (1 + (c.rune?.allBalls ?? 0));
    const meta = c.ballLv[kind] ?? 1;
    return c.atk * p * (1 + elemHit(meta) * runLvMul(lv)) * (1 + (c.rune?.allBalls ?? 0)) * this.heroMul(kind);
  }
  private damage(e: Enemy, raw: number, src: string, canCrit: boolean, fxKind: string): number {
    const s = this.s, c = s.cfg;
    if (e.hp <= 0) return 0;
    if (s.phase === 'fly' && src !== 'wall' && src !== 'spirit') { s.hits = (s.hits ?? 0) + 1; if (s.hits > (s.bestHits ?? 0)) s.bestHits = s.hits; } // Ш96
    let d = raw, crit = false;
    if (canCrit && this.rng.chance(c.crit)) { d *= c.critDmg; crit = true; }
    if (e.freeze > 0) d *= 1.1;
    if ((e.burnT > 0 || e.poisonT > 0 || e.wet > 0 || e.freeze > 0) && c.rune?.afflicted) d *= 1 + c.rune.afflicted;
    if ((e.wet > 0 || e.freeze > 0) && c.rune?.wetFrozen) d *= 1 + c.rune.wetFrozen;
    if (ENEMY[e.kind].tier === 'boss') d *= 1 + c.boss;
    if (ENEMY[e.kind].tier !== 'normal' && c.rune?.elite) d *= 1 + c.rune.elite;
    if (e.kind === 'echidna') { let k = 1; for (let i = 1; i < c.stage; i++) k *= 1.1; d = Math.max(1, d - ECHIDNA_ARMOR * 100 * k); }
    d = Math.round(d);
    if (e.shield > 0) { const a = Math.min(e.shield, d); e.shield -= a; d -= a; }
    const dealt = Math.min(e.hp, d);
    e.hp -= d; e.flash = 8;
    s.dealt += dealt; s.dmgBy[src] = (s.dmgBy[src] ?? 0) + dealt;
    this.fx.push({ t: 'hit', x: e.c + e.w / 2, y: e.r + e.h / 2, dmg: d, crit, kind: fxKind });
    if (e.hp <= 0 && c.bossEv && e.kind === c.bossEv) { // Ш101: the boss never dies — a new phase, its shots grow stronger
      e.hp = e.max; s.bossPhase = (s.bossPhase ?? 0) + 1; this.fx.push({ t: 'phase', n: s.bossPhase });
    } else if (e.hp <= 0) this.kill(e);
    return dealt;
  }
  private ballHit(b: Ball, e: Enemy, mul = 1): void {
    const s = this.s, c = s.cfg, lv = b.lv, rn = c.rune ?? {};
    // правка Ш7: «урон при ударе» — the direct hit of every ball (shards count as area); the ghost — «пробивание»
    const direct = (b.kind === 'shard' ? 1 : 1 + (rn.impact ?? 0)) * (b.kind === 'ghost' ? 1 + (rn.pierce ?? 0) : 1);
    this.damage(e, this.atkOf(b.kind, lv) * direct * mul, b.kind, true, b.kind);
    const ex = e.c + e.w / 2, ey = e.r + e.h / 2;
    const A = c.atk * (1 + s.power) * (1 + (rn.allBalls ?? 0)) * this.heroMul(b.kind);
    // правка Ш7: the duration rune is a chance of one more turn, rolled only when an effect is put on
    const dur = () => rn.dur && this.rng.chance(rn.dur) ? 1 : 0;
    switch (b.kind) {
      case 'fire': if (e.hp > 0) { e.burnN = Math.min(3, e.burnN + 1); e.burnT = 3 + dur(); } break;
      case 'poison': if (e.hp > 0) { e.poisonN = Math.min(5, e.poisonN + 1); e.poisonT = 4 + dur(); } break;
      case 'ice': if (e.hp > 0 && (e.wet > 0 || this.rng.chance(BALL_FX.freezeChance(lv)))) { e.freeze = 2 + dur(); this.fx.push({ t: 'freeze', x: ex, y: ey }); } break;
      case 'wet': if (e.hp > 0) e.wet = 2 + dur(); break;
      case 'beam': {
        const row = Math.abs(b.vx) > Math.abs(b.vy);
        const dmg = A * BALL_FX.beam(lv) * (1 + (rn.beamLight ?? 0));
        const lines: ('row' | 'col')[] = lv >= 3 ? ['row', 'col'] : [row ? 'row' : 'col'];
        for (const dir of lines) {
          const at = dir === 'row' ? Math.floor(ey) : Math.floor(ex);
          this.fx.push({ t: 'beam', dir, at, from: dir === 'row' ? ex : ey, color: BALLS.beam.glow });
          for (const o of [...s.enemies]) if (o !== e && o.hp > 0 && (dir === 'row' ? o.r <= at && at < o.r + o.h : o.c <= at && at < o.c + o.w)) this.damage(o, dmg, 'beam', false, 'beam');
        }
        break;
      }
      case 'lightning': {
        if (!this.rng.chance(0.7)) break;
        let n = 1 + (lv >= 3 ? 1 : 0) + (e.wet > 0 ? 1 : 0);
        const done = new Set([e.id]);
        let from = { x: ex, y: ey };
        while (n-- > 0) {
          let best: Enemy | null = null, bd = 9;
          for (const o of s.enemies) { if (o.hp <= 0 || done.has(o.id)) continue; const d = Math.abs(o.c + o.w / 2 - from.x) + Math.abs(o.r + o.h / 2 - from.y); if (d < bd) { bd = d; best = o; } }
          if (!best || bd > 3.5) break;
          done.add(best.id);
          const to = { x: best.c + best.w / 2, y: best.r + best.h / 2 };
          this.fx.push({ t: 'chain', x1: from.x, y1: from.y, x2: to.x, y2: to.y });
          this.damage(best, A * BALL_FX.chain(lv) * (1 + (rn.beamLight ?? 0)), 'lightning', false, 'lightning');
          from = to;
        }
        break;
      }
      case 'quake': {
        const cc = Math.floor(ex), rr = Math.floor(ey);
        this.fx.push({ t: 'quake', c: cc, r: rr });
        for (const o of [...s.enemies]) if (o !== e && o.hp > 0 && o.c <= cc + 1 && o.c + o.w - 1 >= cc - 1 && o.r <= rr + 1 && o.r + o.h - 1 >= rr - 1) this.damage(o, A * BALL_FX.quake(lv) * (1 + (rn.area ?? 0)), 'quake', false, 'quake');
        break;
      }
      case 'cluster': {
        if (!this.rng.chance(BALL_FX.shardChance(lv))) break;
        const a = this.rng.range(0, 2 * PI);
        s.balls.push({ kind: 'shard', lv, x: b.x, y: b.y, vx: BALL_V * 0.85 * fcos(a), vy: BALL_V * 0.85 * fsin(a), age: 0, alive: true, bounces: 0, hit: { [e.id]: 0 } });
        this.fx.push({ t: 'shard', x: b.x, y: b.y });
        break;
      }
      case 'spike': {
        const cc = Math.floor(ex), rr = e.r + e.h; // the cell the enemy will step into
        if (rr < ROWS && !s.bushes.some(x => x.c === cc && x.r === rr)) { s.bushes.push({ c: cc, r: rr, t: 2 + dur(), dmg: A * BALL_FX.thorn(lv) * (1 + (rn.pierce ?? 0)) }); this.fx.push({ t: 'thorn', c: cc, r: rr }); }
        else { const bu = s.bushes.find(x => x.c === cc && x.r === rr); if (bu) bu.t = Math.max(bu.t, 2 + dur()); }
        break;
      }
    }
  }
  private kill(e: Enemy): void {
    const s = this.s, d = ENEMY[e.kind];
    s.kills++;
    this.fx.push({ t: 'die', x: e.c, y: e.r, w: e.w, h: e.h, kind: e.kind });
    if (d.tier === 'boss' && e.kind !== 'split1') s.bossDead = true;
    // splitting: slime → 2 small, big slime → 3, colossus → 2 halves → 3 shards each
    if (e.kind === 'slime') this.splitInto(e, 'smallslime', 2);
    else if (e.kind === 'bigslime') this.splitInto(e, 'slime', 3);
    else if (e.kind === 'split1') { this.splitInto(e, 'split2', 2); }
    else if (e.kind === 'split2') this.splitInto(e, 'split3', 3);
    if (e.kind === 'split1') s.bossDead = false;
    if (e.kind === 'split3' || e.kind === 'split2') { if (!s.enemies.some(o => o.hp > 0 && (o.kind === 'split1' || o.kind === 'split2' || o.kind === 'split3'))) s.bossDead = s.bossSpawned; }
    s.xp += d.xp;
    while (s.xp >= s.xpNext) { s.xp -= s.xpNext; s.level++; s.xpNext = Math.round(4 + 2.2 * (s.level - 1)); s.pendingLv++; this.fx.push({ t: 'level' }); }
  }
  private splitInto(e: Enemy, kind: EnemyId, n: number): void {
    const occ = this.occ(), free: [number, number][] = [];
    for (let r = e.r; r < e.r + e.h + 1 && r < ROWS; r++) for (let c = e.c - 1; c <= e.c + e.w; c++) if (c >= 0 && c < COLS && !occ[r * COLS + c]) free.push([c, r]);
    for (let r = e.r; r < e.r + e.h; r++) for (let c = e.c; c < e.c + e.w; c++) if (!free.some(f => f[0] === c && f[1] === r)) free.unshift([c, r]);
    for (let i = 0; i < n && free.length; i++) {
      const j = this.rng.int(Math.min(free.length, 4 + i)); const [c, r] = free.splice(j, 1)[0];
      const o = this.makeEnemy(kind, c, r); o.pr = r; this.s.enemies.push(o);
    }
  }

  // ---------------- turns ----------------
  private endVolley(): void {
    const s = this.s;
    s.enemies = s.enemies.filter(e => e.hp > 0);
    if (this.checkEnd()) return;
    s.phase = 'enemy'; s.phaseT = 0;
    this.enemyTurn();
    this.checkEnd();
  }
  private afterEnemies(): void {
    const s = this.s;
    if (s.phase !== 'enemy') return;
    s.immune = false;
    if (s.pendingLv > 0) { s.phase = 'choose'; this.rollCards(); } else s.phase = 'aim';
  }
  private checkEnd(): boolean {
    const s = this.s;
    if (s.cfg.storm) { if (s.heroHp <= 0) { s.phase = 'lose'; return true; } return false; } // Ш98: no win, only how long
    if (s.bossDead && s.enemies.some(e => e.hp > 0)) { for (const e of s.enemies) if (e.hp > 0) { e.hp = 0; this.fx.push({ t: 'die', x: e.c, y: e.r, w: e.w, h: e.h, kind: e.kind }); } s.enemies = []; }
    if (s.heroHp <= 0) { s.phase = 'lose'; return true; } // Ш102: the wall falling is not the end — the hero is
    if (s.spawned >= s.sd.turns && s.bossSpawned && !s.enemies.some(e => e.hp > 0)) { s.phase = 'win'; return true; }
    return false;
  }
  private enemyTurn(): void {
    const s = this.s, c = s.cfg, A = c.atk * (1 + s.power);
    s.turn++; s.healThisTurn = 0;
    if (!c.storm && c.gear?.bark) s.immune = s.turn % this.gx('bark', GEAR_FX.bark) === 0; // Ш104: «Кора» — a turn nothing hurts
    for (const e of s.enemies) { e.pr = e.r; e.pc = e.c; }
    // 1. damage over time (the rune «урон всех шаров и их эффектов» counts here too)
    const Ad = A * (1 + (c.rune?.allBalls ?? 0));
    for (const e of [...s.enemies]) {
      if (e.hp <= 0) continue;
      if (e.burnT > 0) { const d = Ad * BALL_FX.burn(this.lvOf('fire')) * e.burnN * (1 + (c.rune?.dot ?? 0)); this.fx.push({ t: 'dot', x: e.c + e.w / 2, y: e.r + e.h / 2, dmg: Math.round(d), kind: 'burn' }); this.damage(e, d, 'fire', false, 'burn'); e.burnT--; if (e.burnT <= 0) e.burnN = 0; }
      if (e.hp > 0 && e.poisonT > 0) { const d = Ad * BALL_FX.poison(this.lvOf('poison')) * e.poisonN * (1 + (c.rune?.dot ?? 0)); this.fx.push({ t: 'dot', x: e.c + e.w / 2, y: e.r + e.h / 2, dmg: Math.round(d), kind: 'poison' }); this.damage(e, d, 'poison', false, 'poison'); e.poisonT--; if (e.poisonT <= 0) e.poisonN = 0; }
    }
    s.enemies = s.enemies.filter(e => e.hp > 0);
    // 2. the spirit
    if (c.spirit) { s.spiritT++; if (s.spiritT >= spiritEvery(c.spirit.rarity)) { s.spiritT = 0; this.spiritAct(); } }
    // 3. the wall heals itself / the shield comes back
    if (c.wall.id === 'heal') this.wallHeal(s.wallMax * wallFx.heal(c.wall.rarity));
    if (!c.storm && c.gear?.roots && s.wallHp > 0) this.wallHeal(s.wallMax * this.gx('roots', GEAR_FX.roots)); // Ш104: «Корни»
    if (c.wall.id === 'shield' && s.wallHp > 0) s.wallShield = Math.round(s.wallMax * wallFx.shield(c.wall.rarity));
    // 4. enemies act, the nearest to the wall first
    const order = [...s.enemies].sort((a, b) => (b.r + b.h) - (a.r + a.h) || a.c - b.c);
    let firstHit = c.wall.id === 'reinf' && c.wall.rarity >= 9;
    for (const e of order) {
      if (e.hp <= 0) continue;
      e.cd++;
      const d = ENEMY[e.kind], front = e.r + e.h >= ROWS;
      const hitWall = (mul: number, kind: 'hit' | 'shot' | 'rock') => {
        if (this.blocked(e.c + e.w / 2)) return; // Ш104: «Кора» / «Чаща» — before the shield takes anything
        let dmg = s.sd.dmgUnit * d.atk * mul * (e.curse > 0 ? 0.7 : 1);
        if (firstHit) { firstHit = false; dmg = 0; }
        const armor = c.wallArmor ?? 0; if (armor > 0 && dmg > 0) dmg = Math.max(1, dmg - Math.min(armor, dmg / 2));
        dmg = Math.round(dmg);
        if (s.wallShield > 0) {
          if (c.wall.id === 'shield' && c.wall.rarity >= 9 && s.wallShield >= Math.round(s.wallMax * wallFx.shield(c.wall.rarity))) this.damage(e, dmg, 'wall', false, 'counter');
          const a = Math.min(s.wallShield, dmg); s.wallShield -= a; dmg -= a;
        }
        this.hurt(dmg, e.c + e.w / 2, kind, { x: e.c + e.w / 2, y: e.r + e.h }, true); // Ш102: the wall first, then the hero
        if (c.wall.id === 'counter' && e.hp > 0) {
          const cd = A * wallFx.counter(c.wall.rarity);
          this.fx.push({ t: 'counter', x: e.c + e.w / 2, y: e.r + e.h / 2 });
          if (c.wall.rarity >= 9) { for (const o of [...s.enemies]) if (o.hp > 0 && o.r + o.h >= e.r + e.h - 0.5 && o.r <= e.r + e.h - 1) this.damage(o, cd, 'wall', false, 'counter'); }
          else this.damage(e, cd, 'wall', false, 'counter');
        }
        if (c.wall.id === 'heal' && c.wall.rarity >= 9 && !s.wallSaved && s.wallHp < 0.2 * s.wallMax && s.wallHp > 0) { s.wallSaved = true; this.wallHeal(0.3 * s.wallMax, true); }
      };
      // abilities
      if (e.kind === 'healer' && e.cd % 2 === 0) {
        let best: Enemy | null = null;
        for (const o of s.enemies) if (o !== e && o.hp > 0 && o.hp < o.max && Math.abs(o.c - e.c) <= 1 + o.w - 1 && Math.abs(o.r - e.r) <= 1 + o.h - 1 && (!best || o.hp / o.max < best.hp / best.max)) best = o;
        if (best) { const a = Math.round(best.max * 0.1); best.hp = Math.min(best.max, best.hp + a); this.fx.push({ t: 'heal', x: best.c + best.w / 2, y: best.r + best.h / 2, amt: a }); }
      }
      if (e.kind === 'bhealer' && e.cd % 2 === 0) {
        for (const o of s.enemies) if (o !== e && o.hp > 0 && o.hp < o.max && Math.abs(o.c + o.w / 2 - e.c - 1) <= 3 && Math.abs(o.r + o.h / 2 - e.r - 1) <= 3) { const a = Math.round(o.max * 0.1); o.hp = Math.min(o.max, o.hp + a); this.fx.push({ t: 'heal', x: o.c + o.w / 2, y: o.r + o.h / 2, amt: a }); }
      }
      if (e.kind === 'summoner' && e.cd % 3 === 0) this.summon(e, 1 + this.rng.int(2));
      if (e.kind === 'shield' && e.cd % 3 === 0) e.shield = Math.min(e.shieldMax, e.shield + Math.round(e.shieldMax / 4));
      if (e.kind === 'cannon' && e.cd % 2 === 0) this.hitHero(e, 0.1);
      if (e.kind === 'hydra' && e.cd % 3 === 0) this.hitHero(e, 0.08);
      // ranged minibosses stop at their distance and shoot
      if (e.kind === 'archer' && e.r + e.h >= ROWS - 4) { hitWall(0.5, 'shot'); continue; }
      if (e.kind === 'cyclops' && e.r + e.h >= ROWS - 3) { if (e.cd % 2 === 0) hitWall(1, 'rock'); continue; }
      if (front) { hitWall(e.kind === 'hydra' ? 3 : 1, 'hit'); continue; }
      // the step
      if (e.wet > 0 && ENEMY[e.kind].tier !== 'boss' && !e.skipped && this.rng.chance(BALL_FX.wetSkip(this.lvOf('wet')))) { e.skipped = true; continue; }
      e.skipped = false;
      for (let k = 0; k < d.step; k++) { if (!this.tryMove(e)) break; }
    }
    for (const e of s.enemies) { if (e.freeze > 0) e.freeze--; if (e.wet > 0) e.wet--; if (e.curse > 0) e.curse--; }
    for (const b of s.bushes) b.t--;
    s.bushes = s.bushes.filter(b => b.t > 0);
    s.enemies = s.enemies.filter(e => e.hp > 0);
    // 5. new enemies at the top
    if (s.cfg.storm) { if (s.tick >= (s.nextBoss ?? STORM.boss)) { s.nextBoss = s.tick + STORM.boss; s.bossSpawned = false; this.spawnBoss(); } else this.spawnRow(); }
    else if (s.spawned < s.sd.turns) this.spawnRow();
    else if (!s.bossSpawned) this.spawnBoss();
    else if (!s.bossDead) this.spawnEscort();
  }
  private lvOf(b: BallId): number { return this.s.specials.find(x => x.id === b)?.lv ?? 1; }
  private tryMove(e: Enemy): boolean {
    const s = this.s, nr = e.r + 1;
    if (nr + e.h > ROWS) return false;
    const occ = this.occ(e.id);
    for (let c = e.c; c < e.c + e.w; c++) if (occ[(nr + e.h - 1) * COLS + c]) return false;
    e.r = nr;
    for (const b of s.bushes) if (b.c >= e.c && b.c < e.c + e.w && b.r === nr + e.h - 1) this.damage(e, b.dmg, 'spike', false, 'thorn');
    return true;
  }
  private occ(skip = -1): Uint8Array {
    const o = new Uint8Array(COLS * (ROWS + 4));
    for (const e of this.s.enemies) if (e.hp > 0 && e.id !== skip) for (let r = e.r; r < e.r + e.h; r++) for (let c = e.c; c < e.c + e.w; c++) if (r >= 0) o[r * COLS + c] = 1;
    return o;
  }
  private hitHero(e: Enemy, share: number): void {
    const s = this.s, dmg = Math.round(s.heroMax * share * (1 + 0.04 * (s.cfg.stage - 1)));
    this.hurt(dmg, e.c + e.w / 2, 'shot', { x: e.c + e.w / 2, y: e.r + e.h }); // Ш102: the shooters hit the wall too while it stands
  }
  /** Ш102: every blow goes into the wall; when the wall has fallen — into the hero (the last stand). A repair raises it again */
  private hurt(dmg: number, x: number, kind: 'hit' | 'shot' | 'rock', from: { x: number; y: number }, checked = false): void {
    const s = this.s, g = s.cfg.gear;
    if (!checked && this.blocked(x)) return;
    if (s.wallHp > 0) {
      const w = Math.min(s.wallHp, dmg); s.wallHp -= w; dmg -= w;
      this.fx.push({ t: 'wall', c: x, dmg: w, kind });
      if (s.wallHp <= 0) {
        s.wallHp = 0;
        if (g?.breath && (s.breathUsed ?? 0) < GEAR_FX.breathN[g.breath - 1]) { // Ш104: «Второе дыхание» — the wall rises once (twice)
          s.breathUsed = (s.breathUsed ?? 0) + 1; s.wallHp = Math.round(s.wallMax * this.gx('breath', GEAR_FX.breath)); dmg = 0;
          this.fx.push({ t: 'breath' });
        } else this.fx.push({ t: 'wallFall' });
      }
    }
    if (dmg > 0) { s.heroHp -= dmg; this.fx.push({ t: 'hero', dmg, from }); }
  }
  /** Ш104: «Кора» (a turn / a few seconds of immunity) and «Чаща» (a chance the blow misses) */
  private blocked(x: number): boolean {
    const s = this.s, g = s.cfg.gear;
    if (!g) return false;
    if (s.immune || (s.immuneUntil ?? 0) > s.tick) { this.fx.push({ t: 'block', x, kind: 'immune' }); return true; }
    if (g.thicket && this.rng.chance(this.gx('thicket', GEAR_FX.thicket))) { this.fx.push({ t: 'block', x, kind: 'miss' }); return true; }
    return false;
  }
  /** Ш104: the storm and the boss attack count seconds: «Кора» — 3 s of immunity every 20 (12) s, «Корни» — a repair every 5 s */
  private gearTick(): void {
    const s = this.s, g = s.cfg.gear; if (!g) return;
    if (g.bark && s.tick % (this.gx('bark', GEAR_FX.barkSec) * 60) === 0) s.immuneUntil = s.tick + GEAR_FX.barkLen;
    if (g.roots && s.wallHp > 0 && s.tick % (GEAR_FX.rootsSec * 60) === 0) { s.healThisTurn = 0; this.wallHeal(s.wallMax * this.gx('roots', GEAR_FX.roots)); }
  }
  private wallHeal(amt: number, force = false): void {
    const s = this.s, cap = 0.2 * s.wallMax - s.healThisTurn; // правка Ш20: all healing ≤ 20% of the wall per turn
    const a = Math.round(Math.max(0, Math.min(amt, force ? amt : cap, s.wallMax - s.wallHp)));
    if (a <= 0) return;
    s.wallHp += a; if (!force) s.healThisTurn += a;
    this.fx.push({ t: 'wallHeal', amt: a });
  }
  private summon(e: Enemy, n: number): void {
    const occ = this.occ(), free: [number, number][] = [];
    for (let r = Math.max(0, e.r - 1); r <= e.r + 1; r++) for (let c = e.c - 1; c <= e.c + 1; c++) if (c >= 0 && c < COLS && r < ROWS - 1 && !occ[r * COLS + c]) free.push([c, r]);
    for (let i = 0; i < n && free.length; i++) {
      const [c, r] = free.splice(this.rng.int(free.length), 1)[0];
      const o = this.makeEnemy('base', c, r); o.pr = r; this.s.enemies.push(o);
      this.fx.push({ t: 'summon', x: c + 0.5, y: r + 0.5 });
    }
  }
  private spiritAct(): void {
    const s = this.s, sp = s.cfg.spirit!, A = s.cfg.atk * (1 + s.power) * 0.2 * (1 + 0.05 * (sp.lv - 1)) * (1 + (s.cfg.rune?.spirit ?? 0));
    const alive = s.enemies.filter(e => e.hp > 0), tg: { x: number; y: number }[] = [];
    const pickN = (n: number) => { const pool = [...alive], out: Enemy[] = []; while (out.length < n && pool.length) out.push(pool.splice(this.rng.int(pool.length), 1)[0]); return out; };
    switch (sp.id) {
      case 'healer': {
        const amt = Math.round((40 + 12 * (sp.lv - 1)) * (1 + 0.15 * sp.rarity) * (1 + (s.cfg.rune?.spirit ?? 0)));
        s.heroHp = Math.min(s.heroMax, s.heroHp + amt); this.wallHeal(amt * 3);
        break;
      }
      case 'fire': for (const e of pickN(5)) { e.burnN = Math.min(3, e.burnN + 1); e.burnT = Math.max(e.burnT, 3); this.damage(e, A, 'spirit', false, 'burn'); tg.push({ x: e.c + e.w / 2, y: e.r + e.h / 2 }); } break;
      case 'storm': {
        const weak = [...alive].sort((a, b) => a.hp - b.hp || a.id - b.id).slice(0, 3);
        const dmg = A * (1 + 3 * BALL_FX.burn(1)) * 1.5;
        for (const e of weak) { tg.push({ x: e.c + e.w / 2, y: e.r + e.h / 2 }); this.damage(e, dmg, 'spirit', false, 'lightning'); }
        break;
      }
      case 'frost': {
        let maxR = -1; for (const e of alive) maxR = Math.max(maxR, e.r + e.h);
        for (const e of alive) if (e.r + e.h === maxR) { e.freeze = Math.max(e.freeze, 2); tg.push({ x: e.c + e.w / 2, y: e.r + e.h / 2 }); this.damage(e, A * 0.5, 'spirit', false, 'ice'); }
        break;
      }
      case 'curse': for (const e of pickN(3)) { e.curse = 2; tg.push({ x: e.c + e.w / 2, y: e.r + e.h / 2 }); } break;
    }
    this.fx.push({ t: 'spirit', id: sp.id, targets: tg });
  }

  // ---------------- spawning ----------------
  private makeEnemy(kind: EnemyId, c: number, r: number): Enemy {
    const s = this.s, d = ENEMY[kind];
    const ramp = 1 + 0.1 * s.spawned;
    const hp = s.cfg.storm // Ш98: weaker, many, +15% every 30 s
      ? Math.round(s.sd.hpUnit * d.hp * (d.tier === 'boss' ? STORM.bossHp : STORM.hp) * Math.pow(STORM.hpGrow, Math.floor(s.tick / STORM.wave)))
      : Math.round(s.sd.hpUnit * d.hp * (d.tier === 'normal' ? ramp : 1 + 0.02 * s.spawned));
    const e: Enemy = {
      id: s.nextId++, kind, c, r, w: d.w, h: d.h, hp, max: hp, shield: 0, shieldMax: 0,
      burnN: 0, burnT: 0, poisonN: 0, poisonT: 0, freeze: 0, wet: 0, skipped: false, curse: 0,
      pr: r, pc: c, cd: 0, flash: 0, atk: d.atk,
    };
    if (kind === 'shield') { e.shieldMax = Math.round(hp * 0.25); e.shield = e.shieldMax; }
    return e;
  }
  private spawnRow(): void {
    const s = this.s, sd = s.sd, t = s.spawned;
    s.spawned++;
    const occ = this.occ();
    const free: number[] = []; for (let c = 0; c < COLS; c++) if (!occ[c]) free.push(c);
    if (s.cfg.storm ? s.spawned % STORM.miniEvery === 0 : sd.miniAt.includes(s.spawned)) {
      const kind = MINIS[(sd.stage * 2 + sd.miniAt.indexOf(s.spawned)) % MINIS.length];
      const w = ENEMY[kind].w;
      const starts = free.filter(c => c + w <= COLS && [...Array(w).keys()].every(k => free.includes(c + k) && !occ[COLS + c + k]));
      if (starts.length) { const c0 = starts[this.rng.int(starts.length)]; s.enemies.push(this.makeEnemy(kind, c0, 0)); for (let k = 0; k < w; k++) free.splice(free.indexOf(c0 + k), 1); }
    }
    // density grows through the stage: 2–3 at first, up to 4–6 on a 9-wide field; правка Ш42 — the field is 7 wide,
    // so the count is scaled to it and at least two cells of a row stay free for the balls to pass
    const want = 2 + Math.floor(t / 6) + this.rng.int(2) + (sd.stage >= 5 ? 1 : 0);
    const n = Math.min(free.length, COLS - 2, Math.max(2, Math.round(want * COLS / 9)));
    for (let i = 0; i < n; i++) {
      const c = free.splice(this.rng.int(free.length), 1)[0];
      const kind = sd.pool[this.rng.int(sd.pool.length)];
      s.enemies.push(this.makeEnemy(kind, c, 0));
    }
  }
  /** while the boss lives, a few of its guards come every turn: the balls have something to bounce off */
  private spawnEscort(): void {
    const s = this.s, occ = this.occ(), free: number[] = [];
    for (let c = 0; c < COLS; c++) if (!occ[c]) free.push(c);
    const n = Math.min(free.length, 1 + this.rng.int(2));
    for (let i = 0; i < n; i++) { const c = free.splice(this.rng.int(free.length), 1)[0]; s.enemies.push(this.makeEnemy(s.sd.pool[this.rng.int(s.sd.pool.length)], c, 0)); }
  }
  private spawnBoss(): void {
    const s = this.s, kind = s.sd.boss, w = ENEMY[kind].w;
    const occ = this.occ();
    let best = Math.floor((COLS - w) / 2);
    for (let d = 0; d < COLS; d++) for (const c of [best - d, best + d]) if (c >= 0 && c + w <= COLS && [...Array(w).keys()].every(k => !occ[c + k] && !occ[COLS + c + k])) { best = c; d = COLS; break; }
    const e = this.makeEnemy(kind, best, 0);
    e.hp = e.max = Math.round(s.sd.hpUnit * ENEMY[kind].hp * (1 + 0.04 * s.spawned));
    if (kind === 'shield') { e.shieldMax = Math.round(e.max * 0.35); e.shield = e.shieldMax; }
    s.enemies.push(e); s.bossSpawned = true;
  }

  // ---------------- level-up cards ----------------
  private rollCards(avoid: string[] = []): void {
    const s = this.s, c = s.cfg; let pool: Card[] = [];
    const owned = BALL_IDS.filter(b => (c.ballLv[b] ?? 0) > 0 && !s.specials.some(x => x.id === b));
    if (s.specials.length < 4) for (const b of owned) pool.push({ k: 'new', ball: b, title: BALLS[b].name, desc: BALLS[b].desc(1), lv: 1 });
    for (const x of s.specials) if (x.lv < this.maxLv(x.id)) pool.push({ k: 'up', ball: x.id, title: BALLS[x.id].name, desc: BALLS[x.id].desc(x.lv + 1), lv: x.lv + 1 });
    if (s.normals < c.normals + 4) pool.push({ k: 'normal', title: '+1 обычный шар', desc: 'Ещё один обычный шар в каждом залпе' });
    if (avoid.length) { const rest = pool.filter(x => !avoid.includes(x.k + (x.ball ?? ''))); if (rest.length >= 3) pool = rest; }
    const picks: Card[] = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(this.rng.int(pool.length), 1)[0]);
    if (picks.length < 3) picks.push({ k: 'power', title: 'Сила Олимпа', desc: 'Урон всех шаров +12%' });
    if (picks.length < 3) picks.push({ k: 'repair', title: 'Починка стены', desc: 'Стена восстанавливает 25% здоровья' });
    s.cards = picks;
  }
  private applyCard(k: Card): void {
    const s = this.s;
    if (k.k === 'new' && k.ball) s.specials.push({ id: k.ball, lv: 1 });
    else if (k.k === 'up' && k.ball) { const x = s.specials.find(y => y.id === k.ball); if (x) x.lv = Math.min(3, x.lv + 1); }
    else if (k.k === 'normal') s.normals++;
    else if (k.k === 'power') s.power += 0.12;
    else if (k.k === 'repair') s.wallHp = Math.min(s.wallMax, s.wallHp + Math.round(0.25 * s.wallMax));
    // правка: rune «чинит стену при новом уровне»
    if (s.cfg.rune?.repair) s.wallHp = Math.min(s.wallMax, s.wallHp + Math.round(s.cfg.rune.repair * s.wallMax));
  }

  // ---------------- auto aim ----------------
  // ---------------- Ш98: storm ----------------
  /** one tick of the storm: the stream flies, enemies step every few seconds (faster every 30 s), a level-up pauses */
  private stormTick(): void {
    const s = this.s;
    if (s.cfg.bossEv) return this.bossTick();
    this.flyTick();
    if (s.enemies.some(e => e.hp <= 0)) s.enemies = s.enemies.filter(e => e.hp > 0); // Ш100: the dead leave at once (the aim line saw them)
    if ((s.phase as Phase) !== 'fly') return;
    this.gearTick();
    s.stormT = (s.stormT ?? 0) + 1;
    const every = Math.max(STORM.stepMin, Math.round(STORM.step * Math.pow(STORM.stepGrow, Math.floor(s.tick / STORM.wave))));
    if (s.stormT >= every) {
      s.stormT = 0;
      s.enemies = s.enemies.filter(e => e.hp > 0);
      this.enemyTurn();
      if (s.bossDead) { s.bossDead = false; s.bossSpawned = false; }
      if (this.checkEnd()) return;
    }
    if (s.pendingLv > 0) { s.phase = 'choose'; this.rollCards(); }
  }
  // ---------------- Ш101: the boss attack ----------------
  /** the boss of the day in the middle of the top, 3 random special balls besides the hero's */
  private bossStart(): void {
    const s = this.s, c = s.cfg, kind = c.bossEv!, d = ENEMY[kind];
    const e = this.makeEnemy(kind, Math.floor((COLS - d.w) / 2), 0);
    e.max = e.hp = Math.round(s.sd.hpUnit * d.hp * BOSS_EV.phaseHp); e.shield = e.shieldMax = 0;
    s.enemies.push(e); s.bossSpawned = true;
    const owned = BALL_IDS.filter(b => b !== c.heroBall && (c.ballLv[b] ?? 0) > 0), pool = owned.length >= 3 ? owned : BALL_IDS.filter(b => b !== c.heroBall);
    for (let i = 0; i < 3 && pool.length; i++) s.specials.push({ id: pool.splice(this.rng.int(pool.length), 1)[0], lv: 1 });
  }
  /** a tick of the boss attack: the stream flies; every 3 s the boss shoots the wall (stronger every 30 s and every phase),
   *  burns, poison and the spirit tick; every minute it steps one row down and a choice of 3 skills comes */
  private bossTick(): void {
    const s = this.s, c = s.cfg, A = c.atk * (1 + s.power) * (1 + (c.rune?.allBalls ?? 0));
    this.flyTick();
    if ((s.phase as Phase) !== 'fly') return;
    const boss = s.enemies.find(e => e.kind === c.bossEv);
    if (!boss) { s.phase = 'lose'; return; }
    this.gearTick();
    s.bossT = (s.bossT ?? 0) + 1; s.stormT = (s.stormT ?? 0) + 1;
    if (s.bossT % BOSS_EV.shotEvery === 0) {
      const k = Math.pow(BOSS_EV.shotGrow, Math.floor(s.tick / STORM.wave)) * (1 + BOSS_EV.phaseShot * (s.bossPhase ?? 0));
      const dmg = Math.round(s.wallMax * BOSS_EV.shot * k);
      this.fx.push({ t: 'bossShot', x: boss.c + boss.w / 2, y: boss.r + boss.h });
      this.hurt(dmg, boss.c + boss.w / 2, 'rock', { x: boss.c + boss.w / 2, y: boss.r + boss.h });
      // burns and poison on the boss, its statuses, the spirit — every shot (3 s), like a turn
      if (boss.burnT > 0) { const d = A * BALL_FX.burn(this.lvOf('fire')) * boss.burnN * (1 + (c.rune?.dot ?? 0)); this.fx.push({ t: 'dot', x: boss.c + boss.w / 2, y: boss.r + boss.h / 2, dmg: Math.round(d), kind: 'burn' }); this.damage(boss, d, 'fire', false, 'burn'); boss.burnT--; if (boss.burnT <= 0) boss.burnN = 0; }
      if (boss.poisonT > 0) { const d = A * BALL_FX.poison(this.lvOf('poison')) * boss.poisonN * (1 + (c.rune?.dot ?? 0)); this.fx.push({ t: 'dot', x: boss.c + boss.w / 2, y: boss.r + boss.h / 2, dmg: Math.round(d), kind: 'poison' }); this.damage(boss, d, 'poison', false, 'poison'); boss.poisonT--; if (boss.poisonT <= 0) boss.poisonN = 0; }
      if (boss.freeze > 0) boss.freeze--; if (boss.wet > 0) boss.wet--; if (boss.curse > 0) boss.curse--;
      if (c.spirit) { s.spiritT++; if (s.spiritT >= spiritEvery(c.spirit.rarity)) { s.spiritT = 0; this.spiritAct(); } }
      s.healThisTurn = 0; // the 20% cap counts per shot (3 s) here
      if (c.wall.id === 'heal') this.wallHeal(s.wallMax * wallFx.heal(c.wall.rarity) * 0.5);
      if (this.checkEnd()) return;
    }
    if (s.bossT % BOSS_EV.stepEvery === 0) {
      boss.pr = boss.r; boss.pc = boss.c; s.stormT = 0;
      if (boss.r + boss.h + 1 > ROWS) { s.heroHp = 0; s.phase = 'lose'; return; } // it reached the wall — the end
      boss.r++;
      s.pendingLv++; this.fx.push({ t: 'level' });
    }
    if (s.pendingLv > 0) { s.phase = 'choose'; this.rollCards(); }
  }
  /** the balls the run owns now, minus those in the air or in the queue — a new ball from a card joins the stream */
  private stormRefill(): void {
    const s = this.s, have = new Map<string, number>();
    for (const k of [...s.queue, ...s.balls.filter(b => b.kind !== 'shard').map(b => b.kind)]) have.set(k, (have.get(k) ?? 0) + 1);
    for (const x of s.specials) if (!have.get(x.id)) s.queue.push(x.id);
    for (let i = have.get('normal') ?? 0; i < s.normals; i++) s.queue.push('normal');
  }
  /** seconds survived in the storm (the score) */
  get stormSec(): number { return Math.floor(this.s.tick / 60); }
  /** the storm's «Auto»: aim at the enemy closest to the wall (no copies of the battle — the stream never ends) */
  stormAim(): number {
    const s = this.s; let t: Enemy | undefined;
    for (const e of s.enemies) if (e.hp > 0 && (!t || e.r + e.h > t.r + t.h)) t = e;
    if (!t) return Math.round(-PI / 2 * 1000);
    const a = fatan2(t.r + t.h / 2 - (ROWS + LAUNCH_DY), t.c + t.w / 2 - COLS / 2);
    return Math.round(clamp(a, -PI + 0.12, -0.12) * 1000);
  }

  /** the best of N angles: each one is played on a copy of the battle, the one with the most damage wins
   *  (front rows count more — they are about to hit the wall). Deterministic: the copy does not touch this battle */
  bestAim(n = 25): number {
    let best = -PI / 2, bv = -1;
    for (let i = 0; i < n; i++) {
      const a = -PI + 0.14 + (PI - 0.28) * (i + 0.5) / n;
      const o = this.clone(); o.act({ aim: Math.round(a * 1000) });
      const before = new Map(o.s.enemies.map(e => [e.id, e.hp]));
      let guard = 0;
      while (o.s.phase === 'fly' && guard++ < 4000) o.step();
      let v = 0;
      for (const [id, hp0] of before) {
        const e = o.s.enemies.find(x => x.id === id) ?? this.s.enemies.find(x => x.id === id)!;
        const left = o.s.enemies.find(x => x.id === id)?.hp ?? 0;
        const lost = hp0 - Math.max(0, left);
        const w = 1 + 0.25 * (e.r + e.h) + (left <= 0 ? 0.6 * e.max / Math.max(1, hp0) : 0);
        v += lost / Math.max(1, e.max) * w * (ENEMY[e.kind].tier === 'boss' ? 2.5 : ENEMY[e.kind].tier === 'mini' ? 1.6 : 1);
      }
      if (v > bv) { bv = v; best = a; }
    }
    return Math.round(best * 1000);
  }

  hash(): string { const s = this.s; return [s.turn, s.kills, s.dealt, s.wallHp, s.heroHp, s.level, s.enemies.length, this.rng.state()].join(':'); }
  get progress(): number { const s = this.s; return Math.min(1, (s.spawned + (s.bossDead ? 1 : 0)) / (s.sd.turns + 1)); }
}

/** replays a battle from its actions (for checks) */
export function replayOrb(cfg: OrbConfig, acts: Act[]): Orb {
  const o = new Orb(cfg);
  if (cfg.storm) { // Ш98: every act at its tick, then to the end
    for (const a of acts) { let g = 0; if (a.choice !== undefined || a.reroll) while (o.s.phase !== 'choose' && o.busy && g++ < 2e6) o.step(); else while (a.at !== undefined && o.s.tick < a.at && o.busy && g++ < 2e6) o.step(); o.act(a); }
    let g = 0; while (o.busy && g++ < 2e6) o.step();
    return o;
  }
  for (const a of acts) { o.act(a); let g = 0; while (o.busy && g++ < 20000) o.step(); }
  return o;
}
