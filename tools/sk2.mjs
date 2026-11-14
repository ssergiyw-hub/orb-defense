import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('file://' + process.cwd() + '/dist/index.html#god-skilltest'); await p.waitForTimeout(3200);
await p.evaluate(() => { document.querySelector('[data-a="startPick"][data-v="apollo"]').click(); document.querySelector('[data-a="startGo"]').click(); });
await p.waitForTimeout(400); await p.screenshot({ path: 'shots/u-hub.png' });
await p.evaluate(() => document.querySelector('[data-a="battle"]').click());
await p.waitForTimeout(4000); await p.screenshot({ path: 'shots/u-aura.png' });
await p.keyboard.down('d');
for (let i = 0; i < 6; i++) { await p.waitForTimeout(70); await p.screenshot({ path: `shots/u-walk${i}.png`, clip: { x: 155, y: 360, width: 80, height: 110 } }); }
await p.keyboard.up('d');
console.log(errs); await b.close();
