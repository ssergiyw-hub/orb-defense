// Orb Defense: the new menu screens — balls (books on shelves, правка Ш5), the ball card (open book, Ш6),
// the spirit tavern (Ш16–Ш18) and the walls (Ш15, Ш19).
import * as P from '../meta/profile';
import * as OM from '../meta/orbMeta';
import { trS } from './i18n';
import { BALLS, BALL_IDS, BallId, elemHit, SPIRITS, SPIRIT_IDS, SpiritId, spiritEvery, WALLS, WALL_IDS, WallId, lookOf, RARITY_NAME, RARITY_COLOR } from '../core/orbContent';

const every = (n: number) => n === 1 ? 'Срабатывает каждый ход' : n >= 5 ? `Срабатывает раз в ${n} ходов` : `Срабатывает раз в ${n} хода`;
const book = (b: BallId) => `orb/book/${BALLS[b].book}.webp`;
const pct = (v: number) => (Math.round(v * 1000) / 10) + '%';
const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n);
const rar = (r: number) => `<span class="orar" style="--c:${RARITY_COLOR[r]}">${RARITY_NAME[r]}</span>`;
const spiritPic = (s: SpiritId, lv: number, side = 'f') => `orb/spirit/${s}${lookOf(OM.rarityOf(lv))}${side}.webp`;
const wallPic = (w: WallId, lv: number) => `orb/wall/${w === 'start' ? 'start' : w + lookOf(OM.rarityOf(lv))}.webp`;

export function spiritBtnPic(p: P.Profile): string {
  const o = OM.orb(p), s = o.spirit && o.spirits[o.spirit].owned ? o.spirit : null;
  return s ? `<span class="obpic" style="background-image:url(${spiritPic(s, o.spirits[s].lv)})"></span>` : '<i>✨</i>';
}
/** Ш48: the chosen spirit floats in the temple, alive (bob, sway, breath, rarity aura, its element's sparks, a flash now and
 *  then); a tap opens the tavern. With no spirit — a faint silhouette «Призови духа» */
export function spiritFloat(p: P.Profile): string {
  const o = OM.orb(p), s = o.spirit && o.spirits[o.spirit].owned ? o.spirit : null;
  if (!s) return `<button class="osfloat none" data-a="o:spirits"><span class="osbody"><img src="${spiritPic('healer', 1)}" alt=""></span><small>Призови духа</small></button>`;
  const lv = o.spirits[s].lv, r = OM.rarityOf(lv);
  const parts = Array.from({ length: 8 }, (_, i) => `<i style="--i:${i};--x:${((i * 37) % 9 - 4) * 5}px;--d:${(i * 0.43).toFixed(2)}s"></i>`).join('');
  return `<button class="osfloat" data-a="o:spirits" style="--c:${SPIRITS[s].color};--q:${RARITY_COLOR[r]}" aria-label="${SPIRITS[s].name}">
    <span class="osaura"></span><span class="ospart">${parts}</span><span class="osbody"><img src="${spiritPic(s, lv)}" alt=""></span><i class="osflash"></i></button>`;
}
/** Ш47: the 7th equipment cell — the current wall in its rarity frame; a tap opens the walls window (no runes, no gems) */
export function wallSlot(p: P.Profile): string {
  const o = OM.orb(p), lv = o.walls[o.wall].lv, r = OM.rarityOf(lv), start = o.wall === 'start';
  return `<button class="gslotcard owslot" data-a="o:walls" style="--r:${start ? '#b89a5a' : RARITY_COLOR[r]}">${start ? '' : `<span class="lv">Ур. ${lv}</span>`}<span class="owimg" style="background-image:url(${wallPic(o.wall, lv)})"></span><small>Стена</small></button>`;
}
export function wallBtnPic(p: P.Profile): string { const o = OM.orb(p); return `<span class="obpic obwall" style="background-image:url(${wallPic(o.wall, o.walls[o.wall].lv)})"></span>`; }

