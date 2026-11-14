// правка 125: the event bear drawn from its Meshy atlases (8 directions). Walks after the hero; during a wind-up the
// paw / slam clip plays up to the moment of the blow, after the blow the rest of it; the charge has its own run cycle.
import { BEAR3D } from './bear3dImages';
import { Enemy, BearAtk } from '../core/sim';
import { dirRow } from './hero3d';

type Clip = keyof typeof BEAR3D.clips;
const imgs = new Map<Clip, HTMLImageElement>();
function atlas(clip: Clip): HTMLImageElement | null {
  let im = imgs.get(clip);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = BEAR3D.clips[clip].src; imgs.set(clip, im); }
  return im.complete && im.naturalWidth ? im : null;
}
export function preloadBear(): void { for (const k of Object.keys(BEAR3D.clips) as Clip[]) atlas(k); }
/** правка 192: the event is over — let go of the five atlases (~150 MB decoded) */
export function releaseBear(): void { for (const im of imgs.values()) im.src = ''; imgs.clear(); }

/** recovery time after each blow (as in the simulation) */
const REST: Record<string, number> = { swipe: 0.7, slam: 0.8, charge: 0.9 };
let last: 'swipe' | 'slam' | 'charge' | null = null;
let dir = 2;
/** правка 138: the walk goes by the distance walked, not by time — the paws do not slide */
let walked = 0, lx = NaN, ly = NaN;
/** one walk clip (two full gait cycles) covers about 0.56 of the bear's drawn height (measured on the model: ~1.8 m for a 3.2 m cell) */
const WALK_LEN = 0.56;

/** h = height of the cell on the screen; gy = feet on the screen */
export function drawBear3D(c: CanvasRenderingContext2D, e: Enemy, atk: BearAtk | null, x: number, gy: number, h: number, t: number, flash: boolean): boolean {
  let clip: Clip = 'idle', f = 0;
  const lean = (cl: Clip) => BEAR3D.clips[cl];
  if (Math.hypot(e.dx, e.dy) > 0.2) dir = dirRow(e.dx, e.dy * 0.72);
  const step = Math.hypot(e.x - lx, e.y - ly); lx = e.x; ly = e.y;
  if (step < 60) walked += step; // a jump (new fight) is not walking
  if (e.state === 0) { clip = 'walk'; f = Math.floor(walked / (h * WALK_LEN) * lean('walk').n) % lean('walk').n; }
  else if ((e.state === 10 || e.state === 11) && atk) {
    clip = e.state === 10 ? 'swipe' : 'slam'; last = clip;
    const d = lean(clip), k = Math.min(1, atk.t / atk.T);
    f = Math.min(d.n - 1, Math.floor(k * d.hit * (d.n - 1) + 0.0001));
  } else if (e.state === 12) { clip = 'charge'; f = 0; last = 'charge'; x += Math.sin(t * 60) * 2; } // crouches and trembles before the charge
  else if (e.state === 13) { clip = 'charge'; f = Math.floor((t / lean('charge').dur) * lean('charge').n) % lean('charge').n; }
  else if (e.state === 14 && (last === 'swipe' || last === 'slam')) {
    const d = lean(last), k = 1 - Math.max(0, e.stateT) / REST[last], a = Math.floor(d.hit * (d.n - 1));
    clip = last; f = Math.min(d.n - 1, a + Math.floor(k * (d.n - 1 - a)));
  } else { clip = 'idle'; f = Math.floor((t / lean('idle').dur) * lean('idle').n) % lean('idle').n; }
  let im = atlas(clip);
  if (!im) { clip = 'idle'; im = atlas('idle'); f = 0; }
  if (!im) return false;
  const S = BEAR3D.clips[clip].cell;
  c.save(); c.globalAlpha = 0.32; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, gy, h * 0.2, h * 0.08, 0, 0, 6.283); c.fill(); c.restore();
  c.drawImage(im, f * S, dir * S, S, S, x - h / 2, gy - h * (1 - BEAR3D.foot), h, h);
  if (flash) { c.save(); c.globalAlpha = 0.25; c.globalCompositeOperation = 'lighter'; c.drawImage(im, f * S, dir * S, S, S, x - h / 2, gy - h * (1 - BEAR3D.foot), h, h); c.restore(); }
  return true;
}
