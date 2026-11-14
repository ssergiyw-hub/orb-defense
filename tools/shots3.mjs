// Screenshots of every screen: first entry, hub, rooms, battle (pseudo-3D), skill cards, rewards.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/s-${n}.png` });
await p.goto('file://' + process.cwd() + '/dist/index.html#god');
await p.evaluate(() => localStorage.clear()); await p.reload();
await p.click('[data-v="perun"]'); await shot('01-start');
await p.click('[data-a="startGo"]'); await p.waitForTimeout(200); await shot('02-hub');
await p.click('[data-v="shop"]'); await p.click('[data-a="test"]'); await p.click('[data-a="test"]'); await p.click('[data-a="test"]');
await p.click('[data-a="shopSlot"][data-v="mantle"]'); for (let i = 0; i < 3; i++) await p.click('[data-a="gearChest"]');
await p.click('[data-a="spin"][data-v="10"]'); await shot('03-shop');
await p.click('[data-a="go"][data-v="hub"]'); await p.click('[data-v="gear"]');
await p.click('.irow >> nth=0'); await p.click('[data-a="up"][data-v="10"]'); await shot('04-gear');
await p.click('[data-a="go"][data-v="hub"]'); await p.click('[data-v="jewel"]');
for (let i = 0; i < 5; i++) await p.click('[data-a="search"][data-v="crystals:one"]');
await p.click('.gem >> nth=0'); await shot('05-jewel');
await p.click('[data-a="go"][data-v="hub"]'); await p.click('[data-v="runes"]'); await p.click('[data-a="craft"]');
await p.click('.irow >> nth=0'); await p.click('[data-a="runeToggle"]'); await shot('06-runes');
await p.click('[data-a="go"][data-v="hub"]'); await p.click('[data-v="tavern"]'); await p.click('[data-a="buyCoupon"]'); await p.click('[data-a="coupon"][data-v="big"]'); await shot('07-tavern');
await p.click('[data-a="go"][data-v="hub"]'); await p.click('[data-v="portal"]'); await shot('08-portal');
await p.click('[data-a="battle"]');
await p.click('#speedBtn'); await p.click('#speedBtn');
const keys = ['w', 'd', 's', 'a']; let k = 0, cardsShot = false; const t0 = Date.now(); const taken = new Set();
while (Date.now() - t0 < 140000) {
  if (await p.$('#cards:not([hidden])')) { if (!cardsShot) { await shot('10-cards'); cardsShot = true; } await p.evaluate(() => document.querySelector('#cardList .card')?.click()); await p.waitForTimeout(60); continue; }
  if (await p.$('.rewards')) break;
  await p.keyboard.down(keys[k % 4]); await p.waitForTimeout(500); await p.keyboard.up(keys[k % 4]); k++;
  const el = Math.round((Date.now() - t0) / 1000);
  for (const t of [6, 50, 95]) if (el >= t && !taken.has(t)) { taken.add(t); await shot('09-battle-' + t); }
}
await p.waitForTimeout(800); await shot('11-rewards');
await p.click('[data-a="go"][data-v="hub"]'); await shot('12-hub-after');
console.log('errors', errs);
await b.close();
