// battle with rune skills (meteors, spirits), family runes and gear set effects
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const shot = n => p.screenshot({ path: `shots/b-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html#god'); await p.waitForTimeout(3400);
await click('[data-a="startPick"][data-v="hydra"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mw-profile-v1'));
  s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.heroes.hydra.stars = 4; s.heroes.hydra.level = 40;
  let u = 500; const it = (slot, set, rarity, level) => ({ uid: u++, slot, set, rarity, level, gems: [null, null, null, null] });
  s.items = [it('book', 'berserk', 9, 100), it('mantle', 'guard', 2, 40), it('gloves', 'berserk', 2, 40), it('boots', 'berserk', 9, 100), it('amulet', 'guard', 2, 40), it('ring', 'wanderer', 2, 40)];
  s.equipped = { book: 500, mantle: 501, gloves: 502, boots: 503, amulet: 504, ring: 505 };
  s.runes = [{ uid: 900, id: 'revive', rarity: 5 }, { uid: 901, id: 'f_orbs', rarity: 9 }, { uid: 902, id: 'skill', skill: 'meteor', rarity: 5 },
    { uid: 903, id: 'fury', rarity: 2 }, { uid: 904, id: 'f_storm', rarity: 5 }, { uid: 905, id: 'skill', skill: 'sprites', rarity: 9 }];
  s.heroes.hydra.runes = [900, 901, 902, 903, 904, 905];
  localStorage.setItem('mw-profile-v1', JSON.stringify(s));
});
await p.reload(); await p.waitForTimeout(3600);
await click('.fightbtn'); await p.waitForTimeout(3200);
for (let i = 0; i < 40; i++) { await p.waitForTimeout(90); await shot('m' + String(i).padStart(2, '0')); }
console.log(errs); await b.close();
