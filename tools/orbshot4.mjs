// Orb Defense: every menu screen in one go (правка Ш46 — the marble theme) → shots/u-*.png
// Usage: node tools/orbshot4.mjs [width]   (OLANG=uk for Ukrainian)
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(process.argv[2] ?? 390), height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const shot = async (n, w = 700) => { await p.waitForTimeout(w); await p.screenshot({ path: `shots/u-${n}.png` }); };
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'ru');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { state: 'attached', timeout: 30000 }); await p.waitForTimeout(4500);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click('[data-a="startPick"][data-v="veles"]'); await p.waitForTimeout(150); await click('[data-a="startGo"]'); await p.waitForTimeout(350); }
await p.evaluate(([spirit, mx]) => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = mx; s.gold = 7125; s.crystals = 660; s.noConfirm = true;
  s.orb ??= { balls: Object.fromEntries(['fire', 'ice', 'beam', 'ghost', 'poison', 'lightning', 'quake', 'cluster', 'wet', 'spike'].map(b => [b, { lv: 1, cards: 0 }])),
    spirits: Object.fromEntries(['healer', 'fire', 'storm', 'frost', 'curse'].map(x => [x, { lv: 1, owned: x === 'healer' }])), spirit: 'healer', spiritShards: 0,
    walls: Object.fromEntries(['start', 'heal', 'counter', 'shield', 'reinf'].map(w => [w, { lv: 1, owned: w === 'start' }])), wall: 'start', wallStones: 0 };
  if (s.orb && spirit === 'none') s.orb.spirit = null; else if (s.orb && spirit) { s.orb.spirits[spirit] = { lv: 12, owned: true }; s.orb.spirit = spirit; } localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, [process.env.OSPIRIT ?? '', Number(process.env.OMAX ?? 6)]);
await p.reload(); await p.waitForSelector('[data-a="go"]', { state: 'attached', timeout: 30000 }).catch(async e => { console.log(errs, (await p.evaluate(() => document.body.innerText)).slice(0, 300)); throw e; }); await p.waitForTimeout(4500);
await p.evaluate(([spirit, mx]) => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = mx; s.gold = 7125; s.crystals = 660; s.noConfirm = true;
  s.orb ??= { balls: Object.fromEntries(['fire', 'ice', 'beam', 'ghost', 'poison', 'lightning', 'quake', 'cluster', 'wet', 'spike'].map(b => [b, { lv: 1, cards: 0 }])),
    spirits: Object.fromEntries(['healer', 'fire', 'storm', 'frost', 'curse'].map(x => [x, { lv: 1, owned: x === 'healer' }])), spirit: 'healer', spiritShards: 0,
    walls: Object.fromEntries(['start', 'heal', 'counter', 'shield', 'reinf'].map(w => [w, { lv: 1, owned: w === 'start' }])), wall: 'start', wallStones: 0 };
  if (s.orb && spirit === 'none') s.orb.spirit = null; else if (s.orb && spirit) { s.orb.spirits[spirit] = { lv: 12, owned: true }; s.orb.spirit = spirit; } localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, [process.env.OSPIRIT ?? '', Number(process.env.OMAX ?? 6)]);
await p.reload(); await p.waitForSelector('[data-a="go"]', { state: 'attached', timeout: 30000 }).catch(async e => { console.log(errs, (await p.evaluate(() => document.body.innerText)).slice(0, 300)); throw e; }); await p.waitForTimeout(4500);
await shot('hub');
await click('[data-a="map"][data-v="12"]'); await click('[data-a="map"][data-v="7"]'); await shot('hub7', 900);
if (Number(process.env.OMAX ?? 6) >= 25) { // Ш46: chapter colours of the portal
  for (const n of [15, 25]) { await p.evaluate(v => { const b = document.createElement('button'); b.dataset.a = 'map'; b.dataset.v = String(v); document.querySelector('#view .main').appendChild(b); b.click(); }, n); await shot('hub' + n, 1200); }
}
await click('[data-a="go"][data-v="hero"]'); await shot('hero', 1200);
await click('[data-a="o:spirits"]'); await shot('spirits'); await click('.x');
await click('[data-a="o:walls"]'); await shot('walls'); await click('.x');
await click('[data-a="sub"][data-v="chars"]'); await shot('chars');
await click('[data-a="sub"][data-v="runes"]'); await shot('runes');
await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(300);
await click('[data-a="go"][data-v="jewel"]'); await shot('jewel'); await click('.x'); await p.waitForTimeout(200);
await click('[data-a="go"][data-v="smith"]'); await shot('smith'); await click('.x'); await p.waitForTimeout(200);
await click('[data-a="go"][data-v="balls"]'); await shot('balls');
await click('[data-a="o:ball"][data-v="beam"]'); await shot('ball'); await click('.x');
await click('[data-a="go"][data-v="shop"]'); await shot('shop');
await click('[data-a="chest"][data-v="set:1"]'); await shot('reward', 1500); await click('.rok'); await p.waitForTimeout(300);
await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(300); await click('[data-a="idleOpen"]'); await shot('idle'); await click('.x');
await p.waitForTimeout(300); await click('[data-a="wheel"]'); await shot('wheel', 900); await click('.whtop .x');
await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(300); await click('#hTask'); await click('[data-a="taskTab"][data-v="day"]'); await shot('tasks'); await click('.x');
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
