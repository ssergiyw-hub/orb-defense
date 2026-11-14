// Menus with the new hero pictures.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.screenshot({ path: 'shots/x-10-start.png' });
await click('[data-a="startPick"][data-v="prometheus"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes']; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/x-11-hub.png' });
await click('.tab:nth-child(4)'); await click('[data-a="sub"][data-v="chars"]'); await p.waitForTimeout(400);
await p.screenshot({ path: 'shots/x-12-chars.png' });
await b.close();
