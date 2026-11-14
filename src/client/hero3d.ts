// 3D heroes in battle (правки 102, 104): Meshy models rigged and animated, rendered to sprite atlases in 8 directions.
// Only two actions: walking with the weapon held upright (Meshy «Spear Walk») and a calm stance. No swings, no hit or
// death clips: the arrow is born at the top of the staff / club (weaponTip3D) and flies from there.
import { H3D } from './hero3dImages';

type Clip = 'idle' | 'walk';
const imgs = new Map<string, HTMLImageElement>();

export const has3D = (id: string): boolean => !!H3D[id];

/** atlas picture of one action; loads on first use, null until decoded */
function atlas(id: string, clip: Clip): HTMLImageElement | null {
  const def = H3D[id]?.clips[clip]; if (!def) return null;
  const key = id + clip;
  let im = imgs.get(key);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = def.src; imgs.set(key, im); }
  return im.complete && im.naturalWidth ? im : null;
}
/** start loading what a battle needs before the run begins */
export function preload3D(id: string): void {
  // правка 192: only the hero of this fight stays in memory (each hero is ~50 MB decoded)
  for (const [k, im] of imgs) if (!k.startsWith(id)) { im.src = ''; imgs.delete(k); }
  if (has3D(id)) for (const c of ['idle', 'walk'] as Clip[]) atlas(id, c);
}

/** direction row from a facing vector: 0 = right, 2 = towards the camera, 4 = left, 6 = away */
export function dirRow(fx: number, fy: number): number {
  const a = Math.atan2(fy, fx);
  return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
}

interface St { clip: Clip; t0: number; dir: number; phase: number; wx: number; wy: number; tip: { dx: number; up: number } | null }
const st = new Map<string, St>();
export interface H3DPose { fx: number; fy: number; t: number; moving: boolean; blink?: boolean; wx: number; wy: number }

/** hero in battle; s = the same scale the 2D hero uses. Walking frames follow the distance covered (stride = one
 *  cycle in cell heights), so the steps keep pace with the hero instead of running on their own clock */
export function drawHero3D(c: CanvasRenderingContext2D, id: string, x: number, gy: number, s: number, p: H3DPose): boolean {
  const H = H3D[id]; if (!H) return false;
  const k = st.get(id) ?? { clip: 'idle' as Clip, t0: p.t, dir: 2, phase: 0, wx: p.wx, wy: p.wy, tip: null };
  st.set(id, k);
  if (Math.hypot(p.fx, p.fy) > 0.2) k.dir = dirRow(p.fx, p.fy);
  const h = 140 * s;
  const step = Math.min(40, Math.hypot(p.wx - k.wx, p.wy - k.wy)); k.wx = p.wx; k.wy = p.wy;
  const want: Clip = p.moving ? 'walk' : 'idle';
  if (want !== k.clip) { k.clip = want; k.t0 = p.t; }
  let clip = k.clip, im = atlas(id, clip);
  if (!im && clip !== 'idle') { clip = 'idle'; im = atlas(id, 'idle'); }
  if (!im) return false;
  const d = H.clips[clip];
  let f: number;
  if (clip === 'walk') { k.phase = (k.phase + step / (H.stride * h)) % 1; f = Math.floor(k.phase * d.n) % d.n; }
  else if (d.pp) { const m = 2 * (d.n - 1), q = Math.floor(((p.t - k.t0) / d.dur) * (d.n - 1)) % m; f = q < d.n ? q : m - q; }
  else f = Math.floor(((p.t - k.t0) / d.dur) * d.n) % d.n;
  // shadow under the feet
  c.save(); c.globalAlpha = 0.28; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, gy, 15 * s * 1.3, 6 * s * 1.3, 0, 0, 6.283); c.fill(); c.restore();
  const S = H.cell, prev = c.globalAlpha;
  c.globalAlpha = prev * (p.blink ? 0.45 : 1);
  c.drawImage(im, f * S, k.dir * S, S, S, x - h / 2, gy - h * (1 - H.foot), h, h);
  c.globalAlpha = prev;
  const tp = d.tips[k.dir]?.[f];
  k.tip = tp ? { dx: (tp[0] - 0.5) * h, up: (1 - H.foot - tp[1]) * h } : null;
  return true;
}

/** top of the staff / club in the frame drawn last, from the hero's feet: where the arrows are born */
export function weaponTip3D(id: string): { dx: number; up: number } | null { return st.get(id)?.tip ?? null; }