/** the «Шары» tab: books on shelves, 3 in a row */
export function orbBalls(p: P.Profile): string {
  const o = OM.orb(p), crit = OM.ballCritTotal(p);
  const cards = BALL_IDS.map(b => {
    const x = o.balls[b], c = OM.ballCost(x.lv), ready = x.cards >= c.cards;
    return `<button class="obook${ready ? ' ready' : ''}" data-a="o:ball" data-v="${b}" style="--c:${BALLS[b].color}">
      <span class="obname">${BALLS[b].name}</span><img src="${book(b)}" alt=""><img class="obico" src="orb/ball/${b}.webp" alt=""><span class="oblv">Ур. ${x.lv}</span>
      <span class="obcards"><i style="width:${Math.min(100, 100 * x.cards / c.cards).toFixed(0)}%"></i><em>${x.cards}/${c.cards}</em></span></button>`;
  }).join('');
  return `<div class="oballs"><div class="ocrit"><b>Общий крит-урон шаров</b><span>+${pct(crit)}</span><small>растёт от улучшения любого шара</small></div>
    <div class="oshelf">${cards}</div></div>`;
}

export function orbModal(p: P.Profile, om: { kind: 'ball' | 'spirits' | 'walls'; id?: string }): string {
  if (om.kind === 'ball') return ballModal(p, (om.id as BallId) ?? 'fire');
  if (om.kind === 'spirits') return spiritsModal(p);
  return wallsModal(p);
}

function ballModal(p: P.Profile, b: BallId): string {
  const o = OM.orb(p), x = o.balls[b], c = OM.ballCost(x.lv), i = BALL_IDS.indexOf(b);
  const prev = BALL_IDS[(i + BALL_IDS.length - 1) % BALL_IDS.length], next = BALL_IDS[(i + 1) % BALL_IDS.length];
  const hit = elemHit(x.lv), hitN = elemHit(x.lv + 1);
  const okC = x.cards >= c.cards, okG = p.gold >= c.gold;
  const heroName = { prometheus: 'Гестия', skadi: 'Борей', apollo: 'Аполлон', hades: 'Геката', hydra: 'Медуза', perun: 'Зевс', heracles: 'Геракл', stribog: 'Ника', poseidon: 'Посейдон', veles: 'Деметра' }[BALLS[b].hero] ?? '';
  return `<div class="modal obmodal" data-a="close"><div class="mbox obm" style="--c:${BALLS[b].color}">
    <button class="x" data-a="close">✕</button>
    <div class="obribbon"><b>${BALLS[b].name}</b></div>
    <div class="obtop"><button class="obnav" data-a="o:ball" data-v="${prev}">‹</button>
      <div class="obbig"><img src="${book(b)}" alt=""><span>Ур. ${x.lv}</span></div>
      <button class="obnav" data-a="o:ball" data-v="${next}">›</button></div>
    <div class="obpage">
      <div class="obplate">Крит-урон всех шаров <b>+${pct(OM.ballCritStep(x.lv + 1))}</b> за улучшение</div>
      <div class="obdesc"><b>Описание</b><p>${trS(BALLS[b].desc(1))}</p></div>
      <div class="obstats">
        <div><span>Удар стихией</span><b>${pct(hit)} атаки <i>+${pct(hitN - hit)}</i></b></div>
        <div><span>На 3-м уровне в забеге</span><b>${pct(hit * 1.6)} атаки</b></div>
      </div>
      <small class="obhero">${trS(`Шар героя: ${heroName}. В забеге качается до 3-го уровня`)}</small>
      <div class="obcost"><span class="${okC ? 'ok' : 'no'}">🂠 ${x.cards}/${c.cards}</span><span class="${okG ? 'ok' : 'no'}">🪙 ${fmt(p.gold)}/${fmt(c.gold)}</span></div>
      <div class="obbtns"><button class="btn obback" data-a="close">Назад</button><button class="btn obup" data-a="o:ballUp" data-v="${b}" ${okC && okG ? '' : 'disabled'}>Улучшить</button></div>
    </div></div></div>`;
}

