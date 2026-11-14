// Perf check: 200 enemies with the CPU slowed down 6x (roughly a weak Android phone).
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await p.goto('file://' + process.cwd() + '/dist/index.html#god#stress');
await p.click('#startBtn');
const out = [];
for (let i = 0; i < 8; i++) {
  await p.waitForTimeout(1500);
  if (await p.$('#cards:not([hidden])')) await p.click('#cardList .card >> nth=0');
  out.push(await p.textContent('#fps'));
}
await p.screenshot({ path: 'shots/stress.png' });
console.log(out.join(' | '));
await b.close();
