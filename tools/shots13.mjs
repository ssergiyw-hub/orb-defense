// Main screen chest + side buttons, chest window, ★4 gems from the crystal search.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/z-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html');
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.crystals = 30000; s.idleAt = Date.now() - 4 * 3600e3; s.seen = ['hub','chars','gear','jewel','shop','runes']; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(400); await shot('01-hub-half');
await click('[data-a="idleOpen"]'); await click('[data-a="idleInfo"]'); await p.waitForTimeout(200); await shot('02-idle');
await click('[data-a="idleFast"][data-v="energy"]'); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('.rewardov')?.click());
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.idleAt = Date.now() - 13 * 3600e3; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(400); await shot('03-hub-full');
await click('.tab:nth-child(2)'); await p.waitForTimeout(200);
for (let i = 0; i < 70; i++) { await click('[data-a="explore"][data-v="crystals"]'); await p.waitForTimeout(20); await p.evaluate(() => document.querySelector('.rewardov')?.click()); }
await p.waitForTimeout(2500); await shot('04-jewel');
console.log(errs);
await b.close();
