import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('file://' + process.cwd() + '/dist/index.html#god');
await p.click('text=Велес'); await p.click('#startBtn');
await p.click('#speedBtn'); await p.click('#speedBtn');
const keys = ['w', 'd', 's', 'a']; let k = 0; const t0 = Date.now(); const got = new Set(); let fpsLog = [];
while (Date.now() - t0 < 170000) {
  if (await p.$('#cards:not([hidden])')) { await p.click('#cardList .card >> nth=0'); await p.waitForTimeout(30); continue; }
  if (await p.$('#result:not([hidden])')) break;
  await p.keyboard.down(keys[k % 4]); await p.waitForTimeout(500); await p.keyboard.up(keys[k % 4]); k++;
  const name = await p.textContent('#bossName').catch(() => '');
  const vis = await p.$('#bossBar:not([hidden])');
  if (vis && name && !got.has(name.slice(0, 6))) { got.add(name.slice(0, 6)); await p.waitForTimeout(1500); await p.screenshot({ path: `shots/boss-${got.size}.png` }); }
  if (k % 20 === 0) fpsLog.push(await p.textContent('#fps') + ' @' + await p.textContent('#timer'));
}
await p.waitForTimeout(1200);
await p.screenshot({ path: 'shots/boss-end.png' });
console.log(errs, fpsLog.join(' | '));
await b.close();
