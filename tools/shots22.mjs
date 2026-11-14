import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const shot = n => p.screenshot({ path: `shots/w-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3600);
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.stage = Number(new URLSearchParams(location.search).get('st') || 1); localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3800); await shot('01-hub');
await click('.fightbtn'); await p.waitForTimeout(3000);
await shot('02-battle');
for (const [k, n, t] of [['w', '03-north', 2600], ['a', '04-west', 2600], ['s', '05-south', 5200], ['d', '06-east', 5200]]) {
  await p.keyboard.down(k); await p.waitForTimeout(t); await p.keyboard.up(k); await p.waitForTimeout(150); await shot(n);
}
console.log(errs); await b.close();
