import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'uk');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click('[data-a="startPick"][data-v="apollo"]'); await p.waitForTimeout(150); await click('[data-a="startGo"]'); await p.waitForTimeout(350); }
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 6; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForSelector('[data-a="go"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
await click('[data-a="go"][data-v="events"]'); await p.waitForTimeout(500);
for (const ev of ['bossorb', 'storm']) {
  await click(`[data-a="evOpen"][data-v="${ev}"]`); await p.waitForTimeout(400); await click('[data-a="evRate"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `shots/rt-${ev}.png` });
  if (ev === 'bossorb') { await p.evaluate(() => { const r = document.querySelector('.evrows'); r.scrollTop = 9999; }); await p.waitForTimeout(200); await p.screenshot({ path: 'shots/rt-bottom.png' }); }
  await click('.mrate .lvsq.x'); await p.waitForTimeout(300);
  await click(`[data-a="evOpen"][data-v="${ev}"]`); await p.waitForTimeout(400); await p.screenshot({ path: `shots/ev-${ev}.png` }); await click('.mrate .lvsq.x'); await p.waitForTimeout(300);
}
console.log(JSON.stringify(errs)); await b.close();
