// Правка 159: the few sounds the game needs — a shot, a window opening and closing, a purchase, a reward
// (one or many) and the skill pick — and the phone's vibration. Every sound is first made in code;
// where a Kenney sound (CC0, art/sfx, sfxData.ts) fits better — windows, coins, reward, pick — it replaces it once decoded.
// Settings live apart from the profile (key mw-sfx), so they work on the first screen too.
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SFX_DATA } from './sfxData';

export type Snd = 'shot' | 'open' | 'close' | 'buy' | 'reward' | 'rewardMany' | 'pick'; // правка 160: no sound when the skill cards come up
export type Vib = 'hit' | 'heavy' | 'level' | 'reward' | 'death';

const LS = 'mw-sfx';
const cfg = { snd: true, vib: true };
try { Object.assign(cfg, JSON.parse(localStorage.getItem(LS) ?? '{}')); } catch { /* no storage */ }
const saveCfg = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch { /* ignore */ } };
export const soundOn = () => cfg.snd;
export const vibrationOn = () => cfg.vib;
export function setSound(on: boolean): void { cfg.snd = on; saveCfg(); if (on) play('pick'); }
export function setVibration(on: boolean): void { cfg.vib = on; saveCfg(); if (on) vibrate('reward'); }

let ctx: AudioContext | null = null, master: GainNode | null = null;
const bufs: Partial<Record<Snd, AudioBuffer>> = {};
function audio(): AudioContext | null {
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      build(ctx); loadSamples(ctx);
    } catch { ctx = null; return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}
// the browser lets sound start only after a touch: wake the audio on the first one
const unlock = () => { if (cfg.snd) audio(); };
addEventListener('pointerdown', unlock, { once: true, capture: true });
// a phone puts the app away: stop the sound with it
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) void ctx.suspend().catch(() => undefined); else if (cfg.snd) void ctx.resume().catch(() => undefined); });

// ---------------- the sounds, drawn sample by sample ----------------
type Voice = (t: number) => number;
function render(c: AudioContext, len: number, voice: Voice): AudioBuffer {
  const sr = c.sampleRate, n = Math.ceil(len * sr), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = voice(i / sr);
  // soft ends: no clicks
  const f = Math.min(n, Math.round(0.004 * sr));
  for (let i = 0; i < f; i++) { d[i] *= i / f; d[n - 1 - i] *= i / f; }
  return b;
}
const TAU = Math.PI * 2;
let seed = 7; const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };
/** a bell: a few partials, each fading at its own speed */
const bell = (f: number, t: number, dec = 0.5, parts: [number, number][] = [[1, 1], [2, 0.42], [3.01, 0.2], [4.2, 0.1]]) =>
  t < 0 ? 0 : parts.reduce((s, [k, a]) => s + a * Math.sin(TAU * f * k * t) * Math.exp(-t / (dec / Math.sqrt(k))), 0) * Math.min(1, t / 0.004);
/** filtered noise for whooshes: a one-pole low pass whose cut follows `cut(t)` */
function whoosh(len: number, cut: (t: number) => number, env: (t: number) => number, sr: number): Voice {
  let y = 0;
  return t => { if (t > len) return 0; const a = Math.min(1, TAU * cut(t) / sr); y += a * (noise() - y); return y * env(t); };
}

