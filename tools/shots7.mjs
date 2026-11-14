// Screenshots for edits 11-18 + migration of an old save (gems in the book).
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => p.screenshot({ path: `shots/v-${n}.png` });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
const closeReward = () => p.evaluate(() => document.querySelector('.rewardov')?.click());
await p.goto('file://' + process.cwd() + '/dist/index.html');
// an old v0.4 save: gems in bookGems, no sockets in items
await p.evaluate(() => {
  localStorage.setItem('mw-profile-v1', JSON.stringify({ v: 1, gold: 3e6, crystals: 30000, scrolls: 5000, essSmall: 30, essBig: 5, shards: 500, energy: 30, energyAt: Date.now(), couponsSmall: 1, couponsBig: 0,
    heroes: Object.fromEntries(['prometheus','hydra','hades','apollo','heracles','stribog','poseidon','skadi','veles','perun'].map(id => [id, { owned: id === 'hades', level: 30, xp: 0, stars: 3, particles: 10, runes: [null,null,null,null,null,null] }])),
    active: 'hades', items: [{ uid: 1, slot: 'book', set: null, rarity: 1, level: 25 }], equipped: { book: 1, mantle: null, gloves: null, boots: null, amulet: null, ring: null },
    gems: [{ uid: 2, type: 'ruby', stars: 3, level: 20, xp: 0 }, { uid: 3, type: 'emerald', stars: 2, level: 1, xp: 0 }], bookGems: [2, 3, null, null, null], runes: [],
    maxMap: 3, idleAt: Date.now() - 3600e3, fastIdleDay: '', pityGem: 0, pityCoupon: 0, pityLottery: 0, lotteryFreeDay: '', energyBuys: { day: '', n: 0 }, nextUid: 10, seen: ['hub','chars','gear','jewel','shop','runes'], runs: 5, wins: 3,
    explore: { loc: 2, found: [{ type: 'topaz', stars: 1 }], freeDay: '', freeUsed: 0 } }));
});
await p.reload(); await p.waitForTimeout(400);
await shot('01-hub');
await click('.tab:nth-child(4)'); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(500); await shot('02-hero-mini');
await click('.gslotcard'); await shot('03-item-sockets');
await click('[data-a="sockOpen"]'); await shot('04-socket-pick');
await click('[data-a="sockPut"]'); await shot('05-socketed');
await click('.x');
await click('.tab:nth-child(2)');
for (let i = 0; i < 12; i++) await click('[data-a="explore"][data-v="gold"]');
await shot('06-jewel');
await p.evaluate(() => { const f = document.querySelector('.gfield'); f.scrollTop = 120; });
await click('[data-a="explore"][data-v="gold"]'); await shot('07-jewel-after');
await click('.tab:nth-child(3)'); await p.waitForTimeout(400);
await click('[data-a="tasks"]'); await shot('08-tasks-login');
await click('[data-a="loginClaim"]'); await p.waitForTimeout(300); await shot('09-login-reward'); await closeReward();
await click('[data-a="taskTab"][data-v="day"]'); await click('[data-a="taskClaim"][data-v="d:login"]'); await click('[data-a="taskClaim"][data-v="d:search"]'); await shot('10-tasks-day');
await click('[data-a="taskTab"][data-v="week"]'); await shot('11-tasks-week'); await click('.x');
await click('[data-a="market"]'); await shot('12-market-day');
await click('[data-a="mktTab"][data-v="week"]'); await shot('13-market-week');
await click('[data-a="mktTab"][data-v="month"]'); await click('[data-a="mBuy"][data-v="m:mLegend"]'); await p.waitForTimeout(300); await shot('14-market-month-reward'); await closeReward(); await click('.x');
await click('[data-a="wheel"]'); await shot('15-wheel'); await click('[data-a="wInfo"]'); await shot('16-wheel-odds');
await click('.x'); await click('.tab:nth-child(1)'); await shot('17-shop');
console.log('errors', errs);
console.log(await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); return JSON.stringify({ book: s.items.find(i => i.uid === 1), bookGems: s.bookGems, ex: s.explore }); }));
await b.close();
