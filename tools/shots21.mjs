import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const shot = n => p.screenshot({ path: `shots/q-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3600);
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.crystals = 90000; s.heroes.apollo.particles = 50; s.heroes.apollo.xp = 16; s.heroes.apollo.stars = 2; s.idleAt = Date.now() - 13 * 3600e3;
  s.heroes.hydra.owned = true; s.heroes.hydra.particles = 25; s.heroes.hydra.level = 12; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3800); await shot('01-hub');
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="chars"]'); await p.waitForTimeout(400); await shot('02-chars');
await click('[data-a="heroInfo"]'); await p.waitForTimeout(200); await shot('03-info'); await click('.modal .x');
await click('[data-a="bonusOpen"]'); await click('[data-a="heroView"][data-v="hydra"]'); await p.waitForTimeout(300); await shot('04-hydra');
for (let k = 0; k < 3; k++) { await click('[data-a="go"][data-v="shop"]'); await click('[data-a="chest"][data-v="obsidian:10"]'); await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('.rewardov')?.click()); }
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.items.slice(-6).forEach((it, i) => { it.rarity = 3 + (i % 2); }); localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3800);
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(400); await shot('05-gear');
console.log(errs); await b.close();
