// wall bosses: start at wave N (#wvN), frames after a few seconds
import { chromium } from 'playwright';
const wv = process.argv[2] ?? '10';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + `/dist/index.html#god#auratest#wv${wv}`); await p.waitForTimeout(3200);
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 3; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3400);
await click('[data-a="wallOpen"]'); await p.waitForTimeout(300); await click('[data-a="wallGo"]');
await p.waitForTimeout(1000); await click('#speedBtn');
await p.waitForTimeout(Number(process.argv[3] ?? 9000));
await click('#speedBtn'); await click('#speedBtn');
await p.screenshot({ path: `shots/w47-wave${wv}.png` });
console.log(JSON.stringify(errs)); await b.close(); process.exit(0);
