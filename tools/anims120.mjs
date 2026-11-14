import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3000);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 3; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3500);
const tabs = process.argv.slice(2);
for (const t of ['hub', ...tabs]) {
  if (t !== 'hub') { await click(`[data-a="tab"][data-v="${t}"]`); await p.waitForTimeout(800); }
  const r = await p.evaluate(() => document.getAnimations().map(a => { const e = a.effect?.target; const r = e?.getBoundingClientRect?.(); return `${a.animationName ?? a.constructor.name} ${e?.tagName}.${(e?.className?.baseVal ?? e?.className ?? '').toString().split(' ')[0]} ${r ? Math.round(r.width) + 'x' + Math.round(r.height) : ''}`; }));
  const cnt = {}; for (const x of r) cnt[x] = (cnt[x] ?? 0) + 1;
  console.log('==', t, r.length); console.log(Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`).join('\n'));
}
await b.close();
