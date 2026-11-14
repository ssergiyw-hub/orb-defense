// правка 121: walks through the game in a language and lists texts that found no translation
// node tools/i18n/crawl.mjs <lang> [clicks]   (build first)
import { chromium } from 'playwright';
import fs from 'fs';
const lang = process.argv[2] ?? 'en', N = Number(process.argv[3] ?? 500);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.addInitScript(l => { try { localStorage.setItem('mw-lang', l); } catch {} }, lang);
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(5200); // boot ≥ 3.2 s (правка 170)
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = []; s.maxMap = 5; s.gold = 9e6; s.crystals = 99999; s.scrolls = 9999; s.testPay = true; s.noConfirm = true; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(5200);
const SKIP = new Set(['reset', 'battle', 'wallGo', 'startGo', 'resetItem', 'quit']);
// text still in Cyrillic after translation (a pattern that translated only part of it)
const left = new Set();
const scanLeft = async () => (await p.evaluate(() => { const r = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const e = n.parentElement; if (!e || e.closest('script,style,[translate="no"]')) continue; if (/[А-Яа-яЁё]/.test(n.nodeValue)) r.push(n.nodeValue.trim()); } return r; })).forEach(x => left.add(x));
// правка 149: a fixed tour first, so windows and hints that random clicks rarely reach («?» of the idle chest, ratings, passes) are always checked
const TOUR = [['[data-a="idleOpen"]', '[data-a="idleInfo"]'], ['[data-a="passes"]'], ['[data-a="market"]'], ['[data-a="bp"]'], ['[data-a="wheel"]'], ['[data-a="tasks"]'],
  ['[data-a="go"][data-v="events"]', '[data-a="evOpen"][data-v="boss"]', '[data-a="evRate"]', '[data-a="evChest"][data-v="2"]'],
  ['[data-a="go"][data-v="hero"]', '[data-a="sub"][data-v="runes"]', '[data-a="sub"][data-v="chars"]'], ['[data-a="go"][data-v="jewel"]'], ['[data-a="go"][data-v="settings"]'], ['[data-a="go"][data-v="hub"]']];
for (const steps of TOUR) {
  for (const sel of steps) { await click(sel); await p.waitForTimeout(150); if (lang !== 'uk' && lang !== 'ru') await scanLeft(); }
  await click('#layer [data-a="close"]'); await click('[data-a="rewardOk"]'); await p.waitForTimeout(100);
}
let seed = Number(process.argv[4] ?? 7); const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
for (let i = 0; i < N; i++) {
  const list = await p.evaluate(() => Array.from(document.querySelectorAll('#ui [data-a]')).filter(e => e.offsetParent !== null).map((e, i) => { e.setAttribute('data-crawl', i); return [i, e.getAttribute('data-a')]; }));
  const ok = list.filter(([, a]) => !SKIP.has(a));
  if (!ok.length) break;
  const [id] = ok[rnd(ok.length)];
  await click(`[data-crawl="${id}"]`); await p.waitForTimeout(60);
  if (lang !== 'uk' && lang !== 'ru') await scanLeft();
  if (i % 25 === 24) { await click('[data-a="close"]'); await click('[data-a="rewardOk"]'); }
}
// a wall battle and a normal battle: cards, pause, damage window, result
for (const mode of ['wall', 'battle']) {
  await click('[data-a="close"]'); await click('[data-a="rewardOk"]');
  await p.evaluate(() => document.querySelector('[data-a="tab"][data-v="portal"], [data-a="go"][data-v="hub"]')?.click());
  if (mode === 'wall') { await click('[data-a="wallOpen"]'); await p.waitForTimeout(200); await click('[data-a="wallGo"]'); }
  else { await click('[data-a="battle"]'); await p.waitForTimeout(300); await click('[data-a="battleGo"]'); }
  await p.waitForTimeout(1500); await click('#speedBtn'); await click('#speedBtn');
  for (let t = 0; t < 25; t++) { await p.waitForTimeout(700); await p.evaluate(() => { const c = document.querySelector('#cardList .sk'); if (c && !document.getElementById('cards').hidden) c.click(); }); }
  await click('#pauseBtn'); await click('#dmgBtn'); await p.waitForTimeout(200); await click('#dmgTabs [data-t="wall"]'); await p.waitForTimeout(200);
  await click('#dmgClose'); await click('#quitBtn'); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.dmgd').forEach(d => d.open = true)); await p.waitForTimeout(200);
  await click('[data-a="rewardOk"]'); await p.waitForTimeout(300);
}
const miss = await p.evaluate(() => [...window.__i18nMissing]);
fs.writeFileSync(`/tmp/i18n_missing_${lang}_${process.argv[4] ?? 7}.json`, JSON.stringify(miss, null, 0));
fs.writeFileSync(`/tmp/i18n_left_${lang}_${process.argv[4] ?? 7}.json`, JSON.stringify([...left], null, 0));
console.log('left', left.size, 'missing', miss.length, 'errors', errs.length, errs.slice(0, 3));
await b.close(); process.exit(0);