function spiritsModal(p: P.Profile): string {
  const o = OM.orb(p);
  const rows = SPIRIT_IDS.map(s => {
    const x = o.spirits[s], r = OM.rarityOf(x.lv), cost = OM.spiritCost(x.lv), use = o.spirit === s;
    const btn = !x.owned
      ? `<button class="btn ${o.spiritShards >= OM.SPIRIT_OPEN ? 'big2' : ''}" data-a="o:spOpen" data-v="${s}" ${o.spiritShards >= OM.SPIRIT_OPEN ? '' : 'disabled'}>Открыть · ✨${OM.SPIRIT_OPEN}</button>`
      : `${use ? '<span class="ouse">в бою</span>' : `<button class="btn" data-a="o:spUse" data-v="${s}">Взять в бой</button>`}<button class="btn ${o.spiritShards >= cost ? 'big2' : ''}" data-a="o:spUp" data-v="${s}" ${o.spiritShards >= cost && x.lv < OM.MAX_LV ? '' : 'disabled'}>Усилить · ✨${cost}</button>`;
    return `<div class="orow${use ? ' on' : ''}${x.owned ? '' : ' locked'}" style="--c:${SPIRITS[s].color}">
      <img class="opic" src="${spiritPic(s, x.lv)}" alt="">
      <div class="otxt"><b>${SPIRITS[s].name}</b>${x.owned ? `<span>ур. ${x.lv} · ${rar(r)}</span>` : '<span>не открыт</span>'}
        <small>${trS(`${SPIRITS[s].desc}. ${every(spiritEvery(r))}. Атака — 20% атаки героя`)}</small>
        <div class="obtns2">${btn}</div></div></div>`;
  }).join('');
  return `<div class="modal" data-a="close"><div class="mbox owin"><div class="mhead"><div><b>Таверна духов</b><div class="muted small">${trS('Частички духа падают за этапы. Каждые 3 уровня — новая редкость')}</div></div><button class="x" data-a="close">✕</button></div>
    <div class="ores">✨ Частички духа: <b>${o.spiritShards}</b></div><div class="olist">${rows}</div></div></div>`;
}

function wallsModal(p: P.Profile): string {
  const o = OM.orb(p), ws = OM.wallStats(p);
  const rows = WALL_IDS.map(w => {
    const x = o.walls[w], r = w === 'start' ? 0 : OM.rarityOf(x.lv), cost = OM.wallCost(x.lv), use = o.wall === w;
    const btn = !x.owned
      ? `<button class="btn ${p.crystals >= OM.WALL_PRICE[w] ? 'big2' : ''}" data-a="o:wlBuy" data-v="${w}" ${p.crystals >= OM.WALL_PRICE[w] ? '' : 'disabled'}>Купить · 💎${OM.WALL_PRICE[w]}</button>`
      : `${use ? '<span class="ouse">✓ Установлена</span>' : `<button class="btn" data-a="o:wlUse" data-v="${w}">Поставить</button>`}${w === 'start' ? '' : `<button class="btn ${o.wallStones >= cost ? 'big2' : ''}" data-a="o:wlUp" data-v="${w}" ${o.wallStones >= cost && x.lv < OM.MAX_LV ? '' : 'disabled'}>Укрепить · 🧱${cost}</button>`}`;
    return `<div class="orow wrow${use ? ' on' : ''}${x.owned ? '' : ' locked'}">
      <img class="wpic" src="${wallPic(w, x.lv)}" alt="">
      <div class="otxt"><b>${WALLS[w].name}</b>${w === 'start' ? '' : `<span>ур. ${x.lv} · ${rar(r)}</span>`}<small>${trS(WALLS[w].desc(r))}</small>
        <div class="obtns2">${btn}</div></div></div>`;
  }).join('');
  return `<div class="modal" data-a="close"><div class="mbox owin"><div class="mhead"><div><b>Стены</b><div class="muted small">Покупка — за кристаллы, укрепление — камнями стены (бои и батл пасс)</div></div><button class="x" data-a="close">✕</button></div>
    <div class="ores">🧱 Камни стены: <b>${o.wallStones}</b> · 💎 ${p.crystals}</div>
    <div class="owst"><span>❤️ Здоровье стены в бою: <b>${fmt(ws.hp)}</b></span><span>🛡 Броня: <b>${ws.armor}</b></span><small>${trS('Здоровье растёт от уровня стены, топазов и рун «Здоровье стены». Броня — от сапфиров: гасит часть каждого удара врага, но удар не меньше 1 и не слабее половины')}</small></div>
    <div class="olist">${rows}</div></div></div>`;
}
