// правки 172, 173: ad buttons, browser stand-in video, crystal packs, starter pack, passes. node tools/sh172.mjs [lang]
import { chromium } from 'playwright';
const lang = process.argv[2] ?? 'ru';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const base = 'file://' + process.cwd() + '/dist/index.html';
await p.addInitScript(l => localStorage.setItem('mw-lang', l), lang);
await p.goto(base + '#god,winnow'); await p.waitForTimeout(6500);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.maxMap = 4; s.tut = 3; s.testPay = true; s.crystals = 5000; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(6500);
const shot = async n => { await p.waitForTimeout(500); await p.screenshot({ path: `shots/s172-${lang}-${n}.png` }); };
// shop: chests tab (ad chest + tavern), top-up tab (starter + packs)
await click('[data-a="go"][data-v="shop"]'); await p.waitForTimeout(600); await shot('chests');
await p.evaluate(() => { const e = document.querySelector('[data-v="hero"][data-a="ad"]'); e?.scrollIntoView({ block: 'center' }); }); await shot('tavern');
await click('[data-a="shopTab"][data-v="topup"]'); await shot('topup');
await click('[data-a="pack"][data-v="c5"]'); await shot('packbought'); await click('[data-a="rewardOk"]');
// ad: energy in the market — the browser stand-in video
await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(400); await click('[data-a="market"]'); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('[data-a="ad"][data-v="energy"]')?.scrollIntoView({ block: 'center' })); await shot('market');
await click('[data-a="ad"][data-v="energy"]'); await p.waitForTimeout(1500); await shot('fakead');
await p.waitForTimeout(4500); await shot('fakead-done'); await click('.fakead .fax'); await shot('energyreward'); await click('[data-a="rewardOk"]');
await click('[data-a="close"]'); await p.waitForTimeout(300);
// wheel
await click('[data-a="wheel"]'); await p.waitForTimeout(600); await shot('wheel'); await click('[data-a="close"]');
// passes
await click('[data-a="passes"]'); await p.waitForTimeout(600); await shot('passes'); await click('[data-a="close"]');
// a won stage: result window with «удвоить награду»
await click('[data-a="battle"]'); await p.waitForTimeout(700); await click('[data-a="battleGo"]'); await p.waitForTimeout(4500);
await click('[data-a="stageChest"]'); await p.waitForTimeout(400); await shot('result');
await click('[data-a="adDouble"]'); await p.waitForTimeout(6200); await click('.fakead .fax'); await shot('doubled');
console.log(JSON.stringify(errs)); await b.close(); process.exit(0);
