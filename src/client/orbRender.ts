// Orb Defense: drawing the ball battle on Canvas 2D. The battle (core/orb.ts) knows only cells; here they become pixels.
// Layout (правки Ш28–Ш33): the biome picture fills the screen, the field of 9 columns stands on it, the wall with its
// walkway takes the bottom ~22% of the screen, the hero (3D, from behind) and the spirit stand on the walkway.
import { Orb, Fx, Enemy, Ball } from '../core/orb';
import { COLS, ROWS, BALL_R, ENEMY_T, BALLS, ENEMY, BIOME_SET, lookOf, SPIRITS } from '../core/orbContent';
import { WALL_ART, EN_ART } from './orbArt';
import { drawHero3D } from './hero3d';
import { fcos, fsin } from '../core/fmath';
import { ORB_HERO_ART, HERO_POSE_H } from './orbHeroArt';
import { HEROES } from '../core/content';
import { EL_HEX } from './art';

const imgs = new Map<string, HTMLImageElement>();
export function orbImg(src: string): HTMLImageElement | null {
  let im = imgs.get(src);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = src; imgs.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
export function preloadOrb(o: Orb): void {
  const s = o.s, set = BIOME_SET[s.sd.biome];
  orbImg(`orb/bg/${s.sd.biome}.webp`); orbImg(wallSrc(o));
  for (const k of Object.keys(EN_ART)) if (k.startsWith(set + '_')) orbImg(`orb/en/${k}.webp`);
  if (s.cfg.spirit) orbImg(`orb/spirit/${s.cfg.spirit.id}${lookOf(s.cfg.spirit.rarity)}b.webp`);
  for (const k of Object.keys(ORB_HERO_ART[s.cfg.heroId] ?? {})) orbImg(`orb/hero/${s.cfg.heroId}_${k}.webp`); // Ш58
}
function wallKey(o: Orb): string { const w = o.s.cfg.wall; return w.id === 'start' ? 'start' : w.id + lookOf(w.rarity); }
function wallSrc(o: Orb): string { return `orb/wall/${wallKey(o)}.webp`; }

interface Txt { x: number; y: number; s: string; c: string; age: number; life: number; big: boolean; vy: number }
interface Flash { t: string; age: number; life: number; a: number; b: number; c: number; d: number; col: string }
interface Puff { x: number; y: number; vx: number; vy: number; age: number; life: number; r: number; col: string }

export class OrbRenderer {
  private c: CanvasRenderingContext2D;
  W = 0; H = 0; dpr = 1; dprCap = 2;
  cell = 40; fx0 = 0; fy0 = 0; wallY = 0;
  private texts: Txt[] = [];
  private flashes: Flash[] = [];
  private puffs: Puff[] = [];
  private shake = 0; private wallRed = 0; private heroRed = 0;
  private t = 0;
  aimAt: number | null = null; // angle while the finger aims
  constructor(private cv: HTMLCanvasElement) { this.c = cv.getContext('2d')!; }
  resize(): void {
    this.dpr = Math.min(this.dprCap, window.devicePixelRatio || 1);
    this.W = this.cv.clientWidth || window.innerWidth; this.H = this.cv.clientHeight || window.innerHeight;
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
    // правка Ш43: the wall line at 83% of the screen (was 78.5%); the field above it up to the HUD (≈ 12%)
    this.wallY = Math.round(this.H * 0.83);
    const top = Math.max(92, this.H * 0.12);
    this.cell = Math.min(this.W / COLS, (this.wallY - top) / ROWS);
    this.fx0 = (this.W - this.cell * COLS) / 2; this.fy0 = this.wallY - this.cell * ROWS;
  }
  /** screen point of a field point (cells) */
  px(x: number): number { return this.fx0 + x * this.cell; }
  py(y: number): number { return this.fy0 + y * this.cell; }
  launch(): { x: number; y: number } { return { x: this.px(COLS / 2), y: this.py(ROWS - 0.05) }; }

  addFx(o: Orb, fx: Fx[]): void {
    const C = this.cell;
    for (const f of fx) switch (f.t) {
      case 'hit': {
        const col = f.crit ? '#ff4a3a' : f.kind === 'normal' ? '#ffffff' : BALLS[f.kind as keyof typeof BALLS]?.glow ?? '#fff';
        this.text(f.x, f.y - 0.2, fmtN(f.dmg), col, f.crit);
        this.burst(f.x, f.y, f.crit ? 7 : 4, BALLS[f.kind as keyof typeof BALLS]?.color ?? '#fff6d0', 0.6);
        break;
      }
      case 'die': {
        const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
        this.burst(cx, cy, 14 + 6 * f.w * f.h, '#f4e6c2', 1.6 * Math.max(f.w, f.h));
        this.burst(cx, cy, 6, '#ffd36a', 1);
        break;
      }
      case 'beam': this.flashes.push({ t: 'beam', age: 0, life: 0.35, a: f.dir === 'row' ? 1 : 0, b: f.at, c: f.from, d: 0, col: f.color }); break;
      case 'chain': this.flashes.push({ t: 'chain', age: 0, life: 0.3, a: f.x1, b: f.y1, c: f.x2, d: f.y2, col: '#fff6a0' }); break;
      case 'quake': this.flashes.push({ t: 'quake', age: 0, life: 0.45, a: f.c + 0.5, b: f.r + 0.5, c: 0, d: 0, col: '#ffd29a' }); this.shake = Math.max(this.shake, 0.18); break;
      case 'dot': this.text(f.x + 0.25, f.y - 0.35, fmtN(f.dmg), f.kind === 'burn' ? '#ffa04a' : '#9cff6a', false); break;
      case 'wall': this.wallRed = 0.35; this.shake = Math.max(this.shake, f.kind === 'rock' ? 0.3 : 0.12); this.text(f.c, ROWS + 0.35, '-' + fmtN(f.dmg), '#ff6a5a', f.kind === 'rock'); this.burst(f.c, ROWS - 0.1, 5, '#cfc2a8', 0.8); break;
      case 'hero': this.heroRed = 0.4; this.flashes.push({ t: 'shot', age: 0, life: 0.35, a: f.from.x, b: f.from.y, c: COLS / 2, d: ROWS + 1.4, col: '#ff7a3a' }); this.text(COLS / 2, ROWS + 1.2, '-' + fmtN(f.dmg), '#ff4a3a', true); break;
      case 'spirit': {
        const col = SPIRITS[f.id].color;
        for (const tg of f.targets) this.flashes.push({ t: 'spirit', age: 0, life: 0.5, a: 1.55, b: ROWS + 1.2, c: tg.x, d: tg.y, col });
        if (f.id === 'healer') this.burst(COLS / 2, ROWS + 0.6, 16, col, 1.5);
        break;
      }
      case 'heal': this.text(f.x, f.y - 0.3, '+' + fmtN(f.amt), '#7be07a', false); break;
      case 'wallHeal': this.text(COLS / 2 + 2.6, ROWS + 0.45, '+' + fmtN(f.amt), '#7be07a', false); break;
      case 'counter': this.burst(f.x, f.y, 6, '#ff6a3a', 0.8); break;
      case 'freeze': this.burst(f.x, f.y, 6, '#bff0ff', 0.8); break;
      case 'shard': this.burst(f.x, f.y, 4, '#ffffff', 0.5); break;
      case 'thorn': this.burst(f.c + 0.5, f.r + 0.5, 6, '#7bdc6a', 0.7); break;
      case 'summon': this.burst(f.x, f.y, 10, '#ffe08a', 1); break;
      default: break;
    }
    void C; void o;
  }
  private text(x: number, y: number, s: string, c: string, big: boolean): void {
    this.texts.push({ x, y, s, c, age: 0, life: big ? 1.0 : 0.75, big, vy: -0.9 });
    if (this.texts.length > 60) this.texts.shift();
  }
  private burst(x: number, y: number, n: number, col: string, spread: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (0.6 + Math.random()) * spread;
      this.puffs.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.5, age: 0, life: 0.35 + Math.random() * 0.35, r: 0.04 + Math.random() * 0.06, col });
    }
    if (this.puffs.length > 400) this.puffs.splice(0, this.puffs.length - 400);
  }

  draw(o: Orb, dt: number): void {
    const c = this.c, s = o.s, C = this.cell;
    this.t += dt;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // screen shake
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const k = this.shake * 18; sx = (Math.random() - 0.5) * k; sy = (Math.random() - 0.5) * k; }
    c.save(); c.translate(sx, sy);
    this.drawBg(o);
    this.drawGrid(o);
    // thorn bushes
    for (const b of s.bushes) this.drawBush(b.c, b.r, b.t);
    // enemies (interpolated during the enemy step)
    const k = s.phase === 'enemy' ? ease(Math.min(1, s.phaseT / (ENEMY_T * 0.8))) : 1;
    const ens = [...s.enemies].sort((a, b) => (a.r + a.h) - (b.r + b.h));
    for (const e of ens) if (e.hp > 0) this.drawEnemy(o, e, k);
    this.drawWall(o);
    this.drawSpirit(o);
    this.drawHero(o);
    // the aim line
    if (s.phase === 'aim' && this.aimAt !== null) this.drawAim(o, this.aimAt);
    for (const b of s.balls) this.drawBall(b);
    // waiting balls on the walkway: a small counter at the hero's feet
    if (s.phase === 'fly' && s.queue.length) {
      const L = this.launch();
      c.font = `700 ${Math.round(C * 0.32)}px Georgia, serif`; c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillText('×' + s.queue.length, L.x + 1, L.y + C * 0.55 + 1); c.fillStyle = '#fff3c4'; c.fillText('×' + s.queue.length, L.x, L.y + C * 0.55);
    }
    this.drawFx(dt);
    c.restore();
    if (this.wallRed > 0) this.wallRed -= dt;
    if (this.heroRed > 0) this.heroRed -= dt;
  }

  private drawBg(o: Orb): void {
    const c = this.c, im = orbImg(`orb/bg/${o.s.sd.biome}.webp`);
    c.fillStyle = '#16131c'; c.fillRect(-20, -20, this.W + 40, this.H + 40);
    if (!im) return;
    // scale to cover the width; the field centre (the floor oval) sits at the field centre
    const sc = Math.max(this.W / im.naturalWidth, (this.wallY + this.cell) / im.naturalHeight);
    const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    const y = Math.min(0, (this.fy0 + this.wallY) / 2 - h * 0.5);
    c.drawImage(im, (this.W - w) / 2, y, w, h);
    // light floors are darkened a little so the white enemies read (риск читаемости из документа)
    const dim: Record<string, number> = { light: 0.22, air: 0.2, ice: 0.16, water: 0.1, earth: 0.06 };
    const d = dim[o.s.sd.biome] ?? 0;
    if (d) { c.fillStyle = `rgba(20,16,28,${d})`; c.fillRect(this.fx0, this.fy0, this.cell * COLS, this.cell * ROWS); }
    // a soft dark band under the HUD
    const g = c.createLinearGradient(0, 0, 0, this.fy0 + 10);
    g.addColorStop(0, 'rgba(10,8,14,.75)'); g.addColorStop(1, 'rgba(10,8,14,0)');
    c.fillStyle = g; c.fillRect(0, 0, this.W, this.fy0 + 10);
  }
  private drawGrid(o: Orb): void {
    const c = this.c, C = this.cell;
    const dark = ['fire', 'poison', 'dark', 'lightning'].includes(o.s.sd.biome);
    c.save();
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const edge = Math.min(1, (r + 1) / 2.5); // fades away towards the top
      if ((r + q) % 2 === 0) { c.fillStyle = dark ? `rgba(255,240,220,${0.05 * edge})` : `rgba(30,20,10,${0.085 * edge})`; c.fillRect(this.px(q), this.py(r), C, C); }
    }
    c.strokeStyle = dark ? 'rgba(255,245,225,.16)' : 'rgba(40,28,14,.18)'; c.lineWidth = 1;
    c.beginPath();
    for (let q = 1; q < COLS; q++) { c.moveTo(this.px(q) + 0.5, this.py(0.8)); c.lineTo(this.px(q) + 0.5, this.wallY); }
    for (let r = 1; r < ROWS; r++) { c.moveTo(this.fx0, this.py(r) + 0.5); c.lineTo(this.fx0 + C * COLS, this.py(r) + 0.5); }
    c.stroke();
    // the row in front of the wall: a red hint, enemies hit the wall from here
    const g = c.createLinearGradient(0, this.py(ROWS - 1), 0, this.wallY);
    g.addColorStop(0, 'rgba(255,40,30,0)'); g.addColorStop(1, 'rgba(255,40,30,.16)');
    c.fillStyle = g; c.fillRect(this.fx0, this.py(ROWS - 1), C * COLS, C);
    c.restore();
  }
  private drawBush(q: number, r: number, t: number): void {
    const c = this.c, C = this.cell, x = this.px(q + 0.5), y = this.py(r + 0.62);
    c.save(); c.globalAlpha = t >= 2 ? 1 : 0.7;
    c.fillStyle = '#2f6a2a'; c.strokeStyle = '#183814'; c.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42, l = C * (0.28 + 0.06 * (i % 2));
      c.beginPath(); c.moveTo(x - C * 0.08, y + C * 0.1); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.lineTo(x + C * 0.08, y + C * 0.1); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#5fd16a'; c.beginPath(); c.ellipse(x, y + C * 0.12, C * 0.24, C * 0.1, 0, 0, 6.283); c.fill();
    c.restore();
  }
  private drawEnemy(o: Orb, e: Enemy, k: number): void {
    const c = this.c, C = this.cell, set = BIOME_SET[o.s.sd.biome];
    const d = ENEMY[e.kind];
    const r = e.pr + (e.r - e.pr) * k, q = e.pc + (e.c - e.pc) * k;
    const born = e.pr === e.r && e.r === 0 && o.s.phase === 'enemy' ? k : 1;
    const x0 = this.px(q), y0 = this.py(r), w = e.w * C, h = e.h * C;
    const key = `${set}_${d.art}`;
    const im = orbImg(`orb/en/${key}.webp`);
    c.save();
    c.globalAlpha = born;
    // правка Ш41: the sprites have no pedestal and no painted bar — the game draws the shadow and the health bar
    const small = e.kind === 'smallslime' || e.kind === 'split3' ? 0.72 : 1;
    const bh = Math.max(4, C * 0.08), foot = y0 + h - bh - C * 0.1; // the feet stand just above the bar
    // the figure fills the cell: full width, and it may rise a little above the cell's top edge (as a body above its feet)
    const pad = C * 0.02;
    let iw = w * 0.7, ih = h * 0.7;
    if (im) {
      const sc = Math.min((w - 2 * pad) / im.naturalWidth, (foot - y0 + C * 0.1) / im.naturalHeight) * small;
      iw = im.naturalWidth * sc; ih = im.naturalHeight * sc;
    }
    const bob = d.tier === 'boss' ? Math.sin(this.t * 2 + e.id) * C * 0.02 : 0;
    const ix = x0 + (w - iw) / 2, iy = foot - ih + bob;
    // shadow under the feet
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x0 + w / 2, foot - C * 0.02, Math.min(w * 0.44, iw * 0.5), C * 0.1, 0, 0, 6.283); c.fill();
    if (im) {
      c.drawImage(im, ix, iy, iw, ih);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = born * e.flash / 12; c.drawImage(im, ix, iy, iw, ih); c.globalCompositeOperation = 'source-over'; c.globalAlpha = born; }
      if (e.freeze > 0) { c.fillStyle = 'rgba(150,220,255,.28)'; roundRect(c, ix, iy, iw, ih, C * 0.12); c.fill(); }
    } else { c.fillStyle = '#d9cfb8'; roundRect(c, ix, iy, iw, ih, C * 0.14); c.fill(); }
    // hp bar under the feet (and the boss shield above it)
    const bw = Math.min(w * 0.82, C * (e.w > 1 ? 1.8 : 0.82)), bx = x0 + (w - bw) / 2, by = foot + C * 0.04;
    c.fillStyle = 'rgba(20,10,8,.85)'; roundRect(c, bx - 1, by - 1, bw + 2, bh + 2, 2); c.fill();
    c.fillStyle = d.tier === 'boss' ? '#ff3a3a' : d.tier === 'mini' ? '#ff8a2a' : '#e8463a'; roundRect(c, bx, by, bw * Math.max(0, e.hp / e.max), bh, 2); c.fill();
    if (e.shieldMax > 0 && e.shield > 0) { c.fillStyle = '#7fd0ff'; roundRect(c, bx, by - bh - 2, bw * e.shield / e.shieldMax, bh, 2); c.fill(); }
    if (d.tier !== 'normal' || C > 34) {
      c.font = `700 ${Math.round(C * (d.tier === 'normal' ? 0.2 : 0.24))}px system-ui, sans-serif`; c.textAlign = 'center';
      const tx = fmtN(e.hp), ty = by - (e.shield > 0 ? bh + 4 : 3);
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(tx, x0 + w / 2, ty); c.fillStyle = '#fff'; c.fillText(tx, x0 + w / 2, ty);
    }
    // statuses: small marks at the top corner
    const marks: [string, string][] = [];
    if (e.burnT > 0) marks.push(['#ff7a2a', '🔥']);
    if (e.poisonT > 0) marks.push(['#7be04a', '☠']);
    if (e.wet > 0) marks.push(['#3aa8ff', '💧']);
    if (e.freeze > 0) marks.push(['#bff0ff', '❄']);
    if (e.curse > 0) marks.push(['#b07cff', '✦']);
    c.font = `${Math.round(C * 0.2)}px system-ui, sans-serif`;
    marks.forEach((m, i) => { c.fillStyle = m[0]; c.fillText(m[1], x0 + w - C * 0.14 - i * C * 0.2, y0 + C * 0.2); });
    c.restore();
  }
  private drawWall(o: Orb): void {
    const c = this.c, key = wallKey(o), a = WALL_ART[key], im = orbImg(wallSrc(o));
    // under the wall: the walkway colour, in case the picture is shorter than the screen
    c.fillStyle = '#2a2018'; c.fillRect(0, this.wallY, this.W, this.H - this.wallY + 20);
    if (!im || !a) return;
    const sc = this.W / a.w, y = this.wallY - a.solid * sc;
    c.drawImage(im, 0, y, this.W, a.h * sc);
    if (y + a.h * sc < this.H) { // a long phone: the last strip of the walkway is stretched to the bottom
      const sh = 40; c.drawImage(im, 0, a.h - sh, a.w, sh, 0, y + a.h * sc - 1, this.W, this.H - (y + a.h * sc) + 2);
    }
    if (this.wallRed > 0) { c.fillStyle = `rgba(255,30,20,${0.35 * this.wallRed})`; c.fillRect(0, y, this.W, a.solid * sc + this.cell * 0.4); }
    // energy shield: a glowing band over the parapet
    const s = o.s;
    if (s.wallShield > 0) {
      const t = 0.18 + 0.06 * Math.sin(this.t * 3);
      const g = c.createLinearGradient(0, this.wallY - this.cell * 0.9, 0, this.wallY);
      g.addColorStop(0, 'rgba(90,190,255,0)'); g.addColorStop(1, `rgba(120,210,255,${t + 0.25})`);
      c.fillStyle = g; c.fillRect(0, this.wallY - this.cell * 0.9, this.W, this.cell * 0.9);
    }
  }
  private deckY(): number { return this.wallY + (this.H - this.wallY) * 0.5; }
  private drawHero(o: Orb): void {
    const c = this.c, C = this.cell, s = o.s, x = this.W / 2, gy = this.deckY() + C * 0.15;
    const sc = (1.95 * C) / 140; // правка Ш43: the hero is 40% bigger than before (the cell itself grew ~26%)
    const aim = this.aimAt ?? s.aim, fx = fcos(aim), fy = fsin(aim);
    // a golden ring under the hero
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#ffd36a'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, gy, C * 0.55, C * 0.2, 0, 0, 6.283); c.stroke(); c.restore();
    if (this.heroRed > 0) c.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 40);
    const ok = ORB_HERO_ART[s.cfg.heroId] ? this.drawHero2D(o, x, gy, aim) : drawHero3D(c, s.cfg.heroId, x, gy, sc, { fx: fx * 0.2, fy: -1, t: this.t, moving: false, wx: x, wy: gy });
    c.globalAlpha = 1;
    if (!ok) { c.fillStyle = '#e8d6a8'; c.beginPath(); c.arc(x, gy - C * 0.6, C * 0.35, 0, 6.283); c.fill(); }
    // hero hp
    const bw = C * 1.6, bx = x - bw / 2, by = gy + C * 0.3, bh = Math.max(6, C * 0.11);
    c.fillStyle = 'rgba(20,10,8,.85)'; roundRect(c, bx - 2, by - 2, bw + 4, bh + 4, 4); c.fill();
    c.fillStyle = '#4ad66a'; roundRect(c, bx, by, bw * Math.max(0, s.heroHp / s.heroMax), bh, 3); c.fill();
  }
  private drawSpirit(o: Orb): void {
    const s = o.s; if (!s.cfg.spirit) return;
    const c = this.c, C = this.cell, sp = s.cfg.spirit, im = orbImg(`orb/spirit/${sp.id}${lookOf(sp.rarity)}b.webp`);
    const x = this.W * 0.22, y = this.deckY() - C * 0.35 + Math.sin(this.t * 2.2) * C * 0.08;
    const size = C * 1.11 * (0.95 + 0.18 * (lookOf(sp.rarity) - 1)); // правка Ш43: +40% with the bigger cell
    const col = SPIRITS[sp.id].color;
    // aura in the colour of the rarity
    const g = c.createRadialGradient(x, y + size * 0.35, 1, x, y + size * 0.35, size * 0.75);
    g.addColorStop(0, hexA(col, 0.45)); g.addColorStop(1, hexA(col, 0));
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y + size * 0.45, size * 0.75, size * 0.28, 0, 0, 6.283); c.fill();
    if (im) { const sc = size / Math.max(im.naturalWidth, im.naturalHeight); c.drawImage(im, x - im.naturalWidth * sc / 2, y - im.naturalHeight * sc / 2, im.naturalWidth * sc, im.naturalHeight * sc); }
    // turns until it acts: a ring with a number
    const left = Math.max(1, every(sp.rarity) - s.spiritT);
    const rx = x + size * 0.45, ry = y + size * 0.4, rr = C * 0.2;
    c.fillStyle = 'rgba(15,10,20,.85)'; c.beginPath(); c.arc(rx, ry, rr, 0, 6.283); c.fill();
    c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); c.arc(rx, ry, rr, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - (left - 1) / every(sp.rarity))); c.stroke();
    c.fillStyle = '#fff'; c.font = `700 ${Math.round(rr * 1.1)}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(left), rx, ry + 1); c.textBaseline = 'alphabetic';
  }
  /** Ш55, Ш56, Ш58: the drawn hero from behind — turns after the aim (up / diagonal / side, the left side mirrored, a small
   *  lean in between), a short cast pose on each volley, the weapon tip glows. 40% bigger than the 3D hero; over a bottom row
   *  with enemies it goes half see-through so the aim stays readable */
  private castT = -1;
  cast(): void { this.castT = this.t; }
  private drawHero2D(o: Orb, x: number, gy: number, aim: number): boolean {
    const c = this.c, C = this.cell, s = o.s, art = ORB_HERO_ART[s.cfg.heroId];
    const right = Math.cos(aim) >= 0, d = Math.abs(aim + Math.PI / 2);
    const pi = d < 0.45 ? 0 : d < 1.0 ? 1 : 2, nat = [0.22, 0.75, 1.25][pi];
    const casting = this.castT >= 0 && this.t - this.castT < 0.28;
    const key = (casting ? 'cast_' : 'idle_') + ['up', 'diag', 'side'][pi], P = art[key];
    const im = orbImg(`orb/hero/${s.cfg.heroId}_${key}.webp`);
    if (!im || !P) { orbImg(`orb/hero/${s.cfg.heroId}_idle_up.webp`); return false; }
    const k = (C * 2.48) / HERO_POSE_H /* Ш68: +50% */, w = P.w * k, h = P.h * k;
    const lean = Math.max(-0.12, Math.min(0.12, (d - nat) * 0.35)) * (right ? 1 : -1);
    const breath = casting ? 1 : 1 + 0.012 * Math.sin(this.t * 2.4);
    const low = s.enemies.some(e => e.hp > 0 && e.r + e.h >= ROWS - 0.01);
    // shadow at the feet
    c.save(); c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, gy, C * 0.42, C * 0.12, 0, 0, 6.283); c.fill(); c.restore();
    c.save();
    c.globalAlpha *= low ? 0.72 : 1;
    c.translate(x, gy); c.rotate(lean); c.scale(right ? 1 : -1, breath);
    c.drawImage(im, -P.fx * w, -P.fy * h, w, h);
    // the weapon tip: a soft pulse while aiming, a flash on the cast
    const el = HEROES.find(hd => hd.id === s.cfg.heroId)?.element, col = el ? EL_HEX[el] : '#fff3b0';
    const tx = (P.tx - P.fx) * w, ty = (P.ty - P.fy) * h, rr = C * (casting ? 0.55 : 0.28 + 0.05 * Math.sin(this.t * 5));
    const g = c.createRadialGradient(tx, ty, 0, tx, ty, rr);
    g.addColorStop(0, hexA('#ffffff', casting ? 0.95 : 0.6)); g.addColorStop(0.35, hexA(col, casting ? 0.7 : 0.4)); g.addColorStop(1, hexA(col, 0));
    c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(tx, ty, rr, 0, 6.283); c.fill();
    c.restore();
    return true;
  }
  private drawBall(b: Ball): void {
    const c = this.c, C = this.cell, x = this.px(b.x), y = this.py(b.y);
    const def = b.kind === 'normal' || b.kind === 'shard' ? null : BALLS[b.kind];
    const r = BALL_R * C * (b.kind === 'shard' ? 0.75 : 1.15); // Ш59: drawn smaller and crisper (the hit size is the same)
    const col = def?.color ?? '#f4f0e6', glow = def?.glow ?? '#ffffff';
    // trail
    const v = Math.hypot(b.vx, b.vy) || 1, tx = -b.vx / v, ty = -b.vy / v;
    const tl = r * (def ? 3.4 : 2.1);
    const g = c.createLinearGradient(x, y, x + tx * tl, y + ty * tl);
    g.addColorStop(0, hexA(glow, 0.5)); g.addColorStop(1, hexA(glow, 0));
    c.strokeStyle = g; c.lineWidth = r * 1.3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + tx * tl, y + ty * tl); c.stroke();
    // glow
    if (def) { const gg = c.createRadialGradient(x, y, r * 0.6, x, y, r * 1.7); gg.addColorStop(0, hexA(glow, 0.45)); gg.addColorStop(1, hexA(glow, 0)); c.fillStyle = gg; c.beginPath(); c.arc(x, y, r * 1.7, 0, 6.283); c.fill(); }
    // core
    const cg = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.35, glow); cg.addColorStop(1, col);
    c.fillStyle = cg; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
    c.strokeStyle = 'rgba(20,14,8,.85)'; c.lineWidth = 1.5; c.stroke();
    // a crisp highlight, top left
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.18, -0.6, 0, 6.283); c.fill();
    // a little mark of the element
    if (def) {
      c.save(); c.translate(x, y); c.rotate(this.t * 4);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1, r * 0.18);
      c.beginPath(); c.arc(0, 0, r * 0.55, 0, Math.PI * 0.9); c.stroke();
      c.restore();
    }
  }
  private drawAim(o: Orb, a: number): void {
    const c = this.c, C = this.cell, s = o.s;
    let x = COLS / 2, y = ROWS - 0.05, vx = fcos(a), vy = fsin(a);
    const pts: [number, number][] = [[x, y]];
    let bounces = 0, len = 0;
    while (len < 26 && bounces < 2) {
      x += vx * 0.05; y += vy * 0.05; len += 0.05;
      if (x < BALL_R || x > COLS - BALL_R) { vx = -vx; bounces++; pts.push([x, y]); }
      if (y < BALL_R) { vy = -vy; bounces++; pts.push([x, y]); }
      if (y > ROWS) break;
      const hit = s.enemies.find(e => x > e.c + 0.04 - BALL_R && x < e.c + e.w - 0.04 + BALL_R && y > e.r + 0.04 - BALL_R && y < e.r + e.h - 0.04 + BALL_R);
      if (hit) { pts.push([x, y]); bounces = 9; break; }
    }
    if (pts[pts.length - 1][0] !== x || pts[pts.length - 1][1] !== y) pts.push([x, y]);
    c.save();
    c.strokeStyle = 'rgba(255,248,220,.9)'; c.lineWidth = Math.max(2, C * 0.05); c.setLineDash([C * 0.12, C * 0.14]); c.lineDashOffset = -this.t * C * 0.6;
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 4;
    c.beginPath(); c.moveTo(this.px(pts[0][0]), this.py(pts[0][1])); for (const p of pts.slice(1)) c.lineTo(this.px(p[0]), this.py(p[1])); c.stroke();
    c.setLineDash([]);
    const [ex, ey] = pts[pts.length - 1];
    c.strokeStyle = '#fff6c8'; c.lineWidth = 2.5; c.beginPath(); c.arc(this.px(ex), this.py(ey), C * 0.16, 0, 6.283); c.stroke();
    c.restore();
  }
  private drawFx(dt: number): void {
    const c = this.c, C = this.cell;
    // lines: beams, chains, spirit rays, shots at the hero
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.age += dt; if (f.age >= f.life) { this.flashes.splice(i, 1); continue; }
      const k = 1 - f.age / f.life;
      c.save(); c.globalCompositeOperation = 'lighter';
      if (f.t === 'beam') {
        // Ш71: a thin white-blue beam that shoots out from the hit enemy both ways in 0.1 s, then fades
        const grow = Math.min(1, f.age / 0.1), fade = f.age < 0.1 ? 1 : Math.max(0, 1 - (f.age - 0.1) / (f.life - 0.1));
        const w = C * 0.17 * (0.6 + 0.4 * fade), len = (f.a ? COLS : ROWS) * grow;
        const lo = Math.max(0, f.c - len), hi = Math.min(f.a ? COLS : ROWS, f.c + len), mid = f.b + 0.5;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const [ww, col, al] of [[w * 1.6, '#7fd8ff', 0.3], [w, '#bfeaff', 0.8], [w * 0.38, '#ffffff', 1]] as [number, string, number][]) {
          c.fillStyle = hexA(col, al * fade);
          if (f.a) c.fillRect(this.px(lo), this.py(mid) - ww / 2, this.px(hi) - this.px(lo), ww); else c.fillRect(this.px(mid) - ww / 2, this.py(lo), ww, this.py(hi) - this.py(lo));
        }
        c.restore();
      } else if (f.t === 'chain' || f.t === 'spirit' || f.t === 'shot') {
        c.strokeStyle = hexA(f.col, 0.9 * k); c.lineWidth = f.t === 'chain' ? 3 : 2.5; c.shadowColor = f.col; c.shadowBlur = 10;
        c.beginPath(); c.moveTo(this.px(f.a), this.py(f.b));
        if (f.t === 'chain') { const n = 5; for (let j = 1; j < n; j++) { const t = j / n; c.lineTo(this.px(f.a + (f.c - f.a) * t) + (Math.random() - 0.5) * C * 0.3, this.py(f.b + (f.d - f.b) * t) + (Math.random() - 0.5) * C * 0.3); } }
        c.lineTo(this.px(f.c), this.py(f.d)); c.stroke();
      } else if (f.t === 'quake') {
        const R = C * (0.4 + 1.6 * (1 - k));
        c.strokeStyle = hexA(f.col, 0.8 * k); c.lineWidth = C * 0.12 * k + 1;
        c.beginPath(); c.ellipse(this.px(f.a), this.py(f.b), R, R * 0.85, 0, 0, 6.283); c.stroke();
        c.fillStyle = hexA(f.col, 0.18 * k); c.fillRect(this.px(f.a - 1.5), this.py(f.b - 1.5), C * 3, C * 3);
      }
      c.restore();
    }
    // particles
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i]; p.age += dt; if (p.age >= p.life) { this.puffs.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 2.5 * dt;
      const k = 1 - p.age / p.life;
      c.fillStyle = hexA(p.col, 0.85 * k); c.beginPath(); c.arc(this.px(p.x), this.py(p.y), C * p.r * (0.6 + 0.4 * k), 0, 6.283); c.fill();
    }
    c.restore();
    // floating numbers
    c.save(); c.textAlign = 'center';
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]; t.age += dt; if (t.age >= t.life) { this.texts.splice(i, 1); continue; }
      t.y += t.vy * dt; t.vy *= 0.94;
      const k = t.age / t.life, sz = C * (t.big ? 0.42 : 0.28) * (t.age < 0.08 ? 1.3 : 1);
      c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      c.font = `900 ${Math.round(sz)}px system-ui, sans-serif`;
      c.lineWidth = Math.max(2, sz * 0.18); c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(t.s, this.px(t.x), this.py(t.y));
      c.fillStyle = t.c; c.fillText(t.s, this.px(t.x), this.py(t.y));
    }
    c.restore();
  }
}

const every = (r: number) => r >= 9 ? 1 : r >= 6 ? 2 : r >= 3 ? 3 : r >= 1 ? 4 : 5;
function ease(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
export function fmtN(n: number): string { n = Math.round(n); return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K' : String(n); }
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (w <= 0 || h <= 0) { c.beginPath(); return; }
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
