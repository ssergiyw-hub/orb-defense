// Character art drawn with Canvas 2D: heroes (battle and menus) and monsters.
// Everything is drawn upright from the feet point (x, gy) in screen units of the pseudo-3D view.
import { Element, EnemyKind } from '../core/content';
import { HERO_IMG, HERO_PARTS } from './heroImages';
import { HERO_FACE } from './heroArtImages';

type C = CanvasRenderingContext2D;
const INK = '#21160f';
const SKIN = '#f2c99a', SKIN_D = '#d9a676';

export const EL_HEX: Record<Element, string> = {
  fire: '#ff7a2f', ice: '#7fd6ff', nature: '#5fbf4a', light: '#ffe45c', dark: '#8a5cd6',
  lightning: '#9fdcff', water: '#3d8fe0', phys: '#c9c9c9', air: '#d8f0ff', poison: '#9be04a',
};
/** robe colours: [main, dark] — a bit deeper than the element colour so the robe reads well */
const ROBE: Record<Element, [string, string]> = {
  fire: ['#e8562a', '#8f2a12'], ice: ['#58b4e8', '#24638f'], nature: ['#4f9e3a', '#245a1a'], light: ['#f2c640', '#a5761a'],
  dark: ['#6b3fb0', '#2f1660'], lightning: ['#3f7fd8', '#1b3b78'], water: ['#2f76c8', '#143a70'], phys: ['#9a8a7a', '#4a3c30'],
  air: ['#9cc8dc', '#4f7f96'], poison: ['#6aa83a', '#2f5a14'],
};

function ell(c: C, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, lw = 0, stroke = INK): void {
  c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 6.2832); c.fillStyle = fill; c.fill();
  if (lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
function vgrad(c: C, y0: number, y1: number, a: string, b: string): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g;
}
function glow(c: C, x: number, y: number, r: number, col: string, core = '#fff'): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, core); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
}

// ================= heroes =================
export interface HeroPose { fx: number; fy: number; t: number; moving: boolean; blink?: boolean }

type Outfit = 'robe' | 'tunic' | 'cloak' | 'fur' | 'armor' | 'toga' | 'flow' | 'scales' | 'flame';
type Weapon = 'staff' | 'trident' | 'club' | 'bolt' | 'sun' | 'bident';
interface Look { outfit: Outfit; weapon: Weapon; hair: string; robe?: [string, string]; trim?: string }
/** every hero has his own clothes, hair and weapon */
const LOOK: Record<string, Look> = {
  prometheus: { outfit: 'flame', weapon: 'staff', hair: '#e8401a', trim: '#ffcf4a' },
  hydra: { outfit: 'scales', weapon: 'staff', hair: '#4f8a2a' },
  hades: { outfit: 'cloak', weapon: 'bident', hair: '#1e1a2e', robe: ['#3a2a5a', '#160c2a'], trim: '#8a5cd6' },
  apollo: { outfit: 'toga', weapon: 'sun', hair: '#f2c640', robe: ['#f6f1e6', '#c9bea6'], trim: '#e8b020' },
  heracles: { outfit: 'tunic', weapon: 'club', hair: '#5a3418', robe: ['#9a6a3a', '#5a3a1a'], trim: '#c9862e' },
  stribog: { outfit: 'flow', weapon: 'staff', hair: '#eef4fa', robe: ['#b4dcee', '#5f93ad'], trim: '#ffffff' },
  poseidon: { outfit: 'armor', weapon: 'trident', hair: '#2f9a9a', robe: ['#2f76c8', '#143a70'], trim: '#ffd23a' },
  skadi: { outfit: 'fur', weapon: 'staff', hair: '#f4f6fa', robe: ['#7cc4ec', '#2e6f99'], trim: '#ffffff' },
  veles: { outfit: 'fur', weapon: 'staff', hair: '#6b4424', robe: ['#4f7a34', '#24401a'], trim: '#8a6a4a' },
  perun: { outfit: 'armor', weapon: 'bolt', hair: '#d8d2c8', robe: ['#3f6fd8', '#1b3b78'], trim: '#c9d2dc' },
};

/** hero standing at (x, gy); s = scale (1 ≈ 50 units tall without the staff) */
export function drawHero(c: C, id: string, el: Element, x: number, gy: number, s: number, pose: HeroPose): void {
  const im = heroImg(id);
  if (im) { drawHeroImg(c, id, im, el, x, gy, s, pose); return; }
  if (pose.fx < -0.2) facing.set(id, -1); else if (pose.fx > 0.2) facing.set(id, 1);
  const L = LOOK[id] ?? { outfit: 'robe', weapon: 'staff', hair: '#6b4424' } as Look;
  const [robe, robeD] = L.robe ?? ROBE[el], col = EL_HEX[el], trim = L.trim ?? '#f5d27a';
  const back = pose.fy < -0.35;
  const side = Math.max(-1, Math.min(1, pose.fx));
  const hand = side >= 0 ? 1 : -1; // the weapon is held on the side we look to
  const step = pose.moving ? Math.sin(pose.t * 13) : 0;
  const bob = pose.moving ? Math.abs(step) * 1.6 * s : Math.sin(pose.t * 2.6) * 0.6 * s;
  const lw = 2.4 * s;
  const skin = pose.blink ? '#ffffff' : SKIN;
  const bare = L.outfit === 'tunic';
  // weapon hand and staff line
  const hx = x + hand * 13 * s + pose.fx * 4 * s, hy = gy - 25 * s - bob;
  const lean = pose.fx * 7 * s + Math.sin(pose.t * 3) * 0.8 * s;
  const tx = hx + lean, ty = gy - 66 * s - bob, bx = hx - lean * 0.45, by = gy - 3 * s;
  const weapon = () => drawWeapon(c, L.weapon, bx, by, tx, ty, s, col, pose.t);
  const handBall = () => ell(c, hx + lean * 0.35, hy, 3.8 * s, 3.8 * s, skin, 2 * s);

  // feet (bare legs for the tunic)
  for (const sd of [-1, 1]) {
    const fo = step * sd * 3 * s;
    if (bare) { c.strokeStyle = INK; c.lineWidth = 6 * s; c.beginPath(); c.moveTo(x + sd * 5 * s, gy - 14 * s); c.lineTo(x + sd * 5.5 * s + fo * 0.4, gy - 3 * s); c.stroke(); c.strokeStyle = skin; c.lineWidth = 3.6 * s; c.stroke(); }
    ell(c, x + sd * 5.5 * s + fo * 0.4, gy - 2 * s - Math.max(0, fo * sd) * 0.3, 5.2 * s, 3.3 * s, L.outfit === 'fur' ? '#e8e2d6' : '#4a2f1f', 2 * s);
  }
  if (back) { weapon(); handBall(); }
  // cape behind the body
  if (L.outfit === 'cloak' || L.outfit === 'flow') {
    const w = L.outfit === 'flow' ? Math.sin(pose.t * 8) * 3 * s : 0;
    c.fillStyle = L.outfit === 'cloak' ? '#140a22' : '#e8f6ff'; c.strokeStyle = INK; c.lineWidth = lw;
    c.beginPath(); c.moveTo(x - 11 * s, gy - 35 * s - bob); c.quadraticCurveTo(x - 20 * s - w, gy - 16 * s, x - 17 * s - w, gy - 3 * s);
    c.lineTo(x + 17 * s + w, gy - 3 * s); c.quadraticCurveTo(x + 20 * s + w, gy - 16 * s, x + 11 * s, gy - 35 * s - bob); c.closePath(); c.fill(); c.stroke();
  }
  // body
  const top = gy - 36 * s - bob, hem = bare ? gy - 13 * s : gy - 4 * s;
  c.beginPath();
  c.moveTo(x - 10 * s, top); c.quadraticCurveTo(x - 14 * s, top + 12 * s, x - 15 * s, hem);
  c.quadraticCurveTo(x, hem + 4 * s, x + 15 * s, hem);
  c.quadraticCurveTo(x + 14 * s, top + 12 * s, x + 10 * s, top);
  c.quadraticCurveTo(x, top - 3 * s, x - 10 * s, top); c.closePath();
  c.fillStyle = vgrad(c, top, hem, robe, robeD); c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
  c.save(); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(x - 15 * s, top, 7 * s, hem - top);
  switch (L.outfit) {
    case 'scales':
      c.strokeStyle = 'rgba(20,60,10,0.45)'; c.lineWidth = 1.2 * s;
      for (let r = 0; r < 6; r++) for (let k = -3; k <= 3; k++) { c.beginPath(); c.arc(x + k * 5 * s + (r % 2) * 2.5 * s, top + 4 * s + r * 5 * s, 2.6 * s, 0, 3.14); c.stroke(); }
      break;
    case 'flame': // flame-shaped hem
      c.fillStyle = trim; c.beginPath(); c.moveTo(x - 16 * s, hem);
      for (let k = -3; k <= 3; k++) { c.lineTo(x + k * 4.6 * s, hem - (k % 2 ? 9 : 5) * s - Math.sin(pose.t * 9 + k) * 1.5 * s); c.lineTo(x + k * 4.6 * s + 2.3 * s, hem); }
      c.lineTo(x + 16 * s, hem); c.closePath(); c.fill();
      break;
    case 'toga': // golden sash across the chest + hem trim
      c.strokeStyle = trim; c.lineWidth = 3.4 * s; c.beginPath(); c.moveTo(x - 10 * s, top + 1 * s); c.lineTo(x + 12 * s, gy - 16 * s); c.stroke();
      c.fillStyle = trim; c.fillRect(x - 16 * s, hem - 3 * s, 32 * s, 3 * s);
      break;
    case 'fur':
      c.fillStyle = trim; for (let k = -4; k <= 4; k++) ell(c, x + k * 3.6 * s, hem - 1.5 * s, 3 * s, 2.6 * s, trim);
      break;
    case 'armor': // chest plate
      c.fillStyle = vgrad(c, top, top + 16 * s, '#e4ebf2', '#7d8a98'); c.strokeStyle = INK; c.lineWidth = 1.8 * s;
      c.beginPath(); c.roundRect(x - 10 * s, top + 1 * s, 20 * s, 15 * s, 4 * s); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(x, top + 3 * s); c.lineTo(x, top + 14 * s); c.stroke();
      break;
    case 'tunic':
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x - 16 * s, hem - 4 * s, 32 * s, 4 * s);
      break;
  }
  if (L.outfit !== 'toga' && L.outfit !== 'armor') { // belt
    c.fillStyle = robeD; c.fillRect(x - 16 * s, gy - 19 * s - bob * 0.5, 32 * s, 3.4 * s);
    ell(c, x + side * 2 * s, gy - 17.3 * s - bob * 0.5, 2.6 * s, 2.2 * s, trim, 1.2 * s);
  }
  c.restore();
  if (L.outfit === 'fur') { // fur collar
    for (let k = -2; k <= 2; k++) ell(c, x + k * 4 * s, top + 1 * s, 3.4 * s, 3 * s, trim, 1.4 * s);
  }
  if (id === 'heracles') { // lion pelt over the shoulders
    c.fillStyle = '#c9862e'; c.strokeStyle = INK; c.lineWidth = 2 * s;
    c.beginPath(); c.ellipse(x, top + 2 * s, 15 * s, 5 * s, 0, 0, 6.2832); c.fill(); c.stroke();
  }
  if (id === 'stribog') { // scarf blowing in the wind
    const w = Math.sin(pose.t * 9) * 2 * s;
    c.fillStyle = '#ffffff'; c.strokeStyle = INK; c.lineWidth = 1.8 * s;
    c.beginPath(); c.moveTo(x - 8 * s, top + 1 * s); c.quadraticCurveTo(x - 20 * s, top - 1 * s + w, x - 30 * s, top + 4 * s + w);
    c.lineTo(x - 28 * s, top + 8 * s + w); c.quadraticCurveTo(x - 18 * s, top + 5 * s, x - 6 * s, top + 5 * s); c.closePath(); c.fill(); c.stroke();
  }
  // free hand at the other side
  if (!back) {
    const ox = x - hand * 14 * s, oy = gy - 20 * s - bob * 0.5;
    if (bare) { c.strokeStyle = INK; c.lineWidth = 6.5 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - hand * 10 * s, top + 3 * s); c.lineTo(ox, oy); c.stroke(); c.strokeStyle = skin; c.lineWidth = 4 * s; c.stroke(); c.lineCap = 'butt'; }
    ell(c, ox, oy, 3.4 * s, 3.4 * s, skin, 2 * s);
  }
  // head
  const hr = 12 * s, hcx = x + side * 1.5 * s, hcy = gy - 47 * s - bob;
  hairBack(c, id, L.hair, hcx, hcy, hr, s, back, pose.t);
  ell(c, hcx, hcy, hr, hr, skin, lw);
  if (!back) {
    c.fillStyle = 'rgba(217,140,100,0.28)';
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(hcx + side * 3 * s + sd * 6.5 * s, hcy + 3.5 * s, 2.6 * s, 1.8 * s, 0, 0, 6.2832); c.fill(); }
    for (const sd of [-1, 1]) {
      const ex = hcx + side * 3.5 * s + sd * 4.4 * s, ey = hcy + 0.5 * s + pose.fy * 1.2 * s;
      ell(c, ex, ey, 2 * s, 2.7 * s, '#1a120c');
      ell(c, ex - 0.6 * s, ey - 1 * s, 0.75 * s, 0.75 * s, '#ffffff');
      c.strokeStyle = '#3a2418'; c.lineWidth = 1.3 * s; c.beginPath(); c.moveTo(ex - 2.2 * s, ey - 4.2 * s); c.lineTo(ex + 2.2 * s, ey - 4.6 * s + sd * 0.4 * s); c.stroke();
    }
    c.strokeStyle = '#5a2a18'; c.lineWidth = 1.4 * s; c.beginPath(); c.arc(hcx + side * 3.5 * s, hcy + 5 * s, 2.6 * s, 0.3, 2.84); c.stroke();
  } else {
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.arc(hcx, hcy, hr, 0, 6.2832); c.fill();
  }
  hairFront(c, id, L.hair, hcx, hcy, hr, s, back, side, pose.t);
  if (!back) { weapon(); handBall(); }
}

