// Orb Defense balance bot: plays stages with the auto aim. Usage: npx tsx tools/orbbot.ts [stages] [atk] [hp] [seeds]
declare const process: { argv: string[] };
import { Orb, OrbConfig, replayOrb, Act } from '../src/core/orb';
import { BALL_IDS } from '../src/core/orbContent';
const N = +(process.argv[2] ?? 5), atk = +(process.argv[3] ?? 110), hp = +(process.argv[4] ?? 110), seeds = +(process.argv[5] ?? 3);
for (let st = 1; st <= N; st++) {
  const res: string[] = [];
  for (let sd = 1; sd <= seeds; sd++) {
    const cfg: OrbConfig = { seed: sd * 7919 + st, stage: st, heroId: 'prometheus', heroBall: 'fire', atk: atk * Math.pow(1.1, st - 1), hp, crit: 0.05, critDmg: 1.5, boss: 0,
      ballLv: Object.fromEntries(BALL_IDS.map(b => [b, 1])), normals: 4, spirit: { id: 'fire', rarity: 0, lv: 1 }, wall: { id: 'start', rarity: 0, lv: 1 } };
    const o = new Orb(cfg); const acts: Act[] = []; const t0 = Date.now(); let ticks = 0;
    while (o.s.phase !== 'win' && o.s.phase !== 'lose' && o.s.turn < 200) {
      let a: Act;
      if (o.s.phase === 'aim') a = { aim: o.bestAim() }; else if (o.s.phase === 'choose') a = { choice: 0 }; else { o.step(); ticks++; continue; }
      acts.push(a); o.act(a);
    }
    const r = replayOrb(cfg, acts);
    res.push(`${o.s.phase} t${o.s.turn} wall ${Math.round(100 * o.s.wallHp / o.s.wallMax)}% hero ${Math.round(100 * o.s.heroHp / o.s.heroMax)}% lv${o.s.level} kills ${o.s.kills} ${(Date.now() - t0)}ms ticks ${ticks} replay ${r.hash() === o.hash() ? 'ok' : 'BAD'}`);
  }
  console.log('stage', st, '\n  ' + res.join('\n  '));
}
