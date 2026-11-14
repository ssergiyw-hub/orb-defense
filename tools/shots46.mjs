// правка 113: new monsters on the normal maps (biomes 3–6)
import { chromium } from 'playwright';
const map = Number(process.argv[2] ?? 4);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3200);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(m => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = m - 1; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, map);
await p.reload(); await p.waitForTimeout(3400);
await click('[data-a="battle"]'); await p.waitForTimeout(700); await click('[data-a="battleGo"]'); await p.waitForTimeout(1500);
await click('#speedBtn'); await click('#speedBtn');
for (let t = 0; t < 70; t++) { await p.waitForTimeout(1000); await p.evaluate(() => { const c = document.querySelector('#cardList .sk'); if (c && !document.getElementById('cards').hidden) c.click(); }); }
await click('#speedBtn');
await p.waitForTimeout(800);
await p.screenshot({ path: `shots/w46-map${map}.png` });
console.log(JSON.stringify(errs)); await b.close(); process.exit(0);