/** staff and other weapons: crystal (or other top) glows in the element colour */
function drawWeapon(c: C, w: Weapon, bx: number, by: number, tx: number, ty: number, s: number, col: string, t: number): void {
  const a = Math.atan2(ty - by, tx - bx);
  c.lineCap = 'round';
  const shaft = (wood: string, width = 3.4) => {
    c.strokeStyle = INK; c.lineWidth = (width + 2.2) * s; c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
    c.strokeStyle = wood; c.lineWidth = width * s; c.stroke();
  };
  const pulse = 1 + Math.sin(t * 6) * 0.12;
  c.save();
  switch (w) {
    case 'staff': case 'bolt': case 'sun': {
      shaft('#8a5a2a');
      // fork at the top holding the crystal
      c.translate(tx, ty); c.rotate(a + Math.PI / 2);
      c.strokeStyle = INK; c.lineWidth = 2.2 * s;
      c.fillStyle = '#8a5a2a';
      c.beginPath(); c.moveTo(-1.8 * s, 2 * s); c.quadraticCurveTo(-7 * s, -2 * s, -4 * s, -9 * s); c.lineTo(-2.5 * s, -8 * s); c.quadraticCurveTo(-4 * s, -3 * s, 0, 0); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(1.8 * s, 2 * s); c.quadraticCurveTo(7 * s, -2 * s, 4 * s, -9 * s); c.lineTo(2.5 * s, -8 * s); c.quadraticCurveTo(4 * s, -3 * s, 0, 0); c.fill(); c.stroke();
      glow(c, 0, -7 * s, 13 * s * pulse, col);
      if (w === 'staff') { // crystal
        c.fillStyle = col; c.beginPath(); c.moveTo(0, -15 * s); c.lineTo(4.2 * s, -7 * s); c.lineTo(0, 0); c.lineTo(-4.2 * s, -7 * s); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(0, -14 * s); c.lineTo(-3 * s, -7 * s); c.lineTo(0, -6 * s); c.closePath(); c.fill();
      } else if (w === 'bolt') { // lightning bolt
        c.fillStyle = '#ffe45c'; c.beginPath(); c.moveTo(2 * s, -18 * s); c.lineTo(-4 * s, -7 * s); c.lineTo(0, -7 * s); c.lineTo(-2 * s, 1 * s); c.lineTo(5 * s, -10 * s); c.lineTo(1 * s, -10 * s); c.closePath(); c.fill(); c.stroke();
      } else { // sun disk with rays
        c.strokeStyle = '#ffd23a'; c.lineWidth = 1.8 * s;
        for (let k = 0; k < 10; k++) { const r = k * 0.628 + t; c.beginPath(); c.moveTo(Math.cos(r) * 6 * s, -8 * s + Math.sin(r) * 6 * s); c.lineTo(Math.cos(r) * 10 * s, -8 * s + Math.sin(r) * 10 * s); c.stroke(); }
        ell(c, 0, -8 * s, 5.5 * s, 5.5 * s, '#ffe680', 2 * s);
      }
      break;
    }
    case 'trident': case 'bident': {
      shaft(w === 'trident' ? '#c9a24a' : '#3a2a4a', 3);
      c.translate(tx, ty); c.rotate(a + Math.PI / 2);
      glow(c, 0, -8 * s, 12 * s * pulse, col);
      c.fillStyle = w === 'trident' ? '#ffd23a' : '#b8a8d8'; c.strokeStyle = INK; c.lineWidth = 1.8 * s;
      c.beginPath(); c.roundRect(-7 * s, -2 * s, 14 * s, 3 * s, 1.5 * s); c.fill(); c.stroke();
      const prongs = w === 'trident' ? [-6, 0, 6] : [-4, 4];
      for (const px of prongs) {
        const h = px === 0 ? 17 : 13;
        c.beginPath(); c.moveTo(px * s - 1.6 * s, -1 * s); c.lineTo(px * s - 1.6 * s, -h * s + 3 * s); c.lineTo(px * s - 3.4 * s, -h * s + 4 * s); c.lineTo(px * s, -h * s); c.lineTo(px * s + 3.4 * s, -h * s + 4 * s); c.lineTo(px * s + 1.6 * s, -h * s + 3 * s); c.lineTo(px * s + 1.6 * s, -1 * s); c.closePath(); c.fill(); c.stroke();
      }
      break;
    }
    case 'club': { // heavy club, thicker at the top
      c.translate(bx + (tx - bx) * 0.25, by + (ty - by) * 0.25); c.rotate(a + Math.PI / 2);
      const len = Math.hypot(tx - bx, ty - by) * 0.8;
      c.fillStyle = vgrad(c, -len, 0, '#a0703a', '#6a4220'); c.strokeStyle = INK; c.lineWidth = 2.2 * s;
      c.beginPath(); c.moveTo(-2.5 * s, 0); c.lineTo(-7 * s, -len + 6 * s); c.quadraticCurveTo(0, -len - 6 * s, 7 * s, -len + 6 * s); c.lineTo(2.5 * s, 0); c.closePath(); c.fill(); c.stroke();
      for (const [kx, ky] of [[-4, 0.7], [3, 0.82], [-1, 0.6]] as [number, number][]) ell(c, kx * s, -len * ky, 1.6 * s, 1.6 * s, '#5a3418');
      glow(c, 0, -len, 9 * s * pulse, col);
      break;
    }
  }
  c.restore(); c.lineCap = 'butt';
}

/** hair and things behind the head */
function hairBack(c: C, id: string, hair: string, x: number, y: number, r: number, s: number, back: boolean, t: number): void {
  c.strokeStyle = INK; c.lineWidth = 2 * s;
  switch (id) {
    case 'hades': case 'skadi': case 'poseidon': { // long hair to the shoulders
      c.fillStyle = hair; c.beginPath(); c.moveTo(x - r - 1 * s, y - 2 * s); c.quadraticCurveTo(x - r - 3 * s, y + 13 * s, x - r + 2 * s, y + 16 * s);
      c.lineTo(x + r - 2 * s, y + 16 * s); c.quadraticCurveTo(x + r + 3 * s, y + 13 * s, x + r + 1 * s, y - 2 * s); c.closePath(); c.fill(); c.stroke();
      if (id === 'skadi') { c.fillStyle = hair; for (let i = 0; i < 3; i++) ell(c, x + r - 1 * s, y + 18 * s + i * 4.5 * s, 2.6 * s, 2.4 * s, hair, 1.4 * s); }
      break;
    }
    case 'hydra': { // snakes instead of hair
      for (let i = -2; i <= 2; i++) {
        const sx = x + i * 5 * s, sw = Math.sin(t * 4 + i) * 2 * s;
        c.strokeStyle = INK; c.lineWidth = 4.6 * s; c.lineCap = 'round';
        c.beginPath(); c.moveTo(sx, y - r * 0.6); c.quadraticCurveTo(sx + i * 3 * s + sw, y - r - 8 * s, sx + i * 5 * s - sw, y - r - 12 * s + Math.abs(i) * 3 * s); c.stroke();
        c.strokeStyle = hair; c.lineWidth = 2.8 * s; c.stroke(); c.lineCap = 'butt';
        const hx = sx + i * 5 * s - sw, hy = y - r - 12 * s + Math.abs(i) * 3 * s;
        ell(c, hx, hy, 2.8 * s, 2.2 * s, '#6fae3a', 1.4 * s); ell(c, hx + 0.8 * s, hy - 0.5 * s, 0.6 * s, 0.6 * s, '#ffe23a');
      }
      break;
    }
    case 'stribog': { // windswept hair streaming to one side
      c.fillStyle = hair; const w = Math.sin(t * 8) * 1.5 * s;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 2 * s, y - r + i * 5 * s); c.quadraticCurveTo(x - r - 8 * s, y - r + i * 5 * s + w, x - r - 14 * s, y - r + 3 * s + i * 6 * s + w); c.quadraticCurveTo(x - r - 4 * s, y - r + 6 * s + i * 5 * s, x - 2 * s, y - r + 5 * s + i * 5 * s); c.fill(); c.stroke(); }
      break;
    }
  }
  void back;
}

/** hair, beards, crowns and helmets in front */
function hairFront(c: C, id: string, hair: string, x: number, y: number, r: number, s: number, back: boolean, side: number, t: number): void {
  c.lineWidth = 2 * s; c.strokeStyle = INK;
  const cap = (col: string, a0 = 3.15, a1 = 6.27, k = 0.35) => { // hair on top of the head with a fringe line
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r + 0.8 * s, a0, a1); c.quadraticCurveTo(x + side * 3 * s, y - r * k, x - r - 0.8 * s, y - 0.5 * s); c.closePath(); c.fill(); c.stroke();
  };
  const beard = (col: string, len = 15) => {
    if (back) return;
    c.fillStyle = col; c.beginPath(); c.moveTo(x - 10.5 * s, y + 1 * s); c.quadraticCurveTo(x - 9 * s, y + len * s, x + side * 2 * s, y + (len + 3) * s); c.quadraticCurveTo(x + 9 * s, y + len * s, x + 10.5 * s, y + 1 * s);
    c.quadraticCurveTo(x + 5 * s, y + 7 * s, x, y + 6 * s); c.quadraticCurveTo(x - 5 * s, y + 7 * s, x - 10.5 * s, y + 1 * s); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#5a2a18'; c.lineWidth = 1.4 * s; c.beginPath(); c.arc(x + side * 3.5 * s, y + 5 * s, 2.4 * s, 0.3, 2.84); c.stroke(); c.strokeStyle = INK; c.lineWidth = 2 * s;
  };
  switch (id) {
    case 'prometheus': { // living flames instead of hair
      const base = y - r * 0.45;
      for (let i = -3; i <= 3; i++) {
        const f = 1 + Math.sin(t * 11 + i * 1.7) * 0.15, h = (15 - Math.abs(i) * 3) * s * f, bx = x + i * 3.6 * s, sw = Math.sin(t * 7 + i) * 1.5 * s;
        const g = c.createLinearGradient(0, base - r * 0.6 - h, 0, base);
        g.addColorStop(0, '#fff2a0'); g.addColorStop(0.4, '#ffb02a'); g.addColorStop(1, '#e8401a');
        c.fillStyle = g; c.beginPath(); c.moveTo(bx - 4 * s, base - Math.abs(i) * 0.4 * s);
        c.quadraticCurveTo(bx - 3 * s, base - r * 0.6 - h * 0.5, bx + sw, base - r * 0.6 - h);
        c.quadraticCurveTo(bx + 3 * s, base - r * 0.6 - h * 0.4, bx + 4 * s, base - Math.abs(i) * 0.4 * s); c.closePath(); c.fill();
        c.lineWidth = 1.3 * s; c.strokeStyle = 'rgba(120,20,0,0.6)'; c.stroke();
      }
      break;
    }
    case 'hydra': cap('#3f7a22', 3.3, 6.12, 0.2); break;
    case 'hades': { // long dark hair and a small dark crown with purple flames
      cap(hair, 3.1, 6.32, 0.5);
      c.fillStyle = '#4a3a6a'; c.beginPath(); const cy = y - r + 1 * s;
      c.moveTo(x - 8 * s, cy); for (let k = 0; k < 5; k++) { c.lineTo(x - 8 * s + k * 4 * s + 2 * s, cy - 7 * s); c.lineTo(x - 8 * s + (k + 1) * 4 * s, cy); } c.closePath(); c.fill(); c.stroke();
      for (let k = 0; k < 4; k++) glow(c, x - 6 * s + k * 4 * s, cy - 8 * s - Math.sin(t * 9 + k) * 1.5 * s, 3 * s, '#b46cff', '#f0d8ff');
      break;
    }
    case 'apollo': { // golden curls + laurel wreath
      for (let i = -2; i <= 2; i++) ell(c, x + i * 4.6 * s, y - r * 0.78 + Math.abs(i) * 1.5 * s, 4.2 * s, 4.2 * s, hair, 1.6 * s);
      c.strokeStyle = '#3f8a2a'; c.lineWidth = 2 * s; c.beginPath(); c.arc(x, y - 1 * s, r + 0.5 * s, 3.4, 6.03); c.stroke();
      c.fillStyle = '#5fbf4a'; for (let a = 3.5; a < 6.0; a += 0.42) { c.beginPath(); c.ellipse(x + Math.cos(a) * (r + 1 * s), y - 1 * s + Math.sin(a) * (r + 1 * s), 2.6 * s, 1.3 * s, a + 1, 0, 6.2832); c.fill(); }
      break;
    }
    case 'heracles': { // lion head as a hood + short beard
      beard(hair, 9);
      c.fillStyle = '#c9862e'; c.beginPath(); c.arc(x, y - 1 * s, r + 3 * s, 3.25, 6.17); c.closePath(); c.fill(); c.stroke();
      for (let a = 3.3; a < 6.2; a += 0.45) ell(c, x + Math.cos(a) * (r + 3 * s), y - 1 * s + Math.sin(a) * (r + 3 * s), 3 * s, 3 * s, '#8f5418');
      for (const sd of [-1, 1]) ell(c, x + sd * 7 * s, y - r - 2 * s, 2.6 * s, 2.6 * s, '#c9862e', 1.5 * s);
      break;
    }
    case 'stribog': cap(hair, 3.2, 6.25, 0.25); break;
    case 'poseidon': { // sea-green hair, beard and a gold crown
      beard(hair, 16); cap(hair, 3.1, 6.32, 0.45);
      c.fillStyle = '#ffd23a'; c.beginPath(); const cy = y - r + 2 * s;
      c.moveTo(x - 8 * s, cy); c.lineTo(x - 8 * s, cy - 7 * s); c.lineTo(x - 4 * s, cy - 3 * s); c.lineTo(x, cy - 9 * s); c.lineTo(x + 4 * s, cy - 3 * s); c.lineTo(x + 8 * s, cy - 7 * s); c.lineTo(x + 8 * s, cy); c.closePath(); c.fill(); c.stroke();
      break;
    }
    case 'skadi': { // white hair with an ice tiara
      cap(hair, 3.1, 6.32, 0.4);
      c.fillStyle = '#9fe2ff'; c.beginPath(); const cy = y - r + 2 * s;
      c.moveTo(x - 7 * s, cy); c.lineTo(x - 3 * s, cy - 5 * s); c.lineTo(x, cy - 11 * s); c.lineTo(x + 3 * s, cy - 5 * s); c.lineTo(x + 7 * s, cy); c.closePath(); c.fill(); c.stroke();
      glow(c, x, cy - 6 * s, 4 * s, '#c8f0ff');
      break;
    }
    case 'veles': { // shaggy hair, beard, antlers
      beard(hair, 13); cap(hair, 3.05, 6.37, 0.55);
      c.strokeStyle = '#d9c39a'; c.lineWidth = 3 * s; c.lineCap = 'round';
      for (const sd of [-1, 1]) {
        c.beginPath(); c.moveTo(x + sd * 6 * s, y - r + 1 * s); c.lineTo(x + sd * 12 * s, y - r - 10 * s); c.lineTo(x + sd * 18 * s, y - r - 14 * s);
        c.moveTo(x + sd * 10 * s, y - r - 6 * s); c.lineTo(x + sd * 16 * s, y - r - 5 * s);
        c.moveTo(x + sd * 12 * s, y - r - 10 * s); c.lineTo(x + sd * 11 * s, y - r - 17 * s); c.stroke();
      }
      c.lineCap = 'butt';
      break;
    }
    case 'perun': { // big beard and a winged helmet
      beard(hair, 16);
      c.fillStyle = '#b8c4d0'; c.beginPath(); c.arc(x, y, r + 1.5 * s, 3.1, 6.32); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(x + sd * 9 * s, y - r * 0.6); c.quadraticCurveTo(x + sd * 22 * s, y - r - 6 * s, x + sd * 18 * s, y - r - 12 * s); c.quadraticCurveTo(x + sd * 14 * s, y - r - 4 * s, x + sd * 8 * s, y - r * 0.9); c.closePath(); c.fill(); c.stroke(); }
      break;
    }
  }
}


// ================= heroes from pictures =================
/** where things are on each picture, as shares of its width and height:
 *  glow — the magic point of the weapon; face — head centre and size (share of height) for avatars */
