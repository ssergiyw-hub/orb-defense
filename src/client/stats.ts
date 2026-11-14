// Правка 114: who dealt how much damage — the pause window and the run result.
import { Match } from '../core/sim';
import { ENEMIES, EnemyKind, SKILLS, SkillId } from '../core/content';
import { SKILL_ICON, skillPic } from './hub';

/** names of the sources that are not skills (gear set effects) */
const GEAR_SRC: Record<string, [string, string]> = {
  decay: ['Распад', '💀'], pulse: ['Импульс тьмы', '🌑'], spikes: ['Колючки', '🌵'], execute: ['Казнь', '✖'],
};

const num = (v: number) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(0) + 'k' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : String(Math.round(v));

/** rows: icon, name and level, bar, total, share and damage per second; biggest first */
export function dmgTable(m: Match): string {
  const rows = Object.entries(m.dmgBy).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<div class="dmgnone">Урона ещё нет</div>';
  const total = rows.reduce((a, [, v]) => a + v, 0), top = rows[0][1], t = Math.max(1, m.time);
  return `<div class="dmgt">${rows.map(([k, v]) => {
    const sk = SKILLS[k as SkillId], g = GEAR_SRC[k];
    const icon = sk ? (skillPic(k, 'dmgi') ?? `<span class="dmge">${SKILL_ICON[k as SkillId]}</span>`) : `<span class="dmge">${g?.[1] ?? '•'}</span>`;
    const name = sk ? sk.name : g?.[0] ?? k, lv = sk ? m.lvl(k as SkillId) : 0;
    return `<div class="dmgr">${icon}<div class="dmgm"><div class="dmgn"><b>${name}</b>${lv ? `<small>ур. ${lv}</small>` : ''}<em>${num(v)}</em></div>
      <div class="dmgb"><i style="width:${(100 * v / top).toFixed(1)}%"></i></div><div class="dmgs"><span>${(100 * v / total).toFixed(1)}%</span><span>${num(v / t)} в сек.</span></div></div></div>`;
  }).join('')}<div class="dmgtot">Всего <b>${num(total)}</b> · ${num(total / t)} в сек.</div></div>`;
}

/** wall map: damage the wall took, by kind of monster */
export function wallTable(m: Match): string {
  const rows = Object.entries(m.wallBy).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<div class="dmgnone">Стена не получила урона</div>';
  const total = rows.reduce((a, [, v]) => a + v, 0), top = rows[0][1];
  return `<div class="dmgt wallt">${rows.map(([k, v]) => `<div class="dmgr"><span class="dmge">🧱</span><div class="dmgm"><div class="dmgn"><b>${ENEMIES[k as EnemyKind]?.name ?? k}</b><em>${num(v)}</em></div>
    <div class="dmgb"><i style="width:${(100 * v / top).toFixed(1)}%"></i></div><div class="dmgs"><span>${(100 * v / total).toFixed(1)}%</span></div></div></div>`).join('')}</div>`;
}

/** collapsible block for the result screen */
export function dmgDetails(m: Match): string {
  return `<details class="dmgd"><summary>Урон по навыкам <i>▸</i></summary>${dmgTable(m)}</details>` +
    (m.wall ? `<details class="dmgd"><summary>Урон по стене <i>▸</i></summary>${wallTable(m)}</details>` : '');
}
