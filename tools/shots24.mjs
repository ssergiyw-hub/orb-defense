// gear steps and rune screens (v2), plus migration of an old profile
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/v-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3400);
await click('[data-a="startPick"][data-v="apollo"]'); await click('[data-a="startGo"]'); await p.waitForTimeout(300);
// an old (v1) profile: legendary at level 75, mythic, old runes
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mw-profile-v1')); delete s.gv;
  s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.gold = 5e6; s.scrolls = 5000; s.shards = 3000; s.crystals = 50000;
  s.heroes.apollo.stars = 4; s.heroes.apollo.level = 40;
  let u = 500; const it = (slot, set, rarity, level) => ({ uid: u++, slot, set, rarity, level, gems: [null, null, null, null] });
  s.items = [it('book', 'wanderer', 3, 75), it('mantle', 'guard', 2, 55), it('gloves', 'berserk', 4, 90), it('boots', 'wanderer', 1, 30), it('ring', 'berserk', 2, 12),
    it('gloves', 'guard', 2, 1), it('gloves', 'wanderer', 2, 5), it('mantle', 'berserk', 2, 1), it('boots', 'wanderer', 1, 1), it('boots', 'wanderer', 1, 1),
    it('amulet', 'guard', 0, 1), it('amulet', 'guard', 0, 1), it('amulet', 'guard', 0, 1), it('ring', 'wanderer', 2, 3), it('ring', 'guard', 2, 1)];
  s.equipped = { book: 500, mantle: 501, gloves: 502, boots: 503, amulet: null, ring: 504 };
  s.runes = [{ uid: 900, kind: 'elem', elem: 'light', rarity: 3 }, { uid: 901, kind: 'destroy', rarity: 1 }, { uid: 902, kind: 'absorb', rarity: 2 }, { uid: 903, kind: 'elem', elem: 'fire', rarity: 0 }];
  s.heroes.apollo.runes = [900, 901, 902, null, null, null];
  localStorage.setItem('mw-profile-v1', JSON.stringify(s));
});
await p.reload(); await p.waitForTimeout(3600);
const mig = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); return { gv: s.gv, gold: s.gold, scrolls: s.scrolls, items: s.items.slice(0, 5).map(i => [i.slot, i.rarity, i.level]), runes: s.runes, slots: s.heroes.apollo.runes }; });
console.log('before any action (saved state may be old until first save):', JSON.stringify(mig));
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(400); await shot('01-gear');
const mig2 = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); return { gv: s.gv, gold: s.gold, scrolls: s.scrolls, items: s.items.slice(0, 5).map(i => [i.slot, i.rarity, i.level]), runes: s.runes, slots: s.heroes.apollo.runes }; });
console.log('after:', JSON.stringify(mig2));
await click('[data-a="item"][data-v="501"]'); await p.waitForTimeout(300); await shot('02-item-epic');
await p.evaluate(() => document.querySelector('.itembox').scrollTop = 400); await p.waitForTimeout(150); await shot('03-item-epic-scroll');
await click('[data-a="merge"]'); await p.waitForTimeout(300); await shot('04-merged');
await click('.modal .x'); await click('[data-a="item"][data-v="500"]'); await p.waitForTimeout(300); await shot('05-item-legend');
await click('.modal .x'); await click('[data-a="smith"]'); await p.waitForTimeout(300); await shot('06-smith');
await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(300);
for (let i = 0; i < 14; i++) await click('[data-a="workshop"]'), await click('[data-a="craft"]'), await p.evaluate(() => document.querySelector('.rewardov')?.click());
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1'));
  let u = 950; const r = (id, rarity, x = {}) => ({ uid: u++, id, rarity, ...x });
  s.runes.push(r('f_orbs', 5), r('skill', 2, { skill: 'meteor' }), r('skill', 9, { skill: 'sprites' }), r('revive', 6), r('fury', 3), r('elem', 7, { elem: 'ice' }), r('f_storm', 8), r('wisdom', 1), r('wisdom', 1), r('wisdom', 1));
  localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(3500);
await click('[data-a="go"][data-v="hero"]'); await click('[data-a="sub"][data-v="runes"]'); await p.waitForTimeout(400); await shot('07-runes');
await click('[data-a="rune"][data-v="950"]'); await p.waitForTimeout(300); await shot('08-rune-orbs');
await click('[data-a="runeToggle"]'); await p.waitForTimeout(200);
await click('[data-a="rune"][data-v="952"]'); await p.waitForTimeout(300); await shot('09-rune-sprites');
await click('[data-a="runeToggle"]'); await p.waitForTimeout(200);
await click('[data-a="rune"][data-v="957"]'); await p.waitForTimeout(300); await shot('10-rune-wisdom');
await click('[data-a="runeMerge"]'); await p.waitForTimeout(200); await click('.modal .x');
await click('[data-a="workshop"]'); await p.waitForTimeout(300); await shot('11-workshop');
await click('.modal .x'); await p.waitForTimeout(200); await shot('12-runes-after');
console.log(errs); await b.close();
