import { chromium } from 'playwright';
const [,, url, out, w = 1200, h = 420] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('err', String(e)));
await p.goto(url); await p.waitForFunction(() => document.title.startsWith('done'), null, { timeout: 120000 });
console.log(await p.title()); await p.screenshot({ path: out }); await b.close();
