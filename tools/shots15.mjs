// Picture heroes: hero screen, avatars, battle (standing and walking).
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/x-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god');
await p.waitForTimeout(3200);
await click('[data-a="startPick"][data-v="apollo"]'); await p.waitForTimeout(200); await shot('00-start');
await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; for (const id of ['perun','prometheus','hydra']) s.heroes[id].owned = true; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3200); await shot('01-hub');
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="chars"]'); await p.waitForTimeout(300); await shot('02-chars');
for (const id of ['apollo', 'perun', 'prometheus', 'hydra']) {
  await p.evaluate(id => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.active = id; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, id);
  await p.reload(); await p.waitForTimeout(3200);
  await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(200);
  await shot(`03-chars-${id}`);
  await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(200);
  await click('[data-a="battle"]'); await p.waitForTimeout(2500); await shot(`10-${id}-stand`);
  await p.keyboard.down('a'); await p.waitForTimeout(700); await shot(`11-${id}-walk`); await p.keyboard.up('a');
  await p.evaluate(() => { document.getElementById('pauseBtn').click(); document.getElementById('quitBtn').click(); });
  await p.waitForTimeout(1200); await p.evaluate(() => document.querySelector('.rewardov')?.click());
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.energy = 30; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(3200);
}
console.log(errs);
await b.close();
