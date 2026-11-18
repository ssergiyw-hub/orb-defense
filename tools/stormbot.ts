// Ш98: «Шквал шаров» by the bot — how long a player holds, and that the replay matches.
// Usage: npx tsx tools/stormbot.ts <stage (maxMap)> <atk mul> <seeds>
declare const process: { argv: string[] };
import { Orb, Act, replayOrb } from '../src/core/orb';
import * as P from '../src/meta/profile';
import * as M from '../src/meta/orbMeta';
const stage = +(process.argv[2] ?? 3), mul = +(process.argv[3] ?? 1), seeds = +(process.argv[4] ?? 2);
for (let sd = 1; sd <= seeds; sd++) {
  const p = P.newProfile('apollo'); p.maxMap = stage;
  const cfg = { ...M.makeConfig(p, stage, 'apollo', sd * 7919), storm: true };
  cfg.atk *= mul; cfg.hp *= mul;
  const o = new Orb(cfg), acts: Act[] = [];
  let g = 0;
  while (o.s.phase !== 'lose' && g++ < 2e6) {
    if (o.s.phase === 'aim' || (o.s.phase === 'fly' && o.s.tick % 60 === 0)) { const a = { aim: o.stormAim(), at: o.s.tick }; acts.push(a); o.act(a); }
    if (o.s.phase === 'choose') { const a = { choice: 0 }; acts.push(a); o.act(a); continue; }
    o.step();
    if (o.s.tick > 60 * 60 * 15) break; // 15 min cap
  }
  const r = replayOrb(cfg, acts);
  const t = o.stormSec;
  console.log(`stage ${stage} ×${mul} seed ${sd}: held ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} kills ${o.s.kills} lv ${o.s.level} dealt ${Math.round(o.s.dealt)} | replay ${r.hash() === o.hash() ? 'ok' : 'MISMATCH'}`);
}
