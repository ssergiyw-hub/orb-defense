// правка 104: 3D heroes walk with the weapon upright, stand facing the enemy, arrows from the weapon top — frames for a GIF
import { chromium } from 'playwright';
import fs from 'fs';
const hero = process.argv[2] || 'heracles';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3200);
await click(`[data-a="startPick"][data-v="${hero}"]`); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3400);
await click('[data-a="battle"]'); await p.waitForTimeout(600); await click('[data-a="battleGo"]');
await p.waitForTimeout(2200);
const dir = `shots/gif-${hero}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
let i = 0; const t0 = Date.now(); const times = [];
const grab = async () => { await p.screenshot({ path: `${dir}/${String(i++).padStart(3, '0')}.png`, clip: { x: 115, y: 345, width: 160, height: 150 } }); times.push(Date.now() - t0); };
for (const keys of [['d'], ['d', 's'], ['s'], ['a', 's'], ['a'], ['a', 'w'], ['w'], ['d', 'w']]) {
  for (const k of keys) await p.keyboard.down(k);
  const end = Date.now() + 650; while (Date.now() < end) await grab();
  for (const k of keys) await p.keyboard.up(k);
}
const end = Date.now() + 1800; while (Date.now() < end) await grab(); // standing: turns to the enemy, arrows from the weapon
fs.writeFileSync(`${dir}/times.json`, JSON.stringify(times));
await p.screenshot({ path: `shots/w13-${hero}-battle.png` });
console.log(i, 'frames', JSON.stringify(errs)); await b.close(); process.exit(0);
