// Stone theme on every screen.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/t-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(1200); await shot('00-boot');
await p.waitForTimeout(2200); await shot('01-start');
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.crystals = 40000; s.maxMap = 5; s.idleAt = Date.now() - 13 * 3600e3;
  for (const id of ['perun','prometheus','hydra']) s.heroes[id].owned = true; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3600); await shot('02-hub-red');
await click(`[data-a="map"][data-v="5"]`); await p.waitForTimeout(1200); await shot('03-hub-green');
await click(`[data-a="map"][data-v="4"]`); await click(`[data-a="map"][data-v="5"]`); await p.waitForTimeout(1200); await shot("04-hub-blue");
await click('[data-a="idleOpen"]'); await p.waitForTimeout(300); await shot('05-idle'); await click('.modal .x');
for (const st of ['guard', 'berserk']) { await click('[data-a="go"][data-v="shop"]'); await click(`[data-a="shopSet"][data-v="${st}"]`); await click('[data-a="chest"][data-v="set:10"]'); await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('.rewardov')?.click()); }
await click('[data-a="go"][data-v="shop"]'); await p.waitForTimeout(300); await shot('06-shop');
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(400); await shot('07-gear');
await click('[data-a="sub"][data-v="chars"]'); await p.waitForTimeout(400); await shot('08-chars');
await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(400); await shot('09-runes');
await click('[data-a="go"][data-v="jewel"]'); await p.waitForTimeout(400); await shot('10-jewel');
await click('[data-a="go"][data-v="events"]'); await p.waitForTimeout(400); await shot('11-events');
await click('[data-a="tasks"]'); await p.waitForTimeout(300); await shot('12-tasks'); await click('.modal .x');
await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(300); await click('.phit'); await p.waitForTimeout(250); await shot('13-launch');
await p.waitForTimeout(3000); await shot('14-battle');
console.log(errs); await b.close();
