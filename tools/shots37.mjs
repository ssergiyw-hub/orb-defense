// правки 93–94: super wheel with 12 prizes, black market in the lava-stone style
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/w7b-${n}.png` });
const fire = (a, v = '') => p.evaluate(([a, v]) => { const f = document.createElement('i'); f.dataset.a = a; f.dataset.v = v; document.querySelector('#layer').appendChild(f); f.click(); f.remove(); }, [a, v]);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3400);
await p.evaluate(() => document.querySelector('[data-a="startPick"][data-v="hydra"]')?.click()); await p.evaluate(() => document.querySelector('[data-a="startGo"]')?.click()); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 4; s.crystals = 9000; s.noConfirm = true; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3600);
await fire('wheel'); await fire('wtab', 'super'); await p.waitForTimeout(400); await shot('01-wheel-super'); await fire('close');
await fire('market'); await p.waitForTimeout(400); await shot('02-market-day');
await p.evaluate(() => { const b = document.querySelector('.mkbody'); b.scrollTop = 600; }); await p.waitForTimeout(200); await shot('03-market-day2');
await fire('mktTab', 'week'); await p.waitForTimeout(300); await shot('04-market-week');
await p.evaluate(() => document.querySelector('[data-a="mBuy"]')?.click()); await p.waitForTimeout(900); await p.evaluate(() => document.querySelector('.rok')?.click()); await p.waitForTimeout(300); await shot('05-market-week-sold');
await fire('mktTab', 'month'); await p.waitForTimeout(300); await shot('06-market-month');
console.log(JSON.stringify(errs)); await b.close();
