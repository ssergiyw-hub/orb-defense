// Headless run: a bot plays a full match, then the server-side replay is
// checked against the live result. Usage: npx tsx tools/headless.ts [map] [hero] [seed]
import { Match, Input, replay, DT } from '../src/core/sim';
import { HEROES } from '../src/core/content';
declare const process: { argv: string[] };

const map = Number(process.argv[2] ?? 1);
const heroId = process.argv[3] ?? HEROES[0].id;
const seed = Number(process.argv[4] ?? 12345);
const god = process.argv.includes('god');

function bot(m: Match, t: number): Input {
  if (m.phase === 'choose') {
    // prefer arrow, then owned skills, then element skills
    let best = 0, score = -1;
    m.cards.forEach((c, i) => {
      const s = c.id === 'ult' ? 100 : c.id === 'arrow' ? 50 : m.lvl(c.id as never) > 0 ? 30 + m.lvl(c.id as never) : c.id.startsWith('p') ? 10 : 20;
      if (s > score) { score = s; best = i; }
    });
    return { mx: 0, my: 0, choice: best, reroll: false };
  }
  // kite: run away from weighted enemy centre, orbit around arena centre
  let fx = 0, fy = 0;
  for (const e of m.enemies) {
    const dx = m.x - e.x, dy = m.y - e.y, d2 = dx * dx + dy * dy + 1;
    if (d2 < 250 * 250) { fx += dx / d2 * 1000; fy += dy / d2 * 1000; }
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

const cfg = { seed, heroId, map };
const m = new Match(cfg);
const preset = process.argv.find(a => a.startsWith('skill='));
if (preset) m.skills.set(preset.slice(6) as never, 5);
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
});
void DT;
