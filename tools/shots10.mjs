// Battle look: heroes, monsters, rocks, swamps (god mode, a few minutes in).
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god');
await click('[data-a="startPick"][data-v="perun"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/x-01-hub.png' });
await click('[data-a="battle"]'); await p.waitForTimeout(500);
const keys = ['d', 's', 'a', 'w'];
for (let i = 0; i < 16; i++) {
  if (await p.$('#cards:not([hidden])')) { await p.evaluate(() => document.querySelector('#cardList .card')?.click()); await p.waitForTimeout(100); continue; }
  await p.keyboard.down(keys[i % 4]); await p.waitForTimeout(1500); await p.keyboard.up(keys[i % 4]);
  if (i === 5) await p.screenshot({ path: 'shots/x-02-battle.png' });
}
await p.screenshot({ path: 'shots/x-03-battle.png' });
console.log(errs, await p.textContent('#fps'));
await b.close();