interface ImgMeta { glow: [number, number]; face: [number, number, number]; smoke?: [number, number][]; float?: boolean }
const IMG_META: Record<string, ImgMeta> = {
  apollo: { glow: [0.2, 0.33], face: [0.63, 0.26, 0.44] },
  perun: { glow: [0.2, 0.15], face: [0.58, 0.3, 0.44] },
  prometheus: { glow: [0.14, 0.19], face: [0.62, 0.3, 0.42] },
  heracles: { glow: [0.15, 0.15], face: [0.56, 0.33, 0.36] },
  stribog: { glow: [0.8, 0.45], face: [0.52, 0.27, 0.36] },
  poseidon: { glow: [0.12, 0.05], face: [0.5, 0.22, 0.36] }, // правка 101: on legs now
  skadi: { glow: [0.13, 0.17], face: [0.52, 0.24, 0.34] },
  veles: { glow: [0.86, 0.25], face: [0.56, 0.27, 0.36] },
  hades: { glow: [0.82, 0.62], face: [0.46, 0.26, 0.34] },
  hydra: { glow: [0.88, 0.42], face: [0.5, 0.27, 0.5], smoke: [[0.88, 0.42], [0.1, 0.33], [0.8, 0.7]] },
};
/** height of a picture hero in world units at scale 1 */
export const HERO_IMG_H = 84;
const imgCache = new Map<string, HTMLImageElement>();
function heroImg(id: string): HTMLImageElement | null {
  const src = HERO_IMG[id]; if (!src) return null;
  let im = imgCache.get(id);
  if (!im) { im = new Image(); im.src = src; imgCache.set(id, im); }
  return im.complete && im.naturalWidth ? im : null;
}
export const hasHeroImg = (id: string) => !!HERO_IMG[id];
/** load every picture; resolves when all are decoded */
export function loadHeroImgs(): Promise<void> {
  for (const pr of Object.values(HERO_PARTS)) { partImg(pr.body); for (const L of pr.legs) partImg(L.src); }
  return Promise.all(Object.keys(HERO_IMG).map(id => {
    let im = imgCache.get(id);
    if (!im) { im = new Image(); im.src = HERO_IMG[id]; imgCache.set(id, im); }
    return im.decode ? im.decode().catch(() => {}) : Promise.resolve();
  })).then(() => {});
}
const facing = new Map<string, number>();
const walkBlend = new Map<string, { v: number; t: number }>(); // 0 standing … 1 walking, eased
const partImgs = new Map<string, HTMLImageElement>();
function partImg(src: string): HTMLImageElement | null {
  let im = partImgs.get(src);
  if (!im) { im = new Image(); im.src = src; partImgs.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
/** where the weapon's magic point is, relative to the feet: dx to the side, up above the ground (screen units) */
export function heroWeaponPoint(id: string, s: number): { dx: number; up: number } {
  const im = heroImg(id), dir = facing.get(id) ?? 1;
  if (im) {
    const meta = IMG_META[id] ?? { glow: [0.2, 0.2], face: [0.5, 0.3, 0.45] } as ImgMeta;
    const H = HERO_IMG_H * s, W = H * im.naturalWidth / im.naturalHeight;
    return { dx: (meta.glow[0] - 0.5) * W * dir, up: (1 - meta.glow[1]) * H };
  }
  return { dx: 13 * s * dir, up: 62 * s };
}

function drawHeroImg(c: C, id: string, im: HTMLImageElement, el: Element, x: number, gy: number, s: number, pose: HeroPose): void {
  const meta = IMG_META[id] ?? { glow: [0.2, 0.2], face: [0.5, 0.3, 0.45] } as ImgMeta;
  const H = HERO_IMG_H * s, W = H * im.naturalWidth / im.naturalHeight;
  // keep the last direction until the hero clearly turns
  let dir = facing.get(id) ?? 1;
  if (pose.fx < -0.2) dir = -1; else if (pose.fx > 0.2) dir = 1;
  facing.set(id, dir);
  const t = pose.t, col = EL_HEX[el];
  // ease in and out of walking instead of snapping
  const wb = walkBlend.get(id) ?? { v: 0, t };
  const dtw = Math.min(0.1, Math.max(0, t - wb.t)); wb.t = t;
  wb.v = Math.max(0, Math.min(1, wb.v + (pose.moving ? 1 : -1) * dtw / 0.18)); walkBlend.set(id, wb);
  const w = wb.v * wb.v * (3 - 2 * wb.v), ph = t * 11;
  const b = Math.sin(t * 2.4);
  const lift = meta.float ? (3 + Math.sin(t * 2.2) * 2.5) * s : Math.abs(Math.sin(ph)) * 1.2 * s * w;                    // small bob on each step
  const rot = (0.035 + Math.sin(ph) * 0.006) * w + Math.sin(t * 1.2) * 0.012 * (1 - w); // lean into the walk
  const sy = 1 + 0.018 * b * (1 - w), sx = 1 - 0.01 * b * (1 - w);      // breathing when standing
  // dust from the feet while walking
  if (w > 0.3 && !meta.float) for (let i = 0; i < 3; i++) {
    const k = (t * 2.2 + i / 3) % 1;
    c.globalAlpha = (1 - k) * 0.35 * w;
    ell(c, x - dir * (6 + k * 16) * s, gy - 2 * s - k * 6 * s, (2.5 + k * 4) * s, (2 + k * 3) * s, '#e8dcc0');
    c.globalAlpha = 1;
  }
  c.save();
  c.translate(x, gy - lift);
  c.rotate(rot * dir);
  c.scale(sx * dir, sy);
  if (pose.blink) c.globalAlpha = 0.45;
  const parts = HERO_PARTS[id], body = parts ? partImg(parts.body) : null;
  if (parts && body) { // legs that really step
    const k = H / im.naturalHeight, ox = -W / 2, oy = -H;
    parts.legs.forEach((L, i) => {
      const li = partImg(L.src); if (!li) return;
      const ph2 = Math.sin(ph + i * Math.PI), sw = ph2 * 0.58 * w, up = Math.max(0, Math.cos(ph + i * Math.PI)) * 3.2 * s * w, fwd = ph2 * 3.5 * s * w;
      c.save(); c.translate(ox + L.px * k + fwd, oy + L.py * k - up); c.rotate(-sw);
      c.drawImage(li, (L.x - L.px) * k, (L.y - L.py) * k, L.w * k, L.h * k); c.restore();
    });
    c.drawImage(body, -W / 2, -H, W, H);
  } else c.drawImage(im, -W / 2, -H, W, H);
  // living glow on the weapon
  const gx = -W / 2 + meta.glow[0] * W, gyy = -H + meta.glow[1] * H;
  const pulse = 0.75 + 0.25 * Math.sin(t * 4.2);
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = (pose.blink ? 0.3 : 0.65) * pulse;
  glow(c, gx, gyy, 15 * s * (0.9 + 0.2 * pulse), col, '#ffffff');
  // sparks rising from the weapon
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.9 + i / 3) % 1;
    c.globalAlpha = (1 - k) * 0.8;
    ell(c, gx + Math.sin(t * 3 + i * 2.1) * 6 * s, gyy - k * 16 * s, 1.6 * s * (1 - k * 0.5), 1.6 * s * (1 - k * 0.5), col);
  }
  c.globalCompositeOperation = 'source-over';
  // poison smoke curling up
  if (meta.smoke) for (const [px, py] of meta.smoke) for (let i = 0; i < 3; i++) {
    const k = (t * 0.5 + i / 3 + px) % 1;
    c.globalAlpha = (1 - k) * 0.35;
    ell(c, -W / 2 + px * W + Math.sin(t * 2 + i * 2 + py * 9) * 5 * s, -H + py * H - k * 22 * s, (3 + k * 7) * s, (3 + k * 7) * s, col);
  }
  c.restore();
}

// ---------- hero pictures for the menus (drawn once, cached as images) ----------
const picCache = new Map<string, string>();
/** 'full' — whole figure casting; 'face' — head and shoulders for avatars */
export function heroPic(id: string, el: Element, mode: 'full' | 'face', px = 160): string {
  if (mode === 'face' && HERO_FACE[id]) return HERO_FACE[id]; // правка 101: drawn portrait, face centred
  const key = `${id}:${mode}:${px}`;
  const hit = picCache.get(key); if (hit) return hit;
  const im = heroImg(id);
  if (HERO_IMG[id] && !im) return HERO_IMG[id]; // not decoded yet: the raw picture, next render gets the framed one
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const c = cv.getContext('2d')!;
  if (im) {
    const meta = IMG_META[id] ?? { glow: [0.2, 0.2], face: [0.5, 0.3, 0.45] } as ImgMeta;
    const iw = im.naturalWidth, ih = im.naturalHeight;
    if (mode === 'full') {
      const h = px * 0.96, w = h * iw / ih, sc = Math.min(1, px * 0.98 / w);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(px / 2, px * 0.95, px * 0.22, px * 0.05, 0, 0, 6.2832); c.fill();
      c.drawImage(im, (px - w * sc) / 2, px * 0.97 - h * sc, w * sc, h * sc);
    } else {
      const [fx, fy, fs] = meta.face, side = fs * ih;
      c.drawImage(im, fx * iw - side / 2, fy * ih - side / 2, side, side, 0, 0, px, px);
    }
  } else {
    const pose = { fx: 0.55, fy: 0.55, t: 0.3, moving: false };
    if (mode === 'full') {
      const s = px / 86;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(px / 2, px * 0.93, 18 * s, 5 * s, 0, 0, 6.2832); c.fill();
      drawHero(c, id, el, px / 2 - 5 * s, px * 0.93, s, pose);
    } else {
      const s = px / 46;
      drawHero(c, id, el, px / 2, px * 0.45 + 47 * s, s, { fx: 0.2, fy: 0.6, t: 0.3, moving: false });
    }
  }
  const url = cv.toDataURL();
  picCache.set(key, url);
  return url;
}

// ================= monsters =================
export interface MonsterLook { flash: boolean; frozen: boolean; t: number; ux: number; uy: number; state: number; biome: number; charge?: number }

/** main body colours per biome (desert, meadow) */
const SKINS: Record<string, [string, string][]> = {
  grunt: [['#8fae4a', '#4a6a1c'], ['#6fae3a', '#2f6a14']],
  fast: [['#c8a06a', '#6e4e24'], ['#8a8a92', '#3e3e48']],
  tank: [['#b49a72', '#5e4a30'], ['#8a8e94', '#44484e']],
  tank2: [['#9aa4ae', '#4a525a'], ['#9aa4ae', '#4a525a']],
  shooter: [['#efe6d2', '#9a8e72'], ['#efe6d2', '#9a8e72']],
  exploder: [['#d84a5a', '#6a1824'], ['#d84a5a', '#6a1824']],
  summoner: [['#7a3fae', '#341560'], ['#5a3fae', '#22155e']],
  miniboss: [['#6f9a3a', '#2f4a14'], ['#6f9a3a', '#2f4a14']],
  goldboss: [['#ffd23a', '#9a6a00'], ['#ffd23a', '#9a6a00']],
  boss: [['#7a2a8d', '#2a0a36'], ['#7a2a8d', '#2a0a36']],
  // правка 113
  shield: [['#6fae4a', '#2a5a18'], ['#7ab84f', '#2e6a1c']],
  ram: [['#7a5238', '#2e1a10'], ['#6a4a3a', '#2a1a12']],
  harpy: [['#a8784a', '#4a2c14'], ['#8a6a4a', '#3a2614']],
  healer: [['#7ab84f', '#2e6a1c'], ['#6fae4a', '#2a5a18']],
  archer: [['#d8cfba', '#7e735a'], ['#d8cfba', '#7e735a']],
  slime: [['#8ac83a', '#2a5a0e'], ['#6ab88a', '#1a4a36']],
  slimelet: [['#9ad84a', '#3a6a14'], ['#7ac89a', '#225a46']],
  golem: [['#5a5e6a', '#22252c'], ['#5a5e6a', '#22252c']],
  ghost: [['#a8c8e0', '#3a5a7a'], ['#a8c8e0', '#3a5a7a']],
  ogre: [['#8a9a4a', '#3a4818'], ['#8a9a4a', '#3a4818']],
  harpyQueen: [['#7a3a6a', '#2e0e28'], ['#7a3a6a', '#2e0e28']],
  colossus: [['#8a8274', '#3a342a'], ['#8a8274', '#3a342a']],
};

function eyes(c: C, x: number, y: number, s: number, ux: number, uy: number, col = '#fff', pupil = '#111', gap = 4, r = 2.4): void {
  if (uy < -0.55) return; // walking away: we see the back
  for (const sd of [-1, 1]) {
    const ex = x + ux * 2.5 * s + sd * gap * s * Math.max(0.45, 1 - Math.abs(ux) * 0.4), ey = y + uy * 1 * s;
    ell(c, ex, ey, r * s, r * s, col);
    ell(c, ex + ux * r * 0.4 * s, ey + uy * r * 0.3 * s, r * 0.5 * s, r * 0.55 * s, pupil);
  }
}

