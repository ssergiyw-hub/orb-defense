// Pseudo-3D renderer (camera above and slightly to the side, like Brawl Stars).
// The simulation stays a flat top-down plane; only drawing changes:
//  - the ground is squashed vertically by K, so circles on the floor become ellipses;
//  - characters, rocks and bushes stand upright, with a shadow on the floor;
//  - everything upright is drawn from back to front (sorted by y).
// Kept separate from the simulation so it can be swapped for PixiJS later.
import { Match, Fx, Enemy, isBoss } from '../core/sim';
import { AURA, Element, ORBS, RUN, SkillId, WALL, WALL_MAPS, FRAGS, BOSS_EV, BIOMES } from '../core/content';
import { drawBear3D } from './bear3d';
import { tr } from './i18n';
import { drawHero3D, has3D, weaponTip3D } from './hero3d';
import { drawHero, drawMonster, drawObstacle, hasHeroImg, HERO_IMG_H, heroWeaponPoint, drawBush, drawBoneArrow } from './art';
const HERO_S = 0.65; // hero drawing scale (was 1.08)

const K = 0.72; // vertical squash of the floor
/** wall map: where the wall stands on the screen (share of the height from the top) */
export const WALL_SCREEN_Y = 0.82;
/** wall map pictures (Meshy): the wall with the gate and a background for each map of the day */
const wallPics = new Map<string, HTMLImageElement>();
export function wallPic(name: string): HTMLImageElement {
  let im = wallPics.get(name);
  if (!im) { im = new Image(); im.src = `wall/${name}.webp`; wallPics.set(name, im); }
  return im;
}
export function preloadWall(mapIdx: number): void { wallPic('wall'); wallPic('bg_' + WALL_MAPS[mapIdx].id); }
/** правки 125, 126: event arena floors, one per map of the day */
const evPics = new Map<string, HTMLImageElement>();
export function evPic(id: string): HTMLImageElement {
  let im = evPics.get(id);
  if (!im) { im = new Image(); im.src = `ev/${id}.webp`; evPics.set(id, im); }
  return im;
}
// правка 167: полы этапов — нарисованные плитки (Meshy) по биомам вместо ровной заливки
const FLOOR_IDS = ['desert', 'meadow', 'forest', 'swamp', 'grave', 'mount'];
const FLOOR_TILE = 560; // world units per tile
const floorPics = new Map<string, HTMLImageElement>();
export function floorPic(id: string): HTMLImageElement {
  let im = floorPics.get(id);
  if (!im) { im = new Image(); im.src = `floors/${id}.webp`; floorPics.set(id, im); }
  return im;
}
export function preloadFloors(): void { for (const id of FLOOR_IDS) void floorPic(id).decode?.().catch(() => {}); }
/** event arenas are bigger than the screen and the bear charges from afar: the camera shows more */
const EV_VIEW = 600;
/** правка 137: a block of the stone ring: inner edge a→b, outer edge o→p (floor coordinates) */
interface EvBlock { a: number[]; b: number[]; o: number[]; p: number[]; far: boolean; near: boolean; tone: number; chip: number; moss: number; key: number; mx: number; my: number }
interface EvRing { blocks: EvBlock[]; pillars: { x: number; y: number }[]; T: number }

// ---- правка 132: event arenas look like the stages: a low stone wall, the same ground outside, rare bushes, trees and rocks ----
/** average colour of the floor of the day (the ground beyond the wall), worked out once per picture */
const floorAvg = new Map<string, string>();
function floorColour(id: string, fallback: string): string {
  let v = floorAvg.get(id); if (v) return v;
  const im = evPic(id); if (!im.complete || !im.naturalWidth) return fallback;
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 16; const x = cv.getContext('2d')!; x.drawImage(im, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4, k = 0.82; v = `rgb(${Math.round(r / n * k)},${Math.round(g / n * k)},${Math.round(b / n * k)})`;
  } catch { v = fallback; } // a page opened from a file cannot read pixels
  floorAvg.set(id, v); return v;
}
const LAUNCH = 0.14; // seconds a fresh shot takes to leave the weapon

const EL_COLOR: Record<Element | 'enemy', string> = {
  fire: '#ff7a2f', ice: '#7fd6ff', nature: '#5fbf4a', light: '#ffe45c', dark: '#8a5cd6',
  lightning: '#c9f0ff', water: '#3d8fe0', phys: '#d0d0d0', air: '#e8f6ff', poison: '#9be04a', enemy: '#ff5040',
};

/** bright bolt colours per element (hex, alpha is appended) */
/** darker edge colour for a #rrggbb colour */
function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.round(v * 0.45).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}
const BOLT: Partial<Record<Element, string>> = {
  fire: '#ff8a2a', ice: '#5fd0ff', nature: '#6fe04a', light: '#ffe45c', dark: '#b46cff',
  lightning: '#4a9dff', water: '#3d8fe0', air: '#9fe8ff', poison: '#9be04a', phys: '#4a9dff',
};

const ENEMY_COLOR: Record<string, [string, string]> = {
  grunt: ['#d65c4b', '#6e241b'], fast: ['#e8a33d', '#734a0f'], tank: ['#8a6a5a', '#3a291f'],
  shooter: ['#5a8ad6', '#1d3864'], tank2: ['#6f7f8c', '#29323a'], exploder: ['#e04a7a', '#651a33'],
  summoner: ['#9b5cd6', '#401d63'], miniboss: ['#b0302a', '#420f0d'], goldboss: ['#ffd23a', '#7d6000'],
  boss: ['#6a2a7d', '#1e0726'],
};

interface Anim { fx: Fx; t: number; life: number }
interface Drawable { y: number; draw: () => void }

