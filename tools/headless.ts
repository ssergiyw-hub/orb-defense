// Headless run: a bot plays a full match, then the server-side replay is
// checked against the live result. Usage: npx tsx tools/headless.ts [map] [hero] [seed]
import { Match, Input, replay, DT, BASE_MODS, RunMods } from '../src/core/sim';
import { HEROES } from '../src/core/content';
declare const process: { argv: string[] };

const map = Number(process.argv[2] ?? 1);
const heroId = process.argv[3] ?? HEROES[0].id;
const seed = Number(process.argv[4] ?? 12345);
const god = process.argv.includes('god');

function wallBot(m: Match): number {
  // stand under the monster closest to the wall, step away from arrows that will land on us
  let tx = m.x, best = -1e9;
  for (const e of m.enemies) if (e.hp > 0 && e.y > best) { best = e.y; tx = e.x; }
  for (const b of m.eshots) if (b.life > 0 && b.lob && Math.abs(b.tx! - m.x) < b.r + 24 && b.life < 0.9) tx = m.x + (b.tx! < m.x ? 80 : -80);
  const dx = tx - m.x;
  return Math.abs(dx) < 8 ? 0 : dx > 0 ? 100 : -100;
}

function bot(m: Match, t: number): Input {
  if (m.phase !== 'choose' && m.wall) return { mx: wallBot(m), my: 0, choice: -1, reroll: false };
  if (m.phase === 'choose') {
    // prefer arrow, then owned skills, then element skills
    let best = 0, score = -1;
    m.cards.forEach((c, i) => {
      const s = c.id === 'ult' ? 100 : c.id === 'arrow' ? 50 : m.lvl(c.id as never) > 0 ? 30 + m.lvl(c.id as never) : c.id.startsWith('p') ? 10 : 20;
      if (s > score) { score = s; best = i; }
    });
    return { mx: 0, my: 0, choice: best, reroll: false };
  }
  // the bear's wind-up: step out of the zone (sideways from a charge)
  const a = m.bearAtk;
  if (a) {
    let vx = m.x - a.x, vy = m.y - a.y;
    if (a.k === 'charge') { const side = vx * -a.dy + vy * a.dx >= 0 ? 1 : -1; vx = -a.dy * side; vy = a.dx * side; }
    const l = Math.hypot(vx, vy) || 1;
    return { mx: Math.round(vx / l * 100), my: Math.round(vy / l * 100), choice: -1, reroll: false };
  }
  // kite: run away from weighted enemy centre, orbit around arena centre
  let fx = 0, fy = 0;
  for (const e of m.enemies) {
    const dx = m.x - e.x, dy = m.y - e.y, d2 = dx * dx + dy * dy + 1;
    const keep = e.kind === 'bear' ? 330 : 250;
    if (d2 < keep * keep) { fx += dx / d2 * 1000 * (e.kind === 'bear' ? 6 : 1); fy += dy / d2 * 1000 * (e.kind === 'bear' ? 6 : 1); }
  }
  for (const b of m.eshots) {
    const dx = m.x - b.x, dy = m.y - b.y, d2 = dx * dx + dy * dy + 1;
    if (d2 < 120 * 120) { fx += dx / d2 * 2500; fy += dy / d2 * 2500; }
  }
  let bo: { x: number; y: number } | null = null, bd = 300 * 300;
  for (const o of m.orbs) { if (o.v <= 0) continue; const d2 = (o.x - m.x) ** 2 + (o.y - m.y) ** 2; if (d2 < bd) { bd = d2; bo = o; } }
  if (bo) { const d = Math.sqrt(bd) || 1; fx += (bo.x - m.x) / d * 4; fy += (bo.y - m.y) / d * 4; }
  const cx = 1200 - m.x, cy = 1200 - m.y;
  fx += -cy * 0.004 + cx * 0.002; fy += cx * 0.004 + cy * 0.002;
  const l = Math.hypot(fx, fy) || 1;
  void t;
  return { mx: Math.round(fx / l * 100), my: Math.round(fy / l * 100), choice: -1, reroll: false };
}

