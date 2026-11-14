// правки 156–157 look and translation check: ring sockets, gem picker, gem card, wiki gear/gems. node tools/sh157.mjs <lang> [shots → /tmp/s157]
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
execSync('npx tsx tools/power.ts prof');
const prof = fs.readFileSync('/tmp/bal/prof.json', 'utf8');
const lang = process.argv[2] || 'en', shots = process.argv[3];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 800 } });
p.on('pageerror', e => console.log('err', String(e)));
await p.addInitScript(([l, pr]) => { try { if (!sessionStorage.getItem('once')) { localStorage.setItem('mw-lang', l); localStorage.setItem('mw-profile-v1', pr); sessionStorage.setItem('once', '1'); } } catch {} }, [lang, prof]);
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
const w = ms => p.waitForTimeout(ms);
const left = new Set();
const cyr = async tag => (await p.evaluate(() => { const r = []; const t = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = t.nextNode(); n; n = t.nextNode()) { const e = n.parentElement; if (!e || e.closest('script,style,[translate="no"]') || !e.getClientRects().length) continue; if (/[А-Яа-яЁё]/.test(n.nodeValue)) r.push(n.nodeValue.trim()); } return r; })).forEach(x => left.add(tag + ': ' + x));
const shot = async n => { if (shots) { await w(400); await p.screenshot({ path: `/tmp/s157/${lang}_${n}.png` }); } };
await p.goto('http://localhost:8766/index.html'); await w(2500);
await click('[data-a="close"]'); await click('[data-a="rewardOk"]'); await w(300);
await click('[data-a="go"][data-v="hero"]'); await w(400); await click('[data-a="sub"][data-v="gear"]'); await w(400);
// the ring: unsocketed? open its modal, take a gem out, open the picker
await p.evaluate(() => [...document.querySelectorAll('.gslotcard[data-a="item"]')][2]?.click()); await w(400);
await cyr('ring'); await shot('ring');
await click('.sock.full[data-a="sockOut"]'); await w(300); await click('.sock[data-a="sockOpen"]'); await w(400); await cyr('picker'); await shot('picker');
await click('[data-a="sockCancel"]'); await click('.modal [data-a="close"]'); await w(200);
await click('[data-a="go"][data-v="jewel"]'); await w(500); await click('[data-a="gem"]'); await w(400); await cyr('gem'); await shot('gem'); await click('.modal [data-a="close"]'); await w(200);
await click('[data-a="go"][data-v="settings"]'); await w(500); await click('[data-a="wikiOpen"]'); await w(400);
for (const sec of ['gear', 'gems']) { await click(`[data-a="wikiSec"][data-v="${sec}"]`); await w(300); await cyr('wiki-' + sec); await shot('wiki_' + sec); if (shots) { await p.evaluate(() => document.querySelector('.wkbody, .wkscreen')?.scrollBy?.(0, 900)); await shot('wiki_' + sec + '2'); } await click('[data-a="wikiSec"][data-v=""]'); await w(200); }
console.log(JSON.stringify([...left], null, 1));
await b.close();
