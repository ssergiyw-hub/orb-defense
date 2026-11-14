// Boot screen, corner rings, battle pass, passes, gear band, battle HUD, skill cards.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/y-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const closeRw = () => p.evaluate(() => document.querySelector('.rewardov')?.click());
await p.goto('file://' + process.cwd() + '/dist/index.html#god');
await p.waitForTimeout(900); await shot('01-boot');
await p.waitForTimeout(2200);
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.tasks = undefined; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3000); await shot('02-hub');
await click('[data-a="go"][data-v="settings"]'); await click('[data-a="testPay"]'); await p.waitForTimeout(200); await shot('03-settings');
await click('[data-a="go"][data-v="hub"]');
// some battle pass points
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.bp.pts = 740; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(2800);
await click('[data-a="bp"]'); await p.waitForTimeout(200); await shot('04-bp');
await click('[data-a="bpBuy"]'); await p.waitForTimeout(200); await shot('05-bp-bought-reward'); await closeRw();
await click('[data-a="bpAll"]'); await p.waitForTimeout(200); await closeRw(); await p.waitForTimeout(100); await shot('06-bp-claimed');
await click('.bpbox .x');
await click('[data-a="passes"]'); await p.waitForTimeout(200); await shot('07-passes');
await click('[data-a="passBuy"][data-v="perm"]'); await closeRw(); await click('[data-a="passBuy"][data-v="hunter"]'); await closeRw(); await p.waitForTimeout(100);
await p.evaluate(() => document.querySelector('.passbox').scrollTop = 0); await shot('08-passes-bought');
await p.evaluate(() => document.querySelector('.passbox').scrollTop = 900); await p.waitForTimeout(100); await shot('09-passes-bottom');
await click('.passbox .x'); await p.waitForTimeout(100); await shot('10-hub-hunter');
await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(200); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(300); await shot('11-gear');
await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(300);
await click('[data-a="battle"]'); await p.waitForTimeout(6000); await shot('12-battle');
for (let i = 0; i < 40; i++) { const ch = await p.evaluate(() => !document.getElementById('cards').hidden); if (ch) break; await p.waitForTimeout(500); }
await p.waitForTimeout(600); await shot('13-cards');
console.log(errs);
await b.close();
