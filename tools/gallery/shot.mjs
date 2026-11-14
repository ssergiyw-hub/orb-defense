import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('file:///tmp/gallery.html'); await p.waitForTimeout(300); await p.screenshot({ path: '/tmp/gallery.png' }); console.log(errs); await b.close();
