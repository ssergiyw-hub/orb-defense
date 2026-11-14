// правка 99: tasks tabs stay inside the frame on a narrow screen with wide fonts, list scrolls under them
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
const fire = (a, v = '') => p.evaluate(([a, v]) => { const f = document.createElement('i'); f.dataset.a = a; f.dataset.v = v; document.querySelector('#layer').appendChild(f); f.click(); f.remove(); }, [a, v]);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3400);
await p.evaluate(() => document.querySelector('[data-a="startPick"][data-v="hydra"]')?.click()); await p.evaluate(() => document.querySelector('[data-a="startGo"]')?.click()); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3600);
await fire('tasks'); await fire('taskTab', 'day'); await p.waitForTimeout(400); await p.screenshot({ path: 'shots/w9-tasks-top.png' });
await p.evaluate(() => { document.querySelector('.t2body').scrollTop = 400; }); await p.waitForTimeout(200); await p.screenshot({ path: 'shots/w9-tasks-scrolled.png' });
const r = await p.evaluate(() => { const x = document.querySelector('.tasks2 .lvsq.x').getBoundingClientRect(), box = document.querySelector('.tasks2').getBoundingClientRect(); return { xRight: x.right, boxRight: box.right, xTop: x.top, boxTop: box.top }; });
console.log(JSON.stringify(r));
await fire('taskTab', 'login'); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/w9-login.png' });
await b.close();
