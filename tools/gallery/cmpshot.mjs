import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const bg = 'data:image/webp;base64,' + fs.readFileSync(process.argv[2]).toString('base64');
await p.goto('file:///tmp/cmp.html'); await p.evaluate(x => { window.BG = x; }, bg);
await p.addScriptTag({ path: '/tmp/cmp.js' }); await p.waitForFunction(() => window.DONE);
await p.screenshot({ path: process.argv[3] }); await b.close();
