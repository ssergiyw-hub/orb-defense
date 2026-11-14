// правка 155: attack / health / power of a hero at progress snapshots (dev tool).
//   npx tsx tools/power.ts          — the table now
//   npx tsx tools/power.ts save     — keep it in /tmp/power_old.json (before a balance change)
//   npx tsx tools/power.ts cmp      — compare with the kept table
//   npx tsx tools/power.ts prof     — a mid-game profile for screenshots → /tmp/bal/prof.json (tools/sh155.mjs)
import * as P from '../src/meta/profile';
import { SLOTS, SETS } from '../src/meta/defs';
declare const process: { argv: string[] };
type FS = { readFileSync(p: string, e: string): string; writeFileSync(p: string, d: string): void; mkdirSync(p: string, o: { recursive: boolean }): void };
// rough progress by day: hero level, gear rarity / level, gems in every open socket (LAYOUT)
const prog = [
  { name: 'start', hl: 1, rar: 0, lv: 1, gst: 1, glv: 1 },
  { name: 'd7', hl: 10, rar: 1, lv: 15, gst: 1, glv: 10 },
  { name: 'd30', hl: 22, rar: 2, lv: 25, gst: 2, glv: 20 },
  { name: 'd60', hl: 35, rar: 2, lv: 35, gst: 2, glv: 30 },
  { name: 'd120', hl: 50, rar: 4, lv: 50, gst: 3, glv: 45 },
  { name: 'd200', hl: 65, rar: 5, lv: 60, gst: 3, glv: 60 },
  { name: 'd300', hl: 80, rar: 7, lv: 80, gst: 3, glv: 80 },
  { name: 'max', hl: 100, rar: 9, lv: 100, gst: 4, glv: 100 },
];
/** правка 157: what a player puts in each item — the attack / health gem where it fits, the second kind elsewhere */
const LAYOUT: Record<string, string[]> = {
  book: ['ruby', 'ruby', 'ruby', 'ruby'], amulet: ['ruby', 'ruby', 'ruby', 'ruby'], ring: ['diamond', 'garnet', 'diamond', 'garnet'],
  mantle: ['emerald', 'emerald', 'emerald', 'emerald'], gloves: ['emerald', 'emerald', 'emerald', 'emerald'], boots: ['sapphire', 'topaz', 'sapphire', 'topaz'],
};
const gemFor = (sl: string, i: number) => LAYOUT[sl][i];
const builds: Record<string, (i: number) => string> = { berserk: () => 'berserk', guard: () => 'guard', wanderer: () => 'wanderer', mix: i => SETS[i % 3] };
export function make(pi: number, b: string): P.Profile {
  const s = prog[pi], p = P.newProfile('hydra');
  p.heroes.hydra.level = s.hl; p.items = []; p.gems = [];
  SLOTS.forEach((sl, k) => {
    const it = { uid: p.nextUid++, slot: sl, set: builds[b](k), rarity: s.rar, level: s.lv, gems: [null, null, null, null] as (number | null)[] };
    p.items.push(it as never); (p.equipped as Record<string, number>)[sl] = it.uid;
    const open = P.SOCKET_LEVEL.filter(x => s.lv >= x).length;
    for (let i = 0; i < open; i++) { const g = { uid: p.nextUid++, type: gemFor(sl, i), stars: s.gst, level: s.glv, xp: 0 }; p.gems.push(g as never); it.gems[i] = g.uid; }
  });
  return p;
}
async function main(): Promise<void> {
  const fs = (await import('f' + 's')) as unknown as FS; // node only: tsconfig has no node types
  const mode = process.argv[2] ?? '';
  if (mode === 'prof') {
    const p = make(4, 'mix');
    p.maxMap = 25; p.gold = 250000; p.scrolls = 900;
    p.items.push({ uid: p.nextUid++, slot: 'ring', set: 'berserk', rarity: 5, level: 52, gems: [null, null, null, null] } as never);
    p.items.push({ uid: p.nextUid++, slot: 'mantle', set: 'guard', rarity: 2, level: 30, gems: [null, null, null, null] } as never);
    p.gems.push({ uid: p.nextUid++, type: 'ruby', stars: 3, level: 40, xp: 0 } as never);
    fs.mkdirSync('/tmp/bal', { recursive: true }); fs.writeFileSync('/tmp/bal/prof.json', JSON.stringify(p));
  } else {
    const out: Record<string, { atk: number; hp: number; def: number; power: number; dps: number; ehp: number }> = {};
    for (let i = 0; i < prog.length; i++) for (const b of Object.keys(builds)) {
      const p = make(i, b), st = P.statSheet(p), m = P.computeMods(p);
      // dps: attack with crit on average; ehp: health through defence (capped at 75% in battle)
    out[`${prog[i].name}/${b}`] = { atk: st.atk, hp: st.hp, def: m.def, power: P.powerScore(p),
      dps: st.atk * (1 + Math.min(1, m.crit) * (m.critDmg - 1)), ehp: st.hp / (1 - Math.min(0.75, Math.max(0, m.def))) };
    }
    const old = mode === 'cmp' ? JSON.parse(fs.readFileSync('/tmp/power_old.json', 'utf8')) : null;
    if (mode === 'save') fs.writeFileSync('/tmp/power_old.json', JSON.stringify(out));
    const r = (a: number, b: number) => ((a / b - 1) * 100).toFixed(1).padStart(6) + '%';
    for (const [k, n] of Object.entries(out)) {
      const o = old?.[k];
      console.log(k.padEnd(16), 'ATK', String(Math.round(n.atk)).padStart(5), o ? r(n.atk, o.atk) : '', ' HP', String(Math.round(n.hp)).padStart(5), o ? r(n.hp, o.hp) : '',
      ' DPS', String(Math.round(n.dps)).padStart(5), o?.dps ? r(n.dps, o.dps) : '', ' EHP', String(Math.round(n.ehp)).padStart(5), o?.ehp ? r(n.ehp, o.ehp) : '', ' power', String(n.power).padStart(6), o ? r(n.power, o.power) : '');
    }
  }
}
void main();
