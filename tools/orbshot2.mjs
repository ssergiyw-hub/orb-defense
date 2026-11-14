// Orb Defense: menu screenshots (balls, ball card, hero, spirits, walls)
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3600);
await click('[data-a="startPick"][data-v="veles"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.gold = 5000; s.crystals = 800; s.orb = undefined; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3600);
await p.screenshot({ path: 'shots/m-hub.png' });
await click('[data-a="go"][data-v="balls"]'); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/m-balls.png' });
await click('[data-a="o:ball"][data-v="beam"]'); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/m-ball.png' });
await click('.x'); await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(1200); await p.screenshot({ path: 'shots/m-hero.png' });
await click('[data-a="o:spirits"]'); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/m-spirits.png' });
await click('.x'); await click('[data-a="o:walls"]'); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/m-walls.png' });
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
