// Ш105: the item window in marble (epic book with a gem, mythic mantle, rare ring, common boots) → shots/i-*.png. OLANG=uk|ru|en
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const click = sel => p.evaluate(s => document.querySelector(s)?.click(), sel);
await p.addInitScript(l => localStorage.setItem('mw-lang', l), process.env.OLANG ?? 'uk');
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForSelector('[data-a="startPick"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!localStorage.getItem('mw-profile-v1'))); i++) { await click('[data-a="startPick"][data-v="apollo"]'); await p.waitForTimeout(150); await click('[data-a="startGo"]'); await p.waitForTimeout(350); }
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mw-profile-v1')); s.seen = ['hub','chars','gear','jewel','shop','runes','settings']; s.gold = 1431; s.scrolls = 42; s.maxMap = 6; localStorage.setItem('mw-profile-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForSelector('[data-a="go"]', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(4500);
await p.evaluate(() => { const P = window.__hub.p;
  const add = (uid, slot, rarity, level) => { P.items.push({ uid, slot, set: 'guard', rarity, level, gems: [] }); P.equipped[slot] = uid; };
  add(9101, 'book', 2, 21); add(9102, 'mantle', 9, 40); add(9103, 'ring', 1, 8); add(9104, 'boots', 0, 3);
  P.gems.push({ uid: 7001, type: 'ruby', stars: 3, level: 4 }); P.items.find(i => i.uid === 9101).gems[0] = 7001;
  window.__hub.render(); });
await click('[data-a="go"][data-v="hero"]'); await p.waitForTimeout(400); await click('[data-a="sub"][data-v="gear"]'); await p.waitForTimeout(600);
for (const [uid, tag] of [[9101, 'epic'], [9102, 'mythic'], [9103, 'rare'], [9104, 'common']]) {
  await p.evaluate(u => { window.__hub.sel.item = u; window.__hub.render(); }, uid); await p.waitForTimeout(500);
  await p.screenshot({ path: `shots/i-${tag}.png` });
  if (tag === 'epic') { await p.evaluate(() => { const s = document.querySelector('.ibscroll'); if (s) s.scrollTop = 9999; }); await p.waitForTimeout(200); await p.screenshot({ path: 'shots/i-epic2.png' }); }
  await click('.itembox2 .corner-x'); await p.waitForTimeout(200);
}
console.log(JSON.stringify(errs.slice(0, 8))); await b.close();
