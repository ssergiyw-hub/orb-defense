import { chromium } from 'playwright'; import fs from 'fs';
const [,, qs, out, specJson] = process.argv; const spec = JSON.parse(specJson); // [[ci,t,dirDeg,mix|null],...]
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('err', String(e)));
await p.goto('http://localhost:8765/rig.html?' + qs); await p.waitForFunction(() => document.title.startsWith('done'), null, { timeout: 180000 });
const url = await p.evaluate(sp => { const S = 320, cv = document.createElement('canvas'); cv.width = S * sp.length; cv.height = S; const x = cv.getContext('2d'); x.fillStyle = '#3a3028'; x.fillRect(0, 0, cv.width, S);
  sp.forEach(([ci, t, d, mix], i) => { x.drawImage(window.frame(ci, t, d * Math.PI / 180, mix), i * S, 0); const [tx, ty] = window.tip(); x.fillStyle = '#0f0'; x.fillRect(i * S + tx * S - 3, ty * S - 3, 6, 6); }); return cv.toDataURL(); }, spec);
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); await b.close(); process.exit(0);