/** colour between a and b (hex), t 0..1 */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
/** a rounded body part with cel shading: light from the top left, dark underside, a small glint */
function blob(c: C, x: number, y: number, rx: number, ry: number, main: string, dark: string, lw: number, glint = true): void {
  const g = c.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y + ry * 0.2, Math.max(rx, ry) * 1.15);
  g.addColorStop(0, mix(main, '#ffffff', 0.35)); g.addColorStop(0.5, main); g.addColorStop(1, dark);
  ell(c, x, y, rx, ry, g, lw);
  if (glint) { c.save(); c.globalAlpha = 0.45; ell(c, x - rx * 0.38, y - ry * 0.5, rx * 0.3, ry * 0.16, '#ffffff'); c.restore(); }
}
function poly(c: C, pts: number[], fill: string | CanvasGradient, lw: number, stroke = INK): void {
  c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath();
  c.fillStyle = fill; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
function line(c: C, pts: number[], col: string, w: number, cap: CanvasLineCap = 'round'): void {
  c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap; c.stroke(); c.lineCap = 'butt';
}
/** angry eyes with brows */
function angryEyes(c: C, x: number, y: number, s: number, ux: number, uy: number, iris: string, gap: number, r: number, brow = true): void {
  if (uy < -0.55) return;
  const k = Math.max(0.45, 1 - Math.abs(ux) * 0.4);
  for (const sd of [-1, 1]) {
    const ex = x + ux * 2.4 * s + sd * gap * s * k, ey = y + uy * s;
    ell(c, ex, ey, r * s, r * 0.9 * s, iris, 0.9 * s);
    ell(c, ex + ux * r * 0.35 * s, ey + 0.2 * s, r * 0.42 * s, r * 0.55 * s, '#140808');
    ell(c, ex - r * 0.35 * s, ey - r * 0.35 * s, r * 0.22 * s, r * 0.22 * s, '#ffffff');
    if (brow) line(c, [ex - sd * r * 1.1 * s, ey - r * 1.35 * s, ex + sd * r * 0.9 * s, ey - r * 0.75 * s], INK, 1.4 * s);
  }
}

/** a monster standing at (x, gy); r = its collision radius */
export function drawMonster(c: C, kind: EnemyKind, x: number, gy: number, r: number, L: MonsterLook): void {
  const pal = SKINS[kind] ?? SKINS.grunt, [m0, d0] = pal[L.biome % pal.length];
  const main = L.flash ? '#ffffff' : L.frozen ? '#c4ecff' : m0, dark = L.flash ? '#dddddd' : L.frozen ? '#6aa8c8' : d0;
  const tint = (col: string) => L.flash ? mix(col, '#ffffff', 0.75) : L.frozen ? mix(col, '#bfe8ff', 0.55) : col;
  const s = r / 13, lw = Math.max(1.6, 1.9 * s);
  const step = Math.sin(L.t * 12), bob = Math.abs(step) * 1.3 * s;
  const ux = L.ux, uy = L.uy, dir = ux >= 0 ? 1 : -1, front = uy > -0.55;
  c.lineJoin = 'round';
  switch (kind) {
    case 'grunt': { // goblin: tusks, loincloth, a club studded with nails
      const by = gy - bob;
      for (const sd of [-1, 1]) { // feet with toes
        const fx = x + sd * 5 * s + step * sd * 1.6 * s;
        ell(c, fx, gy - 2 * s, 4.2 * s, 2.6 * s, tint('#4a3420'), lw * 0.8);
        for (let t = -1; t <= 1; t++) ell(c, fx + t * 2 * s + dir * 2 * s, gy - 0.6 * s, 0.9 * s, 0.7 * s, tint('#6a4c30'));
      }
      // weapon arm behind when facing away
      blob(c, x, by - 11 * s, 10 * s, 8.6 * s, main, dark, lw);
      // loincloth with a rope belt
      poly(c, [x - 9 * s, by - 9 * s, x + 9 * s, by - 9 * s, x + 7 * s, by - 2 * s, x + 2 * s, by - 4 * s, x - 1 * s, by - 1 * s, x - 7 * s, by - 3 * s], tint('#7a5230'), lw * 0.7);
      line(c, [x - 9.5 * s, by - 9 * s, x + 9.5 * s, by - 9 * s], tint('#c8a060'), 1.6 * s);
      ell(c, x + 2 * s, by - 9 * s, 1.6 * s, 1.4 * s, tint('#e0c080'), 0.7 * s);
      // free hand
      blob(c, x - dir * 10 * s, by - 11 * s, 3.2 * s, 3 * s, main, dark, lw * 0.8, false);
      // head: ears with pink insides
      const hy = by - 21 * s;
      for (const sd of [-1, 1]) {
        poly(c, [x + sd * 6 * s, hy - 2 * s, x + sd * 18 * s, hy - 7 * s + Math.sin(L.t * 5 + sd) * 0.8 * s, x + sd * 8 * s, hy + 3 * s], main, lw * 0.8);
        poly(c, [x + sd * 8 * s, hy - 1 * s, x + sd * 15 * s, hy - 5 * s, x + sd * 9 * s, hy + 1.5 * s], tint('#d88a7a'), 0);
      }
      blob(c, x, hy, 8.5 * s, 7.6 * s, main, dark, lw);
      angryEyes(c, x, hy - 1.5 * s, s, ux, uy, '#ffe23a', 3.3, 2.1);
      if (front) {
        ell(c, x + ux * 3 * s, hy + 1.8 * s, 2 * s, 1.6 * s, dark, 0.8 * s); // nose
        line(c, [x - 3.5 * s + ux * 2 * s, hy + 4.4 * s, x + 3.5 * s + ux * 2 * s, hy + 4.4 * s], INK, 1.2 * s);
        for (const sd of [-1, 1]) poly(c, [x + ux * 2 * s + sd * 2.6 * s, hy + 4.4 * s, x + ux * 2 * s + sd * 1.7 * s, hy + 1.8 * s, x + ux * 2 * s + sd * 0.9 * s, hy + 4.4 * s], '#fff8e0', 0.6 * s);
      }
      // club with iron nails
      const cx = x + dir * 11 * s, cy = by - 13 * s;
      c.save(); c.translate(cx, cy); c.rotate(dir * 0.5 + Math.sin(L.t * 6) * 0.15);
      c.fillStyle = vgrad(c, -12 * s, 2 * s, tint('#a06a32'), tint('#5a3818')); c.strokeStyle = INK; c.lineWidth = lw * 0.8;
      c.beginPath(); c.roundRect(-1.8 * s, -10 * s, 3.6 * s, 13 * s, 1.5 * s); c.fill(); c.stroke();
      blob(c, 0, -13 * s, 4.4 * s, 5.4 * s, tint('#b07a3a'), tint('#5a3818'), lw * 0.8, false);
      for (const [nx, ny] of [[-3, -14], [2.5, -16], [3, -11], [-2, -10]]) { ell(c, nx * s, ny * s, 1 * s, 1 * s, tint('#c8ccd4'), 0.6 * s); }
      c.restore();
      blob(c, cx, cy + 1 * s, 3.2 * s, 3 * s, main, dark, lw * 0.8, false); // hand on the club
      break;
    }
    case 'fast': { // lean wolf: fur ridge, fangs, bushy tail with a light tip
      for (let i = 0; i < 4; i++) {
        const lx = x + (i < 2 ? -6.5 : 6) * s + (i % 2) * 2 * s, ph = Math.sin(L.t * 18 + i * 1.6) * 3 * s, near = i % 2 === 1;
        line(c, [lx, gy - 8 * s, lx + ph * 0.6, gy - 4 * s, lx + ph, gy - 1 * s], INK, (near ? 3.8 : 3.4) * s);
        line(c, [lx, gy - 8 * s, lx + ph * 0.6, gy - 4 * s, lx + ph, gy - 1 * s], near ? main : dark, (near ? 2.4 : 2) * s);
        ell(c, lx + ph + dir * 0.8 * s, gy - 0.8 * s, 1.8 * s, 1.1 * s, dark, 0.7 * s);
      }
      const wag = Math.sin(L.t * 14) * 2 * s;
      c.beginPath(); c.moveTo(x - dir * 9 * s, gy - 13 * s);
      c.quadraticCurveTo(x - dir * 19 * s, gy - 19 * s + wag, x - dir * 22 * s, gy - 11 * s + wag);
      c.quadraticCurveTo(x - dir * 15 * s, gy - 9 * s, x - dir * 9 * s, gy - 9 * s); c.closePath();
      c.fillStyle = main; c.fill(); c.strokeStyle = INK; c.lineWidth = lw * 0.8; c.stroke();
      ell(c, x - dir * 20 * s, gy - 12 * s + wag, 2.4 * s, 2 * s, mix(main, '#ffffff', 0.55));
      blob(c, x, gy - 11 * s - bob * 0.5, 11.5 * s, 5.8 * s, main, dark, lw);
      ell(c, x + dir * 1 * s, gy - 8.6 * s - bob * 0.5, 7 * s, 2.2 * s, mix(main, '#ffffff', 0.4)); // light belly
      // fur ridge along the back
      const ry = gy - 16.5 * s - bob * 0.5; c.beginPath(); c.moveTo(x - dir * 9 * s, ry + 2 * s);
      for (let k = 0; k < 5; k++) c.lineTo(x - dir * (7 - k * 3.5) * s, ry - (k % 2 ? 2.4 : 0.2) * s);
      c.lineTo(x + dir * 8 * s, ry + 1.5 * s); c.fillStyle = dark; c.fill(); c.strokeStyle = INK; c.lineWidth = lw * 0.6; c.stroke();
      // head
      const hx = x + dir * 10.5 * s, hy = gy - 16 * s - bob * 0.5;
      poly(c, [hx - dir * 2.5 * s, hy - 3 * s, hx + dir * 0.5 * s, hy - 11 * s, hx + dir * 4 * s, hy - 3 * s], main, lw * 0.8);
      poly(c, [hx - dir * 1 * s, hy - 4 * s, hx + dir * 0.6 * s, hy - 8.5 * s, hx + dir * 2.6 * s, hy - 4 * s], tint('#d88a7a'), 0);
      blob(c, hx, hy, 5.6 * s, 5 * s, main, dark, lw * 0.9);
      blob(c, hx + dir * 5.8 * s, hy + 1.6 * s, 4.2 * s, 2.7 * s, mix(main, '#ffffff', 0.15), dark, lw * 0.8, false);
      ell(c, hx + dir * 9.4 * s, hy + 0.6 * s, 1.4 * s, 1.1 * s, INK);
      line(c, [hx + dir * 3 * s, hy + 3.6 * s, hx + dir * 9 * s, hy + 3.2 * s], INK, 1 * s);
      for (const k of [4.5, 7]) poly(c, [hx + dir * k * s, hy + 3.3 * s, hx + dir * (k + 0.8) * s, hy + 5.2 * s, hx + dir * (k + 1.5) * s, hy + 3.3 * s], '#fff8e0', 0.5 * s);
      ell(c, hx + dir * 1.6 * s, hy - 1.4 * s, 1.8 * s, 1.5 * s, '#ffe23a', 0.6 * s); ell(c, hx + dir * 2 * s, hy - 1.4 * s, 0.7 * s, 1 * s, '#140808');
      line(c, [hx - dir * 0.2 * s, hy - 3.6 * s, hx + dir * 3.2 * s, hy - 2.6 * s], INK, 1.1 * s);
      break;
    }
    case 'tank': case 'tank2': { // stone golem: stacked boulders, cracks, moss, a glowing rune core
      const iron = kind === 'tank2', mb = bob * 0.5;
      for (const sd of [-1, 1]) { c.fillStyle = vgrad(c, gy - 9 * s, gy, main, dark); c.strokeStyle = INK; c.lineWidth = lw; c.beginPath(); c.roundRect(x + sd * 7 * s - 4.5 * s, gy - 9 * s, 9 * s, 9 * s, 2.5 * s); c.fill(); c.stroke(); }
      // torso of two boulders
      blob(c, x, gy - 14 * s - mb, 13 * s, 8 * s, main, dark, lw);
      blob(c, x, gy - 24 * s - mb, 12 * s, 7.5 * s, main, dark, lw);
      // cracks
      line(c, [x - 7 * s, gy - 27 * s - mb, x - 3 * s, gy - 23 * s - mb, x - 5 * s, gy - 19 * s - mb], 'rgba(0,0,0,0.4)', 1.2 * s);
      line(c, [x + 8 * s, gy - 16 * s - mb, x + 4 * s, gy - 12 * s - mb, x + 6 * s, gy - 9 * s - mb], 'rgba(0,0,0,0.4)', 1.2 * s);
      if (iron) { // riveted iron plate and a chain
        c.fillStyle = vgrad(c, gy - 28 * s, gy - 16 * s, tint('#8a96a2'), tint('#3e464e')); c.strokeStyle = INK; c.lineWidth = lw * 0.9;
        c.beginPath(); c.roundRect(x - 9 * s, gy - 28 * s - mb, 18 * s, 12 * s, 2.5 * s); c.fill(); c.stroke();
        for (const [px, py] of [[-6.5, -25.5], [6.5, -25.5], [-6.5, -18.5], [6.5, -18.5]]) ell(c, x + px * s, gy + py * s - mb, 1.1 * s, 1.1 * s, tint('#dfe6ec'), 0.5 * s);
        for (let k = 0; k < 5; k++) ell(c, x - 10 * s + k * 5 * s, gy - 12 * s - mb + (k % 2) * 1 * s, 2 * s, 1.3 * s, 'rgba(0,0,0,0)', 1.1 * s, tint('#9aa4ae'));
      } else { // glowing rune core
        glow(c, x, gy - 22 * s - mb, 6 * s * (0.9 + 0.1 * Math.sin(L.t * 4)), '#ff9a2a', '#fff3c0');
        line(c, [x - 2 * s, gy - 25 * s - mb, x, gy - 20 * s - mb, x + 2 * s, gy - 25 * s - mb], '#fff0b0', 1.2 * s);
      }
      // boulder arms with fists
      for (const sd of [-1, 1]) {
        const ay = gy - 22 * s - mb + step * sd * 1.6 * s;
        blob(c, x + sd * 15 * s, ay, 5.5 * s, 6 * s, main, dark, lw, false);
        blob(c, x + sd * 16 * s, ay + 9 * s, 5 * s, 4.5 * s, mix(main, dark, 0.2), dark, lw, false);
      }
      // head
      blob(c, x, gy - 34 * s - mb, 7.5 * s, 6 * s, main, dark, lw);
      if (!iron && L.biome === 1) { // moss on the meadow
        for (const [mx, my, mr] of [[-4, -38.5, 3.4], [1, -39.5, 3.8], [5, -38, 2.8], [-10, -29, 3], [9, -29.5, 3.2], [-15, -27, 2.6]]) ell(c, x + mx * s, gy + my * s - mb, mr * s, mr * 0.55 * s, tint('#5aa83a'));
      }
      if (front) for (const sd of [-1, 1]) glow(c, x + ux * 2 * s + sd * 3 * s, gy - 34 * s - mb, 3 * s, iron ? '#5ad0ff' : '#ffb43a', '#fff6c0');
      break;
    }
    case 'shooter': { // skeleton archer: bones, pelvis, ragged cloth, quiver, skull with a jaw
      const bone = main, bd = dark;
      for (const sd of [-1, 1]) { // legs with knees
        const fx = x + sd * 4 * s + step * sd * 1.6 * s;
        line(c, [x + sd * 2.5 * s, gy - 12 * s, x + sd * 3.5 * s, gy - 6.5 * s, fx, gy - 1 * s], INK, 3.4 * s);
        line(c, [x + sd * 2.5 * s, gy - 12 * s, x + sd * 3.5 * s, gy - 6.5 * s, fx, gy - 1 * s], bone, 2 * s);
        ell(c, x + sd * 3.5 * s, gy - 6.5 * s, 1.4 * s, 1.4 * s, bone, 0.7 * s);
        ell(c, fx + dir * 1 * s, gy - 0.8 * s, 2.2 * s, 1.1 * s, bone, 0.7 * s);
      }
      // quiver on the back
      c.save(); c.translate(x - dir * 5 * s, gy - 22 * s - bob); c.rotate(-dir * 0.4);
      c.fillStyle = vgrad(c, -7 * s, 7 * s, tint('#7a4a2a'), tint('#3a2010')); c.strokeStyle = INK; c.lineWidth = lw * 0.7;
      c.beginPath(); c.roundRect(-2.5 * s, -6 * s, 5 * s, 12 * s, 1.5 * s); c.fill(); c.stroke();
      for (const k of [-1.2, 1.2]) poly(c, [k * s, -6 * s, k * s - 1.5 * s, -10 * s, k * s + 1.5 * s, -10 * s], tint('#c84a3a'), 0.5 * s);
      c.restore();
      // pelvis and ragged cloth
      poly(c, [x - 6 * s, gy - 13 * s - bob, x + 6 * s, gy - 13 * s - bob, x + 5 * s, gy - 7 * s - bob, x + 2 * s, gy - 9 * s - bob, x, gy - 6 * s - bob, x - 3 * s, gy - 9 * s - bob, x - 5 * s, gy - 6.5 * s - bob], tint('#7a2a2a'), lw * 0.6);
      ell(c, x, gy - 13 * s - bob, 4.5 * s, 2 * s, bone, 0.8 * s);
      // spine and ribs
      line(c, [x, gy - 25 * s - bob, x, gy - 13 * s - bob], INK, 3 * s); line(c, [x, gy - 25 * s - bob, x, gy - 13 * s - bob], bone, 1.8 * s);
      for (let i = 0; i < 3; i++) {
        const yy = gy - 22.5 * s + i * 3.2 * s - bob, w = (6 - i * 0.9) * s;
        c.beginPath(); c.ellipse(x, yy, w, 1.8 * s, 0, 0.15, Math.PI - 0.15); c.strokeStyle = INK; c.lineWidth = 2.6 * s; c.stroke(); c.strokeStyle = bone; c.lineWidth = 1.4 * s; c.stroke();
      }
      // skull with a separate jaw
      const sy = gy - 30.5 * s - bob;
      blob(c, x, sy, 7.6 * s, 6.8 * s, mix(bone, '#ffffff', 0.25), bd, lw);
      if (front) {
        c.fillStyle = mix(bone, bd, 0.2); c.strokeStyle = INK; c.lineWidth = lw * 0.8;
        c.beginPath(); c.roundRect(x - 4.5 * s + ux * 2 * s, sy + 3.5 * s, 9 * s, 3.6 * s, 1.5 * s); c.fill(); c.stroke();
        for (let k = -1; k <= 1; k++) line(c, [x + ux * 2 * s + k * 2 * s, sy + 3.6 * s, x + ux * 2 * s + k * 2 * s, sy + 6 * s], INK, 0.8 * s);
        for (const sd of [-1, 1]) { ell(c, x + ux * 2 * s + sd * 2.8 * s, sy - 0.3 * s, 2.2 * s, 2.5 * s, '#160c0c'); glow(c, x + ux * 2.3 * s + sd * 2.8 * s, sy - 0.2 * s, 1.6 * s, '#ff3a2a', '#ffd0c0'); }
        poly(c, [x + ux * 2 * s, sy + 1.4 * s, x + ux * 2 * s - 0.9 * s, sy + 3 * s, x + ux * 2 * s + 0.9 * s, sy + 3 * s], '#160c0c', 0);
      }
      line(c, [x + 3 * s, sy - 5 * s, x + 1 * s, sy - 2 * s], 'rgba(0,0,0,0.35)', 0.9 * s); // crack
      // bow arm and bow
      const bx = x + ux * 10 * s, bby = gy - 20 * s - bob + uy * 3 * s, a = Math.atan2(uy, ux);
      line(c, [x + dir * 3 * s, gy - 23 * s - bob, bx - ux * 3 * s, bby], INK, 3 * s); line(c, [x + dir * 3 * s, gy - 23 * s - bob, bx - ux * 3 * s, bby], bone, 1.6 * s);
      const pull = (L.charge ?? 0) * 7 * s;
      c.save(); c.translate(bx, bby); c.rotate(a);
      c.strokeStyle = INK; c.lineWidth = 3.6 * s; c.beginPath(); c.arc(-4 * s, 0, 9 * s, -1.1, 1.1); c.stroke();
      c.strokeStyle = tint('#9a6a32'); c.lineWidth = 2.2 * s; c.stroke();
      const ex = -4 * s + Math.cos(1.1) * 9 * s, ey = Math.sin(1.1) * 9 * s;
      c.strokeStyle = '#e8e2d0'; c.lineWidth = 0.9 * s; c.beginPath(); c.moveTo(ex, -ey); c.lineTo(ex - pull, 0); c.lineTo(ex, ey); c.stroke();
      if (pull > 0) { line(c, [ex - pull, 0, 8 * s, 0], '#efe6d2', 1.6 * s); c.globalAlpha = L.charge!; glow(c, 8 * s, 0, 6 * s, '#ff3a2a', '#ffd0c0'); c.globalAlpha = 1; }
      c.restore();
      break;
    }
    case 'exploder': { // walking bomb: iron bands, rivets, stitched grin, sparking fuse
      const arm = L.state === 1, blink = arm && Math.floor(L.t * 14) % 2 === 0;
      const body = blink ? '#ffef6a' : main;
      for (const sd of [-1, 1]) ell(c, x + sd * 5 * s + step * sd * 1.6 * s, gy - 2 * s, 3.8 * s, 2.4 * s, tint('#3a2a2a'), lw * 0.8);
      const sw = arm ? 1 + Math.sin(L.t * 30) * 0.08 : 1, cy = gy - 13 * s - bob;
      blob(c, x, cy, 11.5 * s * sw, 11 * s * sw, body, dark, lw);
      // iron bands with rivets
      c.save(); c.beginPath(); c.ellipse(x, cy, 11.5 * s * sw, 11 * s * sw, 0, 0, 6.2832); c.clip();
      for (const k of [-0.42, 0.42]) {
        c.beginPath(); c.ellipse(x + k * 14 * s, cy, 3 * s, 12 * s, 0, 0, 6.2832); c.strokeStyle = INK; c.lineWidth = 3.4 * s; c.stroke(); c.strokeStyle = tint('#5a5e66'); c.lineWidth = 2 * s; c.stroke();
        for (const ry of [-6, 0, 6]) ell(c, x + k * 14 * s + (k > 0 ? -2.6 : 2.6) * s, cy + ry * s, 0.9 * s, 0.9 * s, tint('#c8ccd4'));
      }
      c.restore();
      ell(c, x, cy, 11.5 * s * sw, 11 * s * sw, 'rgba(0,0,0,0)', lw);
      angryEyes(c, x, cy - 2 * s, s, ux, uy, '#fff6c0', 3.6, 2.3);
      if (front) { // stitched grin
        c.beginPath(); c.arc(x + ux * 2 * s, cy + 2.6 * s, 4 * s, 0.25, Math.PI - 0.25); c.strokeStyle = INK; c.lineWidth = 1.5 * s; c.stroke();
        for (let k = -1; k <= 1; k++) line(c, [x + ux * 2 * s + k * 2.2 * s, cy + 5 * s, x + ux * 2 * s + k * 2.2 * s, cy + 7.6 * s], INK, 0.9 * s);
      }
      // fuse with a metal cap
      c.fillStyle = tint('#6a6e76'); c.strokeStyle = INK; c.lineWidth = lw * 0.7; c.beginPath(); c.roundRect(x - 2.5 * s, cy - 13 * s, 5 * s, 3.5 * s, 1 * s); c.fill(); c.stroke();
      c.strokeStyle = '#5a4030'; c.lineWidth = 1.8 * s; c.beginPath(); c.moveTo(x, cy - 13 * s); c.quadraticCurveTo(x + 4 * s, cy - 17 * s, x + 2 * s, cy - 20 * s); c.stroke();
      glow(c, x + 2 * s, cy - 21 * s, (arm ? 7 : 4.5) * s * (1 + Math.sin(L.t * 25) * 0.2), '#ffb43a', '#fff');
      for (let i = 0; i < 3; i++) { const k = (L.t * 3 + i / 3) % 1; c.globalAlpha = 1 - k; ell(c, x + 2 * s + Math.sin(i * 2.3 + L.t * 9) * 6 * s * k, cy - 21 * s - k * 6 * s, 0.9 * s, 0.9 * s, '#ffe680'); c.globalAlpha = 1; }
      break;
    }
    case 'summoner': { // hooded shaman: trimmed robe, sash, skull staff, floating runes
      const top = gy - 32 * s - bob;
      c.fillStyle = vgrad(c, top, gy, main, dark); c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.moveTo(x, top - 4 * s); c.quadraticCurveTo(x + 10 * s, top + 4 * s, x + 13 * s, gy - 2 * s);
      for (let k = 0; k < 6; k++) c.lineTo(x + (13 - (k + 1) * 26 / 6) * s, gy - (k % 2 ? 2 : 0) * s - 1 * s); // ragged hem
      c.quadraticCurveTo(x - 10 * s, top + 4 * s, x, top - 4 * s); c.fill(); c.stroke();
      line(c, [x - 12 * s, gy - 4 * s, x + 12 * s, gy - 4 * s], tint('#e0b040'), 1.3 * s); // gold trim
      line(c, [x - 8 * s, gy - 15 * s - bob, x + 8 * s, gy - 15 * s - bob], tint('#c8302a'), 2.2 * s); // sash
      c.strokeStyle = 'rgba(255,200,255,0.55)'; c.lineWidth = 1.1 * s; c.beginPath(); c.moveTo(x - 4 * s, gy - 9 * s); c.lineTo(x, gy - 12 * s); c.lineTo(x + 4 * s, gy - 9 * s); c.moveTo(x, gy - 12 * s); c.lineTo(x, gy - 7 * s); c.stroke();
      // hood opening
      if (front) { ell(c, x + ux * 2 * s, top + 8 * s, 6.2 * s, 5.4 * s, '#14081e', lw * 0.6); for (const sd of [-1, 1]) glow(c, x + ux * 2.5 * s + sd * 2.6 * s, top + 8 * s, 2.6 * s, '#ff5adc', '#fff'); }
      // sleeve holding the staff
      const stx = x + dir * 13 * s;
      line(c, [stx, gy - 1 * s, stx, top - 3 * s], INK, 3.6 * s); line(c, [stx, gy - 1 * s, stx, top - 3 * s], tint('#6a4a2a'), 2.2 * s);
      blob(c, stx - dir * 2 * s, gy - 17 * s - bob, 3.6 * s, 3.2 * s, main, dark, lw * 0.8, false);
      blob(c, stx, top - 7 * s, 3.4 * s, 3 * s, tint('#efe6d2'), tint('#9a8e72'), lw * 0.7, false); // skull on the staff
      for (const sd of [-1, 1]) ell(c, stx + sd * 1.2 * s, top - 7.4 * s, 0.8 * s, 0.9 * s, '#160c0c');
      glow(c, stx, top - 8 * s, 8 * s * (1 + Math.sin(L.t * 5) * 0.15), '#c58aff', 'rgba(255,255,255,0.6)');
      for (let i = 0; i < 3; i++) { // runes circling the shaman
        const a = L.t * 1.6 + i * 2.09, rx = x + Math.cos(a) * 15 * s, ry2 = gy - 20 * s + Math.sin(a) * 5 * s;
        glow(c, rx, ry2, 3.2 * s, '#b46cff', '#f0d8ff');
      }
      break;
    }
    case 'miniboss': case 'goldboss': { // orc warlord: cape, chest plate, tusks, scar, double axe
      const gold = kind === 'goldboss', skin = gold ? '#ffd23a' : main, skinD = gold ? '#9a6a00' : dark;
      const metal = gold ? '#fff0a0' : '#8a929c', metalD = gold ? '#b07a00' : '#3a4048';
      const by = gy - bob;
      // cape behind
      poly(c, [x - 11 * s, by - 26 * s, x + 11 * s, by - 26 * s, x + 14 * s + Math.sin(L.t * 4) * s, by - 3 * s, x - 14 * s + Math.sin(L.t * 4 + 1) * s, by - 3 * s], tint(gold ? '#c8302a' : '#7a1a1a'), lw);
      for (const sd of [-1, 1]) ell(c, x + sd * 6 * s + step * sd * 1.6 * s, gy - 2.5 * s, 5.2 * s, 3 * s, tint(gold ? '#9a6a00' : '#2a1e14'), lw);
      blob(c, x, by - 14 * s, 13 * s, 11 * s, skin, skinD, lw);
      // chest plate with rivets and a belt
      c.fillStyle = vgrad(c, by - 24 * s, by - 10 * s, tint(metal), tint(metalD)); c.strokeStyle = INK; c.lineWidth = lw * 0.9;
      c.beginPath(); c.moveTo(x - 9 * s, by - 23 * s); c.lineTo(x + 9 * s, by - 23 * s); c.lineTo(x + 8 * s, by - 12 * s); c.quadraticCurveTo(x, by - 9 * s, x - 8 * s, by - 12 * s); c.closePath(); c.fill(); c.stroke();
      line(c, [x, by - 22 * s, x, by - 11 * s], 'rgba(0,0,0,0.3)', 1 * s);
      for (const [px, py] of [[-6, -20], [6, -20], [-5.5, -14], [5.5, -14]]) ell(c, x + px * s, by + py * s, 0.9 * s, 0.9 * s, '#ffffffaa');
      c.fillStyle = tint('#4a2e18'); c.beginPath(); c.roundRect(x - 12 * s, by - 9 * s, 24 * s, 3.4 * s, 1 * s); c.fill(); c.stroke();
      c.fillStyle = tint('#ffd23a'); c.beginPath(); c.roundRect(x - 2.4 * s, by - 9.6 * s, 4.8 * s, 4.4 * s, 1 * s); c.fill(); c.stroke();
      // spiked pauldrons
      for (const sd of [-1, 1]) { blob(c, x + sd * 12 * s, by - 22 * s, 6 * s, 4.6 * s, tint(metal), tint(metalD), lw); poly(c, [x + sd * 10 * s, by - 26 * s, x + sd * 13 * s, by - 31 * s, x + sd * 15 * s, by - 25 * s], tint('#efe6d2'), lw * 0.7); }
      // head
      const hy = by - 28.5 * s;
      blob(c, x, hy, 8.5 * s, 8 * s, skin, skinD, lw);
      c.fillStyle = vgrad(c, hy - 10 * s, hy - 2 * s, tint(metal), tint(metalD)); c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.arc(x, hy - 0.5 * s, 9 * s, 3.2, 6.22); c.closePath(); c.fill(); c.stroke();
      for (const sd of [-1, 1]) { c.fillStyle = '#efe6d2'; c.beginPath(); c.moveTo(x + sd * 7 * s, hy - 4.5 * s); c.quadraticCurveTo(x + sd * 16 * s, hy - 7.5 * s, x + sd * 14 * s, hy - 15.5 * s); c.quadraticCurveTo(x + sd * 11 * s, hy - 8.5 * s, x + sd * 4 * s, hy - 7.5 * s); c.closePath(); c.fill(); c.stroke(); }
      angryEyes(c, x, hy + 1 * s, s, ux, uy, '#ff4a3a', 3.3, 1.8);
      if (front) {
        for (const sd of [-1, 1]) poly(c, [x + ux * 2 * s + sd * 3.2 * s, hy + 5.4 * s, x + ux * 2 * s + sd * 2.4 * s, hy + 2 * s, x + ux * 2 * s + sd * 1.5 * s, hy + 5.4 * s], '#fff8e0', 0.6 * s);
        line(c, [x + 4 * s, hy - 2 * s, x + 6.5 * s, hy + 4 * s], tint('#7a2a1a'), 1 * s); // scar
      }
      // double axe
      const ax = x + dir * 17 * s, ay = by - 18 * s;
      line(c, [ax, ay + 12 * s, ax, ay - 16 * s], INK, 4.2 * s); line(c, [ax, ay + 12 * s, ax, ay - 16 * s], tint('#6a4a2a'), 2.8 * s);
      for (const sd of [-1, 1]) {
        c.fillStyle = vgrad(c, ay - 18 * s, ay - 2 * s, tint(gold ? '#fff6c0' : '#e8eef4'), tint(gold ? '#c89a20' : '#8a96a2')); c.strokeStyle = INK; c.lineWidth = lw * 0.8;
        c.beginPath(); c.moveTo(ax, ay - 15 * s); c.quadraticCurveTo(ax + sd * 11 * s, ay - 18 * s, ax + sd * 10 * s, ay - 4 * s); c.quadraticCurveTo(ax + sd * 5 * s, ay - 7 * s, ax, ay - 6 * s); c.closePath(); c.fill(); c.stroke();
      }
      blob(c, ax - dir * 1.5 * s, ay + 1 * s, 3.6 * s, 3.3 * s, skin, skinD, lw * 0.8, false);
      if (gold) for (let i = 0; i < 4; i++) { const a = L.t * 2 + i * 1.57; glow(c, x + Math.cos(a) * 17 * s, gy - 22 * s + Math.sin(a * 1.3) * 11 * s, 3 * s * (0.6 + 0.4 * Math.sin(L.t * 9 + i)), '#fff6a0', '#fff'); }
      break;
    }
    case 'shield': { // правка 123: goblin guard — iron helm with a nose guard, round iron-rimmed shield on the arm, short spear
      const by = gy - bob, back = uy < -0.55, sx = x + dir * 8.5 * s + ux * 2 * s, sy = by - 13 * s;
      for (const sd of [-1, 1]) { // boots
        const fx = x + sd * 5 * s + step * sd * 1.6 * s;
        ell(c, fx, gy - 2 * s, 4.4 * s, 2.6 * s, tint('#3a2a1a'), lw * 0.8);
        line(c, [fx - 3 * s, gy - 3.4 * s, fx + 3 * s, gy - 3.4 * s], tint('#6a4a2a'), 1 * s);
      }
      // spear on the far side
      const px = x - dir * 9 * s;
      line(c, [px, gy - 2 * s, px, by - 36 * s], INK, 3.2 * s); line(c, [px, gy - 2 * s, px, by - 36 * s], tint('#7a5230'), 1.9 * s);
      poly(c, [px, by - 44 * s, px - 2.4 * s, by - 37 * s, px, by - 35 * s, px + 2.4 * s, by - 37 * s], vgrad(c, by - 44 * s, by - 35 * s, tint('#eef2f6'), tint('#7a828c')), lw * 0.6);
      blob(c, px, by - 15 * s, 3 * s, 2.8 * s, main, dark, lw * 0.8, false); // hand on the spear
      blob(c, x, by - 11 * s, 9.5 * s, 8.4 * s, main, dark, lw); // body
      // ring mail vest with a belt
      c.save(); c.beginPath(); c.ellipse(x, by - 11 * s, 9.5 * s, 8.4 * s, 0, 0, 6.2832); c.clip();
      c.fillStyle = vgrad(c, by - 19 * s, by - 4 * s, tint('#8a929c'), tint('#3a4048')); c.fillRect(x - 10 * s, by - 18 * s, 20 * s, 12 * s);
      for (let r2 = 0; r2 < 3; r2++) for (let k = -3; k <= 3; k++) { c.beginPath(); c.arc(x + k * 2.6 * s + (r2 % 2) * 1.3 * s, by - 16 * s + r2 * 3.2 * s, 1.2 * s, 0, Math.PI); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.7 * s; c.stroke(); }
      c.restore();
      ell(c, x, by - 11 * s, 9.5 * s, 8.4 * s, 'rgba(0,0,0,0)', lw);
      c.fillStyle = tint('#4a2e18'); c.strokeStyle = INK; c.lineWidth = lw * 0.7; c.beginPath(); c.roundRect(x - 9.5 * s, by - 7 * s, 19 * s, 2.8 * s, 1 * s); c.fill(); c.stroke();
      ell(c, x, by - 5.6 * s, 1.6 * s, 1.4 * s, tint('#c8a060'), 0.6 * s);
      // head with ears and an iron helm
      const hy = by - 21 * s;
      for (const sd of [-1, 1]) poly(c, [x + sd * 6 * s, hy, x + sd * 14 * s, hy - 3 * s, x + sd * 7.5 * s, hy + 3 * s], main, lw * 0.7);
      blob(c, x, hy, 7.8 * s, 7 * s, main, dark, lw);
      c.fillStyle = vgrad(c, hy - 9 * s, hy - 1 * s, tint('#b4bcc6'), tint('#4a525a')); c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.arc(x, hy - 0.5 * s, 8.3 * s, 3.2, 6.22); c.closePath(); c.fill(); c.stroke();
      line(c, [x - 8 * s, hy - 1.5 * s, x + 8 * s, hy - 1.5 * s], tint('#6a727c'), 1.4 * s);
      for (const k of [-5, 0, 5]) ell(c, x + k * s, hy - 1.6 * s, 0.7 * s, 0.7 * s, tint('#e8eef4'));
      angryEyes(c, x, hy + 1.8 * s, s, ux, uy, '#ffcf3a', 3, 1.6);
      if (front) {
        line(c, [x + ux * 2.4 * s, hy - 1.5 * s, x + ux * 2.4 * s, hy + 3.6 * s], INK, 2.2 * s); line(c, [x + ux * 2.4 * s, hy - 1.5 * s, x + ux * 2.4 * s, hy + 3.6 * s], tint('#9aa4ae'), 1.2 * s); // nose guard
        for (const sd of [-1, 1]) poly(c, [x + ux * 2 * s + sd * 2.6 * s, hy + 5.6 * s, x + ux * 2 * s + sd * 1.8 * s, hy + 3.2 * s, x + ux * 2 * s + sd * 1 * s, hy + 5.6 * s], '#fff8e0', 0.6 * s);
      }
      if (!back) { // round shield on the near arm: wooden planks, iron rim and boss, dents
        const R = 8.6 * s, wq = Math.max(0.6, 1 - Math.abs(ux) * 0.35);
        c.save(); c.translate(sx, sy); c.scale(wq, 1);
        c.beginPath(); c.arc(0, 0, R, 0, 6.2832); c.fillStyle = vgrad(c, -R, R, tint('#a0703a'), tint('#5a3818')); c.fill();
        c.save(); c.clip(); for (const k of [-4.4, -1.4, 1.6, 4.6]) line(c, [k * s, -R, k * s, R], 'rgba(0,0,0,0.3)', 0.8 * s); c.restore();
        c.lineWidth = 2.6 * s; c.strokeStyle = INK; c.stroke(); c.lineWidth = 1.6 * s; c.strokeStyle = tint('#9aa4ae'); c.stroke();
        blob(c, 0, 0, 2.8 * s, 2.8 * s, tint('#c8d0d8'), tint('#5a626a'), 0.9 * s);
        for (let k = 0; k < 6; k++) { const a = k * 1.047; ell(c, Math.cos(a) * 6.8 * s, Math.sin(a) * 6.8 * s, 0.7 * s, 0.7 * s, tint('#e0e6ec')); }
        line(c, [-5 * s, -3 * s, -2.5 * s, -4.5 * s], 'rgba(0,0,0,0.4)', 0.8 * s); // dent
        c.restore();
      } else blob(c, x + dir * 9 * s, by - 13 * s, 3 * s, 2.8 * s, main, dark, lw * 0.8, false);
      break;
    }
    case 'ram': { // правка 123: siege boar — bristly hump, iron brow plate with rivets, curled horns, tusks, hooves
      const lean = L.state === 3 ? 3 * s : L.state === 2 ? -2 * s : 0, by = gy - bob * 0.6, run = L.state === 3 ? 26 : 13;
      for (let i = 0; i < 4; i++) { // legs with hooves
        const lx = x + (i < 2 ? -8 : 7) * s + (i % 2) * 2 * s, ph = Math.sin(L.t * run + i * 1.6) * 2.6 * s, near = i % 2 === 1;
        line(c, [lx, by - 9 * s, lx + ph * 0.5, gy - 4.5 * s, lx + ph, gy - 1.6 * s], INK, (near ? 4.6 : 4) * s);
        line(c, [lx, by - 9 * s, lx + ph * 0.5, gy - 4.5 * s, lx + ph, gy - 1.6 * s], near ? main : dark, (near ? 3.2 : 2.6) * s);
        ell(c, lx + ph + dir * 0.5 * s, gy - 1 * s, 1.9 * s, 1.2 * s, tint('#2a2018'), 0.6 * s);
      }
      // tail tuft
      line(c, [x - dir * 13 * s, by - 15 * s, x - dir * 16 * s, by - 18 * s + Math.sin(L.t * 9) * s], INK, 1.6 * s);
      ell(c, x - dir * 16.5 * s, by - 18.5 * s + Math.sin(L.t * 9) * s, 1.6 * s, 1.6 * s, dark, 0.6 * s);
      blob(c, x - dir * 2 * s, by - 14 * s, 13.5 * s, 8.5 * s, main, dark, lw); // body
      ell(c, x + dir * 1 * s, by - 9.6 * s, 8 * s, 2.4 * s, mix(main, '#e8c8a0', 0.3)); // lighter belly
      // bristly hump along the back
      c.beginPath(); c.moveTo(x - dir * 12 * s, by - 18 * s);
      for (let k = 0; k <= 8; k++) c.lineTo(x - dir * (12 - k * 2.6) * s, by - (21.5 + (k % 2 ? 2.8 : 0) - Math.abs(k - 4) * 0.5) * s);
      c.lineTo(x + dir * 9 * s, by - 18 * s); c.closePath(); c.fillStyle = dark; c.fill(); c.strokeStyle = INK; c.lineWidth = lw * 0.6; c.stroke();
      // head
      const hx = x + dir * 13 * s + dir * lean, hy = by - 12 * s;
      blob(c, hx, hy, 7.4 * s, 6.6 * s, main, dark, lw);
      blob(c, hx + dir * 5.5 * s, hy + 2.5 * s, 3.6 * s, 3 * s, mix(main, '#d8a890', 0.35), dark, lw * 0.8, false); // snout
      for (const k of [-1, 1]) ell(c, hx + dir * 7 * s, hy + 2.2 * s + k * 1.1 * s, 0.6 * s, 0.5 * s, '#1a0e0a');
      for (const sd of [-1, 1]) poly(c, [hx + dir * 3 * s, hy + 4 * s + sd * 0.4 * s, hx + dir * 6.5 * s, hy + 1 * s + sd * 0.4 * s, hx + dir * 4 * s, hy + 5.4 * s], '#fff6e0', 0.6 * s); // tusks
      // iron brow plate with rivets
      c.fillStyle = vgrad(c, hy - 8 * s, hy - 1 * s, tint('#c0c8d0'), tint('#4a525a')); c.strokeStyle = INK; c.lineWidth = lw * 0.8;
      c.beginPath(); c.moveTo(hx - 5 * s, hy - 3 * s); c.quadraticCurveTo(hx, hy - 9.5 * s, hx + dir * 6 * s, hy - 3.5 * s); c.lineTo(hx + dir * 5 * s, hy - 1 * s); c.quadraticCurveTo(hx, hy - 5 * s, hx - 5 * s, hy - 1 * s); c.closePath(); c.fill(); c.stroke();
      for (const k of [-2.5, 0.5, 3.5]) ell(c, hx + dir * k * s, hy - 4.6 * s + Math.abs(k) * 0.3 * s, 0.7 * s, 0.7 * s, tint('#eef2f6'));
      // curled horns
      for (const sd of [-1, 1]) {
        const cx2 = hx - dir * 1.5 * s + sd * 4 * s, cy2 = hy - 4 * s;
        c.beginPath(); c.arc(cx2, cy2, 3.4 * s, -2.6 + (sd > 0 ? 0 : 0.4), 1.6); c.strokeStyle = INK; c.lineWidth = 3.4 * s; c.stroke();
        c.strokeStyle = tint('#d8c8a8'); c.lineWidth = 2 * s; c.stroke();
        for (let k = 0; k < 3; k++) { const a = -1.8 + k * 1; line(c, [cx2 + Math.cos(a) * 2.4 * s, cy2 + Math.sin(a) * 2.4 * s, cx2 + Math.cos(a) * 4.4 * s, cy2 + Math.sin(a) * 4.4 * s], 'rgba(0,0,0,0.35)', 0.6 * s); }
      }
      if (front || Math.abs(ux) > 0.3) { ell(c, hx + dir * 2.4 * s, hy - 0.4 * s, 1.5 * s, 1.3 * s, '#ff3a2a', 0.6 * s); ell(c, hx + dir * 2.6 * s, hy - 0.4 * s, 0.6 * s, 0.7 * s, '#160808'); }
      break;
    }
    case 'harpy': case 'harpyQueen': { // правка 123: feathered bird woman — layered feather wings, scaly legs with talons, wild hair
      const q = kind === 'harpyQueen', fl = Math.sin(L.t * (q ? 7 : 11)), hov = gy - (q ? 30 : 24) * s + fl * 2 * s;
      const fea = (wx: number, wy: number, len: number, a: number, col: string) => { // one long feather
        c.save(); c.translate(wx, wy); c.rotate(a);
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -2.2 * s, len, 0); c.quadraticCurveTo(len * 0.5, 2.2 * s, 0, 0);
        c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9 * s; c.stroke();
        line(c, [0, 0, len * 0.85, 0], 'rgba(0,0,0,0.3)', 0.5 * s); c.restore();
      };
      for (const sd of [-1, 1]) { // wings: bone arm and three rows of feathers
        const sxw = x + sd * 4 * s, syw = hov - 11 * s, lift = fl * 0.55;
        for (let k = 5; k >= 0; k--) { const a = -0.1 - k * 0.3 + lift * 0.7; fea(sxw + sd * (3 + k * 2.2) * s, syw - k * 1.2 * s - lift * k * 1.6 * s, (15 - k * 1.1) * s * (q ? 1.25 : 1), sd > 0 ? a : Math.PI - a, k % 2 ? dark : main); }
        poly(c, [sxw, syw + 2 * s, sxw + sd * 16 * s, syw - 7 * s - lift * 8 * s, sxw + sd * 15 * s, syw - 3 * s - lift * 6 * s, sxw + sd * 4 * s, syw + 5 * s], vgrad(c, syw - 9 * s, syw + 5 * s, mix(main, '#ffffff', 0.25), main), lw * 0.8);
      }
      for (const sd of [-1, 1]) { // scaly legs with three talons
        const lx = x + sd * 3 * s;
        line(c, [lx, hov + 1 * s, lx + sd * 0.5 * s, hov + 9 * s], INK, 2.8 * s); line(c, [lx, hov + 1 * s, lx + sd * 0.5 * s, hov + 9 * s], tint('#c8963a'), 1.6 * s);
        for (const k of [-1, 0, 1]) { line(c, [lx + sd * 0.5 * s, hov + 9 * s, lx + sd * 0.5 * s + k * 2.2 * s, hov + 11.5 * s], INK, 1.3 * s); }
      }
      // feathered body
      blob(c, x, hov - 4 * s, 6.4 * s, 7.6 * s, main, dark, lw);
      for (let r2 = 0; r2 < 3; r2++) for (let k = -1; k <= 1; k++) { const fx2 = x + k * 2.6 * s + (r2 % 2) * 1.3 * s, fy2 = hov - 6 * s + r2 * 3 * s; c.beginPath(); c.moveTo(fx2 - 1.4 * s, fy2); c.lineTo(fx2, fy2 + 1.6 * s); c.lineTo(fx2 + 1.4 * s, fy2); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.7 * s; c.stroke(); }
      const hy = hov - 15 * s, hair = tint(q ? '#2a0a2e' : '#3a2214');
      for (let k = -3; k <= 3; k++) line(c, [x + k * 1.6 * s, hy - 4 * s, x + k * 3.4 * s + Math.sin(L.t * 6 + k) * 1.2 * s, hy + 6 * s + Math.abs(k) * 0.6 * s], hair, 2 * s); // wild hair behind
      blob(c, x, hy, 5.2 * s, 5.4 * s, tint(q ? '#d8b8c8' : '#d8b090'), tint(q ? '#8a5a7a' : '#8a5a3a'), lw);
      for (let k = -2; k <= 2; k++) poly(c, [x + k * 2 * s - 1.4 * s, hy - 4 * s, x + k * 2.2 * s, hy - 7.5 * s - Math.abs(k) * 0.4 * s, x + k * 2 * s + 1.4 * s, hy - 4 * s], hair, 0); // fringe
      angryEyes(c, x, hy, s, ux, uy, q ? '#ff5adc' : '#ffcf3a', 2.2, 1.2);
      if (front) poly(c, [x + ux * 2 * s - 1.1 * s, hy + 1.6 * s, x + ux * 2 * s + 1.1 * s, hy + 1.6 * s, x + ux * 2 * s, hy + 4.2 * s], tint('#c8963a'), 0.6 * s); // hooked beak-nose
      if (q) { // crown with a gem
        const ty = hy - 6 * s; c.fillStyle = vgrad(c, ty - 6 * s, ty, '#fff0a0', '#b07a10'); c.strokeStyle = INK; c.lineWidth = lw * 0.7;
        c.beginPath(); c.moveTo(x - 5 * s, ty); for (let k = 0; k <= 4; k++) c.lineTo(x - 5 * s + k * 2.5 * s, ty - (k % 2 ? 3 : 6) * s); c.lineTo(x + 5 * s, ty); c.closePath(); c.fill(); c.stroke();
        glow(c, x, ty - 2.5 * s, 2.6 * s, '#ff5adc', '#fff');
      }
      break;
    }
    case 'healer': { // правка 123: goblin witch doctor — leaf cloak, bone mask with feathers, totem staff with green fire, bone beads
      const by = gy - bob;
      for (const sd of [-1, 1]) ell(c, x + sd * 4.5 * s + step * sd * 1.4 * s, gy - 2 * s, 3.8 * s, 2.3 * s, tint('#3a2a1a'), lw * 0.8);
      // cloak of leaves (ragged hem)
      c.fillStyle = vgrad(c, by - 26 * s, gy, tint('#4a7a3a'), tint('#1e3a18')); c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.moveTo(x - 7 * s, by - 24 * s); c.lineTo(x + 7 * s, by - 24 * s); c.quadraticCurveTo(x + 11 * s, by - 12 * s, x + 11 * s, gy - 3 * s);
      for (let k = 0; k < 7; k++) { const xx = x + (11 - (k + 1) * 22 / 7) * s; c.quadraticCurveTo(xx + 1.6 * s, gy + (k % 2 ? 0 : 1.5) * s, xx, gy - 3 * s); }
      c.quadraticCurveTo(x - 11 * s, by - 12 * s, x - 7 * s, by - 24 * s); c.fill(); c.stroke();
      for (let k = 0; k < 6; k++) { const lx = x + (k - 2.5) * 3.2 * s, ly = by - 16 * s + (k % 2) * 4 * s; line(c, [lx, ly, lx + 1.2 * s, ly + 3 * s], 'rgba(160,220,120,0.5)', 0.8 * s); }
      blob(c, x, by - 15 * s, 6.5 * s, 6 * s, main, dark, lw * 0.8, false); // bare chest
      for (let k = -3; k <= 3; k++) ell(c, x + k * 1.8 * s, by - 18.5 * s + Math.abs(k) * 0.7 * s, 0.9 * s, 1.2 * s, tint('#efe6d2'), 0.5 * s); // bone beads
      // head with ears, bone mask and feathers
      const hy = by - 26 * s;
      for (const sd of [-1, 1]) poly(c, [x + sd * 5 * s, hy, x + sd * 13 * s, hy - 4 * s, x + sd * 6.5 * s, hy + 3 * s], main, lw * 0.7);
      for (const [fx2, a] of [[-3, -0.35], [0, 0], [3, 0.35]]) { c.save(); c.translate(x + fx2 * s, hy - 6 * s); c.rotate(a); poly(c, [0, 0, -1.6 * s, -6 * s, 0, -9 * s, 1.6 * s, -6 * s], fx2 ? tint('#c8302a') : tint('#e0b040'), 0.7 * s); c.restore(); }
      blob(c, x, hy, 7 * s, 6.4 * s, main, dark, lw);
      if (front) {
        c.fillStyle = vgrad(c, hy - 5 * s, hy + 6 * s, tint('#f4ecd8'), tint('#a89c80')); c.strokeStyle = INK; c.lineWidth = lw * 0.8;
        c.beginPath(); c.moveTo(x + ux * 2 * s - 5 * s, hy - 4 * s); c.quadraticCurveTo(x + ux * 2 * s, hy - 6.5 * s, x + ux * 2 * s + 5 * s, hy - 4 * s); c.quadraticCurveTo(x + ux * 2 * s + 5 * s, hy + 3 * s, x + ux * 2 * s, hy + 6 * s); c.quadraticCurveTo(x + ux * 2 * s - 5 * s, hy + 3 * s, x + ux * 2 * s - 5 * s, hy - 4 * s); c.fill(); c.stroke();
        for (const sd of [-1, 1]) { ell(c, x + ux * 2 * s + sd * 2.2 * s, hy - 1 * s, 1.5 * s, 1.3 * s, '#0e1a0e'); glow(c, x + ux * 2.2 * s + sd * 2.2 * s, hy - 1 * s, 1.5 * s, '#7aff6a', '#eaffe0'); }
        line(c, [x + ux * 2 * s - 3 * s, hy + 2.5 * s, x + ux * 2 * s + 3 * s, hy + 2.5 * s], tint('#c8302a'), 0.9 * s); // war paint
      }
      // totem staff: carved head, hanging charms, green flame
      const stx = x + dir * 11 * s, top = by - 34 * s;
      line(c, [stx, gy - 1 * s, stx, top], INK, 3.6 * s); line(c, [stx, gy - 1 * s, stx, top], tint('#6a4a2a'), 2.2 * s);
      blob(c, stx, top + 2 * s, 3 * s, 3.4 * s, tint('#8a6a3a'), tint('#3a2814'), lw * 0.7, false);
      for (const sd of [-1, 1]) { line(c, [stx + sd * 1.5 * s, top + 5 * s, stx + sd * 2.5 * s, top + 10 * s], 'rgba(0,0,0,0.6)', 0.6 * s); ell(c, stx + sd * 2.5 * s, top + 10.5 * s, 1 * s, 1.3 * s, tint('#efe6d2'), 0.5 * s); }
      glow(c, stx, top - 3 * s, 7 * s * (1 + Math.sin(L.t * 6) * 0.15), '#5ae04a', 'rgba(230,255,200,0.9)');
      for (let i = 0; i < 3; i++) { const k = (L.t * 1.4 + i / 3) % 1; c.globalAlpha = 1 - k; ell(c, stx + Math.sin(i * 2 + L.t * 4) * 2 * s, top - 4 * s - k * 9 * s, 1 * s, 1 * s, '#b8ff9a'); c.globalAlpha = 1; }
      blob(c, stx - dir * 1.5 * s, by - 16 * s, 3 * s, 2.8 * s, main, dark, lw * 0.8, false);
      break;
    }
    case 'archer': { // правка 123: hooded skeleton longbowman — tattered hood and cape, quiver, tall longbow aimed up
      const bone = main, bd = dark, by = gy - bob;
      for (const sd of [-1, 1]) { // legs with knees
        const fx = x + sd * 4 * s + step * sd * 1.5 * s;
        line(c, [x + sd * 2.5 * s, by - 12 * s, x + sd * 3.5 * s, gy - 6.5 * s, fx, gy - 1 * s], INK, 3.3 * s);
        line(c, [x + sd * 2.5 * s, by - 12 * s, x + sd * 3.5 * s, gy - 6.5 * s, fx, gy - 1 * s], bone, 1.9 * s);
        ell(c, fx + dir * 1 * s, gy - 0.8 * s, 2.1 * s, 1.1 * s, bone, 0.6 * s);
      }
      // tattered cape
      poly(c, [x - 7 * s, by - 27 * s, x + 7 * s, by - 27 * s, x + 9 * s, by - 8 * s, x + 6 * s, by - 10 * s, x + 3 * s, by - 6 * s, x, by - 9 * s, x - 3 * s, by - 6 * s, x - 6 * s, by - 10 * s, x - 9 * s, by - 8 * s], tint('#2e2238'), lw * 0.8);
      // quiver with arrows
      c.save(); c.translate(x - dir * 5.5 * s, by - 21 * s); c.rotate(-dir * 0.35);
      c.fillStyle = vgrad(c, -7 * s, 7 * s, tint('#6a4028'), tint('#2e1a0e')); c.strokeStyle = INK; c.lineWidth = lw * 0.7;
      c.beginPath(); c.roundRect(-2.5 * s, -6 * s, 5 * s, 12 * s, 1.5 * s); c.fill(); c.stroke();
      for (const k of [-1.2, 0, 1.2]) poly(c, [k * s, -6 * s, k * s - 1.3 * s, -9.5 * s, k * s + 1.3 * s, -9.5 * s], tint('#5a6a3a'), 0.5 * s);
      c.restore();
      // pelvis, spine and ribs
      ell(c, x, by - 13 * s, 4.4 * s, 2 * s, bone, 0.8 * s);
      line(c, [x, by - 24 * s, x, by - 13 * s], INK, 2.8 * s); line(c, [x, by - 24 * s, x, by - 13 * s], bone, 1.7 * s);
      for (let i = 0; i < 3; i++) { const yy = by - 22 * s + i * 3.1 * s, w = (5.6 - i * 0.9) * s; c.beginPath(); c.ellipse(x, yy, w, 1.7 * s, 0, 0.15, Math.PI - 0.15); c.strokeStyle = INK; c.lineWidth = 2.5 * s; c.stroke(); c.strokeStyle = bone; c.lineWidth = 1.3 * s; c.stroke(); }
      // skull in a hood
      const sy = by - 30 * s;
      c.fillStyle = vgrad(c, sy - 9 * s, sy + 6 * s, tint('#3e3048'), tint('#1a1220')); c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.moveTo(x, sy - 10 * s); c.quadraticCurveTo(x + 9.5 * s, sy - 6 * s, x + 8.5 * s, sy + 5 * s); c.lineTo(x - 8.5 * s, sy + 5 * s); c.quadraticCurveTo(x - 9.5 * s, sy - 6 * s, x, sy - 10 * s); c.fill(); c.stroke();
      blob(c, x + ux * 1.5 * s, sy + 0.5 * s, 5.4 * s, 5.2 * s, mix(bone, '#ffffff', 0.2), bd, lw * 0.8);
      if (front) {
        for (const sd of [-1, 1]) { ell(c, x + ux * 2 * s + sd * 2.1 * s, sy, 1.7 * s, 2 * s, '#140c0c'); glow(c, x + ux * 2.2 * s + sd * 2.1 * s, sy, 1.4 * s, '#7ab4ff', '#e0f0ff'); }
        for (let k = -1; k <= 1; k++) line(c, [x + ux * 2 * s + k * 1.6 * s, sy + 3.2 * s, x + ux * 2 * s + k * 1.6 * s, sy + 5 * s], INK, 0.7 * s);
      }
      // longbow held high
      const bx = x + dir * 9 * s, bby = by - 25 * s, pull = (L.charge ?? 0) * 5 * s;
      line(c, [x + dir * 2 * s, by - 22 * s, bx, bby], INK, 2.8 * s); line(c, [x + dir * 2 * s, by - 22 * s, bx, bby], bone, 1.5 * s);
      c.save(); c.translate(bx, bby); c.rotate(-dir * 0.45);
      c.strokeStyle = INK; c.lineWidth = 3.4 * s; c.beginPath(); c.arc(-dir * 5 * s, 0, 15 * s, -1.05, 1.05); c.stroke(); c.strokeStyle = tint('#6a4520'); c.lineWidth = 2 * s; c.stroke();
      const ex = -dir * 5 * s + Math.cos(1.05) * 15 * s, ey = Math.sin(1.05) * 15 * s;
      c.strokeStyle = '#e8e2d0'; c.lineWidth = 0.8 * s; c.beginPath(); c.moveTo(ex, -ey); c.lineTo(ex - pull, 0); c.lineTo(ex, ey); c.stroke();
      c.restore();
      break;
    }
    case 'slime': case 'slimelet': { // правка 123: toxic ooze — see-through jelly with a sunken skull and bones, drips, bubbles, angry slit eyes
      const wob = Math.sin(L.t * 6), w = 12 * s * (1 + wob * 0.07), h = 10 * s * (1 - wob * 0.07), cy = gy - h;
      // drips around the base
      for (let k = 0; k < 5; k++) { const dx2 = x + (k - 2) * 5 * s, dl = (1.5 + ((k * 7) % 3)) * s * (1 + 0.3 * Math.sin(L.t * 3 + k)); ell(c, dx2, gy - 0.6 * s + dl * 0.3, 1.6 * s, dl, mix(main, dark, 0.3)); }
      c.save(); c.globalAlpha = L.flash ? 1 : 0.82;
      c.fillStyle = vgrad(c, cy - h, gy, mix(main, '#ffffff', 0.2), dark); c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.moveTo(x - w, gy - 1 * s);
      c.bezierCurveTo(x - w * 1.1, cy - h * 0.4, x - w * 0.5, cy - h * 1.15 + wob * s, x + w * 0.1, cy - h);
      c.bezierCurveTo(x + w * 0.7, cy - h * 0.9, x + w * 1.1, cy - h * 0.3, x + w, gy - 1 * s);
      c.quadraticCurveTo(x, gy + 1.5 * s, x - w, gy - 1 * s); c.fill(); c.stroke();
      c.restore();
      if (kind === 'slime') { // a skull and a bone stuck inside
        c.save(); c.globalAlpha = 0.45;
        ell(c, x - 3 * s, cy + 2 * s, 3.4 * s, 3 * s, '#efe6d2'); ell(c, x - 4.2 * s, cy + 1.6 * s, 0.9 * s, 1 * s, '#2a1e14'); ell(c, x - 1.8 * s, cy + 1.6 * s, 0.9 * s, 1 * s, '#2a1e14');
        line(c, [x + 2 * s, cy + 6 * s, x + 7 * s, cy + 3 * s], '#efe6d2', 1.4 * s); c.restore();
      }
      for (let i = 0; i < 4; i++) { const k = (L.t * 0.5 + i / 4) % 1; c.globalAlpha = 0.6 * (1 - k); ell(c, x + (i - 1.5) * 4 * s, gy - 3 * s - k * h * 1.5, (0.9 + i * 0.25) * s, (0.9 + i * 0.25) * s, 'rgba(0,0,0,0)', 0.6 * s, '#ffffff'); c.globalAlpha = 1; }
      c.save(); c.globalAlpha = 0.55; ell(c, x - w * 0.45, cy - h * 0.45, w * 0.18, h * 0.12, '#ffffff'); c.restore();
      angryEyes(c, x + 2 * s, cy - 1 * s, s, ux, uy, '#ffef6a', 2.6, 1.5);
      break;
    }
    case 'golem': case 'colossus': { // basalt golem with blue crystals (the colossus: huge, moss, crown of rock spikes, molten core)
      const big = kind === 'colossus', mb = bob * 0.4, core = big ? '#ff8a2a' : '#4ab4ff', coreHi = big ? '#fff0b0' : '#e0f6ff';
      for (const sd of [-1, 1]) { c.fillStyle = vgrad(c, gy - 10 * s, gy, main, dark); c.strokeStyle = INK; c.lineWidth = lw; c.beginPath(); c.roundRect(x + sd * 8 * s - 5 * s, gy - 10 * s, 10 * s, 10 * s, 2 * s); c.fill(); c.stroke(); }
      poly(c, [x - 14 * s, gy - 9 * s - mb, x + 14 * s, gy - 9 * s - mb, x + 16 * s, gy - 30 * s - mb, x + 6 * s, gy - 35 * s - mb, x - 7 * s, gy - 35 * s - mb, x - 16 * s, gy - 29 * s - mb], vgrad(c, gy - 35 * s, gy - 9 * s, mix(main, '#ffffff', 0.15), dark), lw);
      line(c, [x - 9 * s, gy - 30 * s - mb, x - 4 * s, gy - 22 * s - mb, x - 8 * s, gy - 14 * s - mb], 'rgba(0,0,0,0.45)', 1.3 * s);
      line(c, [x - 4 * s, gy - 22 * s - mb, x + 5 * s, gy - 18 * s - mb, x + 9 * s, gy - 26 * s - mb], core, 1.4 * s);
      glow(c, x, gy - 22 * s - mb, 6.5 * s * (0.9 + 0.1 * Math.sin(L.t * 3)), core, coreHi);
      for (const sd of [-1, 1]) { // shoulders with crystals, heavy arms
        const ay = gy - 25 * s - mb + step * sd * 1.2 * s;
        blob(c, x + sd * 17 * s, ay, 6.5 * s, 6 * s, main, dark, lw, false);
        blob(c, x + sd * 18 * s, ay + 11 * s, 6 * s, 5.5 * s, mix(main, dark, 0.25), dark, lw, false);
        for (const [cx2, h2] of [[0, 9], [3, 6], [-3, 6]]) poly(c, [x + sd * (16 + cx2) * s - 1.6 * s, ay - 4 * s, x + sd * (17 + cx2) * s, ay - (4 + h2) * s, x + sd * (16 + cx2) * s + 1.6 * s, ay - 4 * s], big ? tint('#6a6458') : tint('#7ad0ff'), lw * 0.6);
      }
      const hy = gy - 39 * s - mb;
      blob(c, x, hy, 7 * s, 5.5 * s, main, dark, lw);
      if (big) { for (let k = -2; k <= 2; k++) poly(c, [x + k * 3.2 * s - 1.5 * s, hy - 4 * s, x + k * 3.2 * s, hy - (9 - Math.abs(k) * 1.5) * s, x + k * 3.2 * s + 1.5 * s, hy - 4 * s], tint('#6a6458'), lw * 0.6); for (const [mx2, my2, mr] of [[-8, -33, 3.6], [9, -31, 3.2], [-15, -29, 2.6], [4, -36, 3]]) ell(c, x + mx2 * s, gy + my2 * s - mb, mr * s, mr * 0.5 * s, tint('#5aa83a')); }
      if (front) for (const sd of [-1, 1]) glow(c, x + ux * 2 * s + sd * 2.8 * s, hy, 2.8 * s, core, coreHi);
      break;
    }
    case 'ghost': { // правка 123: wraith — tattered hood and cloak with no legs, bony hands, glowing eyes, a shackle on a chain
      const fl = Math.sin(L.t * 3) * 2 * s, top = gy - 32 * s + fl;
      c.save(); c.globalAlpha *= 0.9;
      const g = c.createLinearGradient(0, top, 0, gy); g.addColorStop(0, mix(main, '#ffffff', 0.25)); g.addColorStop(0.6, mix(main, dark, 0.5)); g.addColorStop(1, 'rgba(60,80,110,0)');
      c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.moveTo(x - 6 * s, top + 2 * s); c.quadraticCurveTo(x, top - 4 * s, x + 6 * s, top + 2 * s);
      c.quadraticCurveTo(x + 12 * s, top + 14 * s, x + 11 * s, gy - 7 * s + fl);
      for (let k = 0; k < 6; k++) { const xx = x + (11 - (k + 1) * 22 / 6) * s; c.lineTo(xx + 1.8 * s, gy - (k % 2 ? 1 : 5) * s + fl + Math.sin(L.t * 7 + k) * 1.4 * s); c.lineTo(xx, gy - 7 * s + fl); }
      c.quadraticCurveTo(x - 12 * s, top + 14 * s, x - 6 * s, top + 2 * s); c.fill(); c.stroke();
      c.restore();
      for (let k = 0; k < 3; k++) line(c, [x - 5 * s + k * 5 * s, top + 12 * s, x - 6 * s + k * 5.5 * s, gy - 8 * s + fl], 'rgba(20,30,50,0.35)', 0.9 * s); // cloth folds
      // hood opening with glowing eyes
      if (front) { ell(c, x + ux * 2 * s, top + 6 * s, 5.4 * s, 5 * s, '#0a1018', lw * 0.6); for (const sd of [-1, 1]) glow(c, x + ux * 2.4 * s + sd * 2.2 * s, top + 6 * s, 2.3 * s, '#7ae8ff', '#ffffff'); }
      // bony hands reaching forward, a shackle and chain
      for (const sd of [-1, 1]) {
        const hx = x + sd * 9 * s + ux * 2 * s, hy2 = top + 15 * s + Math.sin(L.t * 3 + sd) * 1.5 * s;
        for (let k = -1; k <= 1; k++) line(c, [hx, hy2, hx + sd * 2.4 * s + k * 1.2 * s, hy2 + 2.6 * s], '#dfe8f0', 0.9 * s);
        ell(c, hx, hy2, 1.8 * s, 1.5 * s, '#c8d4e0', 0.6 * s);
      }
      ell(c, x - dir * 9 * s, top + 16.5 * s, 2.2 * s, 1.4 * s, 'rgba(0,0,0,0)', 1.1 * s, tint('#8a929c'));
      for (let k = 1; k < 5; k++) ell(c, x - dir * (9 + k * 2.2) * s, top + 17 * s + k * 2.3 * s + fl * 0.3, 1.3 * s, 0.9 * s, 'rgba(0,0,0,0)', 0.9 * s, tint('#8a929c'));
      break;
    }
    case 'ogre': { // правка 123: siege ogre — like the orc warlord's big brother: hide armour, horned helm, tusks, carries an iron-capped ram log on the shoulder
      const by = gy - bob, sw = L.state === -1 ? Math.sin(L.t * 3) * 0.08 : 0;
      for (const sd of [-1, 1]) { const fx = x + sd * 8 * s + step * sd * 1.6 * s; ell(c, fx, gy - 3 * s, 6 * s, 3.4 * s, tint('#2a1e14'), lw); for (let t2 = -1; t2 <= 1; t2++) ell(c, fx + t2 * 2.4 * s + dir * 2 * s, gy - 1 * s, 1 * s, 0.8 * s, tint('#4a3a2a')); }
      blob(c, x, by - 16 * s, 15 * s, 13 * s, main, dark, lw); // body
      blob(c, x + dir * 1 * s, by - 11.5 * s, 9 * s, 6.5 * s, mix(main, '#e8d8a0', 0.3), dark, lw * 0.6, false); // belly
      // hide harness with an iron buckle
      line(c, [x - 12 * s, by - 26 * s, x + 10 * s, by - 6 * s], INK, 4.6 * s); line(c, [x - 12 * s, by - 26 * s, x + 10 * s, by - 6 * s], tint('#6a4428'), 3.2 * s);
      c.fillStyle = vgrad(c, by - 19 * s, by - 13 * s, tint('#c8d0d8'), tint('#4a525a')); c.strokeStyle = INK; c.lineWidth = lw * 0.7; c.beginPath(); c.roundRect(x - 2.5 * s, by - 19 * s, 5 * s, 5 * s, 1 * s); c.fill(); c.stroke();
      c.fillStyle = tint('#4a2e18'); c.beginPath(); c.roundRect(x - 14 * s, by - 8 * s, 28 * s, 3.6 * s, 1 * s); c.fill(); c.stroke();
      // head with a horned iron helm
      const hy = by - 33 * s;
      for (const sd of [-1, 1]) poly(c, [x + sd * 6 * s, hy, x + sd * 12 * s, hy - 2 * s, x + sd * 7 * s, hy + 4 * s], main, lw * 0.7);
      blob(c, x, hy, 8.5 * s, 8 * s, main, dark, lw);
      c.fillStyle = vgrad(c, hy - 10 * s, hy - 1 * s, tint('#a8b2bc'), tint('#3e464e')); c.strokeStyle = INK; c.lineWidth = lw;
      c.beginPath(); c.arc(x, hy - 0.5 * s, 9 * s, 3.2, 6.22); c.closePath(); c.fill(); c.stroke();
      for (const k of [-6, -2, 2, 6]) ell(c, x + k * s, hy - 2 * s, 0.7 * s, 0.7 * s, tint('#e8eef4'));
      for (const sd of [-1, 1]) { c.fillStyle = '#efe6d2'; c.beginPath(); c.moveTo(x + sd * 7 * s, hy - 5 * s); c.quadraticCurveTo(x + sd * 15 * s, hy - 8 * s, x + sd * 13 * s, hy - 16 * s); c.quadraticCurveTo(x + sd * 10 * s, hy - 9 * s, x + sd * 4 * s, hy - 8 * s); c.closePath(); c.fill(); c.stroke(); }
      angryEyes(c, x, hy + 1 * s, s, ux, uy, '#ffcf3a', 3.2, 1.7);
      if (front) {
        ell(c, x + ux * 2.5 * s, hy + 3 * s, 2.2 * s, 1.6 * s, dark, 0.7 * s);
        for (const sd of [-1, 1]) poly(c, [x + ux * 2 * s + sd * 3.4 * s, hy + 7 * s, x + ux * 2 * s + sd * 2.6 * s, hy + 2.6 * s, x + ux * 2 * s + sd * 1.6 * s, hy + 7 * s], '#fff8e0', 0.6 * s);
      }
      // the ram log on the shoulder: bark rings, iron bands, an iron ram head at the front
      c.save(); c.translate(x - dir * 3 * s, by - 17 * s); c.rotate(dir * (0.18 + sw));
      const L0 = -14 * s, L1 = 26 * s;
      c.fillStyle = vgrad(c, -4.5 * s, 4.5 * s, tint('#9a6a3a'), tint('#4a2e14')); c.strokeStyle = INK; c.lineWidth = lw * 0.9;
      c.beginPath(); c.roundRect(dir > 0 ? L0 : -L1, -4.5 * s, L1 - L0, 9 * s, 3 * s); c.fill(); c.stroke();
      for (const k of [-8, 2, 12]) line(c, [dir * k * s, -4.5 * s, dir * k * s, 4.5 * s], tint('#5a626a'), 1.8 * s);
      line(c, [dir * -12 * s, -1 * s, dir * 18 * s, -1.5 * s], 'rgba(0,0,0,0.25)', 0.8 * s);
      const hx2 = dir * (L1 + 1 * s);
      c.fillStyle = vgrad(c, -6 * s, 6 * s, tint('#c8d0d8'), tint('#3e464e'));
      c.beginPath(); c.moveTo(hx2 - dir * 4 * s, -6 * s); c.lineTo(hx2 + dir * 3 * s, -4.5 * s); c.quadraticCurveTo(hx2 + dir * 6 * s, 0, hx2 + dir * 3 * s, 4.5 * s); c.lineTo(hx2 - dir * 4 * s, 6 * s); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(hx2 - dir * 1 * s, -6 * s, 3 * s, 0.4, 4.2); c.strokeStyle = INK; c.lineWidth = 2.6 * s; c.stroke(); c.strokeStyle = tint('#a8b2bc'); c.lineWidth = 1.4 * s; c.stroke();
      c.restore();
      for (const sd of [-1, 1]) blob(c, x + sd * 12 * s, by - 17 * s + sd * dir * 1.5 * s, 4.6 * s, 4.2 * s, main, dark, lw * 0.8, false); // hands on the log
      break;
    }
    case 'boss': { // winged demon: veined wings, lava cracks, tail, horns, crown, claws
      const flap = Math.sin(L.t * 4) * 3 * s, by = gy - bob;
      // tail
      const tw = Math.sin(L.t * 3) * 4 * s;
      c.beginPath(); c.moveTo(x - dir * 8 * s, by - 8 * s); c.quadraticCurveTo(x - dir * 22 * s, by - 4 * s + tw, x - dir * 26 * s, by - 16 * s + tw);
      c.strokeStyle = INK; c.lineWidth = 4.4 * s; c.stroke(); c.strokeStyle = dark; c.lineWidth = 2.8 * s; c.stroke();
      poly(c, [x - dir * 26 * s, by - 21 * s + tw, x - dir * 30 * s, by - 14 * s + tw, x - dir * 23 * s, by - 14 * s + tw], dark, lw * 0.8);
      // wings with veins
      for (const sd of [-1, 1]) {
        const p = [x + sd * 8 * s, by - 26 * s, x + sd * 32 * s, by - 40 * s - flap, x + sd * 27 * s, by - 27 * s, x + sd * 34 * s, by - 20 * s + flap * 0.5, x + sd * 24 * s, by - 18 * s, x + sd * 26 * s, by - 11 * s, x + sd * 12 * s, by - 14 * s];
        poly(c, p, vgrad(c, by - 40 * s, by - 10 * s, mix(dark, '#ff3a2a', 0.15), dark), lw);
        line(c, [x + sd * 9 * s, by - 24 * s, x + sd * 31 * s, by - 39 * s - flap], INK, 1.6 * s);
        line(c, [x + sd * 12 * s, by - 22 * s, x + sd * 27 * s, by - 27 * s], 'rgba(0,0,0,0.5)', 1 * s);
        line(c, [x + sd * 12 * s, by - 19 * s, x + sd * 33 * s, by - 20 * s + flap * 0.5], 'rgba(0,0,0,0.5)', 1 * s);
      }
      // legs with claws
      for (const sd of [-1, 1]) {
        const fx = x + sd * 7 * s + step * sd * 1.6 * s;
        ell(c, fx, gy - 3 * s, 5.6 * s, 3.2 * s, dark, lw);
        for (let k = -1; k <= 1; k++) poly(c, [fx + k * 2.2 * s - 0.8 * s, gy - 1 * s, fx + k * 2.2 * s, gy + 1.4 * s, fx + k * 2.2 * s + 0.8 * s, gy - 1 * s], '#efe6d2', 0.5 * s);
      }
      blob(c, x, by - 16 * s, 14 * s, 13 * s, main, dark, lw);
      // lava cracks across the chest
      c.save(); c.globalAlpha = 0.6 + 0.4 * Math.sin(L.t * 3);
      line(c, [x - 7 * s, by - 22 * s, x - 3 * s, by - 16 * s, x - 5 * s, by - 10 * s], '#ffb03a', 1.6 * s);
      line(c, [x + 6 * s, by - 24 * s, x + 3 * s, by - 18 * s, x + 7 * s, by - 12 * s], '#ffb03a', 1.6 * s);
      line(c, [x - 3 * s, by - 16 * s, x + 3 * s, by - 18 * s], '#ffb03a', 1.2 * s);
      c.restore();
      // clawed arms
      for (const sd of [-1, 1]) { blob(c, x + sd * 14 * s, by - 13 * s + step * sd * s, 4.5 * s, 5 * s, main, dark, lw, false); for (let k = -1; k <= 1; k++) poly(c, [x + sd * 14 * s + k * 2 * s - 0.7 * s, by - 9 * s, x + sd * 14 * s + k * 2 * s, by - 6 * s, x + sd * 14 * s + k * 2 * s + 0.7 * s, by - 9 * s], '#efe6d2', 0.5 * s); }
      // head
      const hy = by - 31 * s;
      blob(c, x, hy, 9.5 * s, 9 * s, main, dark, lw);
      for (const sd of [-1, 1]) { c.fillStyle = vgrad(c, hy - 20 * s, hy - 5 * s, '#fff6e0', '#a89a7a'); c.strokeStyle = INK; c.lineWidth = lw; c.beginPath(); c.moveTo(x + sd * 6 * s, hy - 6 * s); c.quadraticCurveTo(x + sd * 15 * s, hy - 9 * s, x + sd * 13 * s, hy - 19 * s); c.quadraticCurveTo(x + sd * 10 * s, hy - 11 * s, x + sd * 3 * s, hy - 8 * s); c.closePath(); c.fill(); c.stroke(); }
      const ty = hy - 8 * s;
      c.fillStyle = vgrad(c, ty - 8 * s, ty, '#fff0a0', '#c88a1a'); c.beginPath();
      c.moveTo(x - 6 * s, ty); c.lineTo(x - 6 * s, ty - 6 * s); c.lineTo(x - 3 * s, ty - 3 * s); c.lineTo(x, ty - 8 * s); c.lineTo(x + 3 * s, ty - 3 * s); c.lineTo(x + 6 * s, ty - 6 * s); c.lineTo(x + 6 * s, ty); c.closePath(); c.fill(); c.stroke();
      ell(c, x, ty - 2.4 * s, 1.4 * s, 1.4 * s, '#ff3a5a', 0.6 * s);
      if (front) {
        for (const sd of [-1, 1]) glow(c, x + ux * 2.5 * s + sd * 3.5 * s, hy, 3.4 * s, '#ff3a2a', '#fff6a0');
        c.fillStyle = '#2a0808'; c.beginPath(); c.ellipse(x + ux * 2 * s, hy + 5 * s, 4 * s, 2 * s, 0, 0, Math.PI); c.fill();
        for (const sd of [-1, 1]) poly(c, [x + ux * 2 * s + sd * 2.6 * s, hy + 5 * s, x + ux * 2 * s + sd * 1.8 * s, hy + 7.4 * s, x + ux * 2 * s + sd * 1 * s, hy + 5 * s], '#fff8e0', 0.5 * s);
      }
      break;
    }
  }
  c.lineJoin = 'miter';
}

