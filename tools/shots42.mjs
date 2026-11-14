// правки 103, 105: rune hall hero screen, Archero-like tiles and plus-frames, lemon buttons
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3200);
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.gold = 9e6; s.crystals = 90000; s.shards = 5000; s.noConfirm = true; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3400);
await p.evaluate(() => { const P = window.__hub.p; const sl = ['book','mantle','gloves','boots','amulet','ring'], st = ['guard','wanderer','berserk'];
  let uid = 9000; for (const r of [0,0,1,1,2,3,4,5,6,7,8,9,2,1,0,3]) P.items.push({ uid: uid++, slot: sl[uid % 6], set: st[uid % 3], rarity: r, level: 1 + (uid % 5), gems: [] });
  const eq = { book: 8, gloves: 9, boots: 4, amulet: 1 }; let u = 9100;
  for (const [s, r] of Object.entries(eq)) { P.items.push({ uid: u, slot: s, set: 'guard', rarity: r, level: 7 + (u % 9), gems: [] }); P.equipped[s] = u; u++; }
  delete P.equipped.ring; delete P.equipped.mantle; window.__hub.render(); });
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(700);
await p.screenshot({ path: 'shots/w12-01-gear.png' });
await p.evaluate(() => document.querySelector('.igrid')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(200);
await p.screenshot({ path: 'shots/w12-02-grid.png' });
await p.evaluate(() => window.scrollTo(0, 0)); await click('[data-a="sub"][data-v="chars"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/w12-03-chars.png' });
await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/w12-04-runes.png' });
console.log(JSON.stringify(errs)); await b.close();
