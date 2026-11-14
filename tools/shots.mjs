// Visual check: open the build in a phone-sized headless browser and take screenshots.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/0-menu.png' });
await p.click('text=Карта 2');
await p.click('#startBtn');
await p.click('#speedBtn'); await p.click('#speedBtn'); // x4
const keys = ['w', 'd', 's', 'a'];
let k = 0, n = 0;
const targets = [8000, 30000, 47000, 62000, 95000, 110000];
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  const cards = await p.$('#cards:not([hidden])');
  if (cards) { if (n++ === 1) await p.screenshot({ path: 'shots/2-cards.png' }); await p.click('#cardList .card >> nth=0'); await p.waitForTimeout(50); continue; }
  const res = await p.$('#result:not([hidden])');
  if (res) break;
  await p.keyboard.down(keys[k % 4]); await p.waitForTimeout(700); await p.keyboard.up(keys[k % 4]); k++;
  const el = Date.now() - t0;
  if (targets.length && el > targets[0]) { await p.screenshot({ path: `shots/1-play-${Math.round(el / 1000)}.png` }); targets.shift(); }
}
await p.waitForTimeout(1000);
await p.screenshot({ path: 'shots/9-end.png' });
console.log('errors:', errs);
console.log(await p.textContent('#fps'));
await b.close();
