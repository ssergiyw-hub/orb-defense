import { drawMonster, drawObstacle } from '../../src/client/art';
const kinds = ['grunt', 'fast', 'tank', 'tank2', 'shooter', 'exploder', 'summoner', 'miniboss', 'goldboss', 'boss'] as const;
const R: Record<string, number> = { grunt: 10.4, fast: 8.8, tank: 15.2, tank2: 15.2, shooter: 9.6, exploder: 9.6, summoner: 12, miniboss: 27.2, goldboss: 20.8, boss: 36.8 };
const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 900; document.body.appendChild(cv);
const c = cv.getContext('2d')!;
for (const [row, biome] of [[0, 0], [1, 1]] as const) {
  c.fillStyle = biome === 0 ? '#d9c08a' : '#7fb04a'; c.fillRect(0, row * 450, 1400, 450);
  kinds.forEach((k, i) => {
    const big = k === 'boss' || k === 'miniboss' || k === 'goldboss';
    const x = 70 + i * 132, gy = row * 450 + (big ? 330 : 260), sc = big ? 1.2 : 4;
    c.save(); c.translate(x, gy); c.scale(sc, sc);
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, R[k], R[k] * 0.4, 0, 0, 6.283); c.fill();
    drawMonster(c, k, 0, 0, R[k], { flash: false, frozen: false, t: 0.37 * i, ux: 0.6, uy: 0.5, state: 0, biome, charge: k === 'shooter' ? 0.8 : 0 });
    c.restore();
  });
  // real size row
  kinds.forEach((k, i) => { drawMonster(c, k, 60 + i * 132, row * 450 + 420, R[k], { flash: false, frozen: false, t: 0.37 * i, ux: -0.6, uy: 0.5, state: 0, biome }); });
}
void drawObstacle;