/** bone arrow of a skeleton archer, pointing along (ux, uy); red glow so it reads as danger */
export function drawBoneArrow(c: C, x: number, y: number, ux: number, uy: number, s: number, t: number): void {
  const a = Math.atan2(uy, ux);
  c.save(); c.translate(x, y); c.rotate(a);
  // red trail
  const g = c.createLinearGradient(-30 * s, 0, 0, 0); g.addColorStop(0, 'rgba(255,40,30,0)'); g.addColorStop(1, 'rgba(255,40,30,0.55)');
  c.fillStyle = g; c.beginPath(); c.moveTo(-30 * s, 0); c.lineTo(0, -3.5 * s); c.lineTo(0, 3.5 * s); c.closePath(); c.fill();
  glow(c, 2 * s, 0, 11 * s * (0.9 + 0.1 * Math.sin(t * 20)), 'rgba(255,50,40,0.45)', 'rgba(255,120,100,0.6)');
  // shaft
  c.strokeStyle = INK; c.lineWidth = 3.6 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(-13 * s, 0); c.lineTo(7 * s, 0); c.stroke();
  c.strokeStyle = '#efe6d2'; c.lineWidth = 2 * s; c.stroke();
  // fletching
  c.fillStyle = '#b8a888'; c.strokeStyle = INK; c.lineWidth = 1 * s;
  for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(-13 * s, 0); c.lineTo(-17 * s, sd * 4 * s); c.lineTo(-9 * s, sd * 1 * s); c.closePath(); c.fill(); c.stroke(); }
  // jagged dark head
  c.fillStyle = '#3a2a2a'; c.beginPath(); c.moveTo(13 * s, 0); c.lineTo(6 * s, -4 * s); c.lineTo(8 * s, -1 * s); c.lineTo(5 * s, -1.5 * s); c.lineTo(5 * s, 1.5 * s); c.lineTo(8 * s, 1 * s); c.lineTo(6 * s, 4 * s); c.closePath(); c.fill();
  c.strokeStyle = '#ff6a50'; c.lineWidth = 0.8 * s; c.stroke();
  c.lineCap = 'butt'; c.restore();
}

