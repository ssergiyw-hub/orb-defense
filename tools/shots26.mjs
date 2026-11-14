import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const shot = n => p.screenshot({ path: `shots/w2-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3400);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mw-profile-v1'));
  s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.heroes.hydra.stars = 4; s.heroes.hydra.level = 40; s.gold = 9e6; s.scrolls = 9000; s.shards = 5000;
  let u = 500; const it = (slot, set, rarity, level) => ({ uid: u++, slot, set, rarity, level, gems: [null, null, null, null] });
  s.items = [it('book', 'berserk', 8, 90), it('mantle', 'guard', 5, 60), it('gloves', 'berserk', 2, 40), it('boots', 'berserk', 9, 100), it('amulet', 'guard', 3, 45), it('ring', 'wanderer', 2, 40),
    it('book', 'berserk', 2, 1), it('book', 'berserk', 2, 1), it('book', 'guard', 2, 1), it('book', 'berserk', 2, 7), it('mantle', 'wanderer', 2, 1)];
  s.equipped = { book: 500, mantle: 501, gloves: 502, boots: 503, amulet: 504, ring: 505 };
  s.runes = [{ uid: 900, id: 'revive', rarity: 5 }, { uid: 901, id: 'f_orbs', rarity: 9 }, { uid: 902, id: 'skill', skill: 'meteor', rarity: 2 },
    { uid: 903, id: 'fury', rarity: 2 }, { uid: 904, id: 'elem', elem: 'poison', rarity: 3 }, { uid: 905, id: 'skill', skill: 'sprites', rarity: 9 },
    { uid: 906, id: 'luck', rarity: 1 }, { uid: 907, id: 'luck', rarity: 1 }, { uid: 908, id: 'f_blast', rarity: 6 }, { uid: 909, id: 'skill', skill: 'boomerang', rarity: 0 }];
  s.heroes.hydra.runes = [900, 901, 902, 903, 904, 905];
  s.gv = 2; localStorage.setItem('mw-profile-v1', JSON.stringify(s));
});
await p.reload(); await p.waitForTimeout(3600);
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(400); await shot('01-gear');
await click('[data-a="item"][data-v="500"]'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.itembox').scrollTop = 300); await p.waitForTimeout(100); await shot('02-mythic-step');
await click('[data-a="merge"]'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.itembox').scrollTop = 0); await shot('03-mythic');
await click('.modal .x'); await click('[data-a="sub"][data-v="chars"]'); await click('[data-a="bonusOpen"]'); await p.waitForTimeout(300); await shot('04-bonus');
await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(300); await shot('05-runes');
await click('[data-a="go"][data-v="shop"]'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.subbody, .main, #ui')?.scrollTo?.(0, 900)); await shot('06-shop');
console.log(errs); await b.close();
