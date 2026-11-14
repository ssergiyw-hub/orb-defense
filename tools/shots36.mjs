// правки 87–92: stage result, rewards, idle chest, tasks, login calendar, wheel
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const only = process.argv[2] || 'abcdef';
const shot = n => p.screenshot({ path: `shots/w6-${n}.png` });
const fire = (a, v = '') => p.evaluate(([a, v]) => { const f = document.createElement('i'); f.dataset.a = a; f.dataset.v = v; document.querySelector('#layer').appendChild(f); f.click(); f.remove(); }, [a, v]);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3400);
await p.evaluate(() => document.querySelector('[data-a="startPick"][data-v="hydra"]')?.click()); await p.evaluate(() => document.querySelector('[data-a="startGo"]')?.click()); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 4; s.crystals = 900; s.noConfirm = true; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3600);
const H = (f, arg) => p.evaluate(f, arg);
if (only.includes('a')) { // stage result
  await H(() => { const h = window.__hub; const it = (icon, name, count, color, tier) => ({ icon, name, count, color, tier });
    const before = h.snap(); h.p.gold += 1440; h.p.scrolls += 12; h.p.crystals += 30; h.showReward('Этап пройден!', h.diff(before), 
      '<div class="rstats"><span><small>Время</small><b>6:00</b></span><span><small>Убито</small><b>812</b></span><span><small>Улучшений</small><b>20/20</b></span><span><small>Запись</small><b><i class="okc">✓</i></b></span></div><div class="rextra">Открыт этап 5</div>'); });
  await p.waitForTimeout(1600); await shot('01-stage'); await p.evaluate(() => document.querySelector('.rok')?.click());
}
if (only.includes('b')) { // idle chest full and half
  await H(() => { const h = window.__hub; h.p.idleAt = Date.now() - 12.5 * 3600e3; }); await fire('idleOpen'); await p.waitForTimeout(500); await shot('02-idle-full');
  await fire('idleFast', 'free'); await p.waitForTimeout(1500); await shot('03-idle-reward'); await p.evaluate(() => document.querySelector('.rok')?.click());
  await fire('close'); await H(() => { window.__hub.p.idleAt = Date.now() - 8 * 3600e3; }); await fire('idleOpen'); await p.waitForTimeout(400); await shot('04-idle-mid'); await fire('close');
}
if (only.includes('c')) { // tasks
  await H(() => { const h = window.__hub; const P = h.p; P.tasks = undefined; });
  await fire('tasks'); await fire('taskTab', 'day');
  await H(() => { const t = window.__hub.p.tasks; t.d.runs = 3; t.d.kills = 240; t.d.idle = 1; t.dDone = ['login']; t.dChest = []; });
  await fire('taskTab', 'day'); await p.waitForTimeout(400); await shot('05-tasks-day');
  await fire('taskChest', 'd:60'); await p.waitForTimeout(300); await shot('06-tasks-chestinfo');
  await fire('taskTab', 'week'); await p.waitForTimeout(300); await shot('07-tasks-week');
}
if (only.includes('d')) { // login calendar
  await H(() => { const h = window.__hub; h.p.login = { idx: 9, last: '' }; }); await fire('taskTab', 'login'); await p.waitForTimeout(400); await shot('08-login'); await fire('close');
}
if (only.includes('e')) { // wheel
  await fire('close'); await fire('wheel'); await fire('wtab', 'adv'); await p.waitForTimeout(400); await shot('09-wheel');
  await fire('wtab', 'super'); await p.waitForTimeout(300); await shot('10-wheel-super');
  await fire('spin', '1'); await p.waitForTimeout(3600); await shot('11-wheel-prize'); await p.evaluate(() => document.querySelector('.rok')?.click()); await fire('close');
}
if (only.includes('f')) { // 92: market tab switch must not flash: entry animation only on open
  await fire('market'); await p.waitForTimeout(400); await fire('mktTab', 'week');
  const r = await H(() => { const e = document.querySelector('#layer>.mkscreen'); return { still: e.classList.contains('still'), anim: getComputedStyle(e).animationName }; });
  console.log('92 market after tab:', JSON.stringify(r)); await fire('close');
}
console.log(JSON.stringify(errs)); await b.close();
