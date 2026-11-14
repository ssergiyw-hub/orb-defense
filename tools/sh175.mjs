// правка 175: «+1/+2 стрела» — arrows side by side. Screens of a stage fight with multi 2.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const base = process.env.BASE ?? 'file://' + process.cwd() + '/dist/index.html';
await p.goto(base + '#god,multitest'); await p.waitForTimeout(6500);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 3; s.tut = 3; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(6500);
await click('[data-a="battle"]'); await p.waitForTimeout(700); await click('[data-a="battleGo"]'); await p.waitForTimeout(2500);
for (let i = 0; i < 4; i++) { await p.waitForTimeout(900 + i * 130); await p.screenshot({ path: `shots/s175-${i}.png` }); }
console.log(JSON.stringify(errs)); await b.close(); process.exit(0);