function build(c: AudioContext): void {
  const sr = c.sampleRate;
  // a bow shot: a soft string snap — a short noise puff and a quick falling tone
  {
    const w = whoosh(0.07, t => 2600 - 20000 * t, t => Math.exp(-t / 0.018), sr);
    bufs.shot = render(c, 0.09, t => 0.55 * w(t) + 0.35 * Math.sin(TAU * (700 * t - 2600 * t * t)) * Math.exp(-t / 0.02));
  }
  // a window opens: a stone slab slides up — low thud and a rising breath
  {
    const w = whoosh(0.2, t => 300 + 3400 * t / 0.2, t => Math.sin(Math.PI * Math.min(1, t / 0.2)) * 0.9, sr);
    bufs.open = render(c, 0.22, t => 0.5 * w(t) + 0.55 * Math.sin(TAU * 120 * t) * Math.exp(-t / 0.05));
  }
  // a window closes: the breath falls and the slab sets down
  {
    const w = whoosh(0.16, t => 3000 - 2700 * t / 0.16, t => Math.sin(Math.PI * Math.min(1, t / 0.16)) * 0.8, sr);
    bufs.close = render(c, 0.2, t => 0.45 * w(t) + (t > 0.11 ? 0.6 * Math.sin(TAU * 92 * (t - 0.11)) * Math.exp(-(t - 0.11) / 0.04) : 0));
  }
  // a purchase: two coins clink
  {
    const coin = (t: number) => t < 0 ? 0 : (Math.sin(TAU * 2093 * t) + 0.7 * Math.sin(TAU * 3136 * t) + 0.45 * Math.sin(TAU * 5274 * t)) * Math.exp(-t / 0.07);
    bufs.buy = render(c, 0.36, t => 0.32 * (coin(t) + 0.8 * coin(t - 0.075)));
  }
  // one reward: a bright bell (C6) with a sparkle on top
  bufs.reward = render(c, 1.1, t => 0.36 * (bell(1046.5, t, 0.55) + 0.25 * bell(4186, t - 0.03, 0.12)));
  // many rewards: a quick climb C6 E6 G6 C7, then the chord rings out
  {
    const notes = [1046.5, 1318.5, 1568, 2093];
    bufs.rewardMany = render(c, 1.7, t => {
      let s = 0;
      notes.forEach((f, i) => { s += 0.8 * bell(f, t - i * 0.075, 0.3); });
      for (const f of [1046.5, 1318.5, 1568]) s += 0.55 * bell(f, t - 0.33, 0.85);
      return 0.22 * s;
    });
  }
  // a pick: a short two-note «yes»
  bufs.pick = render(c, 0.3, t => 0.3 * (bell(880, t, 0.08, [[1, 1], [2, 0.3]]) + bell(1318.5, t - 0.06, 0.16, [[1, 1], [2, 0.3]])));
}

/** the recorded sounds: decoded once, then they take the place of the made ones */
function loadSamples(c: AudioContext): void {
  for (const [k, url] of Object.entries(SFX_DATA)) {
    void fetch(url).then(r => r.arrayBuffer()).then(a => c.decodeAudioData(a)).then(b => { bufs[k as Snd] = b; }).catch(() => undefined);
  }
}

// ---------------- play ----------------
const VOL: Record<Snd, number> = { shot: 0.32, open: 0.42, close: 0.38, buy: 0.6, reward: 0.75, rewardMany: 0.85, pick: 0.55 };
let lastShot = 0;
export function play(s: Snd): void {
  if (!cfg.snd) return;
  const c = audio(); if (!c || !master || c.state !== 'running') return;
  const b = bufs[s]; if (!b) return;
  if (s === 'shot') { const now = c.currentTime; if (now - lastShot < 0.11) return; lastShot = now; } // not more than ~9 a second
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = b; g.gain.value = VOL[s];
  if (s === 'shot') src.playbackRate.value = 0.92 + Math.random() * 0.16; // a little different every time
  src.connect(g); g.connect(master); src.start();
}

let lastHit = 0;
export function vibrate(k: Vib): void {
  if (!cfg.vib) return;
  const now = performance.now();
  if (k === 'hit') { if (now - lastHit < 260) return; lastHit = now; }
  const go = (p: Promise<void>) => { void p.catch(() => undefined); };
  try {
    switch (k) {
      case 'hit': go(Haptics.impact({ style: ImpactStyle.Light })); break;
      case 'heavy': go(Haptics.impact({ style: ImpactStyle.Heavy })); break;
      case 'reward': go(Haptics.impact({ style: ImpactStyle.Medium })); break;
      case 'level': go(Haptics.impact({ style: ImpactStyle.Light })); setTimeout(() => go(Haptics.impact({ style: ImpactStyle.Light })), 110); break;
      case 'death': go(Haptics.vibrate({ duration: 420 })); break;
    }
  } catch { /* no vibration on this device */ }
}
