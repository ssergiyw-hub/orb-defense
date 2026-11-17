// Orb Defense: screenshots of the runes (правки Ш7, Ш37) and the gems (Ш9) → shots/r-*.png
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(process.argv[2] ?? 390), height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'ru');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
await click('[data-a="startPick"][data-v="veles"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mw-profile-v1'));
  s.seen = ['hub', 'chars', 'gear', 'jewel', 'shop', 'runes', 'settings']; s.maxMap = 6; s.gold = 50000; s.crystals = 3000; s.shards = 1800;
  let u = 900; const R = (slot, fx, rarity) => ({ uid: u++, slot, fx, rarity });
  s.runes = [R('book', 'impact', 6), R('amulet', 'crit', 2), R('ring', 'wetfrozen', 9), R('mantle', 'plusball', 5), R('gloves', 'dur', 1),
    R('boots', 'dot', 3), R('book', 'atk', 0), R('mantle', 'wallhp', 4), R('ring', 'critdmg', 7), R('gloves', 'beamlight', 2), R('amulet', 'spirit', 0), R('boots', 'gold', 1)];
  s.runeOn = { book: 900, amulet: 901, ring: 902, mantle: 903 };
  // gems: a topaz and a sapphire in the gloves, a diamond in the ring
  const it = (slot, rarity) => { const x = { uid: u++, slot, set: slot === 'book' ? 'guard' : 'guard', rarity, level: 45, gems: [null, null, null, null] }; s.items.push(x); s.equipped[slot] = x.uid; return x; };
  const g = (type, stars, level) => { const x = { uid: u++, type, stars, level, xp: 0 }; s.gems.push(x); return x.uid; };
  const gl = it('gloves', 2); gl.gems[0] = g('topaz', 3, 40); gl.gems[1] = g('sapphire', 3, 40);
  const bo = it('boots', 1); bo.gems[0] = g('sapphire', 2, 10);
  const rg = it('ring', 2); rg.gems[0] = g('diamond', 2, 20);
  g('topaz', 1, 1); g('sapphire', 4, 1); g('garnet', 2, 1);
  s.nextUid = u + 1;
  localStorage.setItem('mw-profile-v1', JSON.stringify(s));
});
await p.reload(); await p.waitForSelector('[data-a="go"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(900);
await p.screenshot({ path: 'shots/r-gear.png' });
await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(900); await p.screenshot({ path: 'shots/r-runes.png' });
await click('[data-a="runeSlot"][data-v="ring"]'); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/r-card.png' });
await click('[data-a="runeReroll"]'); await p.waitForTimeout(250); await p.screenshot({ path: 'shots/r-reroll.png' });
await click('[data-a="runeChance"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/r-chance.png' });
await click('[data-a="runeChance"][data-v="gloves"]'); await p.waitForTimeout(400); await p.screenshot({ path: 'shots/r-chance2.png' });
await click('.orchtap'); await p.waitForTimeout(300); await click('.x'); await p.waitForTimeout(300);
await click('[data-a="filterSet"][data-v="gloves"]'); await p.waitForTimeout(300); await click('[data-a="rune"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/r-card2.png' });
await click('.x'); await p.waitForTimeout(200);
await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(600); await click('[data-a="o:walls"]'); await p.waitForTimeout(700); await p.screenshot({ path: 'shots/r-walls.png' });
await click('.x'); await click('[data-a="go"][data-v="jewel"]'); await p.waitForTimeout(800); await click('[data-a="jsub"][data-v="gems"]'); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/r-gems.png' });
await click('.gtile'); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/r-gem.png' });
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
