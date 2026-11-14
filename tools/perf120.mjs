// правка 120: where a battle frame spends its time. PROFILE=1 node tools/build.mjs && node tools/perf120.mjs [wall]
import { chromium } from 'playwright';
const wall = process.argv.includes('wall');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-gpu-rasterization'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist-prof/index.html#god'); await p.waitForTimeout(3000);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 4; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3200);
if (wall) { await click('[data-a="wallOpen"]'); await p.waitForTimeout(300); await click('[data-a="wallGo"]'); }
else { await click('[data-a="battle"]'); await p.waitForTimeout(600); await click('[data-a="battleGo"]'); }
await p.waitForTimeout(1500);
await click('#speedBtn'); await click('#speedBtn');
// play ~50 s game time picking cards, so the screen gets busy
for (let t = 0; t < 14; t++) { await p.waitForTimeout(1000); await p.evaluate(() => { const c = document.querySelector('#cardList .sk'); if (c && !document.getElementById('cards').hidden) c.click(); }); }
await click('#speedBtn');
const cdp = await p.context().newCDPSession(p);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const fr = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(n / 5); }; requestAnimationFrame(f); }));
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(); const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n]));
for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const k = n.callFrame.functionName || '(' + n.callFrame.url.split('/').pop() + ')'; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); }
const tot = [...self.values()].reduce((a, b) => a + b, 0);
console.log('fps', fr, 'enemies', await p.evaluate(() => document.getElementById('fps').textContent));
console.log([...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => `${(100 * v / tot).toFixed(1).padStart(5)}% ${k}`).join('\n'));
console.log(JSON.stringify(errs)); await b.close(); process.exit(0);
