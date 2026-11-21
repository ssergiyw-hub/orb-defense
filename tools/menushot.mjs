import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const has = sel => p.evaluate(s => !!document.querySelector(s), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'uk');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(5000);
for (let i = 0; i < 120 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click('[data-a="startPick"][data-v="apollo"]'); await p.waitForTimeout(300); await click('[data-a="startGo"]'); await p.waitForTimeout(700); }
for (let i = 0; i < 90 && !(await has('[data-a="go"]')); i++) await p.waitForTimeout(500); await p.waitForTimeout(2500);
await p.evaluate(() => { const pr = window.__hub.p; const sl = ['book','mantle','gloves','boots','amulet','ring'];
  let uid = 9000; pr.items = []; const rs = [9,4,2,9,5,3,0,1,4,9,8,2];
  rs.forEach((r, i) => pr.items.push({ uid: uid + i, slot: sl[i % 6], set: 'guard', rarity: r, level: 1 + i, gems: [null, null] }));
  sl.forEach((s, i) => pr.equipped[s] = uid + i); pr.gold = 41000; pr.crystals = 1585; });
const shot = async (scr, tag, sub) => { await p.evaluate(([scr, sub]) => { const h = window.__hub; if (sub) h.sel.heroSub = sub; h.go(scr); }, [scr, sub]); await p.waitForTimeout(1500); await p.screenshot({ path: `shots/${tag}.png` }); };
await shot('hub', 'h-hub'); await shot('hero', 'h-hero', 'gear'); await shot('shop', 'h-shop');
console.log(JSON.stringify(errs.slice(0, 5))); await b.close();
