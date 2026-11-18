// Справочник (81): every number comes from the game tables, so it stays true when the balance changes.
import { HEROES, ELEMENT_NAME, ELEMENT_EFFECT, ENEMIES, BIOMES, SKILLS, SkillId, RUN, FAMILY_NAME, EnemyKind } from '../core/content';
import {
  SLOTS, SLOT_NAME, SETS, SET_NAME, SET_DESC, WEAPON_NAME, SET_FX, RARITIES, RARITY_CAP, RARITY_COLOR, MERGE_RULE, GEM, GEM_TYPES,
  GEM_STAR_EFF, GEM_LOCATIONS, GEM_FREE_PER_DAY, CR_SEARCH, ESS_SMALL, ESS_BIG, RUNES, RuneId, RUNE_TYPE_PL, RUNE_RARITY, RUNE_K, RUNE_UP,
  runeDupes, RUNE_CRAFT, RUNE_CRAFT_TYPE, runeSlots, STAR_PARTICLES, STAR_LEVEL, HERO_UNLOCK_PARTICLES, DUP_PARTICLES, SMALL_COUPON,
  BIG_COUPON, CHESTS, CHEST_X10, ENERGY, IDLE, PRICE, BLESS_RUNES, FAMILY_RUNES, EPIC, LEGEND, MYTHIC, FAMILY_W, HERO_STAT, GEAR_STEP,
  GEM_SLOTS, GEM_LV_BASE, gemSlotsOf,
} from '../meta/defs';
import * as P from '../meta/profile';
import { BALLS, BALL_IDS, HERO_BALL, ENEMY, EnemyId, SPIRITS, SpiritId, COLS, ROWS, stageDef } from '../core/orbContent';
import { RFX, RfxId, RUNE_COMMON, RUNE_REROLL, PLUSBALL_FROM, runeLine } from '../meta/runeDefs';

export interface WikiArticle { icon: string; title: string; body: string }
export interface WikiSection { id: string; icon: string; name: string; items: WikiArticle[] }
export interface WikiArt {
  skill: (id: string) => string; res: (k: string) => string; rune: (r: { fx: RfxId; rarity: number }) => string; item: (slot: typeof SLOTS[number], set: typeof SETS[number], rarity: number) => string;
  hero: (id: string) => string; gem: (t: typeof GEM_TYPES[number], stars: number) => string; chest: () => string; coupon: (big: boolean) => string;
  setIcon: (s: typeof SETS[number]) => string; loc: (i: number) => string;
}

const pc = (v: number) => `${+(v * 100).toFixed(2)}%`;
const li = (xs: string[]) => `<ul>${xs.map(x => `<li>${x}</li>`).join('')}</ul>`;
const tbl = (head: string[], rows: (string | number)[][]) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const col = (r: number, t: string) => `<b style="color:${RARITY_COLOR[r]}">${t}</b>`;

/** a ball description sentence by sentence in spans, so each one is translated */
const trSafe = (t: string) => t.split(/(?<=[.!?])\s+/).map(x => `<span>${x}</span>`).join(' ');

