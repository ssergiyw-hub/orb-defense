// правка 102: 3D heroes — hero screen and battle (idle / run / attack), close-ups of the hero
import { chromium } from 'playwright';
const hero = process.argv[2] || 'heracles';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 3 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3200);
await click(`[data-a="startPick"][data-v="${hero}"]`); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3400);
await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(1500); await p.screenshot({ path: `shots/w10-${hero}-screen.png` });
await click('[data-a="go"][data-v="hub"]'); await click('[data-a="battle"]'); await p.waitForTimeout(600); await click('[data-a="battleGo"]');
await p.waitForTimeout(2500);
const shotHero = async n => { await p.screenshot({ path: `shots/w10-${hero}-${n}.png`, clip: { x: 95, y: 250, width: 200, height: 260 } }); };
await shotHero('idle0');
for (const [k, n] of [['d', 'run-r'], ['s', 'run-d'], ['a', 'run-l'], ['w', 'run-u']]) { await p.keyboard.down(k); await p.waitForTimeout(700); await shotHero(n); await p.keyboard.up(k); }
for (let i = 0; i < 40 && await p.evaluate(() => document.getElementById('cards').hidden); i++) await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('#cardList .sk')?.click()); await p.waitForTimeout(3000);
for (let i = 0; i < 4; i++) { await shotHero('stand' + i); await p.waitForTimeout(170); }
await p.screenshot({ path: `shots/w10-${hero}-battle.png` });
console.log(JSON.stringify(errs)); await b.close();
