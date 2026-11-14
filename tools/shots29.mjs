import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/w4-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3400);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mw-profile-v1'));
  s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.heroes.hydra.stars = 6; s.heroes.hydra.level = 40; s.gold = 9e6; s.scrolls = 9000; s.shards = 5000;
  let u = 500; const it = (slot, set, rarity, level) => ({ uid: u++, slot, set, rarity, level, gems: [null, null, null, null] });
  s.items = [it('book', 'berserk', 4, 50), it('mantle', 'guard', 5, 60), it('gloves', 'berserk', 2, 40), it('boots', 'berserk', 9, 100), it('amulet', 'guard', 3, 45), it('ring', 'wanderer', 2, 40),
    it('gloves', 'berserk', 0, 1), it('gloves', 'berserk', 0, 5), it('gloves', 'berserk', 0, 1), it('ring', 'guard', 1, 3), it('ring', 'guard', 1, 1), it('ring', 'guard', 1, 1),
    it('mantle', 'wanderer', 2, 12), it('book', 'guard', 2, 1), it('boots', 'guard', 0, 1), it('boots', 'guard', 0, 1), it('boots', 'guard', 0, 1)];
  s.equipped = { book: 500, mantle: 501, gloves: 502, boots: 503, amulet: 504, ring: 505 };
  s.runes = [{ uid: 900, id: 'revive', rarity: 5 }, { uid: 901, id: 'f_orbs', rarity: 4 }, { uid: 902, id: 'skill', skill: 'meteor', rarity: 2 },
    { uid: 903, id: 'fury', rarity: 2 }, { uid: 904, id: 'elem', elem: 'poison', rarity: 1 }, { uid: 905, id: 'skill', skill: 'sprites', rarity: 9 },
    { uid: 906, id: 'luck', rarity: 1 }, { uid: 907, id: 'luck', rarity: 1 }, { uid: 908, id: 'luck', rarity: 1 }, { uid: 909, id: 'f_orbs', rarity: 4 }, { uid: 910, id: 'elem', elem: 'poison', rarity: 1 }, { uid: 911, id: 'elem', elem: 'poison', rarity: 1 }, { uid: 912, id: 'skill', skill: 'boomerang', rarity: 0 }];
  s.heroes.hydra.runes = [900, 901, 902, 903, null, 905];
  s.gv = 2; localStorage.setItem('mw-profile-v1', JSON.stringify(s));
});
await p.reload(); await p.waitForTimeout(3600);
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(400); await shot('01-gear');
await click('[data-a="smith"]'); await p.waitForTimeout(300); await shot('02-smith');
await click('[data-a="smKeep"][data-v="506:507"]'); await click('[data-a="smToggle"][data-v="501"]'); await p.waitForTimeout(200); await shot('03-smith-keep');
await click('[data-a="smGo"]'); await p.waitForTimeout(1600); await shot('04-smith-result');
await click('.rewardov'); await click('.modal .x'); await p.waitForTimeout(200);
await click('[data-a="item"][data-v="502"]'); await p.waitForTimeout(300); await shot('05-item');
await click('[data-a="merge"]'); await p.waitForTimeout(1600); await shot('06-merge-result');
await click('.rewardov'); await click('.modal .x');
await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(300); await shot('07-runes');
await click('[data-a="workshop"]'); await p.waitForTimeout(300); await shot('08-ws');
await click('[data-a="wsRune"][data-v="904"]'); await p.waitForTimeout(200); await shot('09-ws-center');
await click('[data-a="wsRune"][data-v="910"]'); await p.waitForTimeout(200); await shot('10-ws-one');
await click('[data-a="wsAuto"]'); await p.waitForTimeout(200); await shot('11-ws-full');
await click('[data-a="wsFuse"]'); await p.waitForTimeout(450); await shot('12-fusing');
await p.waitForTimeout(1700); await shot('13-ws-result');
await click('.rewardov'); await click('[data-a="wsRune"][data-v="901"]'); await click('[data-a="wsAuto"]'); await p.waitForTimeout(200); await shot('14-ws-one-copy');
await click('[data-a="wsTab"][data-v="craft"]'); await p.waitForTimeout(200); await shot('15-craft');
console.log(JSON.stringify(errs)); await b.close();
