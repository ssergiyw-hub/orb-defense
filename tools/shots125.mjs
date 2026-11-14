// правки 125, 126: events window, rating and both battles. node tools/shots125.mjs <lang> <outPrefix>
import { chromium } from 'playwright';
const [lang = 'ru', out = '/tmp/s125/ru'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => console.log('err', String(e)));
await p.addInitScript(l => { try { localStorage.setItem('mw-lang', l); } catch {} }, lang);
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
const shot = async n => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}_${n}.png` }); };
await p.goto((process.env.BASE ?? 'file://' + process.cwd() + '/dist') + '/index.html#god'); await p.waitForTimeout(2500);
for (let i = 0; i < 10 && await p.evaluate(() => !!document.querySelector('[data-a="startPick"]')); i++) { await click('[data-a="startPick"][data-v="hydra"]'); await p.waitForTimeout(500); await click('[data-a="startGo"]'); await p.waitForTimeout(800); }
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = []; s.maxMap = 5; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(2500); await click('[data-a="close"]'); await click('[data-a="rewardOk"]');
await click('[data-a="go"][data-v="events"]'); await shot('1events');
for (const ev of ['boss', 'frags']) {
  await click(`[data-a="evOpen"][data-v="${ev}"]`); await shot(`2${ev}win`);
  if (ev === 'boss') { await click('[data-a="evRate"]'); await shot('3rate'); await p.evaluate(() => document.querySelector('.evrows')?.scrollTo(0, 9999)); await shot('3rate_b'); await click('[data-a="evChest"][data-v="2"]'); await shot('3chest'); await click('.evcpop'); await click(`[data-a="evOpen"][data-v="${ev}"]`); }
  await click('[data-a="evGo"]'); await p.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(ev === 'boss' ? 1100 : 2500);
    await p.evaluate(() => { const c = document.querySelector('#cardList .sk'); if (c && !document.getElementById('cards').hidden) c.click(); });
    await p.waitForTimeout(200); await shot(`4${ev}_${i}`);
  }
  await click('#pauseBtn'); await p.waitForTimeout(300); await click('#quitBtn'); await p.waitForTimeout(1500); await shot(`5${ev}end`);
  await click('[data-a="rewardOk"]'); await p.waitForTimeout(500); await click('[data-a="go"][data-v="events"]'); await p.waitForTimeout(300);
}
await b.close();