/** bush you can walk through; sway 0..1 shakes it, leaves fall while it shakes */
export function drawBush(c: C, x: number, gy: number, r: number, biome: number, sway: number, t: number, seed: number): void {
  const s = r / 22, k = Math.sin(t * 18) * sway * 0.12;
  c.save(); c.translate(x, gy); c.rotate(k); c.translate(-x, -gy);
  if (biome === 0) { // dry desert shrub
    c.strokeStyle = '#5a3a18'; c.lineWidth = 2.4 * s; c.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32; c.beginPath(); c.moveTo(x, gy); c.quadraticCurveTo(x + Math.cos(a) * 10 * s, gy + Math.sin(a) * 14 * s, x + Math.cos(a) * 22 * s, gy + Math.sin(a) * 24 * s); c.stroke(); }
    const [m, d] = ['#a8bc4a', '#5a7a24'];
    for (const [dx, dy, rr] of [[-13, -13, 7], [13, -14, 7], [0, -22, 8], [-6, -9, 6], [8, -8, 6]] as const) ell(c, x + dx * s, gy + dy * s, rr * s, rr * 0.75 * s, vgrad(c, gy + (dy - rr) * s, gy + (dy + rr) * s, m, d), 1.6 * s);
    for (const [dx, dy] of [[-13, -17], [13, -18], [0, -27]] as const) ell(c, x + dx * s, gy + dy * s, 1.8 * s, 1.8 * s, '#ffcf6a', 0.8 * s); // dry blossoms
    c.lineCap = 'butt';
  } else { // round green bush with berries
    const [m, d] = ['#5fae3a', '#2f6a1c'];
    for (const [dx, dy, rr] of [[-13, -9, 11], [13, -9, 11], [0, -17, 13], [0, -6, 12]] as const) ell(c, x + dx * s, gy + dy * s, rr * s, rr * 0.85 * s, vgrad(c, gy + (dy - rr) * s, gy + (dy + rr) * s, m, d), 2 * s);
    ell(c, x - 4 * s, gy - 21 * s, 5 * s, 3 * s, 'rgba(255,255,255,0.25)');
    const berry = ['#e8304a', '#ffd23a', '#e8304a'];
    for (let i = 0; i < 3; i++) ell(c, x + [-10, 6, 12][i] * s, gy + [-12, -18, -6][i] * s, 2.2 * s, 2.2 * s, berry[(i + seed) % 3], 1 * s);
  }
  c.restore();
  // leaves falling while it shakes
  if (sway > 0.05) for (let i = 0; i < 3; i++) {
    const f = ((1 - sway) + i * 0.33) % 1;
    c.globalAlpha = sway; ell(c, x + (i - 1) * 12 * s + Math.sin(t * 6 + i) * 4 * s, gy - 18 * s + f * 18 * s, 2.4 * s, 1.4 * s, biome === 0 ? '#b8a45a' : '#7fce4a');
    c.globalAlpha = 1;
  }
}