// 'rich': every rune and gear effect on at once, to check replays with them
const rich: RunMods = {
  ...BASE_MODS, elem: { fire: 0.3 }, atk: 2, hp: 2, revive: 1, xp: 0.2, loot: 0.2, iframes: 0.3, bossCut: 0.1, goldBoss: 0.3, fury: 0.3,
  lvlHeal: 0.1, killHeal: 0.06, elemPow: { fire: 0.4, poison: 0.4 }, rerolls: 2,
  fam: { orbs: 0.3, storm: 0.3, blast: 0.3, missiles: 0.3, auras: 0.3, arrow: 0.3 },
  famLv: { orbs: 3, storm: 3, blast: 3, missiles: 3, auras: 3, arrow: 3 }, famW: { orbs: 3 },
  skillDmg: { meteor: 0.4 }, start: { meteor: 2, sprites: 3 }, unlock: ['meteor', 'sprites'],
  gfx: { thorn: 2, bark: 2, spikes: 2, roots: 2, breath: 2, thicket: 2, volley: 2, tailwind: 2, frenzy: 2, step: 2, glint: 2, execute: 2, hunger: 2, decay: 2, pulse: 2 },
};
const wm = process.argv.find(a => a.startsWith('wm='));
const cfg = { seed, heroId, map, mods: process.argv.includes('rich') ? rich : undefined, ...(process.argv.includes('wall') ? { mode: 'wall' as const, wallMap: wm ? Number(wm.slice(3)) : 0 } : {}),
  ...(process.argv.includes('frags') ? { mode: 'frags' as const, wallMap: wm ? Number(wm.slice(3)) : 0 } : {}),
  ...(process.argv.includes('boss') ? { mode: 'boss' as const, wallMap: wm ? Number(wm.slice(3)) : 0 } : {}) };
const m = new Match(cfg);
if (god) { m.hp = m.maxHp = 1e9; }
const log: Input[] = [];
const t0 = performance.now();
let maxEnemies = 0, steps = 0;
const marks: string[] = [];
let lastLvl = 1;
while (m.phase !== 'win' && m.phase !== 'lose' && steps < 30 * 60 * 12) {
  const i = bot(m, steps);
  log.push(i);
  m.step(i);
  steps++;
  maxEnemies = Math.max(maxEnemies, m.enemies.length);
  for (const f of m.fx) if (f.t === 'stage') marks.push(`${m.time.toFixed(0)}s ${f.s}`);
  if (m.level !== lastLvl && m.level % 5 === 0) marks.push(`${m.time.toFixed(0)}s level ${m.level}`);
  lastLvl = m.level;
}
const ms = performance.now() - t0;
const r = god ? m : replay(cfg, log);
console.log(marks.join('\n'));
console.log({
  xpTotal: Math.round(m.xpTotal), orbsLeft: m.orbs.length, map, hero: heroId, result: m.phase, time: m.time.toFixed(1), level: m.level, upgrades: m.upgrades, kills: m.kills,
  hp: Math.round(m.hp), maxEnemies, skills: Object.fromEntries(m.skills), ult: m.ult,
  msPerTick: (ms / m.tick).toFixed(3), replayMatch: r.hash() === m.hash(), hash: m.hash(),
  taken: m.dmgTaken, bossHp: m.boss ? Math.round(m.boss.hp) : null,
  ...(m.ev ? { score: m.score(), wave: m.wave } : {}),
  ...(m.wall ? { wave: m.wave, cleared: m.wavesCleared, wallHp: Math.round(m.wallHp), wallMax: Math.round(m.wallMax), wallBy: Object.fromEntries(Object.entries(m.wallBy).map(([k, v]) => [k, Math.round(v)])) } : {}),
  dmgBy: Object.fromEntries(Object.entries(m.dmgBy).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v)])),
});
void DT;
