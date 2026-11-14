// правка 123: old and new monsters side by side, same scale, on a real background
import { drawMonster } from '../../src/client/art';
import { ENEMIES, EnemyKind } from '../../src/core/content';
const rows: EnemyKind[][] = [
  ['grunt', 'fast', 'tank', 'tank2', 'shooter', 'exploder', 'summoner', 'miniboss'],
  ['shield', 'ram', 'harpy', 'healer', 'archer', 'slime', 'golem', 'ghost'],
  ['boss', 'ogre', 'harpyQueen', 'colossus', 'slimelet'],
];
const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1000; document.body.appendChild(cv);
const c = cv.getContext('2d')!;
const bg = new Image(); bg.src = (window as any).BG;
bg.onload = () => {
  c.drawImage(bg, 0, 0, 1600, 1000);
  rows.forEach((row, ri) => row.forEach((k, i) => {
    const R = ENEMIES[k].r, x = 100 + i * 195, gy = 230 + ri * 320, sc = R > 20 ? 1.9 : 3;
    c.save(); c.translate(x, gy); c.scale(sc, sc);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 0, R, R * 0.4, 0, 0, 6.283); c.fill();
    drawMonster(c, k, 0, 0, R, { flash: false, frozen: false, t: 0.37 * i + ri, ux: 0.35, uy: 0.85, state: 0, biome: 1 });
    c.restore();
    c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText(ENEMIES[k].name, x, gy + 30); c.fillStyle = '#fff'; c.fillText(ENEMIES[k].name, x, gy + 30);
  }));
  (window as any).DONE = 1;
};
