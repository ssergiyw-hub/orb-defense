// Screenshots of every screen after the big UI batch.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/u-${n}.png` });
const js = f => p.evaluate(f);
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const closeReward = () => js(() => document.querySelector('.rewardov')?.click());
await p.goto('file://' + process.cwd() + '/dist/index.html');
await js(() => localStorage.clear()); await p.reload();
await click('[data-v="apollo"]'); await click('[data-a="startGo"]');
await js(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.crystals = 50000; s.gold = 3e6; s.scrolls = 3000; s.shards = 2000; s.heroes.apollo.stars = 4; s.heroes.apollo.level = 40; s.heroes.perun.particles = 60; s.seen = ['hub','chars','gear','jewel','shop','runes']; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(300);
await shot('01-hub');
await click('.tab:nth-child(1)'); await click('[data-a="chest"][data-v="set:10"]'); await p.waitForTimeout(500); await shot('02-reward-chest10'); await closeReward();
await click('[data-a="chest"][data-v="obsidian:1"]'); await p.waitForTimeout(500); await shot('03-reward-one'); await closeReward();
await click('[data-a="chest"][data-v="silver:10"]'); await closeReward();
await click('.tab:nth-child(4)'); await click('[data-a="sub"][data-v="gear"]'); await click('[data-a="smith"]');
for (let i = 0; i < 6; i++) { await click('.icard'); await click('[data-a="equip"]'); await click('.x'); }
await shot('04-gear');
await click('[data-a="sub"][data-v="runes"]'); for (let i = 0; i < 8; i++) { await click('[data-a="workshop"]'); await click('[data-a="craft"]'); await closeReward(); }
await click('.rcard'); await click('[data-a="runeToggle"]'); await click('.rcard'); await click('[data-a="runeToggle"]');
await shot('05-runes'); await click('.rcard'); await shot('06-rune-modal'); await click('.x');
await click('.tab:nth-child(2)');
for (let i = 0; i < 9; i++) await click('[data-a="explore"][data-v="gold"]');
await shot('07-jewel-search');
await click('[data-a="collect"]'); await p.waitForTimeout(400); await shot('08-reward-gems'); await closeReward();
await click('[data-a="jsub"][data-v="gems"]'); await shot('09-gems');
await click('.ggrid:not(.book) .gtile'); await shot('10-gem-modal'); await click('.x');
await click('.tab:nth-child(5)'); await shot('11-events');
await click('.tab:nth-child(3)'); await click('[data-a="wheel"]'); await shot('12-wheel');
await click('.wbtn'); await p.waitForTimeout(1200); await shot('13-wheel-spinning'); await p.waitForTimeout(2200); await shot('14-wheel-reward'); await closeReward();
await click('[data-a="wtab"][data-v="super"]'); await shot('15-wheel-super'); await click('.x');
await click('.tab:nth-child(4)'); await click('[data-a="sub"][data-v="chars"]'); await shot('16-chars');
console.log('errors', errs);
await b.close();
