// Orb Defense: walks the new screens and a battle in a language, lists texts without a translation
import { chromium } from 'playwright';
import fs from 'fs';
const lang = process.argv[2] ?? 'en';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.addInitScript(l => { try { localStorage.setItem('mw-lang', l); } catch {} }, lang);
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const left = new Set();
const scan = async () => (await p.evaluate(() => { const r = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const e = n.parentElement; if (!e || e.closest('script,style,[translate="no"]') || e.offsetParent === null) continue; if (/[А-Яа-яЁёІіЇїЄє]/.test(n.nodeValue)) r.push(n.nodeValue.trim()); } return r; })).forEach(x => left.add(x));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3600); await scan();
await click('[data-a="startPick"][data-v="veles"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.gold = 9e6; s.crystals = 9999; s.shards = 9000; s.maxMap = 6;
  // правки Ш7, Ш9: runes of every slot and rarity, and the new gems
  let u = 900; const fx = ['crit','critdmg','elite','dur','afflicted','repair','wallhp','normal','allballs','plusball','spirit','atk','hp','gold'];
  const uq = { book: 'impact', mantle: 'area', gloves: 'beamlight', boots: 'dot', amulet: 'pierce', ring: 'wetfrozen' };
  s.runes = []; Object.keys(uq).forEach((sl, i) => { s.runes.push({ uid: u++, slot: sl, fx: uq[sl], rarity: i }); fx.forEach((x, j) => { if ((j + i) % 3 === 0) s.runes.push({ uid: u++, slot: sl, fx: x, rarity: x === 'plusball' ? 5 : (j + i) % 10 }); }); });
  s.runeOn = { book: 900 };
  for (const t of ['ruby','emerald','topaz','sapphire','diamond','garnet']) s.gems.push({ uid: u++, type: t, stars: 2, level: 5, xp: 0 });
  s.nextUid = u + 1; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3600); await scan();
const steps = [['[data-a="go"][data-v="balls"]'], ...['fire','ice','spike','lightning','quake','cluster','wet','ghost','poison','beam'].map(v => [`[data-a="o:ball"][data-v="${v}"]`, '[data-a="o:ballUp"]', '.x']),
  ['[data-a="go"][data-v="hero"]', '[data-a="o:spirits"]', '[data-a="o:spOpen"]', '.x', '[data-a="o:walls"]', '[data-a="o:wlBuy"]', '.x'], ['[data-a="go"][data-v="events"]'], ['[data-a="go"][data-v="hub"]']];
for (const s of steps) for (const sel of s) { await click(sel); await p.waitForTimeout(250); await scan(); }
// every spirit / wall card
for (const a of ['o:spirits', 'o:walls']) { await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(300); await click(`[data-a="${a}"]`); await p.waitForTimeout(300);
  const n = await p.evaluate(() => document.querySelectorAll('#layer [data-a]').length);
  for (let i = 0; i < n; i++) { await p.evaluate(i => { const e = document.querySelectorAll('#layer [data-a]')[i]; if (e && !/close/.test(e.dataset.a) && !e.classList.contains('x')) e.click(); }, i); await p.waitForTimeout(120); await scan(); }
  await click('.x'); }
// runes (правки Ш7, Ш37): the tab, every rune card, reroll, chances with every slot tab, filters, craft
await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(300); await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(400); await scan();
for (const sl of ['book','mantle','gloves','boots','amulet','ring']) { await click(`[data-a="filterSet"][data-v="${sl}"]`); await p.waitForTimeout(150); await scan(); await click(`[data-a="craft"]`); await p.waitForTimeout(200); await click('.rok'); await p.waitForTimeout(150); await scan(); }
await click('[data-a="filterSet"][data-v="all"]'); await p.waitForTimeout(150);
await click('[data-a="runeSlot"][data-v="mantle"]'); await p.waitForTimeout(200); await scan();
const nr = await p.evaluate(() => document.querySelectorAll('[data-a="rune"]').length);
for (let i = 0; i < nr; i++) { await p.evaluate(i => document.querySelectorAll('[data-a="rune"]')[i]?.click(), i); await p.waitForTimeout(120); await scan();
  if (i < 3) { await click('[data-a="runeReroll"]'); await p.waitForTimeout(120); await scan(); await click('[data-a="runeChance"]'); await p.waitForTimeout(150); await scan();
    for (const sl of ['book','mantle','gloves','boots','amulet','ring']) { await click(`[data-a="runeChance"][data-v="${sl}"]`); await p.waitForTimeout(100); await scan(); }
    await click('.orchtap'); await p.waitForTimeout(100); }
  if (i === 3) { await click('[data-a="runeToggle"]'); await p.waitForTimeout(150); await scan(); continue; }
  await click('.x'); await p.waitForTimeout(100); }
await click('[data-a="runeSlot"][data-v="book"]'); await p.waitForTimeout(150); await click('[data-a="runeToggle"]'); await p.waitForTimeout(150); await scan();
await click('[data-a="runeSlot"][data-v="book"]'); await p.waitForTimeout(150); await scan();
// gems (правка Ш9)
await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(300); await click('[data-a="go"][data-v="jewel"]'); await p.waitForTimeout(400); await click('[data-a="jsub"][data-v="gems"]'); await p.waitForTimeout(400); await scan();
const ng = await p.evaluate(() => document.querySelectorAll('.gtile').length);
for (let i = 0; i < ng; i++) { await p.evaluate(i => document.querySelectorAll('.gtile')[i]?.click(), i); await p.waitForTimeout(120); await scan(); await click('.x'); await p.waitForTimeout(80); }
// battle
await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(300); await click('[data-a="battle"]'); await p.waitForTimeout(400); await scan(); await click('[data-a="battleGo"]');
await p.waitForTimeout(1500); await scan(); await click('#oAuto'); await click('#oSpeed'); await click('#oSpeed');
for (let t = 0; t < 40; t++) { await p.waitForTimeout(600); await scan(); }
await click('#oPause'); await p.waitForTimeout(200); await scan(); await click('#oDmgBtn'); await p.waitForTimeout(200); await scan();
await click('#oQuit'); await p.waitForTimeout(1500); await scan();
const miss = await p.evaluate(() => [...window.__i18nMissing]);
fs.writeFileSync(`/tmp/orb_missing_${lang}.json`, JSON.stringify([...new Set([...miss, ...left])], null, 1));
console.log('left', left.size, 'missing', miss.length, 'errors', errs.slice(0, 3));
await b.close();
