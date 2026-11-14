import { chromium } from 'playwright';
import fs from 'fs';
const [,, qs, outDir, specJson] = process.argv;
const spec = JSON.parse(specJson);
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
p.on('pageerror', e => console.log('err', String(e)));
await p.goto('http://localhost:8765/rig.html?' + qs); await p.waitForFunction(() => document.title.startsWith('done'), null, { timeout: 180000 });
for (const s of spec) {
  const t0 = Date.now();
  const r = await p.evaluate(sp => window.atlas([sp]), s);
  fs.writeFileSync(`${outDir}/${s.key}.png`, Buffer.from(r[s.key].split(',')[1], 'base64'));
  fs.writeFileSync(`${outDir}/${s.key}.tips.json`, JSON.stringify(r[s.key + '.tips']));
  console.log(s.key, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await b.close(); process.exit(0);
