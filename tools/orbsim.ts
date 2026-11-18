// Orb Defense: a free player's progression, played by the bot with the real meta (rewards, chests, upgrades).
// Usage: npx tsx tools/orbsim.ts [battles] [hero] [runsPerDay]
// The player: plays the next stage; after 2 losses there in a row farms the last won stage once; after every fight
// opens the stage chest, wears the best item of each slot, levels the worn gear with scrolls, levels balls (hero ball first).
declare const process: { argv: string[] };
import { Orb, Act } from '../src/core/orb';
import { BALL_IDS, HERO_BALL } from '../src/core/orbContent';
import * as P from '../src/meta/profile';
import * as M from '../src/meta/orbMeta';

const N = +(process.argv[2] ?? 120), HERO = process.argv[3] ?? 'apollo', PER_DAY = +(process.argv[4] ?? 20);
const p = P.newProfile(HERO);
const score = (it: P.Item) => { const b = P.itemBase(it); return (b.atk ?? 0) * 3 + (b.hp ?? 0); };
let lostHere = 0, firstWin: Record<number, number> = {}, log: string[] = [];
const turns: number[] = [];
for (let n = 1; n <= N; n++) {
  const next = p.maxMap + 1, stage = lostHere >= 2 && p.maxMap >= 1 ? p.maxMap : next;
  const cfg = M.makeConfig(p, stage, HERO, n * 7919 + stage);
  const o = new Orb(cfg);
  while (o.s.phase !== 'win' && o.s.phase !== 'lose' && o.s.turn < 250) {
    let a: Act;
    if (o.s.phase === 'aim') a = { aim: o.bestAim() }; else if (o.s.phase === 'choose') a = { choice: 0 }; else { o.step(); continue; }
    o.act(a);
  }
  const win = o.s.phase === 'win';
  turns.push(o.s.turn);
  const r = M.finishOrb(p, o, stage, false);
  if (r.chest) P.openStageChest(p, r.chest, r.gold);
  if (stage === next) { if (win) { lostHere = 0; firstWin[stage] = n; } else lostHere++; } else lostHere = 0;
  // wear the best of each slot
  for (const it of p.items) { const cur = p.items.find(i => i.uid === p.equipped[it.slot]); if (!cur || score(it) > score(cur)) P.equip(p, it.uid); }
  // level the worn gear (cheapest first), then the balls (hero ball first, then the lowest)
  for (let k = 0; k < 40; k++) {
    const worn = Object.values(p.equipped).map(u => p.items.find(i => i.uid === u)!).filter(Boolean).sort((a, b) => a.level - b.level);
    let did = false;
    for (const it of worn) { try { if (P.upgradeItem(p, it.uid, 1)) { did = true; break; } } catch { /* cap or money */ } }
    const ob = M.orb(p), hb = HERO_BALL[HERO];
    const order = [hb, ...BALL_IDS.filter(b => b !== hb).sort((a, b) => ob.balls[a].lv - ob.balls[b].lv)];
    for (const b of order) { try { M.upgradeBall(p, b); did = true; break; } catch { /* not yet */ } }
    if (!did) break;
  }
  const st = P.statSheet(p, HERO), ob = M.orb(p);
  if (n % 10 === 0 || n === 1) log.push(`#${n} (day ${(n / PER_DAY).toFixed(1)}) maxMap ${p.maxMap} | hero lv ${p.heroes[HERO].level} atk ${Math.round(st.atk)} hp ${Math.round(st.hp)} | gold ${p.gold} scrolls ${p.scrolls} | balls ${BALL_IDS.map(b => ob.balls[b].lv).join(',')} | items ${p.items.length} | last: st${stage} ${win ? 'WIN' : 'lose'} t${o.s.turn} wall ${Math.round(100 * o.s.wallHp / o.s.wallMax)}%`);
}
console.log(log.join('\n'));
console.log('first wins (stage: battle #):', Object.entries(firstWin).map(([s, n]) => `${s}:${n}`).join(' '));
console.log('turns per fight: avg', (turns.reduce((a, b) => a + b, 0) / turns.length).toFixed(1), 'max', Math.max(...turns));
