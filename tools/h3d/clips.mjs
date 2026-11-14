import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:8765/rig.html?' + process.argv[2]); await p.waitForFunction(() => document.title.startsWith('done'), null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => window.CLIPS))); await b.close(); process.exit(0);
