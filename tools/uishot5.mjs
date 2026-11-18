// Ш106–Ш111: tasks, black market, hero search, event window, item window, the hero-screen tap test, the card reroll → shots/v-*.png
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const H = f => p.evaluate(f);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'uk');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click('[data-a="startPick"][data-v="apollo"]'); await p.waitForTimeout(150); await click('[data-a="startGo"]'); await p.waitForTimeout(350); }
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 6; s.crystals = 910; s.gold = 1431; s.couponsSmall = 1; s.energy = 30; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForSelector('[data-a="go"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
// tasks
await H(() => { const h = window.__hub; h.panel = 'tasks'; h.sel.taskTab = 'day'; h.render(); }); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/v-tasks.png' });
await H(() => { const h = window.__hub; h.panel = null; h.render(); });
// market week / month
for (const t of ['day', 'month']) { await H(t => { const h = window.__hub; h.panel = 'market'; h.sel.mktTab = t; h.render(); }, t); await p.waitForTimeout(600); await p.screenshot({ path: `shots/v-market-${t}.png` }); }
await H(() => { const h = window.__hub; h.panel = null; h.render(); });
// shop: chests and the hero search
await click('[data-a="go"][data-v="shop"]'); await p.waitForTimeout(700); await p.screenshot({ path: 'shots/v-shop1.png' });
await H(() => document.querySelector('.th-tav')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/v-shop2.png' });
// events: the storm window
await click('[data-a="go"][data-v="events"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/v-events.png' });
await click('[data-a="evOpen"][data-v="storm"]'); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/v-ev-storm.png' }); await click('.mrate .lvsq.x'); await p.waitForTimeout(300);
await click('[data-a="evOpen"][data-v="bossorb"]'); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/v-ev-boss.png' }); await click('.mrate .lvsq.x'); await p.waitForTimeout(300);
// Ш106: on the hero screen a tap where the Portal's «Settings» button is must not open the settings
await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(600);
const sb = await H(() => { const r = document.querySelector('.side.left .setbtn')?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
const scr0 = await H(() => document.getElementById('ui')?.dataset.scr);
if (sb) await p.mouse.click(sb.x, sb.y); await p.waitForTimeout(500);
console.log('Ш106 tap at', JSON.stringify(sb), 'screen before', scr0, 'after', await H(() => document.getElementById('ui')?.dataset.scr), 'panel', await H(() => window.__hub.panel));
await p.screenshot({ path: 'shots/v-hero-tap.png' });
await H(() => { const h = window.__hub; h.panel = null; h.sel.item = undefined; h.render(); });
// Ш111: a stage battle, the level-up cards with the reroll buttons
await H(() => window.__hub.go('hub')); await p.waitForTimeout(600); await click('.fightbtn'); await p.waitForTimeout(3500);
await H(() => { const o = window.__orb; o.s.pendingLv = 1; o.s.phase = 'choose'; o.rollCards(); });
await p.waitForTimeout(800); await p.screenshot({ path: 'shots/v-cards.png' });
await click('.oroll.gem'); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/v-cards2.png' });
console.log('crystals after gem reroll', await H(() => window.__hub.p.crystals));
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
