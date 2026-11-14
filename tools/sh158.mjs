// правка 158 look check: the phone's «Back» (window.__back with #backtest) — windows close, screens go to the Portal, then «leave the game?»
import { chromium } from 'playwright';
const lang = process.argv[2] || 'uk';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 800 } });
p.on('pageerror', e => console.log('PAGEERROR', String(e)));
await p.addInitScript(l => { try { localStorage.setItem('mw-lang', l); } catch {} }, lang);
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
const w = ms => p.waitForTimeout(ms);
const state = async tag => console.log(tag.padEnd(16), JSON.stringify(await p.evaluate(() => ({ layer: [...document.querySelectorAll('#layer > *, .rewardov')].map(e => e.className.split(' ').slice(0, 2).join('.')), screen: document.querySelector('#view')?.dataset.s, exit: !!document.querySelector('.exitpanel'), pause: !document.getElementById('pauseMenu')?.hidden }))));
const back = async tag => { await p.evaluate(() => window.__back()); await w(400); await state(tag); };
await p.goto('http://localhost:8766/index.html#god#backtest'); await w(2000);
await back('start: back'); await p.screenshot({ path: `/tmp/s158/${lang}_start_exit.png` });
await click('[data-a="exitNo"].lvbtn'); await w(300); await state('stay');
for (let i = 0; i < 10 && await p.evaluate(() => !!document.querySelector('[data-a="startPick"]')); i++) { await click('[data-a="startPick"][data-v="hydra"]'); await w(400); await click('[data-a="startGo"]'); await w(700); }
await state('after start');
await back('back on reward');
await back('back again');
await click('[data-a="passes"]'); await w(400); await state('passes open');
await back('back closes');
await click('[data-a="go"][data-v="shop"]'); await w(400); await state('shop');
await back('back → portal');
await back('back → exit?'); await p.screenshot({ path: `/tmp/s158/${lang}_exit.png` });
await back('back closes exit');
await click('[data-a="fight"], .fightbtn'); await w(2500); await state('battle');
await back('battle back'); await back('battle back 2');
await b.close();
