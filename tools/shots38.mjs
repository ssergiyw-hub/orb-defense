import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
const fire = (a, v = '') => p.evaluate(([a, v]) => { const f = document.createElement('i'); f.dataset.a = a; f.dataset.v = v; document.querySelector('#layer').appendChild(f); f.click(); f.remove(); }, [a, v]);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3400);
await p.evaluate(() => document.querySelector('[data-a="startPick"][data-v="hydra"]')?.click()); await p.evaluate(() => document.querySelector('[data-a="startGo"]')?.click()); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3600);
for (const [h, n] of [[13, 'full'], [8, 'mid'], [2, 'low']]) {
  await p.evaluate(h => { window.__hub.p.idleAt = Date.now() - h * 3600e3; window.__hub.render(); }, h); await p.waitForTimeout(300);
  await p.screenshot({ path: `shots/w8-hub-${n}.png`, clip: { x: 0, y: 520, width: 200, height: 200 } });
  await fire('idleOpen'); await p.waitForTimeout(400); await p.screenshot({ path: `shots/w8-idle-${n}.png`, clip: { x: 0, y: 60, width: 390, height: 330 } }); await fire('close');
}
await b.close();
