import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3200);
await click('[data-a="startPick"][data-v="stribog"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await click('[data-a="go"][data-v="shop"]'); await click('[data-a="shopSet"][data-v="berserk"]'); await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/w9-01-shop.png', fullPage: false });
for (const [i, y] of [[2, 700], [3, 1400]]) { await p.evaluate(y => document.getElementById('view').scrollTop = y, y); await p.waitForTimeout(200); await p.screenshot({ path: `shots/w9-0${i}-shop.png` }); }
console.log(errs); await b.close();
