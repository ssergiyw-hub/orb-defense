// Jeweler with every gem type at every star level (★4 = glowing prismatic gems).
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3200);
await p.evaluate(() => { document.querySelector('[data-a="startPick"][data-v="apollo"]').click(); document.querySelector('[data-a="startGo"]').click(); });
await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes']; s.gems = [];
  const T = ['ruby','emerald','sapphire','topaz','amethyst','diamond','garnet','jade']; let u = 500;
  for (const st of [4,3,2,1]) for (const t of T) s.gems.push({ uid: u++, type: t, stars: st, level: 1, xp: 0 });
  localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3200);
await p.evaluate(() => document.querySelector('[data-a="go"][data-v="jewel"]').click()); await p.waitForTimeout(1500);
await p.screenshot({ path: 'shots/w-jewel.png' });
console.log(errs); await b.close();