export function drawObstacle(c: C, kind: number, x: number, gy: number, r: number, biome: number): void {
  const s = r / 30;
  if (kind === 0) { // rock
    const [m, d] = biome === 0 ? ['#c4ab80', '#6e5a3a'] : ['#9a9ea4', '#4a4e54'];
    c.fillStyle = vgrad(c, gy - 40 * s, gy, m, d); c.strokeStyle = INK; c.lineWidth = 3 * s; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x - 30 * s, gy - 2 * s); c.lineTo(x - 26 * s, gy - 22 * s); c.lineTo(x - 10 * s, gy - 38 * s); c.lineTo(x + 12 * s, gy - 34 * s);
    c.lineTo(x + 28 * s, gy - 18 * s); c.lineTo(x + 30 * s, gy - 2 * s); c.quadraticCurveTo(x, gy + 6 * s, x - 30 * s, gy - 2 * s); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.moveTo(x - 22 * s, gy - 22 * s); c.lineTo(x - 9 * s, gy - 34 * s); c.lineTo(x + 2 * s, gy - 30 * s); c.lineTo(x - 12 * s, gy - 18 * s); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(x + 4 * s, gy - 30 * s); c.lineTo(x + 8 * s, gy - 16 * s); c.lineTo(x + 2 * s, gy - 6 * s); c.stroke();
    c.lineJoin = 'miter';
  } else if (biome === 0) { // big cactus
    c.fillStyle = vgrad(c, gy - 70 * s, gy, '#6fae52', '#2f6a24'); c.strokeStyle = INK; c.lineWidth = 3 * s;
    c.beginPath(); c.roundRect(x - 9 * s, gy - 68 * s, 18 * s, 68 * s, 9 * s); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(x - 26 * s, gy - 46 * s, 10 * s, 26 * s, 5 * s); c.roundRect(x - 26 * s, gy - 26 * s, 20 * s, 9 * s, 4.5 * s); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(x + 16 * s, gy - 56 * s, 10 * s, 24 * s, 5 * s); c.roundRect(x + 6 * s, gy - 38 * s, 20 * s, 9 * s, 4.5 * s); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.5 * s; c.beginPath(); c.moveTo(x, gy - 64 * s); c.lineTo(x, gy - 4 * s); c.stroke();
  } else { // tree
    c.fillStyle = '#7a4e2a'; c.strokeStyle = INK; c.lineWidth = 3 * s;
    c.beginPath(); c.moveTo(x - 7 * s, gy); c.lineTo(x - 5 * s, gy - 34 * s); c.lineTo(x + 5 * s, gy - 34 * s); c.lineTo(x + 7 * s, gy); c.closePath(); c.fill(); c.stroke();
    const blobs: [number, number, number][] = [[-16, -44, 16], [16, -46, 16], [0, -60, 19], [-6, -40, 15], [8, -38, 14]];
    for (const [bx, by, br] of blobs) ell(c, x + bx * s, gy + by * s, br * s, br * s * 0.92, '#3f8a2e', 3 * s);
    for (const [bx, by, br] of blobs) ell(c, x + bx * s, gy + by * s, br * s - 1.5 * s, br * s * 0.92 - 1.5 * s, vgrad(c, gy + (by - br) * s, gy + (by + br) * s, '#6fc04f', '#2f7a22'));
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(x - 6 * s, gy - 66 * s, 7 * s, 4 * s, -0.4, 0, 6.2832); c.fill();
  }
}
