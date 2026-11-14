import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
for (const [W, H] of [[390, 844], [390, 680]]) {
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', e => console.log('err', String(e)));
await p.addInitScript(() => { try { localStorage.setItem('mw-lang', 'uk'); } catch {} });
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
await p.goto('http://localhost:8766/index.html#god'); await p.waitForTimeout(2500);
for (let i = 0; i < 10 && await p.evaluate(() => !!document.querySelector('[data-a="startPick"]')); i++) { await click('[data-a="startPick"][data-v="hydra"]'); await p.waitForTimeout(500); await click('[data-a="startGo"]'); await p.waitForTimeout(800); }
await click('[data-a="close"]'); await click('[data-a="rewardOk"]');
await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(400);
for (const sub of ['gear', 'runes', 'chars']) {
  await click(`[data-a="sub"][data-v="${sub}"]`); await p.waitForTimeout(500);
  console.log(H, sub, await p.evaluate(() => { const t = document.querySelector('.temple'); const s = document.querySelector('.gcol .gslotcard, .rslot'); return [t.style.zoom, t.style.getPropertyValue('--cut'), Math.round(t.getBoundingClientRect().height), s && Math.round(s.getBoundingClientRect().width), document.getElementById('hscroll').clientHeight]; }));
  await p.screenshot({ path: `/tmp/s132/k${H}_${sub}.png` });
}
await p.close(); }
await b.close();
