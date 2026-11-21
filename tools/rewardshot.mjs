// Ш112, Ш116: the reward window — 1 reward, 8 + the first-win chest (scrolled to the bottom), 10 with «Ещё» → shots/w-*.png
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'uk');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
const has = sel => p.evaluate(s => !!document.querySelector(s), sel);
for (let i = 0; i < 120 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click('[data-a="startPick"][data-v="apollo"]'); await p.waitForTimeout(300); await click('[data-a="startGo"]'); await p.waitForTimeout(700); }
for (let i = 0; i < 90 && !(await has('[data-a="go"]')); i++) await p.waitForTimeout(500); await p.waitForTimeout(2500);
const img = n => `<img src="orb/ui/${n}.webp" style="width:58px">`;
const shots = [
  ['w-one', 'Награда за вход: день 4', [{ icon: '<span style="font-size:44px">⚡</span>', name: 'Энергия', count: '10' }], null, null],
  ['w-two', 'Сундук накопления', [{ icon: '<span style="font-size:40px">🪙</span>', name: 'Золото', count: '2640' }, { icon: '<span style="font-size:40px">📜</span>', name: 'Свитки', count: '12' }], null, null],
  ['w-many', 'Этап пройден!', [
    { icon: '<span style="font-size:40px">🪙</span>', name: 'Золото', count: '656' }, { icon: '<span style="font-size:40px">📜</span>', name: 'Свитки', count: '3' },
    { icon: '<span style="font-size:40px">💜</span>', name: 'Осколки рун', count: '5' }, { icon: '<span style="font-size:40px">🧑</span>', name: 'Аполлон', count: '+0.7 ур.', xp: true, tier: 3, color: '#ffcf4a', lvl: 9 },
    { icon: '<span style="font-size:40px">📕</span>', name: 'Луч Аполлона', count: '×10' }, { icon: '<span style="font-size:40px">📘</span>', name: 'Ледяной шар', count: '×10' },
    { icon: '<span style="font-size:40px">✨</span>', name: 'Частицы духа', count: '×4' }, { icon: '<span style="font-size:40px">🧱</span>', name: 'Камни стены', count: '×3' }],
    { kind: 'gold', open: true, items: [{ icon: '<span style="font-size:36px">🧥</span>', name: 'Мантия «Лес»', tier: 1 }, { icon: '<span style="font-size:36px">🧪</span>', name: 'Малая эссенция', count: '2' }] }, null],
  ['w-set', 'Сундук комплекта снаряжения', [{ icon: '<span style="font-size:36px">🧥</span>', name: 'Мантия «Лес»', sub: 'Эпическое', tier: 2 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Мантия «Лес»', sub: 'Редкое', tier: 1 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Книга «Лес»', sub: 'Редкое', tier: 1 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Мантия «Лес»', sub: 'Обычное', tier: 0 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Книга «Лес»', sub: 'Обычное', tier: 0 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Перчатки «Лес»', sub: 'Обычное', tier: 0 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Сапоги «Лес»', sub: 'Обычное', tier: 0 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Книга «Лес»', sub: 'Обычное', tier: 0 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Амулет «Лес»', sub: 'Обычное', tier: 0 },{ icon: '<span style="font-size:36px">🧥</span>', name: 'Книга «Лес»', sub: 'Мифическое', tier: 4 }], null, [{ label: 'Ещё ×1', sub: '740💎', a: 'x', v: '' }, { label: 'Ещё ×10', sub: '7060💎', a: 'x', v: '' }]],
];
for (const [tag, title, items, chest, again] of shots) {
  await p.evaluate(([title, items, chest, again]) => { const h = window.__hub; h.showReward(title, items, '<div class="rstats"><span><small>Ходов</small><b>39</b></span><span><small>Убито</small><b>129</b></span></div>', chest ?? undefined); if (again) { h.reward.again = again; h.render(); } }, [title, items, chest, again]);
  await p.waitForTimeout(900); await p.screenshot({ path: `shots/${tag}.png` });
  if (tag === 'w-many') { await p.evaluate(() => { const s = document.querySelector('.mrw .rwin'); if (s) s.scrollTop = 9999; }); await p.waitForTimeout(400); await p.screenshot({ path: 'shots/w-many2.png' }); }
  await click('.rok'); await p.waitForTimeout(400);
}
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
