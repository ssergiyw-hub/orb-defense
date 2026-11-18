// Orb Defense: battle screenshots. Usage: node tools/orbshot.mjs [hero] [stage] [tag]
import { chromium } from 'playwright';
const hero = process.argv[2] || 'prometheus', stage = process.argv[3] || '1', tag = process.argv[4] || 'a';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'ru');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click(`[data-a="startPick"][data-v="${hero}"]`); await p.waitForTimeout(150); await click('[data-a="startGo"]'); await p.waitForTimeout(350); }
await p.evaluate(st => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = +st - 1; s.energy = 99; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, stage);
await p.reload(); await p.waitForSelector('[data-a="go"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
await p.screenshot({ path: `shots/o-${tag}-hub.png` });
await click('[data-a="battle"]'); await p.waitForTimeout(600); await click('[data-a="battleGo"]');
await p.waitForTimeout(2500);
await p.screenshot({ path: `shots/o-${tag}-start.png` });
// aim by hand: drag up-left and release
await p.mouse.move(195, 560); await p.mouse.down();
// правка Ш53: low to the right, then below the launch line — the aim must stay on the right
await p.mouse.move(385, 600, { steps: 6 }); await p.mouse.move(385, 760, { steps: 6 }); await p.waitForTimeout(300);
await p.screenshot({ path: `shots/o-${tag}-aimlow.png` });
await p.mouse.move(40, 520, { steps: 8 }); await p.waitForTimeout(300);
await p.screenshot({ path: `shots/o-${tag}-aimleft.png` });
await p.mouse.move(120, 300, { steps: 6 }); await p.waitForTimeout(400);
await p.screenshot({ path: `shots/o-${tag}-aim.png` });
await p.mouse.up(); await p.waitForTimeout(120);
await p.screenshot({ path: `shots/o-${tag}-cast.png` }); await p.waitForTimeout(780);
await p.screenshot({ path: `shots/o-${tag}-fly.png` });
await p.waitForTimeout(5200); await p.screenshot({ path: `shots/o-${tag}-fast.png` }); // Ш88: the speed-up badge after 5 s of flight
await p.evaluate(() => document.getElementById('oAuto').click());
// правка Ш72: catch the level-up cards (auto picks after 0.45 s)
for (let k = 0; k < 600; k++) { if (await p.evaluate(() => !document.getElementById('oCards').hidden)) { await p.waitForTimeout(60); await p.screenshot({ path: `shots/o-${tag}-cards.png` }); break; } await p.waitForTimeout(50); }
await p.evaluate(() => document.getElementById('oSpeed').click());
await p.evaluate(() => document.getElementById('oSpeed').click());
for (let i = 0; i < 6; i++) { await p.waitForTimeout(5000); await p.screenshot({ path: `shots/o-${tag}-t${i}.png` }); }
// правка Ш45: the pause with the skills and the damage tabs
await p.evaluate(() => document.getElementById('oPause').click()); await p.waitForTimeout(400);
await p.screenshot({ path: `shots/o-${tag}-pause.png` });
await p.evaluate(() => document.getElementById('oTabDmg').click()); await p.waitForTimeout(300);
await p.screenshot({ path: `shots/o-${tag}-pause2.png` });
// Ш79: surrender → the end-of-battle reward window
await p.evaluate(() => document.getElementById('oQuit')?.click()); await p.waitForTimeout(300);
await p.evaluate(() => document.getElementById('oQuitYes')?.click()); await p.waitForTimeout(2500);
await p.screenshot({ path: `shots/o-${tag}-end.png` });
// Ш93: a tall parchment — 10 rewards (the cells cloned), the ornaments must not stretch
await p.evaluate(() => { const g = document.querySelector('.rgrid'); if (!g) return; const cs = [...g.querySelectorAll('.rcell')]; for (let i = cs.length; i < 10; i++) g.appendChild(cs[i % cs.length].cloneNode(true)); });
await p.evaluate(() => { if (document.querySelector('.rgrid')) return; const b = document.querySelector('.rband'); if (!b) return; const g = document.createElement('div'); g.className = 'rgrid';
  const cs = [...b.querySelectorAll('.rcell')]; for (let i = 0; i < 10; i++) g.appendChild(cs[i % cs.length].cloneNode(true)); b.replaceWith(g); document.querySelector('.rewardov')?.classList.replace('band', 'grid'); });
await p.waitForTimeout(2200); await p.screenshot({ path: `shots/o-${tag}-end10.png` });
console.log('pseudo', await p.evaluate(() => { const g = document.querySelector('.rgrid'); const cs = getComputedStyle(g, '::after'); const r = g.getBoundingClientRect(); return [cs.width, cs.height, cs.position, cs.transform.slice(0, 40), r.width, r.height, getComputedStyle(g).position].join(' '); }));
// the 4-item band layout of the same window (a fight with 4 rewards)
await p.evaluate(() => { const g = document.querySelector('.rgrid'); if (!g) return; const cells = [...g.querySelectorAll('.rcell')].slice(0, 4);
  const band = document.createElement('div'); band.className = 'rband'; band.innerHTML = '<div class="rrays"></div><div class="rflash"></div><div class="rrow n4"></div>';
  cells.forEach(c => band.lastElementChild.appendChild(c)); g.replaceWith(band); document.querySelector('.rewardov').classList.replace('grid', 'band'); });
await p.waitForTimeout(2200); await p.screenshot({ path: `shots/o-${tag}-end4.png` });
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
