import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 680 } });
p.on('pageerror', e => console.log('err', String(e)));
await p.addInitScript(() => { try { localStorage.setItem('mw-lang', 'uk'); } catch {} });
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
const shot = async n => { await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/s132/f_${n}.png` }); };
await p.goto('http://localhost:8766/index.html#god'); await p.waitForTimeout(2500);
for (let i = 0; i < 10 && await p.evaluate(() => !!document.querySelector('[data-a="startPick"]')); i++) { await click('[data-a="startPick"][data-v="hydra"]'); await p.waitForTimeout(500); await click('[data-a="startGo"]'); await p.waitForTimeout(800); }
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = []; s.maxMap = 5; s.energy = 20; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(2500); await click('[data-a="close"]'); await click('[data-a="rewardOk"]');
await shot('hub');
await click('[data-a="go"][data-v="shop"]'); await p.evaluate(() => document.getElementById('view').scrollTop = 180); await shot('shop');
await click('[data-a="go"][data-v="events"]'); await p.evaluate(() => document.getElementById('view').scrollTop = 0); await shot('events0');
await p.evaluate(() => document.getElementById('view').scrollTop = 200); await shot('events');
await click('[data-a="go"][data-v="hub"]'); await click('[data-a="market"]'); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('.mkbody').scrollTop = 120); await shot('market');
await b.close();