/** правка 194: size of the hero's bolt on screen (body, glow, tail, muzzle flash); the hit radius does not change */
const ARROW_LOOK = 0.8;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private anims: Anim[] = [];
  private shake = 0;
  private clock = 0;
  private shotCount = 0;
  private bushSway: number[] = []; private bushIn: boolean[] = []; private trails = new Map<number, number[]>(); private trailM: Match | null = null;
  private hpM: Match | null = null; private hpLast = 0; private hpLag = 1; private hurtT = 0; private lastClock = 0;
  viewW = 460; // world units across the screen width
  private bgCv: HTMLCanvasElement | null = null; private bgKey = '';
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  /** правка 120: the most canvas pixels per CSS pixel (quality setting) */
  dprCap = 2;
  resize(): void {
    const dpr = Math.min(this.dprCap, window.devicePixelRatio || 1);
    this.bgKey = '';
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
  }

  addFx(list: Fx[]): void {
    for (const f of list) {
      if (f.t === 'stage') continue;
      const life = f.t === 'text' ? 0.7 : f.t === 'line' ? 0.15 : f.t === 'beam' ? 0.2 : f.t === 'pulse' ? 0.5 : 0.3;
      this.anims.push({ fx: f, t: 0, life });
      if (f.t === 'boom' && f.c === 'enemy') this.shake = 0.2;
    }
    if (this.anims.length > 300) this.anims.splice(0, this.anims.length - 300);
  }

  draw(m: Match, a: number, dt: number): void {
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const s = W / (m.wall ? WALL.fieldW + 24 : m.ev ? EV_VIEW : this.viewW);
    this.clock += dt;
    this.shotCount = m.shots.length; this.bearM = m;
    const bi = m.wmap ? m.wmap.style : m.biome.style, ob = m.wmap ? (m.wmap.style ? 1 : 2) : m.biome.name === 'Пустыня' ? 0 : m.biome.style ? 1 : 2; // ob: look of rocks and bushes
    const lerp = (p: number, q: number) => p + (q - p) * a;
    const hx = lerp(m.px, m.x), hy = lerp(m.py, m.y); // the hero
    let shx = 0, shy = 0;
    if (this.shake > 0) { this.shake -= dt; shx = (Math.random() - 0.5) * 6; shy = (Math.random() - 0.5) * 6; }
    const offY = H * 0.06; // player a bit below centre: more room to see what comes
    // правка 112: on the wall the camera stands still — the whole width of the field, the wall low on the screen
    const camX = m.wall ? WALL.fieldW / 2 : hx, camY = m.wall ? WALL.wallY - (H * WALL_SCREEN_Y - H / 2 - offY) / (K * s) : hy;
    if (m.wall) shx = shy = 0;
    const wb = ob === 0 ? 0 : 1; // sandy or grey stones
    const tx = W / 2 - camX * s + shx, ty = H / 2 + offY - camY * K * s + shy;
    const ground = () => c.setTransform(s, 0, 0, s * K, tx, ty);   // floor: y squashed
    const upright = () => c.setTransform(s, 0, 0, s, tx, ty);      // standing things: draw at (x, y*K - z)

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#262626';
    c.fillRect(0, 0, W, H);

    const vw = W / s, vh = H / s / K;
    const x0 = camX - vw / 2 - 80, x1 = camX + vw / 2 + 80;
    const y0 = camY - vh / 2 - offY / s / K - 120, y1 = camY + vh / 2 + 120;
    const vis = (x: number, y: number) => x > x0 && x < x1 && y > y0 && y < y1;

    // ---------- floor ----------
    const A = RUN.arena, T = 34;
    if (m.wall) this.wallFloor(m, W, H);
    ground();
    const decor: { x: number; y: number; kind: number }[] = [];
    const outside: { x: number; y: number; kind: number; r: number }[] = [];
    if (m.ev) this.evFloor(m, x0, y0, x1, y1);
    if (!m.wall && !m.ev) {
    // the land goes on beyond the wall: same ground, a little darker
    const fid = FLOOR_IDS[Math.max(0, BIOMES.indexOf(m.biome)) % FLOOR_IDS.length], fim = floorPic(fid);
    const tex = fim.complete && fim.naturalWidth > 0;
    if (tex) {
      if (this.floorKey !== fid || !this.floorPat) { this.floorPat = c.createPattern(fim, 'repeat'); this.floorKey = fid; this.floorPat?.setTransform(new DOMMatrix().scaleSelf(FLOOR_TILE / fim.naturalWidth)); }
      c.fillStyle = this.floorPat ?? m.biome.ground;
    } else c.fillStyle = m.biome.ground;
    c.fillRect(x0 - 200, y0 - 200, x1 - x0 + 400, y1 - y0 + 400);
    c.fillStyle = m.biome.detail;
    const g = 80;
    for (let gx = Math.floor(x0 / g) * g; gx < x1; gx += g) for (let gy = Math.floor(y0 / g) * g; gy < y1; gy += g) {
      const h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
      const inA = gx >= 0 && gy >= 0 && gx < A - 40 && gy < A - 40;
      const out = gx < -T - 80 || gy < -T - 90 || gx >= A + T + 20 || gy >= A + T + 20;
      if (!inA && !out) continue; // keep the wall band clear
      if (!tex && h % 5 === 0) { c.beginPath(); c.arc(gx + (h % 37), gy + (h % 53), 3 + (h % 7), 0, 6.283); c.fill(); }
      if (h % 29 === 0) decor.push({ x: gx + 20 + (h % 30), y: gy + 30, kind: h % 3 });
      if (out && h % 7 === 2) outside.push({ x: gx + 15 + (h % 50), y: gy + 15 + ((h >> 5) % 50), kind: [0, 1, 2, 0, 2][(h >> 3) % 5], r: 22 + (h % 14) });
      if (!tex && h % 7 === 3) { // flowers on the meadow, pebbles in the desert (the painted floors have their own)
        const fx = gx + 10 + (h % 61), fy = gy + 8 + ((h >> 6) % 61);
        if (bi === 1) { const cols = ['#ff7aa0', '#ffe14a', '#ffffff', '#b88aff']; for (let i = 0; i < 3; i++) { c.fillStyle = cols[(h >> (i + 3)) % 4]; c.beginPath(); c.arc(fx + i * 6 - 6, fy + (i % 2) * 4, 2.6, 0, 6.283); c.fill(); } }
        else { c.fillStyle = '#b89a66'; c.beginPath(); c.ellipse(fx, fy, 4 + (h % 3), 3, 0, 0, 6.283); c.fill(); c.fillStyle = '#d8c290'; c.beginPath(); c.ellipse(fx - 1, fy - 1, 2, 1.2, 0, 0, 6.283); c.fill(); }
        c.fillStyle = m.biome.detail;
      }
    }
    // outside the arena is a bit darker, so the play area reads at once
    c.fillStyle = 'rgba(20,14,8,0.28)';
    const dark = (xa: number, ya: number, xb: number, yb: number) => { if (xb > xa && yb > ya) c.fillRect(xa, ya, xb - xa, yb - ya); };
    const X0 = x0 - 200, X1 = x1 + 200, Y0 = y0 - 200, Y1 = y1 + 200;
    dark(X0, Y0, X1, Math.min(Y1, -T)); dark(X0, Math.max(Y0, A + T), X1, Y1);
    dark(X0, Math.max(Y0, -T), Math.min(X1, -T), Math.min(Y1, A + T)); dark(Math.max(X0, A + T), Math.max(Y0, -T), X1, Math.min(Y1, A + T));
    // soft shadow of the wall on the arena floor
    const sh = 26;
    for (const [gx0, gy0, gx1, gy1, rx, ry, rw, rh] of [[0, 0, 0, sh, 0, 0, A, sh], [0, A, 0, A - sh, 0, A - sh, A, sh], [0, 0, sh, 0, 0, 0, sh, A], [A, 0, A - sh, 0, A - sh, 0, sh, A]]) {
      const gr = c.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(rx, ry, rw, rh);
    }
    // top of the low stone wall on the west, east and south sides
    this.wallTop(wb, A, T, x0, x1, y0, y1);
    } // not the wall map
    // swamps (meadow) and quicksand (desert): clearly darker, with moving ripples
    for (const w of m.swamps) {
      if (!vis(w.x, w.y) && !vis(w.x + w.r, w.y) && !vis(w.x - w.r, w.y) && !vis(w.x, w.y - w.r) && !vis(w.x, w.y + w.r)) continue;
      const [edge, mid, rip] = wb === 0 ? ['#a8834a', '#c29a5a', 'rgba(255,240,200,0.35)'] : ['#2f4a26', '#3f5f30', 'rgba(170,220,140,0.35)'];
      c.globalAlpha = 0.82; // правка 167: болото полупрозрачное — сквозь него виден нарисованный пол
      c.fillStyle = edge; c.beginPath(); c.arc(w.x, w.y, w.r, 0, 6.283); c.fill();
      c.fillStyle = mid; c.beginPath(); c.arc(w.x, w.y, w.r * 0.86, 0, 6.283); c.fill();
      c.globalAlpha = 1;
      c.strokeStyle = rip; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const k = ((this.clock * 0.35 + i / 3) % 1); c.globalAlpha = 1 - k; c.beginPath(); c.arc(w.x + Math.sin(i * 2.1) * w.r * 0.3, w.y + Math.cos(i * 1.7) * w.r * 0.3, w.r * 0.15 + k * w.r * 0.45, 0, 6.283); c.stroke(); }
      c.globalAlpha = 1;
      if (bi === 1) { c.fillStyle = '#5f8a3a'; for (let i = 0; i < 4; i++) { const a = i * 1.6 + w.x; c.beginPath(); c.ellipse(w.x + Math.cos(a) * w.r * 0.55, w.y + Math.sin(a) * w.r * 0.55, 9, 6, 0, 0, 6.283); c.fill(); } }
    }
    if (m.bearAtk) this.bearZone(m);
    // pools
    for (const p of m.pools) {
      if (p.life <= 0 || !vis(p.x, p.y)) continue;
      c.globalAlpha = Math.min(0.45, p.life);
      c.fillStyle = EL_COLOR[p.elem]; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
      c.globalAlpha = 1;
    }
    // orbit of the dark spheres: a faint ring on the floor
    const RING: Record<string, string> = { darkOrbs: 'rgba(160,110,255,0.22)', fireOrbs: 'rgba(255,130,40,0.2)', iceOrbs: 'rgba(140,220,255,0.22)', boltOrbs: 'rgba(255,235,110,0.2)' };
    for (const id of Object.keys(ORBS) as SkillId[]) if (m.lvl(id) > 0) {
      const R = ORBS[id]!.R; c.strokeStyle = RING[id]; c.lineWidth = 5; c.beginPath();
      if (m.wall) c.ellipse(hx, hy - R * 0.8, R * 0.85, R * 1.45, 0, 0, 6.283); else c.arc(hx, hy, R, 0, 6.283);
      c.stroke();
    }
    // bark shield ready (gear: Кора): a ring of leaves on the floor
    if (m.shieldUp()) {
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * 3);
      c.strokeStyle = `rgba(150,220,90,${0.35 + 0.25 * pulse})`; c.lineWidth = 3; c.setLineDash([10, 7]); c.lineDashOffset = this.clock * 12;
      c.beginPath(); c.arc(hx, hy, 26, 0, 6.283); c.stroke(); c.setLineDash([]);
    }
    // meteors on their way: a warning circle where they will land
    for (const sh of m.shots) if (sh.kind === 'meteor' && sh.life > 0 && vis(sh.x, sh.y)) {
      const k = 1 - sh.life / 0.7;
      c.fillStyle = `rgba(255,90,30,${0.08 + 0.14 * k})`; c.beginPath(); c.arc(sh.x, sh.y, sh.tx, 0, 6.283); c.fill();
      c.strokeStyle = `rgba(255,160,60,${0.5 + 0.4 * k})`; c.lineWidth = 3; c.beginPath(); c.arc(sh.x, sh.y, sh.tx * (0.35 + 0.65 * k), 0, 6.283); c.stroke();
    }
    // auras around the hero (the pickup circle is not shown)
    const na = m.lvl('natureAura'), pa = m.lvl('poisonAura');
    if (m.wall) this.auraStrips(m);
    else {
    const camX = hx, camY = hy;
    if (pa > 0) {
      const r = m.auraR('poisonAura');
      const g = c.createRadialGradient(camX, camY, r * 0.2, camX, camY, r);
      g.addColorStop(0, 'rgba(120,200,60,0.05)'); g.addColorStop(0.75, 'rgba(110,190,50,0.2)'); g.addColorStop(1, 'rgba(140,60,200,0.05)');
      c.fillStyle = g; c.beginPath(); c.arc(camX, camY, r, 0, 6.283); c.fill();
      for (let i = 0; i < 10; i++) { // swirling puffs
        const a = this.clock * 0.8 + i * 0.628, rr = r * (0.55 + 0.35 * ((i * 37) % 10) / 10), pr = 10 + 6 * Math.sin(this.clock * 2 + i);
        c.fillStyle = i % 3 === 0 ? 'rgba(150,80,210,0.22)' : 'rgba(120,210,60,0.22)';
        c.beginPath(); c.arc(camX + Math.cos(a) * rr, camY + Math.sin(a) * rr, pr, 0, 6.283); c.fill();
      }
    }
    if (na > 0) {
      const r = m.auraR('natureAura'), pulse = 0.5 + 0.5 * Math.sin(this.clock * 4);
      c.fillStyle = `rgba(90,200,80,${0.08 + 0.05 * pulse})`; c.beginPath(); c.arc(camX, camY, r, 0, 6.283); c.fill();
      c.strokeStyle = `rgba(120,230,90,${0.55 + 0.25 * pulse})`; c.lineWidth = 5; c.beginPath(); c.arc(camX, camY, r, 0, 6.283); c.stroke();
      c.strokeStyle = 'rgba(200,255,160,0.5)'; c.lineWidth = 2; c.setLineDash([14, 18]); c.lineDashOffset = -this.clock * 40;
      c.beginPath(); c.arc(camX, camY, r - 7, 0, 6.283); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 6; i++) { // leaves running round the ring
        const a = this.clock * 1.6 + i * 1.047, lx = camX + Math.cos(a) * r, ly = camY + Math.sin(a) * r;
        c.save(); c.translate(lx, ly); c.rotate(a + 1.2); c.fillStyle = '#6fd84a'; c.strokeStyle = '#2f6a1c'; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(0, 0, 8, 4, 0, 0, 6.283); c.fill(); c.stroke(); c.restore();
      }
    }
    } // round auras
    // floor effects
    for (const an of this.anims) {
      const k = an.t / an.life, f = an.fx; if (k >= 1) continue;
      c.globalAlpha = 1 - k;
      if (f.t === 'boom') {
        c.fillStyle = EL_COLOR[f.c]; c.beginPath(); c.arc(f.x, f.y, f.r * (0.5 + k * 0.5), 0, 6.283); c.fill();
        if (f.c !== 'enemy') { c.strokeStyle = '#ffffffaa'; c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.arc(f.x, f.y, f.r * (0.6 + 0.45 * k), 0, 6.283); c.stroke(); }
      }
      if (f.t === 'ring') { c.strokeStyle = EL_COLOR[f.c]; c.lineWidth = 10; c.beginPath(); c.arc(f.x, f.y, f.r * (0.6 + 0.4 * k), 0, 6.283); c.stroke(); }
      if (f.t === 'beam') { c.strokeStyle = EL_COLOR.light; c.lineWidth = f.w * 2 * (1 - k * 0.5); c.lineCap = 'round'; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2, f.y2); c.stroke(); c.lineCap = 'butt'; }
      if (f.t === 'pulse') { // a wave rolling out from the hero
        const r = f.r * (0.25 + 0.75 * Math.sqrt(k)), col = EL_COLOR[f.c];
        const g = c.createRadialGradient(f.x, f.y, r * 0.55, f.x, f.y, r); g.addColorStop(0, col + '00'); g.addColorStop(0.85, col + '66'); g.addColorStop(1, col + '00');
        c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r, 0, 6.283); c.fill();
        c.strokeStyle = col; c.lineWidth = 4 * (1 - k) + 1; c.beginPath(); c.arc(f.x, f.y, r, 0, 6.283); c.stroke();
      }
      c.globalAlpha = 1;
    }
    // dash telegraphs
    for (const e of m.enemies) if (e.hp > 0 && e.state === 2) {
      c.strokeStyle = 'rgba(255,40,40,0.45)'; c.lineWidth = e.r * 1.6;
      c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * 260, e.y + e.dy * 260); c.stroke();
    }
    // xp gems lie on the floor
    c.fillStyle = '#4ee0c8'; c.strokeStyle = '#1b6e60'; c.lineWidth = 1.5;
    for (const o of m.orbs) {
      if (o.v <= 0) continue;
      const x = lerp(o.px, o.x), y = lerp(o.py, o.y);
      if (!vis(x, y)) continue;
      const r = o.v > 3 ? 7 : 5;
      c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fill(); c.stroke();
    }
    // shadows of everything standing
    c.fillStyle = 'rgba(0,0,0,0.22)';
    const shadow = (x: number, y: number, r: number) => { c.beginPath(); c.arc(x, y + r * 0.15, r, 0, 6.283); c.fill(); };
    for (const e of m.enemies) if (e.hp > 0) { const x = lerp(e.px, e.x), y = lerp(e.py, e.y); if (vis(x, y)) shadow(x, y, e.r * 0.95); }
    for (const o of m.obstacles) if (vis(o.x, o.y)) shadow(o.x, o.y, o.r * (o.kind === 0 ? 1.05 : 0.75));
    shadow(hx, hy, 15);
    // where the arcing arrows and boulders will land
    for (const b of m.eshots) if (b.life > 0 && b.lob) {
      const k = 1 - b.life / b.lob;
      c.fillStyle = `rgba(255,40,30,${0.1 + 0.2 * k})`; c.beginPath(); c.arc(b.tx!, b.ty!, b.r, 0, 6.283); c.fill();
      c.strokeStyle = `rgba(255,60,40,${0.5 + 0.4 * k})`; c.lineWidth = 2.5; c.beginPath(); c.arc(b.tx!, b.ty!, b.r * (0.3 + 0.7 * k), 0, 6.283); c.stroke();
    }
    for (const sh of m.shots) if (sh.life > 0 && sh.kind !== 'wind' && sh.kind !== 'jet') { const x = lerp(sh.px, sh.x), y = lerp(sh.py, sh.y); if (vis(x, y)) shadow(x, y, Math.min(8, sh.r)); }
    for (const b of m.eshots) if (b.life > 0) { const x = lerp(b.px, b.x), y = lerp(b.py, b.y); if (vis(x, y)) shadow(x, y, b.r * 0.8); }

    // ---------- standing things, back to front ----------
    upright();
    const list: Drawable[] = [];
    if (!m.wall) for (const d of decor) list.push({ y: d.y, draw: () => this.decor(d.x, d.y, d.kind, bi) });
    for (const o of m.obstacles) if (vis(o.x, o.y)) list.push({ y: o.y, draw: () => drawObstacle(c, o.kind, o.x, o.y * K, o.r, ob) });
    if (this.trailM !== m) { this.trailM = m; this.trails.clear(); this.bushSway = m.bushes.map(() => 0); this.bushIn = m.bushes.map(() => false); }
    m.bushes.forEach((b, i) => {
      if (!vis(b.x, b.y)) return;
      let inside = (hx - b.x) ** 2 + (hy - b.y) ** 2 < (b.r + 6) ** 2;
      if (!inside) for (const e of m.enemies) if (e.hp > 0 && Math.abs(e.x - b.x) < b.r && Math.abs(e.y - b.y) < b.r) { inside = true; break; }
      if (inside && !this.bushIn[i]) this.bushSway[i] = 1;
      this.bushIn[i] = inside;
      this.bushSway[i] = Math.max(inside ? 0.25 : 0, this.bushSway[i] - dt * 1.6);
      const sw = this.bushSway[i];
      list.push({ y: b.y + b.r * 0.55, draw: () => drawBush(c, b.x, b.y * K, b.r, ob, sw, this.clock, i) });
    });
    for (const e of m.enemies) {
      if (e.hp <= 0) continue;
      const x = lerp(e.px, e.x), y = lerp(e.py, e.y);
      if (vis(x, y) || m.wall) list.push({ y, draw: () => this.enemy(e, x, y, hx, hy, bi) });
    }
    if (m.wall) list.push({ y: -1e9, draw: () => this.wallImg(c) }); // правка 118: the wall seen from above lies under everyone
    list.push({ y: hy, draw: () => this.player(m, hx, hy) });
    const alive = new Set<number>();
    for (const sh of m.shots) {
      if (sh.life <= 0) continue;
      const x = lerp(sh.px, sh.x), y = lerp(sh.py, sh.y);
      if (sh.kind === 'boomerang' || sh.kind === 'shard' || sh.kind === 'fireball' || sh.kind === 'spark') { // remember where it was: ghost trail
        alive.add(sh.id);
        let h = this.trails.get(sh.id); if (!h) { h = []; this.trails.set(sh.id, h); }
        h.push(x, y); const keep = this.shotCount > 60 ? 6 : 12; while (h.length > keep) h.splice(0, 2);
      }
      if (vis(x, y)) list.push({ y: Math.max(y, sh.age < LAUNCH ? hy + 1 : y), draw: () => this.shot(sh, x, y, m.hero.element, m.hero.id, hx, hy) });
    }
    for (const id of this.trails.keys()) if (!alive.has(id)) this.trails.delete(id);
    for (const b of m.eshots) {
      if (b.life <= 0) continue;
      const x = lerp(b.px, b.x), y = lerp(b.py, b.y);
      if (!vis(x, y)) continue;
      if (b.lob) { // arc: up and down on the way
        const f = 1 - b.life / b.lob, z = 4 * 70 * f * (1 - f) + 12, vz = 4 * 70 * (1 - 2 * f) / b.lob;
        if (b.src === 'colossus') list.push({ y, draw: () => { this.ball(x, y - z / K, 13, '#8a8478', '#2e2a24', 2.5); } });
        else list.push({ y, draw: () => drawBoneArrow(c, x, y * K - z, b.vx, b.vy * K - vz, 0.85, this.clock) });
        continue;
      }
      list.push({ y, draw: () => drawBoneArrow(c, x, y * K - 12, b.vx, b.vy * K, 0.85, this.clock) });
    }
    const ORB_COL: Record<string, [string, string, string]> = { // trail, body, rim
      darkOrbs: ['#8a4ae8', '#8a5cd6', '#2a1640'], fireOrbs: ['#ff8a2a', '#ff6a1a', '#5a1a00'],
      iceOrbs: ['#8fe0ff', '#bff0ff', '#1a5a7a'], boltOrbs: ['#ffe86a', '#fff4a0', '#5a5000'],
    };
    for (const id of Object.keys(ORBS) as SkillId[]) {
      const orbL = m.lvl(id); if (orbL <= 0) continue;
      const o = ORBS[id]!, base = m.orbAngles[id] ?? 0, [tc, bc, rc] = ORB_COL[id], dir = Math.sign(o.sp);
      const cnt = m.orbCount(id);
      for (let i = 0; i < cnt; i++) {
        const an = base + i * 6.283 / cnt, [ox, oy] = m.orbXY(o.R, an, hx, hy);
        list.push({ y: oy, draw: () => {
          // glowing arc behind the sphere, longer with the skill level
          const len = 0.9 + 0.15 * orbL, n = this.shotCount > 60 ? 6 : 12;
          c.save();
          for (let k = n; k >= 1; k--) {
            const a2 = an - dir * len * k / n, [px, py0] = m.orbXY(o.R, a2, hx, hy), py = py0 * K - 16;
            c.globalAlpha = 0.45 * (1 - k / n); c.fillStyle = k < n / 3 ? bc : tc; c.beginPath(); c.arc(px, py, 9 * (1 - 0.6 * k / n), 0, 6.283); c.fill();
          }
          c.restore();
          const y2 = oy * K - 16;
          if (id !== 'darkOrbs') { const g = c.createRadialGradient(ox, y2, 0, ox, y2, 16); g.addColorStop(0, tc + 'aa'); g.addColorStop(1, tc + '00'); c.fillStyle = g; c.beginPath(); c.arc(ox, y2, 16, 0, 6.283); c.fill(); }
          c.fillStyle = bc; c.strokeStyle = rc; c.lineWidth = 2; c.beginPath(); c.arc(ox, y2, 9, 0, 6.283); c.fill(); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(ox - 3, y2 - 3, 3, 0, 6.283); c.fill();
          if (id === 'boltOrbs' && Math.random() < 0.5) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ox, y2); c.lineTo(ox + (Math.random() - 0.5) * 22, y2 + (Math.random() - 0.5) * 22); c.stroke(); }
        } });
      }
    }
    // spirits of light (rune skill): little glowing wisps circling the hero
    const ns = m.spriteCount();
    for (let i = 0; i < ns; i++) {
      const an = m.spriteAngle + i * 6.283 / ns, ox = hx + Math.cos(an) * 46, oy = hy + Math.sin(an) * 46;
      list.push({ y: oy, draw: () => this.wisp(ox, oy * K - 34 - Math.sin(this.clock * 3 + i * 2) * 4, an + 1.571, i) });
    }
    if (m.ev) { // правка 137: the stone ring and its pillars stand among everything else, sorted by depth
      const ring = this.evRing(m), ebi = m.wmap!.style ? 1 : 0;
      for (const bl of ring.blocks) if (vis(bl.mx, bl.my)) list.push({ y: bl.key, draw: () => this.evBlock(bl, ebi) });
      ring.pillars.forEach((q, i) => { if (vis(q.x, q.y)) list.push({ y: q.y + 40, draw: () => this.evPillar(q.x, q.y, ebi, i) }); });
    }
    if (m.ev) for (const o of this.evDecor(m)) if (vis(o.x, o.y)) list.push(o.kind === 2
      ? { y: o.y, draw: () => drawBush(c, o.x, o.y * K, o.r * 0.8, ob, 0, this.clock, o.x) }
      : { y: o.y, draw: () => drawObstacle(c, o.kind, o.x, o.y * K, o.r, ob) });
    if (!m.wall && !m.ev) {
      for (const o of outside) list.push(o.kind === 2
        ? { y: o.y, draw: () => drawBush(c, o.x, o.y * K, o.r * 0.8, ob, 0, this.clock, o.x) }
        : { y: o.y, draw: () => drawObstacle(c, o.kind, o.x, o.y * K, o.r, ob) });
      if (y0 < 0) list.push({ y: -1, draw: () => this.wallFace(wb, A, T, x0, x1) });
      if (y1 > A) list.push({ y: A + T, draw: () => this.wallSouth(wb, A, T, x0, x1) });
    }
    list.sort((p, q) => p.y - q.y);
    for (const d of list) d.draw();

    // ---------- floating effects ----------
    for (const an of this.anims) {
      an.t += dt;
      const k = an.t / an.life, f = an.fx; if (k >= 1) continue;
      c.globalAlpha = 1 - k;
      if (f.t === 'line') {
        c.strokeStyle = EL_COLOR[f.c]; c.lineWidth = 3; c.beginPath(); c.moveTo(f.pts[0], f.pts[1] * K - 18);
        for (let i = 2; i < f.pts.length; i += 2) c.lineTo(f.pts[i] + (Math.random() - 0.5) * 8, f.pts[i + 1] * K - 18 + (Math.random() - 0.5) * 8);
        c.stroke();
      }
      if (f.t === 'ring') { // thorns pop out of the floor
        c.fillStyle = '#3f7a2c';
        for (let i = 0; i < 14; i++) { const a2 = i * 0.449, r1 = f.r * 0.9, bx = f.x + Math.cos(a2) * r1, by = (f.y + Math.sin(a2) * r1) * K; c.beginPath(); c.moveTo(bx - 5, by); c.lineTo(bx, by - 22 * (1 - k)); c.lineTo(bx + 5, by); c.fill(); }
      }
      if (f.t === 'text') {
        c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.font = 'bold 14px sans-serif'; c.textAlign = 'center';
        const ts = tr(f.s); c.strokeText(ts, f.x, f.y * K - 40 - k * 20); c.fillText(ts, f.x, f.y * K - 40 - k * 20);
      }
      c.globalAlpha = 1;
    }
    this.anims = this.anims.filter(an => an.t < an.life);
    // правка 167: тёмные края экрана, как в хабе — бой в той же «вечерней» гамме
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.vign || this.vignW !== W || this.vignH !== H) {
      const g = c.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
      g.addColorStop(0, 'rgba(8,6,12,0)'); g.addColorStop(1, 'rgba(8,6,12,0.55)');
      this.vign = g; this.vignW = W; this.vignH = H;
    }
    c.fillStyle = this.vign; c.fillRect(0, 0, W, H);
  }
  private vign: CanvasGradient | null = null; private vignW = 0; private vignH = 0;
  private floorPat: CanvasPattern | null = null; private floorKey = '';

  /** правки 125, 126: the event arena — the floor of the day inside a hexagon (Фраги) or a circle (the bear), a stone rim, darkness outside */
  private evFloor(m: Match, x0: number, y0: number, x1: number, y1: number): void {
    const c = this.ctx, C = RUN.arena / 2, hex = m.ev === 'frags';
    const R = hex ? FRAGS.apothem / 0.8660254037844386 : BOSS_EV.R;
    const path = (r: number) => {
      c.beginPath();
      if (hex) for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](C + Math.cos(a) * r, C + Math.sin(a) * r); }
      else c.arc(C, C, r, 0, 6.283);
      c.closePath();
    };
    // ground beyond the wall: the colour of the floor of the day, a little darker, with the same specks as on the stages
    const gc = floorColour(m.wmap!.id, m.wmap!.ground);
    c.fillStyle = gc; c.fillRect(x0 - 200, y0 - 200, x1 - x0 + 400, y1 - y0 + 400);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    const gs = 80;
    for (let gx = Math.floor((x0 - 200) / gs) * gs; gx < x1 + 200; gx += gs) for (let gy = Math.floor((y0 - 200) / gs) * gs; gy < y1 + 200; gy += gs) {
      const h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
      if (h % 5 === 0) { c.beginPath(); c.arc(gx + (h % 37), gy + (h % 53), 3 + (h % 7), 0, 6.283); c.fill(); }
    }
    const im = evPic(m.wmap!.id);
    c.save(); path(R); c.clip();
    c.fillStyle = m.wmap!.ground; c.fillRect(C - R, C - R, 2 * R, 2 * R);
    if (im.complete && im.naturalWidth) c.drawImage(im, C - R, C - R, 2 * R, 2 * R);
    c.restore();
    // soft shadow of the wall on the floor inside
    c.save(); path(R); c.clip(); c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 40; path(R); c.stroke(); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 70; path(R); c.stroke(); c.restore();
    this.evLights(m);
  }

  /** правка 137: the stone ring of an event arena — one solid wall with mitred corners, pillars with fire bowls.
   *  Built once per arena: blocks are quads between the inner edge (the arena border) and the outer edge (T further out) */
  private ringCache = new Map<string, EvRing>();
  private evRing(m: Match): EvRing {
    const hex = m.ev === 'frags', key = hex ? 'h' : 'c';
    let ring = this.ringCache.get(key); if (ring) return ring;
    const C = RUN.arena / 2, T = 40, R = hex ? FRAGS.apothem / 0.8660254037844386 : BOSS_EV.R;
    const blocks: EvBlock[] = [], pillars: { x: number; y: number }[] = [];
    let h = 2166136261; const rnd = () => { h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0; return h / 4294967296; };
    const add = (ax: number, ay: number, bx: number, by: number, ox: number, oy: number, px: number, py: number) => {
      const ys = [ay, by, oy, py], nx = (ox + px) / 2 - (ax + bx) / 2, ny = (oy + py) / 2 - (ay + by) / 2, nl = Math.hypot(nx, ny);
      const far = ny / nl < -0.12, near = ny / nl > 0.12;
      blocks.push({ a: [ax, ay], b: [bx, by], o: [ox, oy], p: [px, py], far, near, tone: rnd(), chip: rnd() < 0.3 ? rnd() : -1, moss: rnd(),
        key: far ? Math.min(...ys) : near ? Math.max(...ys) + 1 : (ay + by) / 2, mx: (ax + bx) / 2, my: (ay + by) / 2 });
    };
    if (hex) {
      const ko = (R + T / 0.8660254037844386) / R; // outer hexagon: every side moved out by T, corners stay sharp
      for (let i = 0; i < 6; i++) {
        const a0 = -Math.PI / 2 + i * Math.PI / 3, a1 = a0 + Math.PI / 3;
        const p0 = [C + Math.cos(a0) * R, C + Math.sin(a0) * R], p1 = [C + Math.cos(a1) * R, C + Math.sin(a1) * R];
        const q0 = [C + Math.cos(a0) * R * ko, C + Math.sin(a0) * R * ko], q1 = [C + Math.cos(a1) * R * ko, C + Math.sin(a1) * R * ko];
        pillars.push({ x: (p0[0] + q0[0]) / 2, y: (p0[1] + q0[1]) / 2 });
        const n = Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 60);
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n, L = (u: number[], v: number[], t: number) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
          const [ax, ay] = L(p0, p1, t0), [bx, by] = L(p0, p1, t1), [ox, oy] = L(q0, q1, t0), [px, py] = L(q0, q1, t1);
          add(ax, ay, bx, by, ox, oy, px, py);
        }
      }
    } else {
      const n = Math.round(2 * Math.PI * R / 58 / 8) * 8;
      for (let k = 0; k < n; k++) {
        const a0 = k / n * 2 * Math.PI, a1 = (k + 1) / n * 2 * Math.PI, R2 = R + T;
        add(C + Math.cos(a0) * R, C + Math.sin(a0) * R, C + Math.cos(a1) * R, C + Math.sin(a1) * R, C + Math.cos(a0) * R2, C + Math.sin(a0) * R2, C + Math.cos(a1) * R2, C + Math.sin(a1) * R2);
      }
      for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4 + Math.PI / 8; pillars.push({ x: C + Math.cos(an) * (R + T / 2), y: C + Math.sin(an) * (R + T / 2) }); }
    }
    ring = { blocks, pillars, T };
    this.ringCache.set(key, ring); return ring;
  }

  /** a stone colour a little lighter or darker */
  private tint(hex: string, f: number): string {
    const n = parseInt(hex.slice(1), 16), k = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
  }

  /** one block of the ring (upright transform: a floor point (x, y) at height z is (x, y·K − z)) */
  private evBlock(bl: EvBlock, bi: number): void {
    const c = this.ctx, Hw = 30, [hi, mid, lo] = this.stoneCols(bi), f = 0.9 + bl.tone * 0.2;
    const P = (q: number[], z: number): [number, number] => [q[0], q[1] * K - z];
    const quad = (u: [number, number], v: [number, number], w: [number, number], x: [number, number]) => { c.beginPath(); c.moveTo(u[0], u[1]); c.lineTo(v[0], v[1]); c.lineTo(w[0], w[1]); c.lineTo(x[0], x[1]); c.closePath(); };
    c.lineJoin = 'round'; c.strokeStyle = '#1a140e';
    // the face that looks at the camera: inside of the far half, outside of the near half. Two courses, the lower one with a joint in the middle
    const face = bl.far ? [bl.a, bl.b] : bl.near ? [bl.o, bl.p] : null;
    if (face) {
      const [u, v] = face, dark = bl.far ? 0.92 : 0.8;
      const course = (t0: number, t1: number, z0: number, z1: number, g: number) => {
        const s0 = [u[0] + (v[0] - u[0]) * t0, u[1] + (v[1] - u[1]) * t0], s1 = [u[0] + (v[0] - u[0]) * t1, u[1] + (v[1] - u[1]) * t1];
        const gr = c.createLinearGradient(0, s0[1] * K - z1, 0, s0[1] * K - z0); gr.addColorStop(0, this.tint(mid, f * dark * g)); gr.addColorStop(1, this.tint(lo, f * dark * g));
        c.fillStyle = gr; c.lineWidth = 2; quad(P(s0, z1), P(s1, z1), P(s1, z0), P(s0, z0)); c.fill(); c.stroke();
      };
      course(0, 1, Hw * 0.5, Hw, 1.04);
      course(0, 0.5, 0, Hw * 0.5, 0.97); course(0.5, 1, 0, Hw * 0.5, 1);
    }
    // the top of the block
    const A = P(bl.a, Hw), B = P(bl.b, Hw), O = P(bl.o, Hw), Q = P(bl.p, Hw);
    c.fillStyle = this.tint(bl.tone > 0.5 ? hi : mid, f); c.lineWidth = 2.5; quad(A, B, Q, O); c.fill(); c.stroke();
    // light edge on the arena side and a softer one outside
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 2; c.beginPath();
    const ins = (q: [number, number], r: [number, number]) => [q[0] + (r[0] - q[0]) * 0.14, q[1] + (r[1] - q[1]) * 0.14];
    const i0 = ins(A, O), i1 = ins(B, Q); c.moveTo(i0[0], i0[1]); c.lineTo(i1[0], i1[1]); c.stroke();
    // a chipped corner now and then
    if (bl.chip >= 0) {
      const t = 0.2 + bl.chip * 0.6, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, dx = (O[0] - A[0]) * 0.3, dy = (O[1] - A[1]) * 0.3;
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 7, y); c.lineTo(x + dx * 0.5, y + dy + 2); c.closePath(); c.fill();
    }
    if (bi === 1 && bl.moss < 0.28) { // moss in the joints of green maps
      c.fillStyle = 'rgba(90,168,58,0.85)'; c.beginPath(); c.ellipse(B[0] + (Q[0] - B[0]) * 0.5, B[1] + (Q[1] - B[1]) * 0.5, 7, 3.5, 0, 0, 6.283); c.fill();
    }
  }

  /** a square stone pillar over a joint of the ring, with a fire bowl on top (Meshy) and a living flame */
  private evPillar(x: number, y: number, bi: number, i: number): void {
    const c = this.ctx, S = 58, Hp = 46, cap = 8, [hi, mid, lo] = this.stoneCols(bi);
    const fx = x - S / 2, fy = (y + S / 2) * K; // south face, bottom left corner
    // south face
    const gr = c.createLinearGradient(0, fy - Hp, 0, fy); gr.addColorStop(0, this.tint(mid, 0.95)); gr.addColorStop(1, this.tint(lo, 0.9));
    c.fillStyle = gr; c.strokeStyle = '#1a140e'; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.beginPath(); c.rect(fx, fy - Hp, S, Hp); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(fx, fy - Hp * 0.5); c.lineTo(fx + S, fy - Hp * 0.5); c.moveTo(fx + S * 0.5, fy - Hp * 0.5); c.lineTo(fx + S * 0.5, fy); c.stroke();
    // top with a wider cap stone
    const tY = (y - S / 2) * K - Hp, dep = S * K;
    c.fillStyle = this.tint(lo, 0.85); c.beginPath(); c.rect(fx - 5, tY + dep - cap + 2, S + 10, cap); c.fill(); c.strokeStyle = '#1a140e'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = hi; c.beginPath(); c.rect(fx - 5, tY - cap, S + 10, dep + 2); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx - 1, tY - cap + 4); c.lineTo(fx + S + 1, tY - cap + 4); c.stroke();
    // the bowl
    const im = evPic('brazier'), bw = 62, bh = bw * 224 / 256, cx = x, top = tY - cap + dep * 0.5;
    if (im.complete && im.naturalWidth) c.drawImage(im, cx - bw / 2, top - bh * 0.78, bw, bh);
    // the flame: a few tongues that flicker and lean, a warm glow around
    const t = this.clock, rimY = top - bh * 0.6;
    const fl = 0.85 + 0.15 * Math.sin(t * 9.1 + i * 1.7) * Math.sin(t * 5.3 + i);
    c.save(); c.globalCompositeOperation = 'lighter';
    const glow = c.createRadialGradient(cx, rimY - 8, 2, cx, rimY - 8, 46 * fl);
    glow.addColorStop(0, 'rgba(255,190,90,0.55)'); glow.addColorStop(0.4, 'rgba(255,120,30,0.22)'); glow.addColorStop(1, 'rgba(255,90,20,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(cx, rimY - 8, 46 * fl, 0, 6.283); c.fill();
    c.restore();
    const tongue = (dx: number, w: number, hgt: number, ph: number, col: string) => {
      const sway = Math.sin(t * 7 + ph) * 3.5, hh = hgt * (0.82 + 0.18 * Math.sin(t * 11 + ph * 2.3));
      c.fillStyle = col; c.beginPath(); c.moveTo(cx + dx - w, rimY);
      c.quadraticCurveTo(cx + dx - w * 0.9, rimY - hh * 0.55, cx + dx + sway, rimY - hh);
      c.quadraticCurveTo(cx + dx + w * 0.9, rimY - hh * 0.55, cx + dx + w, rimY); c.closePath(); c.fill();
    };
    tongue(-9, 7, 24, i, '#e8461a'); tongue(9, 7, 22, i + 2, '#e8461a'); tongue(0, 11, 34, i + 1, '#ff7a1e');
    tongue(-4, 6, 22, i + 3, '#ffb43a'); tongue(4, 5, 18, i + 4, '#ffb43a'); tongue(0, 4, 13, i + 5, '#fff2a8');
    if (this.dprCap > 1.3) { // sparks (not in «Экономия»)
      c.fillStyle = '#ffd27a';
      for (let k = 0; k < 4; k++) { const ph = ((t * 0.8 + k * 0.25 + i * 0.13) % 1); c.globalAlpha = 1 - ph; c.beginPath(); c.arc(cx + Math.sin(k * 2.1 + i + ph * 4) * 10, rimY - 10 - ph * 46, 1.8, 0, 6.283); c.fill(); }
      c.globalAlpha = 1;
    }
  }

  /** warm light of the fire bowls on the floor (floor transform; not in «Экономия») */
  private evLights(m: Match): void {
    if (this.dprCap <= 1.3) return;
    const c = this.ctx, ring = this.evRing(m), t = this.clock;
    c.save(); c.globalCompositeOperation = 'lighter';
    ring.pillars.forEach((q, i) => {
      const r = 170 * (0.94 + 0.06 * Math.sin(t * 8 + i * 1.7));
      const g = c.createRadialGradient(q.x, q.y, 10, q.x, q.y, r); g.addColorStop(0, 'rgba(255,150,60,0.2)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, r, 0, 6.283); c.fill();
    });
    c.restore();
  }

  /** правка 132: rare bushes, trees and rocks beyond the wall, the same every run of the arena */
  private evDecorCache = new Map<string, { x: number; y: number; kind: number; r: number }[]>();
  private evDecor(m: Match): { x: number; y: number; kind: number; r: number }[] {
    const hex = m.ev === 'frags', key = (hex ? 'h' : 'c') + m.wmap!.id;
    let out = this.evDecorCache.get(key); if (out) return out;
    out = [];
    const C = RUN.arena / 2, R = hex ? FRAGS.apothem / 0.8660254037844386 : BOSS_EV.R, green = m.wmap!.style === 1;
    let h = 2166136261 ^ key.length * 7919; const rnd = () => { h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0; return h / 4294967296; };
    for (let i = 0, tries = 0; i < 46 && tries < 600; tries++) {
      const a = rnd() * 6.283, d = R + 110 + rnd() * 760, x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
      if (out.some(o => (o.x - x) ** 2 + (o.y - y) ** 2 < 150 * 150)) continue;
      const t = rnd(), kind = green ? (t < 0.55 ? 2 : t < 0.85 ? 1 : 0) : (t < 0.6 ? 0 : t < 0.8 ? 2 : 1);
      out.push({ x, y, kind, r: 22 + rnd() * 16 }); i++;
    }
    this.evDecorCache.set(key, out); return out;
  }


  /** правка 125: red zone of the bear's coming blow, filling up as the blow comes closer */
  private bearZone(m: Match): void {
    const c = this.ctx, a = m.bearAtk!, k = Math.min(1, a.t / a.T), ang = Math.atan2(a.dy, a.dx);
    const shape = () => {
      c.beginPath();
      if (a.k === 'swipe') { c.moveTo(a.x, a.y); c.arc(a.x, a.y, a.R, ang - Math.PI / 3, ang + Math.PI / 3); c.closePath(); }
      else if (a.k === 'slam') c.arc(a.x, a.y, a.R, 0, 6.283);
      else { const w = 58, nx = -a.dy * w, ny = a.dx * w, ex = a.x + a.dx * a.R, ey = a.y + a.dy * a.R; c.moveTo(a.x + nx, a.y + ny); c.lineTo(ex + nx, ey + ny); c.lineTo(ex - nx, ey - ny); c.lineTo(a.x - nx, a.y - ny); c.closePath(); }
    };
    c.save();
    shape(); c.fillStyle = `rgba(255,40,20,${0.16 + 0.1 * k})`; c.fill();
    c.strokeStyle = `rgba(255,70,40,${0.6 + 0.4 * k})`; c.lineWidth = 4; c.stroke();
    // the filling part: grows from the bear to the edge of the zone
    c.clip(); c.fillStyle = 'rgba(255,60,30,0.35)'; c.beginPath();
    if (a.k === 'charge') { c.save(); c.translate(a.x, a.y); c.rotate(ang); c.fillRect(0, -60, a.R * k, 120); c.restore(); }
    else { c.arc(a.x, a.y, a.R * k, 0, 6.283); c.fill(); }
    c.restore();
  }

  /** правка 112: background of the map of the day, covering the screen (the camera does not move) */
  private wallFloor(m: Match, W: number, H: number): void {
    const c = this.ctx, im = wallPic('bg_' + m.wmap!.id), key = `${m.wmap!.id}:${W}x${H}`;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.bgKey !== key) { // the background is scaled once into a canvas of the screen size: one plain copy per frame
      const ready = im.complete && im.naturalWidth > 0;
      const cv = this.bgCv ?? document.createElement('canvas'); cv.width = W; cv.height = H;
      const b = cv.getContext('2d')!;
      b.fillStyle = m.wmap!.ground; b.fillRect(0, 0, W, H);
      if (ready) { const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; b.drawImage(im, (W - w) / 2, H - h, w, h); }
      // the far top darkens a little: monsters come out of the haze
      const g = b.createLinearGradient(0, 0, 0, H * 0.22); g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = g; b.fillRect(0, 0, W, H * 0.22);
      this.bgCv = cv; this.bgKey = ready ? key : '';
    }
    c.drawImage(this.bgCv!, 0, 0);
  }

  /** правка 118: the wall from above — battlements with the gate and two towers, the hero's platform below */
  private wallImg(c: CanvasRenderingContext2D): void {
    const im = wallPic('wall'), w = WALL.fieldW + 44, x = WALL.fieldW / 2 - w / 2;
    const MERLON = 59; // row of the 1100 px picture where the battlements start: monsters stop right there
    const top = WALL.wallY * K - 4;
    if (!im.complete || !im.naturalWidth) { // fallback while loading
      c.fillStyle = '#8a8478'; c.fillRect(x, top, w, 400); c.fillStyle = '#b8b0a0'; c.fillRect(x, top, w, 16);
      return;
    }
    const k = w / im.naturalWidth, y0 = top - MERLON * k, h = im.naturalHeight * k;
    c.fillStyle = '#6a6458'; c.fillRect(x, y0 + h - 4, w, 600); // very tall screens: plain paving below the picture
    c.drawImage(im, x, y0, w, h);
  }

  /** правка 112: auras on the wall are strips across the whole field some way in front of the wall */
  private auraStrips(m: Match): void {
    const c = this.ctx, W = WALL.fieldW;
    for (const id of ['poisonAura', 'natureAura'] as const) {
      if (m.lvl(id) <= 0) continue;
      const [y0, y1] = m.auraBand(id), h = y1 - y0, nat = id === 'natureAura', pulse = 0.5 + 0.5 * Math.sin(this.clock * 4);
      const g = c.createLinearGradient(0, y0, 0, y1);
      if (nat) { g.addColorStop(0, 'rgba(90,200,80,0)'); g.addColorStop(0.2, `rgba(90,200,80,${0.16 + 0.06 * pulse})`); g.addColorStop(0.8, `rgba(90,200,80,${0.16 + 0.06 * pulse})`); g.addColorStop(1, 'rgba(90,200,80,0)'); }
      else { g.addColorStop(0, 'rgba(140,60,200,0)'); g.addColorStop(0.25, 'rgba(110,190,50,0.22)'); g.addColorStop(0.75, 'rgba(110,190,50,0.22)'); g.addColorStop(1, 'rgba(140,60,200,0)'); }
      c.fillStyle = g; c.fillRect(0, y0, W, h);
      if (nat) {
        c.strokeStyle = `rgba(120,230,90,${0.5 + 0.25 * pulse})`; c.lineWidth = 4;
        for (const yy of [y0 + 6, y1 - 6]) { c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
        c.strokeStyle = 'rgba(200,255,160,0.5)'; c.lineWidth = 2; c.setLineDash([14, 18]); c.lineDashOffset = -this.clock * 40;
        c.beginPath(); c.moveTo(0, y0 + h / 2); c.lineTo(W, y0 + h / 2); c.stroke(); c.setLineDash([]);
        for (let i = 0; i < 9; i++) { // leaves drifting along the strip
          const lx = ((this.clock * 40 + i * W / 9) % (W + 40)) - 20, ly = y0 + h * (0.2 + 0.6 * ((i * 37) % 10) / 10) + Math.sin(this.clock * 2 + i) * 6;
          c.save(); c.translate(lx, ly); c.rotate(this.clock * 2 + i); c.fillStyle = '#6fd84a'; c.strokeStyle = '#2f6a1c'; c.lineWidth = 1.5;
          c.beginPath(); c.ellipse(0, 0, 8, 4, 0, 0, 6.283); c.fill(); c.stroke(); c.restore();
        }
      } else {
        for (let i = 0; i < 16; i++) { // swirling puffs
          const px = ((i * W / 16 + this.clock * 18 * (i % 2 ? 1 : -1)) % W + W) % W, py = y0 + h * (0.2 + 0.6 * ((i * 53) % 10) / 10), pr = 12 + 6 * Math.sin(this.clock * 2 + i);
          c.fillStyle = i % 3 === 0 ? 'rgba(150,80,210,0.22)' : 'rgba(120,210,60,0.22)';
          c.beginPath(); c.arc(px, py, pr, 0, 6.283); c.fill();
        }
      }
    }
  }

  /** a ball standing on the floor with simple light and shade */
  private ball(x: number, y: number, r: number, fill: string, line: string, lw: number): number {
    const c = this.ctx, cy = y * K - r * 0.95;
    c.fillStyle = fill; c.strokeStyle = line; c.lineWidth = lw;
    c.beginPath(); c.arc(x, cy, r, 0, 6.283); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(x, cy, r, 0.2, 2.94); c.arc(x, cy - r * 0.25, r * 0.92, 2.94, 0.2, true); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.ellipse(x - r * 0.35, cy - r * 0.45, r * 0.32, r * 0.2, -0.5, 0, 6.283); c.fill();
    c.beginPath(); c.arc(x, cy, r, 0, 6.283); c.stroke();
    return cy;
  }

  /** small things you can walk through: dry grass and pebbles in the desert, bushes and flowers on the meadow */
  /** stones of a wall along one side: [start, length] pairs, the same every frame */
  private wallStones = new Map<number, [number, number][]>();
  private stones(len: number, seed: number): [number, number][] {
    const key = len * 7 + seed; let st = this.wallStones.get(key);
    if (!st) { st = []; let pos = 0, h = 2166136261 ^ seed; while (pos < len) { h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0; const l = 38 + (h % 34); st.push([pos, Math.min(l, len - pos)]); pos += l; } this.wallStones.set(key, st); }
    return st;
  }
  private stoneCols(bi: number): [string, string, string] { return bi === 0 ? ['#d8bc88', '#a8885a', '#5a4428'] : ['#9aa0a6', '#6a7076', '#2e3236']; }
  /** one stone block, drawn in the current transform: light top, dark bottom, a crack now and then */
  private block(x: number, y: number, w: number, h: number, bi: number, k: number): void {
    const c = this.ctx, [hi, mid, lo] = this.stoneCols(bi);
    const gr = c.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, hi); gr.addColorStop(0.55, mid); gr.addColorStop(1, lo);
    c.fillStyle = gr; c.strokeStyle = '#1a140e'; c.lineWidth = 2.5;
    c.beginPath(); c.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 5); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 5, y + 4, w - 10, 3);
    if (k % 3 === 0) { c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + w * 0.3, y + 4); c.lineTo(x + w * 0.42, y + h * 0.5); c.lineTo(x + w * 0.35, y + h - 4); c.stroke(); }
    if (bi === 1 && k % 4 === 1) { c.fillStyle = '#5aa83a'; c.beginPath(); c.ellipse(x + w * 0.6, y + 4, w * 0.22, 4, 0, 0, 6.283); c.fill(); }
  }
  /** the wall seen from above on the west, east and south sides (floor transform) */
  private wallTop(bi: number, A: number, T: number, x0: number, x1: number, y0: number, y1: number): void {
    if (x0 < 0) this.stones(A + 2 * T, 1).forEach(([p, l], k) => { const y = p - T; if (y + l > y0 && y < y1) this.block(-T, y, T, l, bi, k); });
    if (x1 > A) this.stones(A + 2 * T, 2).forEach(([p, l], k) => { const y = p - T; if (y + l > y0 && y < y1) this.block(A, y, T, l, bi, k + 1); });
  }
  /** north wall: its front face stands up towards the camera (upright transform) */
  private wallFace(bi: number, A: number, T: number, x0: number, x1: number): void {
    const H = 46, c = this.ctx;
    this.stones(A + 2 * T, 3).forEach(([p, l], k) => { const x = p - T; if (x + l > x0 && x < x1) this.block(x, -H, l, H * 0.55, bi, k); });
    this.stones(A + 2 * T, 4).forEach(([p, l], k) => { const x = p - T + 18; if (x + l > x0 && x < x1) this.block(x, -H * 0.45, l, H * 0.45, bi, k + 2); });
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-T, -2, A + 2 * T, 2);
    // top surface of the wall
    const [hi] = this.stoneCols(bi); c.fillStyle = hi; c.strokeStyle = '#1a140e'; c.lineWidth = 2.5;
    c.beginPath(); c.rect(-T, -H - T * K, A + 2 * T, T * K); c.fill(); c.stroke();
  }
  /** south wall: we see its top and its back is hidden, a band of stones in front of everything near the edge */
  private wallSouth(bi: number, A: number, T: number, x0: number, x1: number): void {
    this.stones(A + 2 * T, 5).forEach(([p, l], k) => { const x = p - T; if (x + l > x0 && x < x1) this.block(x, A * K - 18, l, T * K + 18, bi, k + 3); });
  }

  private decor(x: number, y: number, kind: number, style: number): void {
    const c = this.ctx, by = y * K;
    if (style === 0) {
      if (kind === 2) { c.fillStyle = '#a8916a'; c.beginPath(); c.ellipse(x - 5, by - 2, 4, 3, 0, 0, 6.283); c.ellipse(x + 4, by - 1, 3, 2.4, 0, 0, 6.283); c.fill(); return; }
      c.strokeStyle = '#a88a4a'; c.lineWidth = 2; c.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 2, by); c.lineTo(x + i * 5, by - 11 + Math.abs(i) * 2); c.stroke(); }
      c.lineCap = 'butt';
    } else if (kind === 2) {
      for (const [dx, col] of [[-6, '#ffe45c'], [0, '#ff8ab0'], [6, '#ffffff']] as [number, string][]) {
        c.strokeStyle = '#3f7a2c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + dx, by); c.lineTo(x + dx, by - 8); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(x + dx, by - 9, 2.6, 0, 6.283); c.fill();
      }
    } else { // bush: three balls
      this.ball(x - 10, y, 12, '#4f9a3a', '#2a5a20', 3); this.ball(x + 10, y, 12, '#4f9a3a', '#2a5a20', 3); this.ball(x, y + 2, 14, '#5aa844', '#2a5a20', 3);
    }
  }

  private shot(s: Match['shots'][number], x: number, y: number, heroEl: Element, heroId: string, hx: number, hy: number): void {
    const c = this.ctx;
    const el = s.effects[s.effects.length - 1] ?? 'phys';
    const col = BOLT[el === 'phys' ? heroEl : el] ?? EL_COLOR[el];
    let sx = x, sy = y * K - 16, grow = 1;
    if (s.kind === 'meteor') { this.meteor(s, x, y); return; }
    if (s.age < LAUNCH && s.kind !== 'spark') { // just fired: comes out of the weapon, not out of the hero's back
      const w = (has3D(heroId) && weaponTip3D(heroId)) || heroWeaponPoint(heroId, HERO_S), f = s.age / LAUNCH, e = f * (2 - f);
      const ox = hx + w.dx, oy = hy * K - w.up;
      sx = ox + (x - ox) * e; sy = oy + (sy - oy) * e; grow = 0.35 + 0.65 * f;
      // muzzle flash on the weapon
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - f;
      const fr = (14 + 10 * f) * (s.kind === 'arrow' ? ARROW_LOOK : 1), gf = c.createRadialGradient(ox, oy, 0, ox, oy, fr);
      gf.addColorStop(0, '#ffffff'); gf.addColorStop(0.35, col); gf.addColorStop(1, col + '00');
      c.fillStyle = gf; c.beginPath(); c.arc(ox, oy, fr, 0, 6.283); c.fill(); c.restore();
    }
    const tr = this.trails.get(s.id);
    if (tr && tr.length > 2 && s.age >= LAUNCH) { // fading ghosts on the last positions
      c.save();
      const n = tr.length / 2;
      for (let i = 0; i < n - 1; i++) {
        const f = (i + 1) / n, r = (s.kind === 'fireball' ? 9 : s.kind === 'boomerang' ? 8 : s.kind === 'spark' ? 3.5 : s.kind === 'arrow' ? 4 * ARROW_LOOK : 4) * (0.4 + 0.6 * f);
        c.globalAlpha = 0.4 * f; c.fillStyle = col; c.beginPath(); c.arc(tr[i * 2], tr[i * 2 + 1] * K - 16, r, 0, 6.283); c.fill();
        if (s.kind === 'fireball' && i % 2 === 0) { c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(tr[i * 2] + Math.sin(this.clock * 30 + i) * 3, tr[i * 2 + 1] * K - 18, 1.6, 0, 6.283); c.fill(); }
      }
      c.restore();
    }
    const ang = Math.atan2(s.vy * K, s.vx);
    c.save(); c.translate(sx, sy); c.rotate(ang); c.scale(grow, grow);
    if (s.kind !== 'arrow') { // brighter skill projectiles: soft glow under them
      const gr = Math.max(14, s.r * 2.6), g0 = c.createRadialGradient(0, 0, 0, 0, 0, gr); g0.addColorStop(0, col + 'aa'); g0.addColorStop(1, col + '00');
      c.fillStyle = g0; c.beginPath(); c.arc(0, 0, gr, 0, 6.283); c.fill();
    }
    c.fillStyle = col; c.strokeStyle = '#222'; c.lineWidth = 1.5;
    switch (s.kind) {
      case 'arrow': { // magic bolt: glowing head with a white core, fading tail, sparks and tiny lightning cracks
        const t = s.age, many = this.shotCount > 60;
        c.scale(ARROW_LOOK, ARROW_LOOK); // правка 194: the hero's bolt is drawn 20% smaller (hits as before)
        // tail
        const g = c.createLinearGradient(-58, 0, 10, 0);
        g.addColorStop(0, col + '00'); g.addColorStop(0.55, col + '88'); g.addColorStop(1, col + 'ff');
        c.fillStyle = g; c.beginPath(); c.moveTo(-58, 0); c.quadraticCurveTo(-20, -7, 8, -5.5); c.lineTo(8, 5.5); c.quadraticCurveTo(-20, 7, -58, 0); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2;
        for (const o of [-2.5, 0, 2.5]) { c.beginPath(); c.moveTo(-40 + Math.abs(o) * 4, o * 0.5); c.quadraticCurveTo(-14, o * 1.3 + Math.sin(t * 40 + o) * 1.2, 6, o); c.stroke(); }
        // head glow + blade + core
        const hg = c.createRadialGradient(8, 0, 0, 8, 0, 18); hg.addColorStop(0, col + 'dd'); hg.addColorStop(1, col + '00');
        c.fillStyle = hg; c.beginPath(); c.arc(8, 0, 18, 0, 6.283); c.fill();
        c.fillStyle = shade(col); c.beginPath(); c.moveTo(22, 0); c.quadraticCurveTo(8, -8.5, -8, -5); c.quadraticCurveTo(0, 0, -8, 5); c.quadraticCurveTo(8, 8.5, 22, 0); c.fill();
        c.fillStyle = col; c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(8, -7, -6, -4); c.quadraticCurveTo(2, 0, -6, 4); c.quadraticCurveTo(8, 7, 20, 0); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(17, 0); c.quadraticCurveTo(8, -3, 0, -1.6); c.lineTo(0, 1.6); c.quadraticCurveTo(8, 3, 17, 0); c.fill();
        if (!many) {
          // sparks flying off and fading
          const seed = (s.id ?? 0) * 7.13;
          c.fillStyle = '#ffffff';
          for (let i = 0; i < 5; i++) {
            const ph = (t * 6 + i / 5 + seed) % 1, sx = -10 - ph * 40, sy = Math.sin(i * 2.3 + seed) * (3 + ph * 10);
            c.globalAlpha = 1 - ph; c.beginPath(); c.arc(sx, sy, 1.3 * (1 - ph) + 0.4, 0, 6.283); c.fill();
          }
          c.globalAlpha = 1;
          // crackling lightning, changes every few frames
          const k = Math.floor(t * 20 + seed);
          c.strokeStyle = shade(col); c.lineWidth = 1.2;
          for (let j = 0; j < 2; j++) {
            let px = -4 - j * 14, py = 0; c.beginPath(); c.moveTo(px, py);
            for (let q = 0; q < 3; q++) { px -= 5 + ((k * 13 + q * 7 + j * 5) % 5); py = (((k * 17 + q * 11 + j * 3) % 9) - 4) * 1.6; c.lineTo(px, py); }
            c.stroke();
          }
        }
        break;
      }
      case 'shard': c.beginPath(); c.moveTo(-8, -3); c.lineTo(8, 0); c.lineTo(-8, 3); c.closePath(); c.fill(); c.stroke(); break;
      case 'boomerang': c.rotate(s.age * 20); c.beginPath(); c.moveTo(-12, -4); c.lineTo(0, 0); c.lineTo(-12, 4); c.lineTo(12, 4); c.lineTo(0, 0); c.lineTo(12, -4); c.fill(); c.stroke(); break;
      case 'wind': c.globalAlpha = 0.8; c.beginPath(); c.arc(-s.r * 0.6, 0, s.r, -1, 1); c.lineWidth = 6; c.strokeStyle = col; c.stroke(); c.globalAlpha = 1; break;
      case 'jet': c.globalAlpha = 0.75; c.beginPath(); c.ellipse(0, 0, s.r * 1.4, s.r * 0.7, 0, 0, 6.283); c.fill(); c.globalAlpha = 1; break;
      case 'flask': c.translate(0, -Math.sin(Math.min(1, s.age / 0.6) * 3.14) * 40); c.beginPath(); c.arc(0, 0, 7, 0, 6.283); c.fill(); c.stroke(); break;
      default: c.beginPath(); c.arc(0, 0, s.r, 0, 6.283); c.fill(); c.stroke();
    }
    c.restore();
  }

  /** a burning rock falling from the sky to its warning circle */
  private meteor(s: Match['shots'][number], x: number, y: number): void {
    const c = this.ctx, k = Math.max(0, s.life / 0.7), z = 340 * k * k, gx = x + 120 * k * k, gy = y * K - 14 - z;
    c.save();
    // fiery tail up and to the right, where it came from
    const tg = c.createLinearGradient(gx, gy, gx + 70, gy - 160);
    tg.addColorStop(0, 'rgba(255,220,120,0.95)'); tg.addColorStop(0.3, 'rgba(255,120,30,0.7)'); tg.addColorStop(1, 'rgba(255,60,10,0)');
    c.fillStyle = tg; c.beginPath(); c.moveTo(gx - 13, gy + 4); c.lineTo(gx + 80, gy - 170); c.lineTo(gx + 100, gy - 150); c.lineTo(gx + 13, gy - 4); c.closePath(); c.fill();
    const hg = c.createRadialGradient(gx, gy, 0, gx, gy, 30); hg.addColorStop(0, 'rgba(255,230,140,0.9)'); hg.addColorStop(1, 'rgba(255,110,20,0)');
    c.fillStyle = hg; c.beginPath(); c.arc(gx, gy, 30, 0, 6.283); c.fill();
    // embers flying off the tail
    for (let i = 0; i < 6; i++) {
      const ph = (this.clock * 3 + i / 6 + s.id * 0.37) % 1, ex = gx + 14 + ph * 60 + Math.sin(i * 2.1) * 8, ey = gy - 30 - ph * 120 + Math.cos(i * 1.7) * 8;
      c.globalAlpha = 1 - ph; c.fillStyle = i % 2 ? '#ffd27a' : '#ff7a2a'; c.beginPath(); c.arc(ex, ey, 2.6 * (1 - ph) + 0.8, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
    // the rock, turning as it falls
    c.translate(gx, gy); c.rotate(this.clock * 4 + s.id); c.scale(1.5, 1.5);
    c.fillStyle = '#5a3a2a'; c.strokeStyle = '#1a0e08'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-12, -3); c.lineTo(-6, -12); c.lineTo(7, -11); c.lineTo(13, -1); c.lineTo(6, 10); c.lineTo(-8, 9); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#ffb040'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-5, -6); c.lineTo(1, 0); c.lineTo(-2, 6); c.moveTo(1, 0); c.lineTo(8, -3); c.stroke();
    c.restore();
  }

  /** a spirit of light: soft glow, white body, tiny eyes, a wavy tail behind it */
  private wisp(x: number, y: number, dir: number, i: number): void {
    const c = this.ctx, t = this.clock * 6 + i;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, 20); g.addColorStop(0, 'rgba(255,250,200,0.85)'); g.addColorStop(0.45, 'rgba(255,225,90,0.35)'); g.addColorStop(1, 'rgba(255,200,60,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 20, 0, 6.283); c.fill();
    c.restore(); c.save(); c.translate(x, y);
    const bx = -Math.cos(dir), by = -Math.sin(dir) * K; // tail points back along the orbit
    c.fillStyle = 'rgba(255,240,170,0.75)'; c.beginPath(); c.moveTo(-5, 0);
    c.quadraticCurveTo(bx * 10 + Math.sin(t) * 3, by * 10 + 4, bx * 18, by * 18 + Math.sin(t * 1.3) * 3); c.quadraticCurveTo(bx * 8, by * 8 - 2, 5, 0); c.fill();
    c.fillStyle = '#fffbe8'; c.strokeStyle = '#ffd64a'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, 6.5, 7.5, 0, 0, 6.283); c.fill(); c.stroke();
    c.fillStyle = '#5a4210'; c.beginPath(); c.arc(-2.2, -1, 1.2, 0, 6.283); c.arc(2.2, -1, 1.2, 0, 6.283); c.fill();
    c.restore();
  }

  private bearM: Match | null = null;
  private enemy(e: Enemy, x: number, y: number, camX: number, camY: number, bi: number): void {
    const c = this.ctx, gy = y * K;
    const dx = camX - x, dy = camY - y, d = Math.hypot(dx, dy) || 1;
    if (e.slowT > 0) { c.strokeStyle = '#7fd6ff'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, gy, e.r + 3, (e.r + 3) * K, 0, 0, 6.283); c.stroke(); }
    const ghostOut = e.kind === 'ghost' && e.sumT % 3 < 1; // правка 113: the ghost cannot be hit right now
    if (ghostOut) { c.save(); c.globalAlpha = 0.3 + 0.1 * Math.sin(this.clock * 12); }
    const squash = e.hitT > 0;
    if (squash) { c.save(); c.translate(x, gy); c.scale(1.08, 0.9); c.translate(-x, -gy); }
    if (e.kind === 'bear') { // правка 125: 3D bear
      if (drawBear3D(c, e, this.bearM?.bearAtk ?? null, x, gy, 140 * HERO_S * 3.3 * 0.75, this.clock, e.flash > 0)) { if (squash) c.restore(); return; }
    }
    drawMonster(c, e.kind, x, gy, e.r, { flash: e.flash > 0, frozen: e.freezeT > 0, t: this.clock + e.id * 0.37, ux: dx / d, uy: dy / d, state: e.state, biome: bi, charge: e.kind === 'shooter' && e.atkCd < 0.45 ? Math.min(1, Math.max(0, 1 - e.atkCd / 0.45)) : 0 });
    if (squash) c.restore();
    if (ghostOut) c.restore();
    const hgt = e.r * (e.kind === 'fast' ? 1.9 : e.kind === 'tank' || e.kind === 'tank2' || e.kind === 'golem' ? 2.8 : e.kind === 'boss' || e.kind === 'harpy' || e.kind === 'harpyQueen' ? 3.6 : e.kind === 'slime' || e.kind === 'slimelet' || e.kind === 'ram' ? 2 : 2.6);
    const cy = gy - hgt * 0.5;
    if (e.flash > 0.03) { // hit spark
      const k = e.flash / 0.08, sr = (1.2 - k) * e.r * 1.1;
      c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 2.5;
      c.beginPath(); for (let i = 0; i < 4; i++) { const a = i * 0.785 + e.id; c.moveTo(x + Math.cos(a) * sr * 0.3, cy + Math.sin(a) * sr * 0.3); c.lineTo(x + Math.cos(a) * sr, cy + Math.sin(a) * sr); c.moveTo(x - Math.cos(a) * sr * 0.3, cy - Math.sin(a) * sr * 0.3); c.lineTo(x - Math.cos(a) * sr, cy - Math.sin(a) * sr); }
      c.stroke();
    }
    if (e.burnT > 0) { c.fillStyle = 'rgba(255,120,40,0.32)'; c.beginPath(); c.ellipse(x, cy, e.r, hgt * 0.5, 0, 0, 6.283); c.fill(); }
    if (e.poisonT > 0 || e.auraPT > 0) { c.fillStyle = 'rgba(150,230,70,0.32)'; c.beginPath(); c.ellipse(x, cy, e.r, hgt * 0.5, 0, 0, 6.283); c.fill(); }
    if (e.kind === 'exploder' && e.state === 1) {
      c.save(); c.setTransform(c.getTransform().a, 0, 0, c.getTransform().a * K, c.getTransform().e, c.getTransform().f);
      c.strokeStyle = '#ff2'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 70 * (1 - e.stateT / 0.6), 0, 6.283); c.stroke(); c.restore();
    }
    if (!isBoss(e.kind) && e.hp < e.maxHp) {
      c.fillStyle = '#000'; c.fillRect(x - e.r, gy - hgt - 8, e.r * 2, 4);
      c.fillStyle = '#e33'; c.fillRect(x - e.r, gy - hgt - 8, e.r * 2 * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  private player(m: Match, x: number, y: number): void {
    const moving = Math.abs(m.x - m.px) + Math.abs(m.y - m.py) > 0.05;
    const blink = m.iframes > 0 && Math.floor(m.tick / 3) % 2 === 1;
    let drawn = false;
    if (has3D(m.hero.id)) { // правки 102, 104: 3D hero — walks with the weapon upright, stands facing the nearest enemy
      const rr = m.reach(480); let best = rr * rr, tx = 0, ty = 0;
      for (const e of m.enemies) { const d = (e.x - m.x) ** 2 + (e.y - m.y) ** 2; if (d < best) { best = d; tx = e.x - m.x; ty = e.y - m.y; } }
      const aim = best < rr * rr;
      const fx = !moving && aim ? tx : m.faceX, fy = !moving && aim ? ty * K : m.faceY;
      drawn = drawHero3D(this.ctx, m.hero.id, x, y * K, HERO_S, { fx, fy, t: this.clock, moving, blink, wx: x, wy: y });
    }
    if (!drawn) drawHero(this.ctx, m.hero.id, m.hero.element, x, y * K, HERO_S, { fx: m.faceX, fy: m.faceY, t: this.clock, moving, blink });
    this.hpBar(m, x, y * K - (drawn && has3D(m.hero.id) ? 140 * HERO_S * 0.8 : hasHeroImg(m.hero.id) ? HERO_IMG_H * HERO_S + 10 : 44));
  }

  /** hero health above the head: green, yellow under 50%, red under 25%; blinks when hit */
  private hpBar(m: Match, x: number, y: number): void {
    const c = this.ctx, dt = Math.max(0, this.clock - this.lastClock); this.lastClock = this.clock;
    const f = Math.max(0, Math.min(1, m.hp / m.maxHp));
    if (this.hpM !== m) { this.hpM = m; this.hpLast = m.hp; this.hpLag = f; this.hurtT = 0; }
    if (m.hp < this.hpLast - 0.01) this.hurtT = 0.4;
    this.hpLast = m.hp;
    this.hpLag = this.hpLag > f ? Math.max(f, this.hpLag - dt * 0.6) : f;
    this.hurtT = Math.max(0, this.hurtT - dt);
    const w = 50, h = 8, x0 = x - w / 2;
    const col = f > 0.5 ? '#46d65a' : f > 0.25 ? '#ffd23a' : '#ff3a3a';
    const rr = (px: number, py: number, pw: number, ph: number, r: number) => { c.beginPath(); c.roundRect(px, py, pw, ph, r); };
    c.save();
    rr(x0 - 2, y - 2, w + 4, h + 4, 5); c.fillStyle = '#000c'; c.fill();
    if (this.hpLag > f) { rr(x0, y, w * this.hpLag, h, 3); c.fillStyle = '#fff'; c.fill(); }
    if (f > 0) { rr(x0, y, w * f, h, 3); c.fillStyle = this.hurtT > 0 && Math.floor(this.hurtT * 20) % 2 === 0 ? '#fff' : col; c.fill();
      c.fillStyle = '#ffffff55'; c.fillRect(x0 + 2, y + 1, Math.max(0, w * f - 4), 2); }
    c.font = '900 11px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.lineWidth = 3; c.strokeStyle = '#000'; const t = String(Math.ceil(Math.max(0, m.hp)));
    c.strokeText(t, x, y - 2); c.fillStyle = this.hurtT > 0 ? '#ff8a8a' : '#fff'; c.fillText(t, x, y - 2);
    c.restore();
  }
}
