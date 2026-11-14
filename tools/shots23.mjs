import { chromium } from 'playwright';
const b = await chromium.launch();
const errs = [];
for (const [st, pos, n] of [[1, '150,150', 'nw-desert'], [2, '2250,2280', 'se-meadow'], [2, '1200,120', 'n-meadow']]) {
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
  p.on('pageerror', e => errs.push(String(e)));
  const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
  await p.goto('file://' + process.cwd() + `/dist/index.html#god-edge${pos}`); await p.waitForTimeout(3400);
  await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
  await p.evaluate(st => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = Math.max(s.maxMap || 0, st); localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, st);
  await p.reload(); await p.waitForTimeout(3600);
  if (st > 1) { await click('[data-a="map"][data-v="2"]'); await p.waitForTimeout(200); }
  await click('.fightbtn'); await p.waitForTimeout(4500);
  await p.screenshot({ path: `shots/w-${n}.png` }); await p.close();
}
console.log(errs); await b.close();
