// Ш116: energy window, battle pass, passes, idle chest, tasks, rating chest box → shots/x-*.png
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'uk');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(5000);
for (let i = 0; i < 120 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click('[data-a="startPick"][data-v="apollo"]'); await p.waitForTimeout(300); await click('[data-a="startGo"]'); await p.waitForTimeout(700); }
await p.waitForTimeout(3000);
await p.evaluate(() => { const s = window.__hub.p; s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 6; s.crystals = 910; s.energy = 28;  });
await p.evaluate(()=>window.__hub.render()); await p.waitForTimeout(800);
const panel = async (name, tag, prep) => { await p.evaluate(([n, prep]) => { const h = window.__hub; if (prep) eval(prep); h.panel = n; h.render(); }, [name, prep ?? '']); await p.waitForTimeout(700); await p.screenshot({ path: `shots/x-${tag}.png` }); await p.evaluate(() => { const h = window.__hub; h.panel = null; h.render(); }); await p.waitForTimeout(200); };
await panel('energy', 'energy');
await panel('bp', 'bp', 'h.p.bp = h.p.bp || {}; ');
await panel('passes', 'passes');
await panel('idle', 'idle', 'h.p.idleAt = Date.now() - 9.4 * 3600e3;');
await panel('idle', 'idle-full', 'h.p.idleAt = Date.now() - 13 * 3600e3;');
await panel('tasks', 'tasks', "h.sel.taskTab = 'day';");
// the rating chest box
await click('[data-a="go"][data-v="events"]'); await p.waitForTimeout(500); await click('[data-a="evOpen"][data-v="storm"]'); await p.waitForTimeout(400); await click('[data-a="evRate"]'); await p.waitForTimeout(500);
await click('.rchest[data-v="1"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/x-chestbox.png' });
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
