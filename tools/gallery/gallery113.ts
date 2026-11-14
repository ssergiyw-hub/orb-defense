// правка 113: new monsters and the wall bosses, big and at real size
import { drawMonster } from '../../src/client/art';
import { ENEMIES, EnemyKind } from '../../src/core/content';
const kinds: EnemyKind[] = ['shield', 'ram', 'harpy', 'healer', 'archer', 'slime', 'slimelet', 'golem', 'ghost', 'ogre', 'harpyQueen', 'colossus'];
const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 900; document.body.appendChild(cv);
const c = cv.getContext('2d')!;
c.fillStyle = '#7fb04a'; c.fillRect(0, 0, 1400, 900);
kinds.forEach((k, i) => {
  const R = ENEMIES[k].r, big = R > 20, col = i % 6, row = Math.floor(i / 6);
  const x = 110 + col * 230, gy = 300 + row * 420, sc = big ? 2.2 : 4;
  c.save(); c.translate(x, gy); c.scale(sc, sc);
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, R, R * 0.4, 0, 0, 6.283); c.fill();
  drawMonster(c, k, 0, 0, R, { flash: false, frozen: false, t: 0.37 * i, ux: 0.4, uy: 0.8, state: 0, biome: 1 });
  c.restore();
  c.fillStyle = '#000'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.fillText(ENEMIES[k].name, x, gy + 40);
  drawMonster(c, k, x + 70, gy + 100, R, { flash: false, frozen: false, t: 0.37 * i, ux: -0.6, uy: 0.5, state: 0, biome: 1 });
});
