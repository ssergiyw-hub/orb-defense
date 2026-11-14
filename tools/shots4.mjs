// Screenshots of the new hub layout and tabs.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const shot = n => p.screenshot({ path: `shots/h-${n}.png` });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.evaluate(() => localStorage.clear()); await p.reload();
await p.click('[data-v="skadi"]'); await p.click('[data-a="startGo"]'); await p.waitForTimeout(6500); await shot('1-main');
await p.click('.tab >> nth=4'); await p.waitForTimeout(200); await shot('2-heroes');
await p.click('.tab >> nth=0'); await shot('3-shop');
await p.click('.setbtn'); await shot('4-settings');
await p.click('.tab >> nth=2');
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.energy = 8; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(300); await shot('5-main-low-energy');
console.log(errs);
await b.close();
