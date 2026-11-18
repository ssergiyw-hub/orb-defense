// Ш98–Ш99: «Шквал шаров» and the energy window. Usage: node tools/stormshot.mjs
import { chromium } from 'playwright';
const hero = 'apollo', stage = '6', tag = 'storm';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'ru');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click(`[data-a="startPick"][data-v="${hero}"]`); await p.waitForTimeout(150); await click('[data-a="startGo"]'); await p.waitForTimeout(350); }
await p.evaluate(st => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = +st - 1; s.energy = 99; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); }, stage);
await p.reload(); await p.waitForSelector('[data-a="go"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
// the energy window from the sphere
await click('#hEn'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/s-energy.png' }); await click('.lvsq.x');
// events → «Шквал шаров» → rating → battle
await click('[data-a="go"][data-v="events"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/s-events.png' });
await click('[data-a="evOpen"][data-v="storm"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/s-event.png' });
await click('[data-a="evRate"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/s-rating.png' });
await click('[data-a="evOpen"][data-v="storm"]'); await p.waitForTimeout(400); await click('[data-a="evGo"]'); await p.waitForTimeout(2500);
await p.mouse.move(150, 600); await p.mouse.down(); await p.mouse.move(110, 400, { steps: 6 });
await p.waitForTimeout(5000); await p.screenshot({ path: 'shots/s-play1.png' });
await p.mouse.move(330, 450, { steps: 10 }); await p.waitForTimeout(12000); await p.screenshot({ path: 'shots/s-play2.png' });
await p.mouse.up();
for (let i = 0; i < 6; i++) { if (await p.evaluate(() => !document.getElementById('oCards')?.hidden)) await click('#oCards .ocard'); await p.waitForTimeout(400); }
await click('#oPause'); await p.waitForTimeout(300); await click('#oQuit'); await p.waitForTimeout(200); await click('#oQuitYes'); await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/s-end.png' });
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
