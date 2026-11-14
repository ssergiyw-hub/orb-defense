import { chromium } from 'playwright';
const [,, qs, ci] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:8765/rig.html?' + qs); await p.waitForFunction(() => document.title.startsWith('done'), null, { timeout: 180000 });
const r = await p.evaluate((ci) => {
  const { bones, mixer, root, clips, THREE } = window.X; const c = clips[ci]; const out = [];
  for (let i = 0; i <= 40; i++) { const t = c.duration * i / 40; mixer.stopAllAction(); mixer.clipAction(c).reset().play(); mixer.setTime(t); root.updateMatrixWorld(true);
    const L = bones.LeftFoot.getWorldPosition(new THREE.Vector3()), R = bones.RightFoot.getWorldPosition(new THREE.Vector3()), H = bones.Hips.getWorldPosition(new THREE.Vector3()), hd = bones.head_end?.getWorldPosition(new THREE.Vector3());
    out.push([t.toFixed(3), L.z.toFixed(3), L.y.toFixed(3), R.z.toFixed(3), R.y.toFixed(3), H.z.toFixed(3), H.y.toFixed(3), hd ? hd.y.toFixed(2) : '']); }
  return out; }, +ci);
console.log(r.map(x => x.join(' ')).join('\n')); await b.close();
