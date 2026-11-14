// Shop chest cards, chest odds window, gear with weapons, battle with bushes, bone arrows and trails.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const shot = n => p.screenshot({ path: `shots/v-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3200);
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes']; s.crystals = 50000; s.maxMap = 1;
  localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3200);
await click('[data-a="go"][data-v="shop"]'); await p.waitForTimeout(500); await shot('01-shop');
await p.evaluate(() => document.querySelector('#view').scrollTop = 520); await p.waitForTimeout(200); await shot('02-shop2');
await click('[data-a="shopSet"][data-v="berserk"]'); await p.evaluate(() => document.querySelector('#view').scrollTop = 0); await p.waitForTimeout(300); await shot('03-shop-berserk');
await click('[data-a="chestInfo"][data-v="set"]'); await p.waitForTimeout(200); await shot('04-info'); await click('.modal .x');
for (const st of ['guard', 'wanderer', 'berserk']) { await click(`[data-a="shopSet"][data-v="${st}"]`); await click('[data-a="chest"][data-v="set:10"]'); await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('.rewardov')?.click()); }
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(400); await shot('05-gear');
// next stage = meadow
await click('[data-a="go"][data-v="hub"]'); await click('[data-a="map"][data-v="2"]'); await p.waitForTimeout(200);
await click('[data-a="battle"]');
for (let i = 0; i < 60; i++) { await p.evaluate(() => { const c = document.querySelectorAll('#cardList .sk'); if (!document.getElementById('cards').hidden && c.length) c[0].click(); }); await p.waitForTimeout(250); if (i === 20) await shot('06-battle'); }
await shot('07-battle'); await p.keyboard.down('d'); await p.waitForTimeout(1500); await shot('08-battle'); await p.keyboard.up('d');
console.log(errs); await b.close();