export function wikiSections(A: WikiArt): WikiSection[] {
  const skills = (Object.keys(SKILLS) as SkillId[]);
  const elemSkills = skills.filter(k => SKILLS[k].kind === 'element'), others = skills.filter(k => SKILLS[k].kind !== 'element');
  const enemyKinds = (Object.keys(ENEMIES) as EnemyKind[]).filter(k => k !== 'bear'); // the event bear is a 3D model, not in the bestiary
  return [
    // Ш89: the help is about the ball game now (it still described the old one: a 5-minute run, a joystick, arrows)
    {
      id: 'battle', icon: A.res('energy'), name: 'Бой', items: [
        { icon: A.res('energy'), title: 'Ход', body: `<span>Поле — ${COLS} × ${ROWS} клеток, враги идут сверху к стене.</span> <span>Целься пальцем и отпусти — герой выпускает залп шаров.</span> <span>Шары отскакивают от краёв поля и от врагов.</span> <span>Когда все шары вернулись, враги делают шаг к стене.</span> <span>Если ход затянулся, бой сам ускоряется: через 5 с ×2, через 10 с ×3.</span>` },
        { icon: A.chest(), title: 'Стена и победа', body: `<span>Враг у стены бьёт её каждый ход.</span> <span>Стена разрушена — поражение.</span> <span>На ${stageDef(1).miniAt.join(' / ')}-м ходу приходит минибосс, на ${stageDef(1).turns}-м — босс этапа.</span> <span>Убей босса — этап пройден.</span> <span>Каждый следующий этап — враги крепче.</span>` },
        { icon: A.res('energy'), title: 'Энергия', body: `<span>Бой стоит ${ENERGY.run} энергии.</span> <span>Энергия копится до ${ENERGY.max}, +1 каждые ${ENERGY.regenSec / 60} минут.</span>` },
        { icon: A.res('particles'), title: 'Уровни забега', body: `<span>Убитые враги дают опыт забега.</span> <span>Новый уровень — выбор из 3 карт: новый особый шар (до 4), уровень шара (до 3-го), +1 обычный шар, «Сила Олимпа» или починка стены.</span> <span>Шар своего героя есть с начала забега.</span>` },
        { icon: A.res('gold'), title: 'Награды', body: `<span>Победа: золото, свитки, осколки рун, карты двух случайных шаров, частички духа, камни стены, опыт героя и сундук этапа.</span> <span>Первая победа на этапе — всегда предмет снаряжения.</span> <span>Поражение — часть награды по пройденному пути.</span>` },
      ],
    },
    {
      id: 'skills', icon: `<img class="wki" src="orb/ball/fire.webp" alt="">`, name: 'Шары', items: [
        { icon: `<img class="wki" src="orb/ball/normal.webp" alt="">`, title: 'Книги шаров', body: `<span>Каждый шар — книга во вкладке «Шары».</span> <span>Книга растёт за карты шара и золото.</span> <span>Каждое улучшение любой книги прибавляет общий крит-урон всех шаров.</span>` },
        ...BALL_IDS.map(b => ({ icon: `<img class="wki" src="orb/ball/${b}.webp" alt="">`, title: BALLS[b].name, body: trSafe(BALLS[b].desc(1)) })),
      ],
    },
    {
      id: 'spirits', icon: `<img class="wki" src="orb/spirit/fire1f.webp" alt="">`, name: 'Духи', items: [
        ...(Object.keys(SPIRITS) as SpiritId[]).map(id => ({ icon: `<img class="wki" src="orb/spirit/${id}1f.webp" alt="">`, title: SPIRITS[id].name, body: SPIRITS[id].desc })),
      ],
    },
    {
      id: 'heroes', icon: A.hero(HEROES[0].id), name: 'Герои', items: [
        { icon: A.res('particles'), title: 'Звёзды и частицы', body: `Новый герой открывается за ${HERO_UNLOCK_PARTICLES} частиц. Звезда героя стоит частиц и требует уровня:` + tbl(['★', 'частиц', 'уровень'], STAR_PARTICLES.map((x, i) => [i + 1, x, STAR_LEVEL[i]])) + `★1–5: эффект стрелы +20% за звезду. ★6–10: урон своей стихии +5% за звезду. Слоты рун: 2 + звёзды (максимум 6).` },
        { icon: A.res('energy'), title: 'Атака и здоровье', body: `Герой 1-го уровня: атака ${HERO_STAT.atk}, здоровье ${HERO_STAT.hp} — это и есть здоровье в бою. Каждый уровень героя: атака +${HERO_STAT.atkLv}, здоровье +${HERO_STAT.hpLv}. Снаряжение и гемы прибавляют числа: оружие, амулет, кольцо и рубин — атаку; мантия, перчатки, сапоги и изумруд — здоровье. Сверху — проценты от всей суммы: комплекты и руны «Атака» и «Здоровье героя». Топаз прибавляет здоровье стены, сапфир — броню стены. Атака ${HERO_STAT.atk * 2} — навыки бьют вдвое сильнее, чем при ${HERO_STAT.atk}.` },
        { icon: A.coupon(true), title: 'Поиск героев', body: `Малый купон: герой с шансом ${pc(SMALL_COUPON.hero)}, иначе ${SMALL_COUPON.particles} частиц. Средний купон (${BIG_COUPON.price}💎): герой ${pc(BIG_COUPON.hero)}, иначе ${BIG_COUPON.particles} частиц, гарантия героя за ${BIG_COUPON.pity} купонов. Уже открытый герой даёт ${DUP_PARTICLES} частиц. «Герой дня» выпадает в 5 раз чаще.` },
        ...HEROES.map(h => ({ icon: A.hero(h.id), title: h.name, body: `<span>Шар героя</span>: <b>${BALLS[HERO_BALL[h.id]]?.name ?? ''}</b>` })),
      ],
    },
    {
      id: 'gear', icon: A.item('book', 'guard', 2), name: 'Снаряжение', items: [
        { icon: A.item('mantle', 'guard', 1), title: 'Слоты', body: `<p>${SLOTS.map(s => `<b>${SLOT_NAME[s]}</b>`).join(' · ')}</p><p>Оружие у каждого комплекта своё:</p>` + li(SETS.map(s => `<b>${SET_NAME[s]}</b> — <span>${WEAPON_NAME[s]}</span>`)) + `<p>Без оружия в бой нельзя. Оружие, амулет и кольцо дают атаку, мантия, перчатки и сапоги — здоровье; растёт с уровнем и редкостью. Кроме оружия, у предмета есть вторая строка от комплекта: Лес — защита, Солнце — скорость и скорость атаки, Пустота — шанс крита.</p>` },
        ...SETS.map(s => ({ icon: A.setIcon(s), title: `Комплект «${SET_NAME[s]}»`, body: `Главное: ${SET_DESC[s].main}.` + li([`2 предмета: ${SET_DESC[s].b2}`, `4 предмета: ${SET_DESC[s].b4}`, `6 предметов: ${SET_DESC[s].b6}`]) + `Эффекты на эпическом (и сильнее на мифическом):` + li(SLOTS.map(sl => `<b>${SLOT_NAME[sl]}</b> — <b>${SET_FX[s][sl].name}</b>: <span>${SET_FX[s][sl].e}</span><br><small><span>${RARITIES[MYTHIC]}</span>: <span>${SET_FX[s][sl].m}</span></small>`)) })),
        { icon: A.item('gloves', 'berserk', 5), title: 'Редкость и предел уровня', body: tbl(['редкость', 'предел ур.'], RARITIES.map((r, i) => [col(i, r), RARITY_CAP[i]])) + `Каждый шаг что-то открывает: редкое — атака +${GEAR_STEP.rare.atk} или здоровье +${GEAR_STEP.rare.hp}, эпическое — эффект комплекта, легендарное — атака +${GEAR_STEP.legend.atk} или здоровье +${GEAR_STEP.legend.hp}, легендарное +3 — характеристики +20%, мифическое — усиленный эффект. Чем выше редкость, тем больше атаки или здоровья даёт каждый уровень.` },
        { icon: A.item('boots', 'wanderer', 3), title: 'Слияние', body: tbl(['из', 'в', 'нужно'], MERGE_RULE.map((m, i) => [col(i, RARITIES[i]), col(i + 1, RARITIES[i + 1]), `${m.n} × ${RARITIES[m.from].toLowerCase()} ${m.sameSet ? (m.from === i ? '(такой же предмет)' : '(свой комплект)') : '(любой комплект, тот же слот)'}`])) + 'Остаётся самый высокий уровень, потраченное на остальные возвращается на 90%. Кузнец сливает всё отмеченное разом, обычные и редкие отмечены сразу.' },
        { icon: A.res('scrolls'), title: 'Прокачка', body: 'Уровень предмета растёт за золото и свитки до предела редкости. «Сброс уровня» возвращает 90% потраченного.' },
      ],
    },
    {
      id: 'gems', icon: A.gem('ruby', 4), name: 'Гемы', items: [
        // правка 157: what gems fit which item, gems work from level 1; правка 156: the stat in its own node
        { icon: A.gem('emerald', 3), title: 'Гнёзда и виды гемов', body: `<p>В каждом предмете 4 гнезда, они открываются на уровнях предмета ${P.SOCKET_LEVEL.join(' / ')}. Каждый предмет принимает два вида гемов:</p>` + li(SLOTS.map(sl => `<b>${SLOT_NAME[sl]}</b> — ${GEM_SLOTS[sl].map(t => `<span>${GEM[t].name}</span>`).join(' · ')}`)) + `<p>Гем на 1-м уровне даёт ${Math.round(GEM_LV_BASE * 100)}% своей силы, к 100-му — всю. Рубин, изумруд, топаз и сапфир прибавляют числа (атака, здоровье героя, здоровье и броня стены), алмаз и гранат — проценты (шанс крита, крит-урон).</p>` },
        ...GEM_TYPES.map(t => ({ icon: A.gem(t, 3), title: GEM[t].name, body: `<p><b>${GEM[t].stat}</b></p><p>До ${GEM[t].pct ? '+' + pc(GEM[t].max) : P.gemValue({ type: t, stars: 4, level: 100 }).split(' ')[0]} у ★4 на 100-м уровне. Доля от максимума по звёздам: ${GEM_STAR_EFF.slice(1).map((x, i) => `★${i + 1} — ${Math.round(x * 100)}%`).join(', ')}.</p><p>Ставится в: ${gemSlotsOf(t).map(sl => `<b>${SLOT_NAME[sl]}</b>`).join(' · ')}</p>` })),
        { icon: A.loc(0), title: 'Поиск по локациям', body: `Каждый поиск может перевести дальше по цепочке, неудача — назад в Пещеру. Бесплатных поисков в день: ${GEM_FREE_PER_DAY}.` + tbl(['локация', 'цена', '★1', '★2', '★3', 'дальше'], GEM_LOCATIONS.map(l => [l.name, l.cost, pc(l.odds[0]), pc(l.odds[1]), pc(l.odds[2]), l.next ? pc(l.next) : '—'])) + 'Остальное — эссенция для синтеза.' },
        { icon: A.loc(3), title: '«Сразу в Руины»', body: `${CR_SEARCH.cost}💎: ★1 ${pc(CR_SEARCH.odds[0])}, ★2 ${pc(CR_SEARCH.odds[1])}, ★3 ${pc(CR_SEARCH.odds[2])}, ★4 ${pc(CR_SEARCH.odds[3])}. Гарантия ★3 за ${CR_SEARCH.pity}, ★4 за ${CR_SEARCH.pity4} поисков. ★4 бывают только здесь, в календаре входа, батл пассе и событиях.` },
        { icon: A.res('essBig'), title: 'Синтез', body: `Уровень гема растёт, если скормить ему другие гемы или эссенцию: малая — ${ESS_SMALL} опыта, большая — ${ESS_BIG}. Гемы вставляются в 4 гнезда предмета, гнёзда открываются на уровнях предмета 1 / 20 / 40 / 60. Вынуть гем — бесплатно.` },
      ],
    },
    {
      id: 'runes', icon: A.rune({ fx: 'critdmg', rarity: 5 }), name: 'Руны', items: [
        { icon: A.rune({ fx: 'crit', rarity: 2 }), title: 'Как устроены руны', body: `<p><span>У каждого из 6 предметов снаряжения — своё гнездо руны.</span> <span>Руна принадлежит одному слоту, её эффект выпадает случайно из списка этого слота (все с равным шансом): ${RUNE_COMMON.length - 1} общих эффектов и особая строка слота.</span> <span>Эффект «+1 обычный шар» бывает только у легендарных и мифических рун.</span> <span>Руна остаётся в гнезде, когда меняешь предмет.</span> <span>Одинаковые эффекты складываются, «+1 обычный шар» — не больше одного.</span></p><p>Сила руны по редкости:</p>` + li(RUNE_K.map((k, i) => `<span>${RUNE_RARITY[i]}</span> <b>×${k}</b>`)) },
        { icon: A.res('shards'), title: 'Осколки рун', body: '<p>Улучшение:</p>' + li(RUNE_UP.map((x, i) => `<span>${RUNE_RARITY[i]}</span> <b>${x}</b>`)) + '<p>Переброс эффекта, новый эффект всегда другой:</p>' + li(RUNE_REROLL.map((x, i) => `<span>${RUNE_RARITY[i]}</span> <b>${x}</b>`)) + `<p><span>Создать: случайного слота — ${RUNE_CRAFT}, выбранного слота — ${RUNE_CRAFT_TYPE} осколков.</span> <span>Разбор возвращает половину.</span></p>` },
        ...(Object.keys(RFX) as RfxId[]).map(fx => ({ icon: A.rune({ fx, rarity: MYTHIC }), title: RFX[fx].short, body: `<p>${runeLine(fx, 0)} (обычная) … ${runeLine(fx, MYTHIC)} (мифическая)</p>${RFX[fx].unique ? `<p>Особая строка слота «${SLOT_NAME[RFX[fx].unique!]}»</p>` : ''}` })),
      ],
    },
    {
      id: 'enemies', icon: A.loc(2), name: 'Враги', items: [
        ...[...new Map((Object.keys(ENEMY) as EnemyId[]).map(k => [ENEMY[k].name, k])).values()].map(k => ({ icon: `<img class="wki" src="orb/en/stone_${ENEMY[k].art}.webp" alt="" onerror="this.style.display='none'">`, title: ENEMY[k].name,
          body: `<span>Здоровье ×${ENEMY[k].hp}</span>, <span>урон ×${ENEMY[k].atk}</span>, <span>шаг ${ENEMY[k].step}</span>` })),
      ],
    },
    {
      id: 'shop', icon: A.chest(), name: 'Магазин и награды', items: [
        ...(Object.keys(CHESTS) as (keyof typeof CHESTS)[]).map(id => ({ icon: A.chest(), title: CHESTS[id].name, body: `${CHESTS[id].desc}. Цена ${CHESTS[id].price}💎, ×10 — по цене ${CHEST_X10}.${CHESTS[id].pity ? ` Гарантия: ${(id === 'runes' ? RUNE_RARITY : RARITIES)[CHESTS[id].pity!.rarity].toLowerCase()} не реже чем раз в ${CHESTS[id].pity!.every}.` : ''}` })),
        { icon: A.skill('pGold'), title: 'Батл пасс', body: `${P.BP.levels} уровней, ${P.BP.perLevel} очков на уровень, сезон ${P.BP.days} дней. Очки дают ежедневные и еженедельные задания. Пропуск (${P.BP.usd}) открывает вторую дорожку наград.` },
        ...P.PASSES.map(x => ({ icon: A.res('gold'), title: x.name, body: `${x.usd}. ${x.perks.join('. ')}.` })),
        { icon: A.res('scrolls'), title: 'Задания', body: 'Ежедневные:' + li(P.DAILY.map(t => `${t.text} — ${t.pts} очков`)) + 'Сундуки дня: ' + P.DAILY_CHESTS.map(c => `${c.at} — ${c.label}`).join(', ') + '. Еженедельные:' + li(P.WEEKLY.map(t => `${t.text} — ${t.pts} очков`)) + 'Сундуки недели: ' + P.WEEKLY_CHESTS.map(c => `${c.at} — ${c.label}`).join(', ') + '.' },
        { icon: A.res('particles'), title: 'Календарь входа', body: '28 дней наград за вход. Пропуск дня прогресс не сбрасывает. На 7-й, 14-й, 21-й и 28-й день — особые награды (средний купон, гемы, частицы героя дня).' },
        { icon: A.res('gold'), title: 'Колесо фортуны', body: `Улучшенное колесо: одно бесплатное вращение в день, дальше ${P.WHEELS.adv.price}💎 (×10 — ${P.WHEELS.adv.price10}💎). Супер колесо: ${P.WHEELS.super.price}💎 (×10 — ${P.WHEELS.super.price10}💎).` },
        { icon: A.res('essBig'), title: 'Чёрный рынок', body: 'День: бесплатный подарок и 5 скидок, обновляется в 00:00. Неделя и месяц: наборы с выбором комплекта, стихии или героя. Всегда в продаже: купоны, свитки, золото, эссенции, энергия.' },
        { icon: A.chest(), title: 'Сундук накопления', body: `Копит золото, свитки и шанс гема, пока тебя нет — до ${IDLE.capH} часов. Быстрый сбор даёт сразу ${IDLE.fastH} часа: бесплатно, за энергию или кристаллы.` },
        { icon: A.res('energy'), title: 'Цены', body: tbl(['что', 'цена'], [['100 свитков', `${PRICE.scrolls100}💎`], ['100 000 золота', `${PRICE.gold100k}💎`], ['Большая эссенция', `${PRICE.essBig}💎`], ['Малая эссенция', `${PRICE.essSmall}💎`], ['30 энергии', `${PRICE.energy30}💎`], ['Средний купон', `${BIG_COUPON.price}💎`]]) + 'Перед тратой кристаллов игра спрашивает подтверждение — это выключается в Настройках.' },
      ],
    },
  ];
}
