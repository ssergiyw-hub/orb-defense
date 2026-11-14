import { chromium } from 'playwright';
import fs from 'fs';
const [,, qs, out, dirDeg = '60'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 400, height: 400 } });
p.on('pageerror', e => console.log('err', String(e)));
await p.goto('http://localhost:8765/rig.html?' + qs); await p.waitForFunction(() => document.title.startsWith('done'), null, { timeout: 180000 });
console.log(await p.title());
const url = await p.evaluate((dd) => {
  const C = window.CLIPS, S = 256, n = 6, cv = document.createElement('canvas'); cv.width = S * n; cv.height = S * C.length; const x = cv.getContext('2d');
  x.fillStyle = '#3a3028'; x.fillRect(0, 0, cv.width, cv.height);
  C.forEach((c, i) => { for (let f = 0; f < n; f++) x.drawImage(window.frame(i, c.dur * f / n, dd * Math.PI / 180), f * S, i * S); x.fillStyle = '#fff'; x.font = '20px sans-serif'; x.fillText(c.name, 6, i * S + 22); });
  return cv.toDataURL('image/png');
}, +dirDeg);
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); await b.close();
