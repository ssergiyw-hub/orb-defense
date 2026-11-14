import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => console.log('err', String(e)));
await p.addInitScript(() => { try { localStorage.setItem('mw-lang', 'uk'); } catch {} });
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
await p.goto('http://localhost:8766/index.html#god-winnow'); await p.waitForTimeout(2500);
for (let i = 0; i < 10 && await p.evaluate(() => !!document.querySelector('[data-a="startPick"]')); i++) { await click('[data-a="startPick"][data-v="hydra"]'); await p.waitForTimeout(500); await click('[data-a="startGo"]'); await p.waitForTimeout(800); }
await click('[data-a="close"]'); await click('[data-a="rewardOk"]');
for (let k = 0; k < 2; k++) {
  await click('.fightbtn'); await p.waitForTimeout(3500);
  await p.screenshot({ path: `/tmp/s132/c${k}_closed.png` });
  await click('[data-a="stageChest"]'); await p.waitForTimeout(900);
  await p.screenshot({ path: `/tmp/s132/c${k}_open.png` });
  await click('[data-a="rewardOk"]'); await p.waitForTimeout(800);
}
await b.close();
