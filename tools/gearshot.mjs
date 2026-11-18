// Ш101–Ш102: «Атака на босса» and the fallen wall. Usage: node tools/gearshot.mjs → shots/g-*.png (Ш104 effects in battle)
import { chromium } from 'playwright';
const hero = 'apollo', stage = '6';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'ru');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click(`[data-a="startPick"][data-v="${hero}"]`); await p.waitForTimeout(150); await click('[data-a="startGo"]'); await p.waitForTimeout(350); }
await p.evaluate(st => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = +st - 1; s.energy = 99; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, stage);
await p.reload(); await p.waitForSelector('[data-a="go"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
await click('[data-a="go"][data-v="events"]'); await p.waitForTimeout(600);
await click('[data-a="evOpen"][data-v="bossorb"]'); await p.waitForTimeout(400); await click('[data-a="evGo"]'); await p.waitForTimeout(2500);
await p.mouse.move(150, 600); await p.mouse.down(); await p.mouse.move(180, 400, { steps: 6 });
// Ш104: all six «Лес» effects mythic, the bark immunity on
await p.evaluate(() => { const o = window.__orb; o.s.cfg.gear = { thorn: 2, bark: 2, spikes: 2, roots: 2, breath: 2, thicket: 2 }; o.s.immuneUntil = o.s.tick + 900; });
await p.waitForTimeout(5000); await p.evaluate(() => { const o = window.__orb; o.s.immuneUntil = 0; }); await p.waitForTimeout(100); await p.screenshot({ path: 'shots/g-noimm.png' });
await p.evaluate(() => { const o = window.__orb; o.s.immuneUntil = 1e9; }); await p.waitForTimeout(150);
await p.screenshot({ path: 'shots/g-immune.png' });
await p.evaluate(() => { const o = window.__orb; o.s.immuneUntil = 0; o.s.wallHp = 1; });
for (let i = 0; i < 12 && !(await p.evaluate(() => !document.getElementById('oBanner').hidden && document.getElementById('oBanner').textContent.length > 20)); i++) await p.waitForTimeout(500);
await p.waitForTimeout(300); await p.screenshot({ path: 'shots/g-breath.png' });
await p.mouse.up();
await click('#oPause'); await p.waitForTimeout(300); await click('#oQuit'); await p.waitForTimeout(200); await click('#oQuitYes'); await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/b-end.png' });
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
