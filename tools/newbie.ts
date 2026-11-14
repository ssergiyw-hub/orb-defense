// правка 168: как переживает первый этап новичок с новым профилем (одна книга), 4 стиля игры
// npx tsx tools/newbie.ts [map=1] [seeds=12]
import { Match, Input } from '../src/core/sim';
import { HEROES } from '../src/core/content';
import { newProfile, computeMods } from '../src/meta/profile';
declare const process: { argv: string[] };
const map = Number(process.argv[2] ?? 1), N = Number(process.argv[3] ?? 12);
type Style = 'stand' | 'wander' | 'kite' | 'circle';
function pick(m: Match): number { // cards: like a newbie — the first card that attacks, else the first
  let best = 0; m.cards.forEach((c, i) => { if (c.id === 'arrow' || c.id === 'ult') best = i; }); return best;
}
function move(m: Match, st: Style, t: number, seed: number): [number, number] {
  if (st === 'stand') return [0, 0];
  if (st === 'wander') { const k = Math.floor(t / 1.5) + seed * 7, a = (k * 2.399) % 6.283; return [Math.cos(a), Math.sin(a)]; }
  if (st === 'circle') { const a = t * 0.5; return [Math.cos(a), Math.sin(a)]; } // walks a big circle, ignores enemies
  let fx = 0, fy = 0; // kite: away from nearby enemies
  for (const e of m.enemies) { const dx = m.x - e.x, dy = m.y - e.y, d2 = dx * dx + dy * dy + 1; if (d2 < 220 * 220) { fx += dx / d2; fy += dy / d2; } }
  const cx = 1200 - m.x, cy = 1200 - m.y; fx += -cy * 4e-6 + cx * 2e-6; fy += cx * 4e-6 + cy * 2e-6;
  const l = Math.hypot(fx, fy) || 1; return [fx / l, fy / l];
}
const hero = process.argv.find(a => HEROES.some(h => h.id === a)) ?? 'hydra';
for (const st of ['stand', 'wander', 'circle', 'kite'] as Style[]) {
  const times: number[] = []; let wins = 0;
  for (let s = 1; s <= N; s++) {
    const p = newProfile(hero);
    const m = new Match({ seed: s * 7919, heroId: hero, map, mods: computeMods(p) });
    while (m.phase !== 'win' && m.phase !== 'lose' && m.time < 420) {
      if (m.phase === 'choose') { m.step({ mx: 0, my: 0, choice: pick(m), reroll: false }); continue; }
      const [x, y] = move(m, st, m.time, s);
      m.step({ mx: Math.round(x * 100), my: Math.round(y * 100), choice: -1, reroll: false } as Input);
    }
    times.push(m.time); if (m.phase === 'win') wins++;
  }
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)];
  console.log(st.padEnd(7), `wins ${wins}/${N}`, 'died at s:', times.map(t => t.toFixed(0)).join(' '), ' median', med.toFixed(0));
}
