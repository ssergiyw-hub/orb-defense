// Orb Defense: battle screenshots. Usage: node tools/orbshot.mjs [hero] [stage] [tag]
import { chromium } from 'playwright';
const hero = process.argv[2] || 'prometheus', stage = process.argv[3] || '1', tag = process.argv[4] || 'a';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3600);
await click(`[data-a="startPick"][data-v="${hero}"]`); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(st => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = +st - 1; s.energy = 99; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, stage);
await p.reload(); await p.waitForTimeout(3600);
await p.screenshot({ path: `shots/o-${tag}-hub.png` });
await click('[data-a="battle"]'); await p.waitForTimeout(600); await click('[data-a="battleGo"]');
await p.waitForTimeout(2500);
await p.screenshot({ path: `shots/o-${tag}-start.png` });
// aim by hand: drag up-left and release
await p.mouse.move(195, 640); await p.mouse.down(); await p.mouse.move(120, 300, { steps: 6 }); await p.waitForTimeout(400);
await p.screenshot({ path: `shots/o-${tag}-aim.png` });
await p.mouse.up(); await p.waitForTimeout(900);
await p.screenshot({ path: `shots/o-${tag}-fly.png` });
await p.evaluate(() => document.getElementById('oAuto').click());
await p.evaluate(() => document.getElementById('oSpeed').click());
await p.evaluate(() => document.getElementById('oSpeed').click());
for (let i = 0; i < 6; i++) { await p.waitForTimeout(5000); await p.screenshot({ path: `shots/o-${tag}-t${i}.png` }); }
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
