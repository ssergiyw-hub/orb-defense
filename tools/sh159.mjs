// правка 159 check: sounds play where they should (counted), no errors; saves every sound to /tmp/s159/*.wav
import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('/tmp/s159', { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 800 } });
p.on('pageerror', e => console.log('PAGEERROR', String(e)));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript(() => {
  window.__snd = []; window.__vib = []; window.__bufs = [];
  const st = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { window.__snd.push(Math.round(this.buffer.duration * 1000)); return st.apply(this, a); };
  const cb = AudioContext.prototype.createBuffer;
  AudioContext.prototype.createBuffer = function (...a) { const r = cb.apply(this, a); window.__bufs.push(r); return r; };
  navigator.vibrate = (x) => { window.__vib.push(JSON.stringify(x)); return true; };
});
const click = s => p.evaluate(s => document.querySelector(s)?.click(), s);
const w = ms => p.waitForTimeout(ms);
const take = async tag => { const r = await p.evaluate(() => { const s = window.__snd.splice(0), v = window.__vib.splice(0); return { s, v }; }); console.log(tag.padEnd(14), 'sounds', JSON.stringify(r.s), 'vib', JSON.stringify(r.v)); };
await p.goto('http://localhost:8766/index.html#god'); await w(2000);
await p.mouse.click(5, 5); await w(200);
for (let i = 0; i < 10 && await p.evaluate(() => !!document.querySelector('[data-a="startPick"]')); i++) { await click('[data-a="startPick"][data-v="hydra"]'); await w(400); await click('[data-a="startGo"]'); await w(700); }
await take('start');
await click('[data-a="close"]'); await click('[data-a="rewardOk"]'); await w(400); await take('first reward');
await click('[data-a="passes"]'); await w(400); await take('open passes');
await click('#layer [data-a="close"]'); await w(400); await take('close');
await p.evaluate(() => { const q = JSON.parse(localStorage.getItem('mw-profile-v1')); q.crystals = 99999; q.gold = 9e6; localStorage.setItem('mw-profile-v1', JSON.stringify(q)); });
await p.reload(); await w(2000); await p.mouse.click(5, 5); await w(200); await take('reload');
await click('[data-a="go"][data-v="shop"]'); await w(500);
console.log('shop actions', await p.evaluate(() => [...new Set([...document.querySelectorAll('#view [data-a]')].map(e => e.dataset.a + ':' + (e.dataset.v || '')))].join(' '))); await click('[data-a="shopTab"][data-v="topup"]'); await w(300); await p.evaluate(() => document.querySelector('[data-a="buy"]')?.click()); await w(400); await take('buy ask');
await click('[data-a="cfYes"]'); await w(600); await take('buy done');
await click('[data-a="rewardOk"]'); await w(300); await click('[data-a="shopTab"][data-v="chests"]'); await w(300); await p.evaluate(() => document.querySelector('[data-a="chest"][data-v="set:10"]')?.click()); await w(300); await click('[data-a="cfYes"]'); await w(700); await take('chest');
await click('[data-a="rewardOk"]'); await w(400); await take('ok');
// save the sound shapes
const wavs = await p.evaluate(() => window.__bufs.map(b => Array.from(b.getChannelData(0))));
console.log('buffers', wavs.length);
fs.writeFileSync('/tmp/s159/bufs.json', JSON.stringify(wavs.map(a => a.map(x => Math.round(x * 32767)))));
await click('[data-a="go"][data-v="hub"]'); await w(300);
await click('[data-a="fight"], .fightbtn'); await w(3000); await take('battle start');
for (let i = 0; i < 40 && await p.evaluate(() => document.querySelector('#cards')?.hidden); i++) await w(500);
await take('until cards');
await p.evaluate(() => document.querySelector('#cardList button')?.click()); await w(500); await take('picked');
await b.close();
