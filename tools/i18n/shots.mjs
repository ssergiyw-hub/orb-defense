import { chromium } from 'playwright';
const [lang, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.addInitScript(l => { try { localStorage.setItem('mw-lang', l); } catch {} }, lang);
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(2500);
await click('[data-a="startPick"][data-v="hydra"]'); await p.waitForTimeout(400); await click('[data-a="startGo"]'); await p.waitForTimeout(600);
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = []; s.maxMap = 5; s.gold = 9e6; s.crystals = 99999; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(2500);
await click('[data-a="close"]'); await click('[data-a="rewardOk"]');
for (const v of process.argv.slice(4)) {
  if (v === 'wallfight' || v === 'fight') {
    await click('[data-a="go"][data-v="hub"]'); await p.waitForTimeout(300);
    if (v === 'wallfight') { await click('[data-a="wallOpen"]'); await p.waitForTimeout(500); await p.screenshot({ path: `${out}_wallwin.png` }); await click('[data-a="wallGo"]'); }
    else { await click('[data-a="battle"]'); await p.waitForTimeout(400); await click('[data-a="battleGo"]'); }
    for (let t = 0; t < 12; t++) { await p.waitForTimeout(700); if (await p.evaluate(() => !document.getElementById('cards').hidden)) { await p.screenshot({ path: `${out}_${v}cards.png` }); await p.evaluate(() => document.querySelector('#cardList .sk')?.click()); } }
    await p.screenshot({ path: `${out}_${v}.png` });
    await click('#pauseBtn'); await p.waitForTimeout(300); await p.screenshot({ path: `${out}_${v}pause.png` });
    await click('#quitBtn'); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}_${v}end.png` }); await click('[data-a="rewardOk"]'); await p.waitForTimeout(500);
    continue;
  }
  if (v.startsWith('a:')) await click(`[data-a="${v.slice(2)}"]`); else await click(`[data-a="go"][data-v="${v}"]`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}_${v.replace(':','')}.png` });
}
await b.close();
