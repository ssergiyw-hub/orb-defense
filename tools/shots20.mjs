import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const shot = n => p.screenshot({ path: `shots/r-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3800);
await click('[data-a="startPick"][data-v="poseidon"]'); await p.waitForTimeout(300); await shot('00-start');
await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.crystals = 90000; s.maxMap = 3; s.idleAt = Date.now() - 7 * 3600e3;
  for (const id in s.heroes) s.heroes[id].owned = true; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(4000); await shot('01-hub');
for (const st of ['guard', 'wanderer', 'berserk']) { await click('[data-a="go"][data-v="shop"]'); await click(`[data-a="shopSet"][data-v="${st}"]`); for (let k = 0; k < 2; k++) { await click('[data-a="chest"][data-v="set:10"]'); await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('.rewardov')?.click()); } }
await click('[data-a="chest"][data-v="obsidian:10"]'); await p.waitForTimeout(200); await shot('02-reward'); await p.evaluate(() => document.querySelector('.rewardov')?.click());
await click('[data-a="go"][data-v="shop"]'); await p.waitForTimeout(300); await shot('03-shop');
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(300);
// equip the best of each slot
await p.evaluate(() => { for (let i = 0; i < 12; i++) { const c = document.querySelector('.igrid .icard'); if (!c) break; c.click(); const e = document.querySelector('[data-a="equip"]'); if (e) e.click(); else document.querySelector('.modal .x')?.click(); } });
await p.waitForTimeout(300); await shot('04-gear');
await click('.gslotcard:not(.empty)'); await p.waitForTimeout(300); await shot('05-item'); await click('.modal .x');
await click('[data-a="sub"][data-v="chars"]'); await p.waitForTimeout(300); await shot('06-chars');
await p.evaluate(() => document.querySelector('#view').scrollTop = 400); await p.waitForTimeout(200); await shot('07-chars2');
for (const id of ['heracles', 'poseidon', 'skadi', 'veles', 'hades', 'stribog']) { await click(`[data-a="heroView"][data-v="${id}"]`); await p.waitForTimeout(250); await p.evaluate(() => document.querySelector('#view').scrollTop = 0); await p.waitForTimeout(100); await p.screenshot({ path: `shots/r-h-${id}.png`, clip: { x: 0, y: 40, width: 390, height: 260 } }); }
await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(300);
await click('.fightbtn'); await p.waitForTimeout(3500); await p.keyboard.down('a'); await p.waitForTimeout(500); await shot('08-battle'); await p.keyboard.up('a');
console.log(errs); await b.close();
