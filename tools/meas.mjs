import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w, h] of [[390, 800], [360, 740], [412, 915]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(3300);
  await p.evaluate(() => { document.querySelector('[data-a="startPick"][data-v="apollo"]').click(); document.querySelector('[data-a="startGo"]').click(); });
  await p.waitForTimeout(400);
  console.log(w, h, await p.evaluate(() => { const r = s => { const e = document.querySelector(s).getBoundingClientRect(); return [Math.round(e.top), Math.round(e.bottom)]; };
    return { set: r('.side.left .setbtn'), stage: r('.stage'), view: r('#view'), tabs: r('#tabs'), fight: r('.fightbtn'), art: r('.hubart') }; }));
  await p.close();
}
await b.close();
