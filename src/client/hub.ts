// Hub: first entry, main screen (portal), hero (characters / gear / runes), jeweler (search / gems),
// shop (daily / chests / top-up), events, wheel of fortune, reward pop-up.
// Plain DOM; every button carries data-a="action" and data-v="value".
import { HEROES, ELEMENT_NAME, ELEMENT_EFFECT, Element, SkillId, WALL, WALL_MAPS, EVENT, EventId, stageMul } from '../core/content';
import {
  GEM, GEM_TYPES, GemType, RARITIES, RARITY_CAP, RARITY_COLOR, SLOTS, SLOT_ICON, SLOT_NAME, SETS, SET_NAME,
  SET_DESC, WEAPON_NAME, SET_COLOR, CHESTS as CHEST_DEFS, Slot, SetId, levelCost, STAR_PARTICLES, STAR_LEVEL, heroXpFor, runeSlots, RUNE_RARITY, RUNE_CRAFT, RUNE_CRAFT_TYPE, RUNE_UP,
  PRICE, BIG_COUPON, CHESTS, CHEST_X10, ChestId, HERO_UNLOCK_PARTICLES, CR_SEARCH, ENERGY, IDLE, gemXpFor, GEM_STAR_EFF,
  GEM_LOCATIONS, GEM_FREE_PER_DAY, R_TIER, R_PLUS, MYTHIC, gearLines, RUNES, RUNE_TYPES, RUNE_TYPE_NAME, RUNE_TYPE_PL, RUNE_SLOT_TYPE, RuneType,
  runeDupes, runeWorth, runeTier, SET_FX, GEAR_MAIN, HERO_STAT, EPIC, GEM_SLOTS, gemSlotsOf,
} from '../meta/defs';
import { runeStone, STONE_SHAPE } from './runeArt';
import { couponSvg, sparksHtml } from './uiArt';
import { ICONS } from './iconImages';
import { wikiSections, WikiSection } from './wiki';
import * as P from '../meta/profile';
import * as OM from '../meta/orbMeta';
import { orbBalls, orbModal, spiritBtnPic, wallBtnPic } from './orbHub';
import { BIOME_NAME, stageBiome, BALLS, HERO_BALL } from '../core/orbContent';
import type { BallId, SpiritId, WallId } from '../core/orbContent';
import * as cloud from './cloud';
import * as sfx from './sfx';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { showRewardAd } from './ads';
/** правка 159: actions that spend currency on something — they get the coin sound */
const BUY_ACTS = new Set(['buy', 'offer', 'mBuy', 'chest', 'buyCoupon', 'bpBuy', 'passBuy']);
import { GEM_IMG } from './gemImages';
import { STONE, LAVA, PORTAL_BG } from './uiImages';
import { UI2 } from './ui2Images';
import { EL_BG } from './heroArtImages';
import { ITEM_IMG } from './itemImages';
import { heroPic , hasHeroImg } from './art';
import { LANGS, LANG_WORD, lang as curLang, setLang, Lang, tr, trS } from './i18n';

type Screen = 'start' | 'hub' | 'hero' | 'jewel' | 'shop' | 'events' | 'settings' | 'balls';
type HeroSub = 'chars' | 'gear' | 'runes';
/** rank letter of a rarity step with its +1/+2/+3 */
/** frame colours of wheel prizes by tier */
const PRIZE_COLOR = ['#9aa0b8', '#4ea3ff', '#b46cff', '#ffb43a'];
/** gem frame colours by stars: ★1 brown-grey, ★2 blue, ★3 purple, ★4 gold */
const STAR_COLOR = ['', '#9a8a70', '#4ea3ff', '#b46cff', '#ffb43a'];

/** metal corner brackets with a gem, for the shop chest cards (82) */
const CORNER = `<svg viewBox="0 0 48 48"><path d="M3 3H40L32 11H11V32L3 40Z" fill="var(--cm)" stroke="#0c0908" stroke-width="2.5" stroke-linejoin="round"/><path d="M3 3H40L32 11H11V32L3 40Z" fill="url(#crnShine)"/>
  <path d="M7 7H31M7 7V31" stroke="#ffffff40" stroke-width="1.6" stroke-linecap="round"/><path d="M14 14H26M14 14V26" stroke="#0c0908" stroke-width="1.2" opacity=".6"/>
  <path d="M12 4L20 12L12 20L4 12Z" fill="var(--gm)" stroke="#0c0908" stroke-width="2"/><path d="M12 7L17 12L12 12Z" fill="#ffffff90"/></svg>`;
const CORNERS = ['tl', 'tr', 'bl', 'br'].map(k => `<i class="cor ${k}">${CORNER}</i>`).join('');
/** painted resource icon; cls ri = sized by the font around it */
/** правка 202: icons of letter rewards */
const MAIL_RES: Record<P.MailKey, () => string> = {
  gold: () => resImg('gold'), crystals: () => GEM_ICON, scrolls: () => resImg('scrolls'), shards: () => resImg('shards'), energy: () => resImg('energy'),
  essSmall: () => resImg('essSmall'), essBig: () => resImg('essBig'), couponsSmall: () => couponSvg(false, 30), couponsBig: () => couponSvg(true, 30),
};
/** правка 202: envelope with a wax seal for the mail button */
const MAIL_ICON = `<svg class="mailico" viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="23" rx="3" fill="#e9d6a8" stroke="#5a3b1a" stroke-width="2"/><path d="M5 11l15 12 15-12" fill="none" stroke="#5a3b1a" stroke-width="2"/><circle cx="20" cy="23" r="5" fill="#c0262d" stroke="#6a0c10" stroke-width="1.5"/><path d="M18 23h4M20 21v4" stroke="#ffd0b0" stroke-width="1.2"/></svg>`;
const RES_OF: Record<string, string> = { '📜': 'scrolls', '✨': 'essSmall', '💠': 'essBig', '⚡': 'energy', 'ᚱ': 'shards', '🔮': 'shards', '🧩': 'particles', '🪙': 'gold' };
export const resImg = (k: string, cls = 'ri') => `<img class="${cls}" src="${ICONS['res_' + k]}" alt="" draggable="false">`;
/** painted skill icon: the skill rune's shield, or the plain sign for arrow skills, passives and the ultimate */
export const skillPic = (id: string, cls = 'skp'): string | undefined => { const u = ICONS['s_' + id] ?? ICONS['p_' + id]; return u ? `<img class="${cls}" src="${u}" alt="" draggable="false">` : undefined; };
const COIN = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f7c531" stroke="#a8740a" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#c98f12" stroke-width="1.6"/><path d="M8 7 Q10 5 13 6" stroke="#fff6c8" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
const GEM_ICON = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 13L2 9z" fill="#36b4ff" stroke="#0b5f9e" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 9h20M8 3l4 6 4-6M12 9v13" stroke="#9be0ff" stroke-width="1.2" fill="none"/></svg>';

export const EL_HEX: Record<Element, string> = {
  fire: '#ff7a2f', ice: '#7fd6ff', nature: '#5fbf4a', light: '#ffe45c', dark: '#8a5cd6',
  lightning: '#c9f0ff', water: '#3d8fe0', phys: '#c9c9c9', air: '#e8f6ff', poison: '#9be04a',
};
const EL_SYM: Record<Element, string> = {
  fire: '🔥', ice: '❄️', nature: '🌿', light: '☀️', dark: '🌑', lightning: '⚡', water: '💧', phys: '⚔️', air: '🌪️', poison: '☠️',
};
export const SKILL_ICON: Record<SkillId | 'ult', string> = {
  arrow: '🏹', multi: '🎯', double: '⏩', fireball: '🔥', iceShards: '❄️', natureAura: '🍃', lightBeam: '☀️', darkOrbs: '🌑',
  chain: '⚡', waterJet: '💧', boomerang: '🪃', wind: '🌪️', poisonFlask: '🧪', poisonAura: '☣️', fireOrbs: '☄️', iceOrbs: '💠', boltOrbs: '🌩️', meteor: '🌠', sprites: '✨', pDmg: '⚔️', pHp: '❤️', pDef: '🛡️',
  pSpeed: '👟', pPickup: '🧲', pXp: '📘', pVamp: '🩸', pGold: '🪙', ult: '🌟',
};

const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? Math.floor(n / 1000) + 'k' : String(Math.floor(n));
const sp3 = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // правка 173: 14 000
const pct = (v: number) => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
const hero = (id: string) => HEROES.find(h => h.id === id)!;

/** fairy-tale chest: 0 empty (closed), 1 half (lid ajar, coins glint), 2 full (open, overflowing, glowing) */
/** iron-bound wooden chest: 0 closed and dull, 1 lid ajar with a few coins, 2 wide open, heaped with gold */
/** round stone the hero stands on; runes on its rim glow with the element colour */
const PEDESTAL = `<svg class="pedestal" viewBox="0 0 200 70"><defs>
  <linearGradient id="pdtop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a5c50"/><stop offset="1" stop-color="#3a3029"/></linearGradient>
  <linearGradient id="pdside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3029"/><stop offset="1" stop-color="#16110e"/></linearGradient>
  <radialGradient id="pdglow"><stop offset="0" stop-color="var(--c)" stop-opacity=".55"/><stop offset="1" stop-color="var(--c)" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="100" cy="40" rx="98" ry="28" fill="url(#pdglow)" class="pdg"/>
  <path d="M14 30 Q14 54 100 56 Q186 54 186 30 L186 42 Q186 66 100 68 Q14 66 14 42Z" fill="url(#pdside)" stroke="#0c0908" stroke-width="2"/>
  <ellipse cx="100" cy="30" rx="86" ry="22" fill="url(#pdtop)" stroke="#0c0908" stroke-width="2"/>
  <ellipse cx="100" cy="30" rx="70" ry="16" fill="none" stroke="#2a221c" stroke-width="2"/>
  <path d="M44 40l4-6M58 45l2-7l3 4M80 49v-7M100 50l-3-6h6M120 49v-7l3 3M142 45l-2-7M156 40l-4-6M40 22l5 2M160 22l-5 2M70 13l2 4M130 13l-2 4" stroke="var(--c)" stroke-width="2.2" stroke-linecap="round" fill="none" class="pdr"/>
  <path d="M30 26 Q60 12 100 11" stroke="#ffffff22" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;

/** правки 109, 110: the temple — one picture with a stone dais built into the floor; the hero stands on its top plate
 *  (feet at the rune circle, 50% / 66.5% of the picture), a soft shadow under the feet, the floor runes pulse, the
 *  braziers flicker. The same picture serves all three tabs; «Персонажи» shows it closer (CSS --z) */
const FIRES: [number, number, number][] = [[18.4, 52.6, 1], [81.8, 52.6, 1], [30.8, 49.6, 0.6], [68.9, 49.6, 0.6]];
const templeBg = (heroHtml: string): string => `<div class="hbg"><i class="dglow" aria-hidden="true"></i>${FIRES.map(([x, y, k], n) =>
  `<i class="fire${n > 1 ? ' far' : ''}" style="left:${x}%;top:${y}%;--k:${k}" aria-hidden="true"><s></s><b>${'<i></i>'.repeat(n > 1 ? 3 : 6)}</b></i>`).join('')}
  <span class="hstand">${heroHtml}</span></div>`;

const CHEV = (d: number) => `<svg viewBox="0 0 24 24" class="chev"><path d="${d < 0 ? 'M15 4 L7 12 L15 20' : 'M9 4 L17 12 L9 20'}" fill="none" stroke="#ff9a2a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${d < 0 ? 'M15 4 L7 12 L15 20' : 'M9 4 L17 12 L9 20'}" fill="none" stroke="#ffe08a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** правка 108: the +step (epic / legendary) as a small round gold-rimmed emblem in the tile corner; mythic has no step */
function plusFrame(rarity: number, cls = ''): string {
  return R_PLUS[rarity] ? `<i class="pstep${cls}" aria-hidden="true"><b>${R_PLUS[rarity]}</b></i>` : '';
}

/** inventory grids (правка 96): fill the last row with empty stone sockets, at least 4 rows */
function padCells(cells: string[], cols = 5, min = 20): string[] {
  const out = cells.slice();
  while (out.length < min || out.length % cols) out.push('<span class="isock" aria-hidden="true"></span>');
  return out;
}

/** portal colour of a stage: meadow green, desert red, every fifth stage blue */
export function portalColor(n: number): 'green' | 'red' | 'blue' { void n; return 'green'; } // Orb Defense (Ш12): the portal is always emerald

/** rune chest of dark stone (Meshy, правка 89): 0 closed, 1 light in the seam, 2 open with gold */
export function chestSvg(state: number, size = 74): string {
  return `<img class="chestimg st${state}" src="${UI2['chest' + Math.max(0, Math.min(2, state))]}" style="width:${size}px" alt="" draggable="false">`;
}



/** bottom tab icons, drawn in the same chunky outlined style as the heroes */
const TAB_ICON: Record<string, string> = {
  balls: '<img class="tabimg" src="orb/book/fire.webp" alt="">',
  shop: `<svg viewBox="0 0 48 48" class="tabico"><defs><linearGradient id="tpurse" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c88a4a"/><stop offset="1" stop-color="#7a4a20"/></linearGradient></defs>
    <path d="M14 16 Q10 30 12 38 Q14 44 24 44 Q34 44 36 38 Q38 30 34 16Z" fill="url(#tpurse)" stroke="#1a0e06" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M13 15 Q24 20 35 15 L32 9 Q24 12 16 9Z" fill="#a86a34" stroke="#1a0e06" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M14 17 Q24 21 34 17" stroke="#e8c060" stroke-width="2.6" fill="none"/><circle cx="34" cy="20" r="2.4" fill="#e8c060" stroke="#1a0e06" stroke-width="1.4"/>
    <path d="M18 26 Q20 24 23 25" stroke="#ffffff44" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="9" cy="40" rx="5" ry="2.4" fill="#ffd23a" stroke="#6a4a00" stroke-width="1.4"/><ellipse cx="40" cy="42" rx="5" ry="2.4" fill="#ffd23a" stroke="#6a4a00" stroke-width="1.4"/><ellipse cx="40" cy="39" rx="5" ry="2.4" fill="#ffe680" stroke="#6a4a00" stroke-width="1.4"/></svg>`,
  jewel: `<svg viewBox="0 0 48 48" class="tabico"><path d="M10 18 L17 9 H31 L38 18 L24 41Z" fill="#5ac8ff" stroke="#0a2a4a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M10 18 H38 M17 9 L21 18 L24 41 M31 9 L27 18 L24 41 M21 18 L24 9 L27 18" stroke="#0a2a4a" stroke-width="1.4" fill="none"/>
    <path d="M17 9 L21 18 H10Z" fill="#9ae4ff"/><path d="M24 9 L21 18 H27Z" fill="#d8f6ff"/><path d="M21 18 L24 41 L10 18Z" fill="#3aa8e8"/><circle cx="34" cy="10" r="1.6" fill="#fff"/></svg>`,
  hub: `<svg viewBox="0 0 48 48" class="tabico"><defs><radialGradient id="tport"><stop offset="0" stop-color="#ffe680"/><stop offset=".55" stop-color="#ff8a1a"/><stop offset="1" stop-color="#a82a00"/></radialGradient></defs>
    <path d="M9 42 V20 Q9 6 24 6 Q39 6 39 20 V42Z" fill="#4a423c" stroke="#1a1410" stroke-width="2.6"/>
    <path d="M14 42 V21 Q14 11 24 11 Q34 11 34 21 V42Z" fill="url(#tport)" stroke="#1a1410" stroke-width="2"/>
    <path d="M24 26 m-1 0 a4 4 0 1 1 4 4 a7 7 0 1 1 -8 -7 a10 10 0 1 1 11 11" fill="none" stroke="#fff3c0" stroke-width="2" stroke-linecap="round" opacity=".9"/>
    <path d="M11 22h2M35 22h2M11 32h2M35 32h2M23 8h2" stroke="#ffb040" stroke-width="2"/></svg>`,
  hero: `<svg viewBox="0 0 48 48" class="tabico"><defs><linearGradient id="thelm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0c060"/><stop offset="1" stop-color="#a86a20"/></linearGradient></defs>
    <path d="M24 3 Q38 4 40 14 Q30 8 24 12Z" fill="#e8303a" stroke="#4a0a0a" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M10 26 Q10 11 24 11 Q38 11 38 26 V40 H31 V30 Q31 27 28 27 H20 Q17 27 17 30 V40 H10Z" fill="url(#thelm)" stroke="#2a1606" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M24 12 V27" stroke="#2a1606" stroke-width="2.2"/><path d="M14 20 Q16 15 21 14" stroke="#fff6c0" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M10 33 H17 M31 33 H38" stroke="#7a4a10" stroke-width="1.6"/></svg>`,
  events: `<svg viewBox="0 0 48 48" class="tabico"><defs><linearGradient id="tcup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#c88a1a"/></linearGradient></defs>
    <path d="M14 8 H34 V18 Q34 30 24 31 Q14 30 14 18Z" fill="url(#tcup)" stroke="#3a2200" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M14 11 Q6 11 7 18 Q8 24 15 24 M34 11 Q42 11 41 18 Q40 24 33 24" fill="none" stroke="#3a2200" stroke-width="2.6"/>
    <path d="M14 11 Q8 11 9 18 Q10 22 15 22 M34 11 Q40 11 39 18 Q38 22 33 22" fill="none" stroke="#f0c040" stroke-width="1.4"/>
    <path d="M21 31 H27 V36 H21Z" fill="#c88a1a" stroke="#3a2200" stroke-width="2"/><path d="M15 36 H33 L35 42 H13Z" fill="#7a4a8a" stroke="#2a102a" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M24 13 l4 5 -4 5 -4 -5z" fill="#3ae07a" stroke="#0a3a1a" stroke-width="1.4"/><path d="M18 11 Q18 18 20 22" stroke="#fff6c0" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
};

/** gem icon (picture from the art folder) */

const BP_ICON = '<svg class="sbico" viewBox="0 0 40 40"><path d="M8 4h24v28l-12-6-12 6z" fill="#b46cff" stroke="#3a1a70" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 4h24v7H8z" fill="#ffcf4a" stroke="#3a1a70" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 14l2.4 4.8 5.3.8-3.8 3.7.9 5.2-4.8-2.5-4.8 2.5.9-5.2-3.8-3.7 5.3-.8z" fill="#fff2a0" stroke="#7a4a00" stroke-width="1.2"/></svg>';
const MARKET_ICON = '<svg class="sbico" viewBox="0 0 40 40"><path d="M6 15h28v19H6z" fill="#3a2440" stroke="#120818" stroke-width="2.2"/><path d="M10 22h20v12H10z" fill="#1a0e22"/>'
  + '<path d="M3 15l4-9h26l4 9z" fill="#6a2a8a" stroke="#120818" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 6l-2 9M20 6v9M28 6l2 9" stroke="#2a0e3a" stroke-width="3"/>'
  + '<path d="M3 15q3.5 4 7 0q3.5 4 7 0q3 4 6 0q3.5 4 7 0q3.5 4 7 0" fill="#8a3ab0" stroke="#120818" stroke-width="2"/>'
  + '<ellipse cx="15" cy="31" rx="5" ry="2" fill="#e8a020" stroke="#5a3a00" stroke-width="1.2"/><ellipse cx="15" cy="28.5" rx="5" ry="2" fill="#ffd23a" stroke="#5a3a00" stroke-width="1.2"/><ellipse cx="15" cy="26" rx="5" ry="2" fill="#ffe680" stroke="#5a3a00" stroke-width="1.2"/>'
  + '<path d="M25 24l3 4-3 5-3-5z" fill="#ff4a6a" stroke="#4a0a1a" stroke-width="1.2"/><circle cx="31" cy="9" r="0" /></svg>';
const PASS_ICON = '<svg class="sbico" viewBox="0 0 40 40"><g transform="rotate(-12 20 20)"><path d="M4 11h32v6a3 3 0 0 0 0 6v6H4v-6a3 3 0 0 0 0-6z" fill="#ff7a5a" stroke="#6a1a10" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 11v18" stroke="#6a1a10" stroke-width="1.6" stroke-dasharray="2.5 2"/><path d="M24 15l1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5z" fill="#fff2a0" stroke="#7a3a00" stroke-width="1"/></g></svg>';
/** tilted ticket art for a pass card */
function ticketSvg(c1: string, c2: string, mark: string): string {
  return `<svg class="ticket" viewBox="0 0 120 120"><g transform="rotate(-10 60 60)">
    <path d="M10 22h100v24a10 10 0 0 0 0 28v24H10V74a10 10 0 0 0 0-28z" fill="${c1}" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
    <path d="M10 22h100v24a10 10 0 0 0 0 28v24H10V74a10 10 0 0 0 0-28z" fill="none" stroke="${c2}" stroke-width="2" stroke-linejoin="round" transform="translate(60 60) scale(.86) translate(-60 -60)"/>
    <path d="M18 30l8-0M18 30l0 8M102 30l-8 0M102 30l0 8M18 90l8 0M18 90l0-8M102 90l-8 0M102 90l0-8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <text x="60" y="72" text-anchor="middle" font-size="34" font-weight="900" fill="#fff" stroke="${c2}" stroke-width="3" paint-order="stroke">${mark}</text>
    <path d="M24 40l4-4M30 40l4-4M36 40l4-4" stroke="#ffffffaa" stroke-width="3" stroke-linecap="round"/></g></svg>`;
}


/** item pictures drawn as SVG: the weapon depends on the set, the rest is tinted by the set colour */
export function itemSvg(slot: Slot, set: SetId | null, size = 34, rarity = 0): string {
  const pics = ITEM_IMG[set ?? 'guard']?.[slot];
  if (pics) return `<img class="itemimg r${rarity}" src="${pics[Math.min(3, rarity)]}" width="${size}" height="${size}" alt="" draggable="false">`;
  return itemSvgDrawn(slot, set, size);
}
function itemSvgDrawn(slot: Slot, set: SetId | null, size = 34): string {
  const c = set ? SET_COLOR[set] : '#c9b48a', o = '#21160f';
  const w = (b: string) => `<svg class="itemsvg" viewBox="0 0 48 48" width="${size}" height="${size}">${b}</svg>`;
  const gem = (x: number, y: number, r: number) => `<path d="M${x} ${y - r}l${r} ${r}-${r} ${r}-${r}-${r}z" fill="${c}" stroke="${o}" stroke-width="1.6"/><path d="M${x} ${y - r}l${r * 0.4} ${r}-${r * 0.4} ${r * 0.5}" fill="#fff8"/>`;
  if (slot === 'book') {
    if (set === 'wanderer') return w(`<path d="M12 42L30 14" stroke="${o}" stroke-width="7" stroke-linecap="round"/><path d="M12 42L30 14" stroke="#b07a3a" stroke-width="4" stroke-linecap="round"/>
      <path d="M30 14c-2-6 4-11 9-8 5 3 2 10-3 9-3-1-3-5 0-5" fill="none" stroke="${o}" stroke-width="5" stroke-linecap="round"/><path d="M30 14c-2-6 4-11 9-8 5 3 2 10-3 9-3-1-3-5 0-5" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="35" cy="9" r="2" fill="#fff"/>`);
    if (set === 'berserk') return w(`<path d="M10 43L32 13" stroke="${o}" stroke-width="7" stroke-linecap="round"/><path d="M10 43L32 13" stroke="#4a3a44" stroke-width="4" stroke-linecap="round"/>
      <path d="M17 33l-6-1M20 29l1-6M24 24l-6-2" stroke="${o}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M33 4l7 7-5 9-9-4z" fill="${c}" stroke="${o}" stroke-width="2"/><path d="M33 6l3 6-6 3" fill="#fff6"/>
      <path d="M28 12l-4-4M40 16l4 3" stroke="${o}" stroke-width="2.4" stroke-linecap="round"/>`);
    return w(`<rect x="9" y="7" width="30" height="35" rx="3" fill="#7a3a1e" stroke="${o}" stroke-width="2.4"/><rect x="13" y="7" width="26" height="35" rx="2" fill="#9a4a24"/>
      <path d="M13 11h22M13 38h22" stroke="#f0d28a" stroke-width="2"/><rect x="34" y="20" width="7" height="9" rx="1.5" fill="#e8c060" stroke="${o}" stroke-width="1.6"/>${gem(25, 24, 6)}`);
  }
  if (slot === 'mantle') return w(`<path d="M16 8h16l6 34c-9 3-21 3-28 0z" fill="${c}" stroke="${o}" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 8c3 5 13 5 16 0" fill="none" stroke="${o}" stroke-width="2"/>
    <path d="M24 13v28" stroke="#0003" stroke-width="2"/><circle cx="20" cy="12" r="2.6" fill="#f0d28a" stroke="${o}" stroke-width="1.4"/><circle cx="28" cy="12" r="2.6" fill="#f0d28a" stroke="${o}" stroke-width="1.4"/>`);
  if (slot === 'gloves') return w(`<path d="M14 40V20c0-3 4-3 4 0v-6c0-3 4-3 4 0v-2c0-3 4-3 4 0v2c0-3 4-3 4 0v12l3-4c2-2 5 0 4 2l-7 10v6z" fill="${c}" stroke="${o}" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="13" y="36" width="20" height="7" rx="2" fill="#f0d28a" stroke="${o}" stroke-width="2"/>`);
  if (slot === 'boots') return w(`<path d="M15 6h14v22l10 6c3 2 2 8-2 8H13c-2 0-3-2-2-4l4-6z" fill="${c}" stroke="${o}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M13 6h18" stroke="${o}" stroke-width="5" stroke-linecap="round"/><path d="M13 6h18" stroke="#f0d28a" stroke-width="2.6" stroke-linecap="round"/><path d="M12 40h28" stroke="#0004" stroke-width="3"/>`);
  if (slot === 'amulet') return w(`<path d="M12 6c0 14 6 20 12 22M36 6c0 14-6 20-12 22" fill="none" stroke="#f0d28a" stroke-width="2.4" stroke-dasharray="3 2"/>
    <circle cx="24" cy="33" r="9" fill="#e8c060" stroke="${o}" stroke-width="2.2"/>${gem(24, 33, 6)}`);
  return w(`<ellipse cx="24" cy="30" rx="13" ry="11" fill="none" stroke="${o}" stroke-width="7"/><ellipse cx="24" cy="30" rx="13" ry="11" fill="none" stroke="#e8c060" stroke-width="4"/>
    ${gem(24, 15, 8)}`);
}

export function gemSvg(type: GemType, size = 46, stars = 3): string {
  return `<img class="gemsvg" src="${GEM_IMG[type][Math.max(1, Math.min(4, stars)) - 1]}" width="${size}" height="${size}" alt="${GEM[type].name}" draggable="false">`;
}

/** one thing in a reward: icon, name, the number in the corner (count), a coloured caption under it (sub),
 *  rarity tier 0..4 (frame glow and sparks), a ribbon (badge), one more line for single rewards (detail) */
export interface RewardItem { icon: string; name: string; count?: string; sub?: string; color?: string; tier?: number; badge?: string; detail?: string; altar?: boolean }
/** again: buttons to repeat what gave the reward (hero search, chests); reveal: new heroes shown one by one first */
interface Reward { title: string; items: RewardItem[]; note?: string; chest?: { kind: P.StageChest; items: RewardItem[]; open: boolean }; again?: { label: string; sub: string; a: string; v: string; off?: boolean }[]; reveal?: string[];
  /** правка 172: «удвоить награду за бой» за рекламу — what the fight gave, and whether it is already doubled */
  ad?: { gold: number; scrolls: number; shards: number; done: boolean } }

export class Hub {
  p: P.Profile | null = P.load();
  screen: Screen = 'start';
  private root: HTMLElement;
  private sel: {
    heroInfo?: boolean; bonusOpen?: boolean;
    chestInfo?: ChestId;
    /** правки 125, 126: yesterday's place and reward, shown once in the event window */
    evLast?: { place: number; score: number; label: string };
    /** правка 133: the place whose chest is open in the rating */
    evChest?: number;
    heroPick?: string; map: number; heroSub: HeroSub; heroView?: string; sortSlot?: boolean;
    item?: number; gem?: number; feed?: boolean; synth?: { target?: number; foods: number[]; small: number; big: number; confirm?: boolean } | null; jewelSub: 'search' | 'gems'; rune?: number; runeFilter: string; showFilter?: boolean; workshop?: boolean; wsTab?: 'merge' | 'craft'; wsCenter?: number; wsPick?: number[]; fusing?: boolean;
    smith?: { flip: number[]; keep: Record<number, number> } | null;
    wiki?: { sec?: string; q?: string } | null;
    set: SetId; shopTab: 'chests' | 'topup'; taskTab: 'day' | 'week' | 'login'; tChest?: number; mktTab: 'day' | 'week' | 'month'; mElem: Element; mHero: string;
    pick?: { item: number; idx: number }; newGem?: number;
  } = { map: 1, heroSub: 'gear', jewelSub: 'search', runeFilter: 'all', set: 'guard', shopTab: 'chests', taskTab: 'day', mktTab: 'day', mElem: 'fire', mHero: 'prometheus' };
  private wheel: { open: boolean; tab: 'free' | 'adv' | 'super'; rot: number; target: number; busy: boolean; info?: boolean } = { open: false, tab: 'adv', rot: 0, target: 0, busy: false };
  private heroInfoHtml = '';
  /** правка 159: the last button pressed (a purchase gets the coin sound) and the reward window's key */
  private lastAct = ''; private readonly rewardKey = 'rewardov';
  /** правка 158: the «leave the game?» window is open */
  private exitAsk = false;
  /** a crystal purchase waiting for "Купить" (79) */
  private confirm: { a: string; v: string; cost: number; what: string; icon: string; never?: boolean } | null = null;
  private confirmed = false;
  private panel: 'tasks' | 'market' | 'idle' | 'bp' | 'passes' | 'wall' | 'rating' | 'ev' | 'evrate' | 'mail' | null = null;
  /** Orb Defense: the open window of a ball, the spirit tavern or the walls */
  private om: { kind: 'ball' | 'spirits' | 'walls'; id?: string } | null = null;
  /** правки 125, 126: which event window is open */
  private evSel: EventId = 'boss';
  /** правка 120б: last HTML put into the page (skip identical rebuilds) */
  private lastView = ''; private lastTabs = ''; private lastLayer = '';
  /** правка 112: leaderboard tab */
  private rateTab: 'week' | 'all' | 'map' = 'week';
  private idleInfo = false;
  private skel = false;
  private hdrKey = '';
  private reward: Reward | null = null;
  private toastT = 0;
  private timer = 0;
  /** gem auto-search: runs searches one by one with the location animation */
  private auto = { on: false, timer: 0, n: 0, gold: 0, g: [0, 0, 0, 0], found: {} as Record<string, number>, small: 0, big: 0, stop3: true, last: null as null | { moved: boolean; loc: number; text: string } };

  constructor(root: HTMLElement, private onBattle: (map: number, mods: ReturnType<typeof P.computeMods>, heroId: string, wallMap?: number, ev?: EventId) => void) {
    this.root = root;
    cloud.onMail(() => { // правка 202: new letters / a reward taken; letters that came while the mail is open count as read
      if (this.panel === 'mail') cloud.readMail(cloud.mail().map(l => l.id));
      if (!this.root.hidden) this.render();
    });
    const st = document.documentElement.style; // stone wall and lava for every screen
    st.setProperty('--stone', `url(${STONE})`); st.setProperty('--lava', `url(${LAVA})`); st.setProperty('--portal', `url(${PORTAL_BG.blue})`);
    // lava-stone kit from Meshy (правки 87–91)
    for (const [k, v] of [['banner', 'banner'], ['oct', 'octframe'], ['plate', 'plate'], ['lavab', 'lavabtn'], ['trough', 'trough'], ['sq', 'sqbtn'], ['cave', 'cave'], ['wheelimg', 'wheel'], ['hall', 'hall']]) st.setProperty('--u-' + k, `url(${UI2[v]})`);
    root.addEventListener('click', e => this.click(e));
    root.addEventListener('input', e => { // справочник: search as you type, without losing the keyboard
      const t = e.target as HTMLInputElement;
      if (t.id !== 'wkq' || !this.sel.wiki) return;
      this.sel.wiki.q = t.value; const box = this.root.querySelector('#wkbody'); if (box) box.innerHTML = this.wikiBody();
    });
    this.screen = this.p ? 'hub' : 'start';
    if (this.p) this.sel.map = this.p.maxMap + 1;
    this.timer = window.setInterval(() => {
      if (!this.p || root.hidden || this.screen !== 'hub') return;
      P.tick(this.p);
      if (this.wheel.open || this.reward || this.panel) this.updateHeader(this.p); else this.render();
    }, 1000);
  }

  /** Б2: the profile came from the game server after the Hub was built */
  reloadProfile(): void {
    this.p = P.load(); this.screen = this.p ? 'hub' : 'start';
    if (this.p) this.sel.map = this.p.maxMap + 1;
  }

  /** правка 158: the phone's «Back» — closes the top window; with none, goes to the Portal; on the Portal asks to leave the game */
  back(): void {
    if (this.root.hidden) return;
    if (this.exitAsk) { this.exitAsk = false; return this.render(); }
    const tops = Array.from(this.root.querySelectorAll<HTMLElement>('#layer > *, .rewardov, .wkscreen'));
    const top = tops[tops.length - 1];
    if (top) {
      for (const sel of ['[data-a="cfNo"]', '[data-a="revealNext"]', '[data-a="rewardOk"]', '[data-a="sockCancel"]', '[data-a="wsClose"]', '[data-a="wikiSec"][data-v=""]', '[data-a="wikiClose"]', '.x[data-a="close"]', '[data-a="close"]']) {
        const b = top.matches(sel) ? top : top.querySelector<HTMLElement>(sel);
        if (b) { b.click(); return; }
      }
    }
    if (this.p && this.screen !== 'hub' && this.screen !== 'start') return this.go('hub');
    this.exitAsk = true; this.render();
  }
  private vExit(): string {
    return `<div class="modal exitm" data-a="exitNo"><div class="mbox lvpanel exitpanel">${this.lvBanner('Выйти из игры?', 'fit')}
      <div class="lvsub">Прогресс сохранён на телефоне.</div>
      <div class="exbtns"><button class="lvbtn" data-a="exitNo"><b>Остаться</b></button><button class="btn ghost exitgo" data-a="exitYes">Выйти</button></div></div></div>`;
  }
  show(screen: Screen = 'hub'): void { this.root.hidden = false; this.go(screen); }
  hide(): void { this.root.hidden = true; document.getElementById('toast')!.hidden = true; }

  // ---------------- reward pop-up: what changed in the profile ----------------
  snap(): string { return JSON.stringify(this.p); }
  diff(before: string): RewardItem[] {
    const a = JSON.parse(before) as P.Profile, b = this.p!;
    const out: RewardItem[] = [];
    const cur: [keyof P.Profile, string, string][] = [
      ['crystals', GEM_ICON, 'Кристаллы'], ['gold', resImg('gold', 'rbig'), 'Золото'], ['scrolls', resImg('scrolls', 'rbig'), 'Свитки'], ['essSmall', resImg('essSmall', 'rbig'), 'Малая эссенция'],
      ['essBig', resImg('essBig', 'rbig'), 'Большая эссенция'], ['shards', resImg('shards', 'rbig'), 'Осколки рун'], ['energy', resImg('energy', 'rbig'), 'Энергия'],
      ['couponsSmall', couponSvg(false, 46), 'Малый купон'], ['couponsBig', couponSvg(true, 46), 'Средний купон'],
    ];
    for (const id of Object.keys(b.heroes)) {
      const hd = hero(id);
      if (b.heroes[id].owned && !a.heroes[id].owned) out.push({ icon: this.heroSvg(id), name: hd.name, sub: 'новый герой', color: EL_HEX[hd.element], tier: 3, badge: 'НОВЫЙ' });
    }
    const newItems = b.items.filter(x => !a.items.some(y => y.uid === x.uid)).sort((x, y) => y.rarity - x.rarity);
    for (const it of newItems) out.push({ icon: itemSvg(it.slot, it.set, 60, it.rarity), name: P.itemName(it), sub: RARITIES[it.rarity], color: RARITY_COLOR[it.rarity], tier: R_TIER[it.rarity] });
    const newGems = b.gems.filter(x => !a.gems.some(y => y.uid === x.uid)).sort((x, y) => y.stars - x.stars);
    for (const g of newGems) out.push({ icon: gemSvg(g.type, 52, g.stars), name: GEM[g.type].name, sub: '★'.repeat(g.stars), color: STAR_COLOR[g.stars], tier: Math.max(0, g.stars - 1) });
    const newRunes = b.runes.filter(x => !a.runes.some(y => y.uid === x.uid)).sort((x, y) => y.rarity - x.rarity);
    for (const r of newRunes) out.push({ icon: this.runeBadge(r, 64), name: P.runeName(r), sub: RUNE_RARITY[r.rarity], color: RARITY_COLOR[r.rarity], tier: R_TIER[r.rarity], detail: P.runeValue(r), altar: true });
    for (const [k, icon, name] of cur) {
      const d = (b[k] as number) - (a[k] as number);
      if (d > 0) out.push({ icon, name, count: fmt(d) });
    }
    for (const id of Object.keys(b.heroes)) {
      const ha = a.heroes[id], hb = b.heroes[id];
      // правка 144: how much level the fight gave — «+0.3 ур.», «+1 ур.» — not the hero's whole level
      if (hb.level > ha.level || hb.xp > ha.xp) {
        const at = (h: { level: number; xp: number }) => h.level + Math.min(1, h.xp / heroXpFor(h.level));
        const g = Math.max(0.1, Math.round((at(hb) - at(ha)) * 10) / 10), up = hb.level > ha.level;
        out.push({ icon: this.heroSvg(id), name: hero(id).name, count: `+${Number.isInteger(g) ? g : g.toFixed(1)} ур.`, sub: up ? 'новый уровень' : undefined, color: up ? '#5cd68c' : EL_HEX[hero(id).element], tier: up ? 2 : 1 });
      }
    }
    for (const id of Object.keys(b.heroes)) { // particles of one hero summed into one tile
      const d = b.heroes[id].particles - a.heroes[id].particles;
      if (d > 0) { const hd = hero(id); out.push({ icon: `${this.heroSvg(id)}<i class="pz">${resImg('particles', 'pzi')}</i>`, name: hd.name, sub: 'частицы', count: '+' + d, color: EL_HEX[hd.element] }); }
    }
    return out;
  }
  /** new heroes in a reward, for the full-screen show before the list */
  private newHeroes(before: string): string[] {
    const a = JSON.parse(before) as P.Profile;
    return Object.keys(this.p!.heroes).filter(id => this.p!.heroes[id].owned && !a.heroes[id].owned);
  }
  showReward(title: string, items: RewardItem[], note?: string, chest?: Reward['chest'], ad?: Reward['ad']): void {
    this.reward = { title, items, note, chest, ad };
    this.root.hidden = false;
    this.render();
  }

  private go(s: Screen): void {
    this.screen = s;
    if (s === 'hub') void cloud.refreshMail(); // правка 202: new letters when coming back to the Portal (at most once a minute)
    if (this.auto.on && s !== 'jewel') this.autoStop();
    this.sel.synth = null; this.sel.wiki = null;
    this.sel.item = this.sel.gem = this.sel.rune = undefined; this.sel.feed = false; this.sel.workshop = false; this.sel.pick = undefined; this.panel = null;
    this.render();
  }

  private toast(msg: string, ms = 2600): void {
    const t = document.getElementById('toast')!;
    t.textContent = msg; t.hidden = false;
    clearTimeout(this.toastT); this.toastT = window.setTimeout(() => { t.hidden = true; }, ms);
  }

  /** run an action; with a title, whatever the player got shows in the reward pop-up */
  // ---------------- smith (71) and rune workshop (74) ----------------
  private smOn(g: P.SmithGroup): boolean { return g.auto !== (this.sel.smith?.flip.includes(g.keep) ?? false); }
  /** the group as the player set it: the chosen keeper stays, the rest is material */
  private smGroup(g: P.SmithGroup): { keep: number; mats: number[] } {
    const k = this.sel.smith?.keep[g.keep] ?? g.keep, all = [g.keep, ...g.mats];
    return all.includes(k) ? { keep: k, mats: all.filter(u => u !== k) } : { keep: g.keep, mats: g.mats };
  }
  /** a merge with its own result screen: "Слияние выполнено" with what went up */
  private doMerge(fn: () => RewardItem[], after?: () => void): void {
    try {
      const items = fn();
      if (this.p) P.save(this.p);
      after?.();
      this.reward = { title: 'Слияние выполнено', items };
    } catch (e) {
      if (e instanceof P.GameError) this.toast(e.message); else { console.error(e); this.toast('Ошибка: ' + (e as Error).message); }
    }
    this.render();
  }
  private itemResult(it: P.Item): RewardItem {
    const r = it.rarity, opens = gearLines(it.slot, it.set).filter(l => l.at === r);
    return { icon: itemSvg(it.slot, it.set, 60, r), name: P.itemName(it), sub: RARITIES[r], color: RARITY_COLOR[r], tier: R_TIER[r], altar: true,
      detail: `<span class="was">предел уровня ${RARITY_CAP[r - 1]} → <b>${RARITY_CAP[r]}</b></span>${opens.map(l => `<em class="opn">Открыто: ${l.text}</em>`).join('')}` };
  }
  private runeResult(was: P.Rune, r: P.Rune): RewardItem {
    const s = r.rarity, opens = P.runeLines(r).filter(l => l.at === s);
    return { icon: this.runeBadge(r, 64), name: P.runeName(r), sub: RUNE_RARITY[s], color: RARITY_COLOR[s], tier: R_TIER[s], altar: true,
      detail: `<span class="was">${P.runeValue(was)} → <b>${P.pctTxt(P.runeMain(r))}</b></span>${opens.map(l => `<em class="opn">Открыто: ${l.text}</em>`).join('')}` };
  }
  private wsTap(p: P.Profile, uid: number): void {
    const r = p.runes.find(x => x.uid === uid); if (!r) return;
    const c = p.runes.find(x => x.uid === this.sel.wsCenter), pick = this.sel.wsPick ?? [];
    if (uid === this.sel.wsCenter) { this.sel.wsCenter = undefined; this.sel.wsPick = []; return this.render(); }
    if (pick.includes(uid)) { this.sel.wsPick = pick.filter(x => x !== uid); return this.render(); }
    if (c && P.runeMates(p, c).some(x => x.uid === uid)) {
      if (pick.length >= runeDupes(c.rarity)) return this.toast('Гнёзда заняты: сними копию или нажми «Объединить»');
      this.sel.wsPick = [...pick, uid]; return this.render();
    }
    if (r.rarity >= MYTHIC) return this.toast('Руна уже мифическая — выше некуда');
    this.sel.wsCenter = uid; this.sel.wsPick = []; this.render();
  }
  /** "Подобрать": fill the copies for the centre; with an empty altar take the best rune that can merge */
  private wsAuto(p: P.Profile): void {
    let c = p.runes.find(x => x.uid === this.sel.wsCenter);
    if (!c) {
      c = [...p.runes].filter(x => P.canMergeRune(p, x)).sort((a, b) => b.rarity - a.rarity || (P.runeHolder(p, b.uid) ? 1 : 0) - (P.runeHolder(p, a.uid) ? 1 : 0))[0];
      if (!c) return this.toast('Нет рун для слияния: нужны одинаковые руны одной редкости');
      this.sel.wsCenter = c.uid;
    }
    const need = runeDupes(c.rarity), mates = P.runeMates(p, c);
    if (mates.length < need) { this.sel.wsPick = mates.map(x => x.uid); this.render(); return this.toast(`Не хватает копий: есть ${mates.length} из ${need}`); }
    this.sel.wsPick = mates.slice(0, need).map(x => x.uid); this.render();
  }

  /** what an action would spend in crystals (79): price, name and picture for the question */
  private crystalCost(p: P.Profile, a: string, v: string): { cost: number; what: string; icon: string } | null {
    const n = Number(v);
    switch (a) {
      case 'chest': { const [id, k] = v.split(':'); const c = CHESTS[id as ChestId]; return { cost: c.price * (k === '10' ? CHEST_X10 : 1), what: `${c.name} ×${k}`, icon: chestSvg(2, 70) }; }
      case 'hsearch': { const [k, m] = v.split(':'); if (k !== 'big') return null; const miss = Math.max(0, Number(m) - p.couponsBig); return { cost: BIG_COUPON.price * miss, what: `Поиск героев ×${m}${miss ? ` (купить средних купонов: ${miss})` : ''}`, icon: couponSvg(true, 72) }; }
      case 'buyCoupon': return { cost: BIG_COUPON.price * (n || 1), what: `Средний купон ×${n || 1}`, icon: couponSvg(true, 72) };
      case 'buy': { const k = v as 'scrolls'; const M: Record<string, [number, string, string]> = { scrolls: [PRICE.scrolls100, '100 свитков', 'scrolls'], gold: [PRICE.gold100k, '100 000 золота', 'gold'], essBig: [PRICE.essBig, 'Большая эссенция', 'essBig'], essSmall: [PRICE.essSmall, 'Малая эссенция', 'essSmall'], energy: [PRICE.energy30, '30 энергии', 'energy'] }; const x = M[k]; return x ? { cost: x[0], what: x[1], icon: resImg(x[2], 'cfi') } : null; }
      case 'offer': { const o = P.dailyOffers().find(x => x.id === v); return o && o.cur === 'crystals' ? { cost: o.price, what: o.label, icon: this.prizeIcon(o.icon) } : null; }
      case 'mBuy': { const [k, id] = v.split(':'); const o = (k === 'm' ? P.MONTH_OFFERS : P.WEEK_OFFERS).find(x => x.id === id); return o ? { cost: o.price, what: o.label, icon: this.mktParts(o)[0].icon } : null; }
      case 'idleFast': return v === 'crystals' ? { cost: P.fastIdleState(p).price, what: 'Быстрый сбор: 2 часа', icon: chestSvg(2, 70) } : null;
      case 'explore': return v === 'crystals' ? { cost: CR_SEARCH.cost, what: 'Поиск гема сразу в Руинах', icon: `<img class="cfi" src="${ICONS.loc_3}" alt="">` } : null;
      case 'spin': { if (this.wheel.tab === 'free') return null; const wid = this.wheel.tab === 'super' ? 'super' : 'adv', W = P.WHEELS[wid]; if (wid === 'adv' && n === 1 && P.lotteryFree(p)) return null; return { cost: n === 10 ? W.price10 : W.price, what: `${W.name} колесо ×${n}`, icon: resImg('gold', 'cfi') }; }
    }
    return null;
  }
  // ---------------- справочник (81) ----------------
  private wikiCache?: WikiSection[];
  private wikiData(): WikiSection[] {
    return this.wikiCache ??= wikiSections({
      skill: id => skillPic(id, 'wki') ?? SKILL_ICON[id as SkillId] ?? '', res: k => resImg(k, 'wki'), rune: r => this.runeBadge(r, 44),
      item: (sl, st, r) => itemSvg(sl, st, 44, r), hero: id => this.heroSvg(id), gem: (t, st) => gemSvg(t, 40, st), chest: () => chestSvg(2, 44),
      coupon: big => couponSvg(big, 44), setIcon: st => `<img class="wki" src="${ICONS['set_' + st]}" alt="">`, loc: i => `<img class="wki" src="${ICONS['loc_' + i]}" alt="">`,
    });
  }
  private wikiBody(): string {
    const w = this.sel.wiki!, data = this.wikiData(), q = (w.q ?? '').trim().toLowerCase();
    const art = (x: { icon: string; title: string; body: string }) => `<div class="wkart"><div class="wkah"><span class="wkic">${x.icon}</span><b>${x.title}</b></div><div class="wktx">${x.body}</div></div>`;
    if (q) {
      const hits = data.flatMap(sec => sec.items.filter(x => (x.title + ' ' + x.body.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(q)).map(x => ({ ...x, title: `${x.title} <small>· ${sec.name}</small>` })));
      return hits.length ? hits.map(art).join('') : '<p class="muted center">Ничего не нашлось</p>';
    }
    const sec = data.find(x => x.id === w.sec);
    if (sec) return `<button class="wkback" data-a="wikiSec" data-v="">‹ Все разделы</button><div class="vhead">${sec.name}</div>` + sec.items.map(art).join('');
    return `<div class="wkgrid">${data.map(x => `<button class="wksec" data-a="wikiSec" data-v="${x.id}"><span class="wkic big">${x.icon}</span><b>${x.name}</b><small>${x.items.length} статей</small></button>`).join('')}</div>`;
  }
  private wikiScreen(): string {
    return `<div class="wkscreen"><div class="wkhead"><div class="wktitle"><span>Справочник</span></div><button class="x" data-a="wikiClose">✕</button></div>
      <div class="wksearch"><input id="wkq" type="search" placeholder="Поиск: руна, сундук, Медуза…" value="${(this.sel.wiki?.q ?? '').replace(/"/g, '&quot;')}" autocomplete="off"></div>
      <div class="wkbody panelbox" id="wkbody" data-k="wiki${this.sel.wiki?.sec ?? ''}">${this.wikiBody()}</div></div>`;
  }

  private vConfirm(p: P.Profile): string {
    const c = this.confirm!;
    return `<div class="cfov"><div class="cfbox">
      <div class="cftitle"><span>Покупка</span></div>
      <div class="cfart">${c.icon}</div>
      <div class="cfwhat">${c.what}</div>
      <div class="cfq">Потратить <b>${fmt(c.cost)}💎</b>?</div>
      <div class="muted small">Останется ${fmt(p.crystals - c.cost)}💎</div>
      <button class="cfnever${c.never ? ' on' : ''}" data-a="cfNever"><i>${c.never ? '✓' : ''}</i>Больше не спрашивать</button>
      <div class="cfbtns"><button class="btn ghost" data-a="cfNo">Отмена</button><button class="stonebtn" data-a="cfYes"><b>Купить</b><small>${fmt(c.cost)}💎</small></button></div>
      <div class="muted small">Вернуть вопрос можно в Настройках</div></div></div>`;
  }

  /** "again" buttons for the reward window: same action once more / ten more, with the price now */
  private againFor(a: string, v: string): Reward['again'] {
    const p = this.p!;
    if (a === 'hsearch') {
      const big = v.startsWith('big');
      if (!big) return [{ label: 'Ещё ×1', sub: `${couponSvg(false, 26)} есть ${p.couponsSmall}`, a, v: 'small:1', off: !p.couponsSmall }];
      const cost = (n: number) => p.couponsBig >= n ? `${couponSvg(true, 26)} ${n}/${p.couponsBig}` : `${BIG_COUPON.price * (n - p.couponsBig)}💎`;
      return [{ label: 'Ещё ×1', sub: cost(1), a, v: 'big:1', off: p.couponsBig < 1 && p.crystals < BIG_COUPON.price },
        { label: 'Ещё ×10', sub: cost(10), a, v: 'big:10', off: p.couponsBig < 10 && p.crystals < BIG_COUPON.price * (10 - p.couponsBig) }];
    }
    if (a === 'chest') {
      const id = v.split(':')[0] as ChestId, pr = CHESTS[id].price;
      return [{ label: 'Ещё ×1', sub: `${pr}💎`, a, v: `${id}:1`, off: p.crystals < pr }, { label: 'Ещё ×10', sub: `${pr * CHEST_X10}💎`, a, v: `${id}:10`, off: p.crystals < pr * CHEST_X10 }];
    }
    if (a === 'craft') { const c = v ? RUNE_CRAFT_TYPE : RUNE_CRAFT; return [{ label: 'Создать ещё', sub: `${c} ᚱ · есть ${p.shards}`, a, v, off: p.shards < c }]; }
    return undefined;
  }

  private act(fn: () => string | void, rewardTitle?: string, again?: [string, string]): void {
    const before = rewardTitle ? this.snap() : '';
    try {
      const r = fn();
      if (this.p) P.save(this.p);
      if (BUY_ACTS.has(this.lastAct)) sfx.play('buy');
      if (rewardTitle) { const items = this.diff(before); if (items.length) this.reward = { title: r || rewardTitle, items, reveal: this.newHeroes(before), again: again && this.againFor(...again) }; else if (r) this.toast(r); }
      else if (r) this.toast(r);
    } catch (e) {
      if (e instanceof P.GameError) this.toast(e.message); else { console.error(e); this.toast('Ошибка: ' + (e as Error).message); }
    }
    this.render();
  }

  // ---------------- click router ----------------
  private click(e: Event): void {
    const t = e.target as HTMLElement;
    if (this.reward && t.closest('.dmgd')) return; // правка 114: the damage table opens and closes by itself
    if (this.reward && t.closest('.rewardov')) { // buttons inside the reward act, a tap anywhere else closes it
      const rb = t.closest('[data-a]') as HTMLElement | null;
      if (rb?.dataset.a === 'revealNext') { this.reward.reveal = this.reward.reveal?.slice(1); return this.render(); }
      if (rb?.dataset.a === 'adDouble') { if (!rb.hasAttribute('disabled')) void this.adDouble(); return; }
      // правка 145: the first tap anywhere (the chest itself or «OK») opens the stage chest, the next one closes the window
      if (this.reward.chest && !this.reward.chest.open) { this.reward.chest.open = true; return this.render(); }
      if (!rb || !rb.closest('.rewardov')) { this.reward = null; return this.render(); }
      if (rb.hasAttribute('disabled')) return;
      this.reward = null;
    }
    const b = t.closest('[data-a]') as HTMLElement | null;
    if (!b) return;
    const a = b.dataset.a!, v = b.dataset.v ?? '', n = Number(v);
    this.lastAct = a; // правка 159: a purchase sounds after it went through
    const p = this.p;
    if (a === 'close') { if (t.closest('.mbox') && !t.closest('.x')) return; this.om = null; this.sel.chestInfo = undefined; this.sel.heroInfo = false; this.sel.item = this.sel.gem = this.sel.rune = undefined; this.sel.pick = undefined; this.sel.workshop = false; this.sel.smith = null; this.sel.wsCenter = undefined; this.sel.wsPick = []; this.panel = null; if (!this.wheel.busy) { this.wheel.open = false; this.wheel.info = false; } return this.render(); }
    if (p && a.startsWith('o:')) { // Orb Defense actions
      switch (a) {
        case 'o:ball': this.om = { kind: 'ball', id: v }; return this.render();
        case 'o:spirits': this.om = { kind: 'spirits', id: v || undefined }; return this.render();
        case 'o:walls': this.om = { kind: 'walls', id: v || undefined }; return this.render();
        case 'o:ballUp': return this.act(() => { OM.upgradeBall(p, v as BallId); sfx.play('buy'); return 'Шар улучшен!'; });
        case 'o:spOpen': return this.act(() => { OM.openSpirit(p, v as SpiritId); OM.orb(p).spirit = v as SpiritId; return 'Дух открыт!'; });
        case 'o:spUp': return this.act(() => { OM.upgradeSpirit(p, v as SpiritId); return 'Дух усилен!'; });
        case 'o:spUse': return this.act(() => { OM.orb(p).spirit = v as SpiritId; });
        case 'o:wlBuy': return this.act(() => { OM.buyWall(p, v as WallId); OM.orb(p).wall = v as WallId; return 'Стена куплена!'; });
        case 'o:wlUp': return this.act(() => { OM.upgradeWall(p, v as WallId); return 'Стена укреплена!'; });
        case 'o:wlUse': return this.act(() => { OM.orb(p).wall = v as WallId; });
      }
    }
    if (a === 'go') { if (v === 'jewel' && p && !P.unlocked(p, 'jewel')) return this.toast(P.unlockText('jewel')); if (v === 'events') return this.toast('События появятся в следующих обновлениях'); return this.go(v as Screen); }
    // правка 165: закрытый раздел — подсказка, когда откроется
    if (p) { const gate = ({ wheel: 'wheel', market: 'market', bp: 'bp', passes: 'passes' } as Record<string, P.Feature>)[a] ?? (a === 'sub' && v === 'runes' ? 'runes' : undefined);
      if (gate && !P.unlocked(p, gate)) return this.toast(P.unlockText(gate)); }
    // правка 158: leave the game (APK only)
    if (a === 'exitAsk') { this.exitAsk = true; return this.render(); }
    if (a === 'exitNo') { if (t.closest('.mbox') && !t.closest('button')) return; this.exitAsk = false; return this.render(); }
    if (a === 'exitYes') { if (p) P.save(p); void App.exitApp().catch(() => undefined); return; }
    if (a === 'startPick') { this.sel.heroPick = v; return this.render(); }
    if (a === 'startGo') { if (!this.sel.heroPick) return; this.p = P.newProfile(this.sel.heroPick); P.save(this.p); this.sel.map = 1; return this.go('hub'); }
    if (!p) return;
    // 79: ask before spending crystals
    if (a === 'cfNo') { this.confirm = null; return this.render(); }
    if (a === 'cfNever') { if (this.confirm) this.confirm.never = !this.confirm.never; return this.render(); }
    if (a === 'cfYes') {
      const c = this.confirm; if (!c) return;
      this.confirm = null;
      if (c.never) { p.noConfirm = true; P.save(p); }
      this.confirmed = true;
      const f = document.createElement('i'); f.dataset.a = c.a; f.dataset.v = c.v;
      try { this.click({ target: f } as unknown as Event); } finally { this.confirmed = false; }
      return;
    }
    if (!this.confirmed && !p.noConfirm) {
      const c = this.crystalCost(p, a, v);
      if (c && c.cost > 0 && c.cost <= p.crystals) { this.confirm = { a, v, ...c }; return this.render(); }
    }
    switch (a) {
      case 'battle': {
        if (p.energy < ENERGY.run) return this.act(() => { P.startRun(p, this.sel.map); });
        const art = this.root.querySelector('.hubart') as HTMLElement | null;
        if (art) { if (art.classList.contains('launch')) return; art.classList.add('launch'); window.setTimeout(() => { art.classList.remove('launch'); const f = document.createElement('i'); f.dataset.a = 'battleGo'; this.click({ target: f } as unknown as Event); }, 420); return; }
      }
      // falls through
      case 'battleGo': return this.act(() => { P.startRun(p, this.sel.map); P.save(p); this.hide(); this.onBattle(this.sel.map, P.computeMods(p), p.active); });
      case 'map': this.sel.map = Math.max(1, Math.min(n, p.maxMap + 1)); return this.render();
      case 'idleOpen': this.panel = 'idle'; this.idleInfo = false; return this.render();
      // ---- правки 112, 115: wall defence ----
      case 'wallOpen': if (!P.wallUnlocked(p)) return this.toast('Защита стены откроется после этапа 2'); this.panel = 'wall'; return this.render();
      case 'rating': this.panel = 'rating'; return this.render();
      case 'rateTab': this.rateTab = v as 'week'; return this.render();
      case 'wallGo': return this.act(() => {
        const mapIdx = P.wallMapToday();
        P.startWall(p, v === 'paid'); P.save(p); this.panel = null; this.hide();
        this.onBattle(Math.max(1, p.maxMap), P.computeMods(p), p.active, mapIdx);
      });
      // ---- правки 125, 126: events ----
      case 'evOpen': {
        if (!P.evUnlocked(p)) return this.toast('События откроются после этапа 2');
        this.evSel = v as EventId; this.panel = 'ev';
        const st = P.evState(p, this.evSel); if (st.last && !st.last.seen) { st.last.seen = true; P.save(p); this.sel.evLast = st.last; } else this.sel.evLast = undefined;
        return this.render();
      }
      case 'evRate': this.panel = 'evrate'; this.sel.evChest = undefined; return this.render();
      case 'evChest': this.sel.evChest = v ? +v : undefined; return this.render();
      case 'evGo': return this.act(() => {
        const ev = this.evSel, mapIdx = P.wallMapToday();
        P.startEvent(p, ev, v === 'paid'); P.save(p); this.panel = null; this.hide();
        this.onBattle(Math.max(1, p.maxMap), P.computeMods(p), p.active, mapIdx, ev);
      });
      case 'idleInfo': this.idleInfo = !this.idleInfo; return this.render();
      case 'idle': this.panel = null; return this.act(() => { P.collectIdle(p); return 'Сундук накопления'; }, 'Сундук накопления');
      case 'idleFast': this.panel = null; return this.act(() => { P.fastIdle(p, v as 'free'); return 'Быстрый сбор: 2 часа'; }, 'Быстрый сбор');
      case 'sub': this.sel.heroSub = v as HeroSub; this.sel.item = this.sel.rune = undefined; return this.go('hero');
      // characters
      case 'heroView': this.sel.heroView = v; return this.render();
      case 'heroInfo': this.sel.heroInfo = true; return this.render();
      case 'bonusOpen': this.sel.bonusOpen = !this.sel.bonusOpen; return this.render();
      case 'active': return this.act(() => { P.setActive(p, v); return `В бой идёт ${hero(v).name}`; });
      case 'star': return this.act(() => { P.starUp(p, v); return `${hero(v).name}: ★${p.heroes[v].stars}`; });
      case 'unlock': return this.act(() => { P.unlockHero(p, v); return 'Герой открыт!'; }, 'Герой открыт!');
      case 'hsearch': { const [k, m] = v.split(':'); return this.act(() => { P.heroSearch(p, k === 'big', Number(m)); return 'Поиск героев'; }, 'Поиск героев', [a, v]); }
      case 'coupon': return this.act(() => { P.useCoupon(p, v === 'big'); return 'Таверна'; }, 'Таверна');
      case 'coupon10': return this.act(() => { for (let i = 0; i < 10 && p.couponsBig > 0; i++) P.useCoupon(p, true); return 'Таверна ×10'; }, 'Таверна');
      case 'buyCoupon': return this.act(() => { P.buyBigCoupon(p, n || 1); return 'Покупка'; }, 'Покупка');
      // gear
      case 'item': this.sel.item = n; return this.render();
      case 'slotEmpty': return this.toast(`Слот «${SLOT_NAME[v as Slot]}» пуст. Предметы падают с побед и продаются в сундуках магазина`);
      case 'sort': this.sel.sortSlot = !this.sel.sortSlot; return this.render();
      case 'smith': this.sel.smith = { flip: [], keep: {} }; return this.render();
      case 'smToggle': { const sm = this.sel.smith!, k = n; sm.flip = sm.flip.includes(k) ? sm.flip.filter(x => x !== k) : [...sm.flip, k]; return this.render(); }
      case 'smKeep': { const [k, u] = v.split(':').map(Number); this.sel.smith!.keep[k] = u; return this.render(); }
      case 'smAll': { const sm = this.sel.smith!, plan = P.smithPlan(p), all = plan.every(g => this.smOn(g)); sm.flip = plan.filter(g => all ? g.auto : !g.auto).map(g => g.keep); return this.render(); }
      case 'smGo': {
        const groups = P.smithPlan(p).filter(g => this.smOn(g)).map(g => this.smGroup(g));
        return this.doMerge(() => P.smithRun(p, groups).map(it => this.itemResult(it)), () => { this.sel.smith = { flip: [], keep: {} }; });
      }
      case 'equip': return this.act(() => { P.equip(p, n); return 'Надето'; });
      case 'unequip': return this.act(() => { P.unequip(p, v as Slot); this.sel.item = undefined; return 'Снято'; });
      case 'up': return this.act(() => { const d = P.upgradeItem(p, this.sel.item!, n); return `+${d} ур.`; });
      case 'merge': return this.doMerge(() => { P.merge(p, this.sel.item!); return [this.itemResult(p.items.find(x => x.uid === this.sel.item)!)]; });
      case 'resetItem': { if (!b.dataset.sure) { b.dataset.sure = '1'; const sm = b.querySelector('small'); if (sm) sm.textContent = 'Точно?'; b.classList.add('sure'); return; } return this.act(() => P.resetItem(p, this.sel.item!)); }
      case 'toMerge': this.root.querySelector('#ibmerge')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      // runes
      case 'rune': this.sel.rune = n; return this.render();
      case 'runeSlot': if (v === 'lock') return this.toast('Слот откроется следующей звездой героя');
        this.sel.runeFilter = v; this.render(); return this.toast(`Выбери руну «${RUNE_TYPE_NAME[v as RuneType]}» снизу и нажми «Вставить»`);
      case 'filter': this.sel.showFilter = !this.sel.showFilter; return this.render();
      case 'filterSet': this.sel.runeFilter = v; this.sel.showFilter = false; return this.render();
      case 'workshop': this.sel.workshop = true; this.sel.wsTab = this.sel.wsTab ?? 'merge'; this.sel.wsPick = []; this.sel.wsCenter = undefined; this.sel.rune = undefined; return this.render();
      case 'wsTab': this.sel.wsTab = v as 'merge'; return this.render();
      case 'wsClose': this.sel.workshop = false; this.sel.wsCenter = undefined; this.sel.wsPick = []; return this.render();
      case 'wsRune': return this.wsTap(p, n);
      case 'wsAuto': return this.wsAuto(p);
      case 'wsFuse': {
        const r = p.runes.find(x => x.uid === this.sel.wsCenter); if (!r || this.sel.fusing) return;
        const pick = this.sel.wsPick ?? [];
        if (pick.length < runeDupes(r.rarity)) return this.toast(`Поставь ${runeDupes(r.rarity)} ${runeDupes(r.rarity) === 1 ? 'копию' : 'копии'} в гнёзда`);
        const alt = this.root.querySelector('.altar'); this.sel.fusing = true; alt?.classList.add('fusing');
        window.setTimeout(() => {
          this.sel.fusing = false;
          this.doMerge(() => { const was = { ...r }; P.mergeRune(p, r.uid, pick); return [this.runeResult(was, r)]; }, () => { this.sel.wsPick = []; });
        }, 900);
        return;
      }
      case 'craft': return this.act(() => { P.craftRune(p, (v || undefined) as RuneType | undefined); return 'Мастерская рун'; }, 'Мастерская рун', [a, v]);
      case 'runeUp': return this.act(() => { P.upgradeRune(p, this.sel.rune!); return 'Редкость руны повышена'; });
      case 'runeMerge': { const r = p.runes.find(x => x.uid === this.sel.rune); this.sel.rune = undefined; this.sel.workshop = true; this.sel.wsTab = 'merge'; this.sel.wsCenter = r?.uid; this.sel.wsPick = []; if (r) this.wsAuto(p); return this.render(); }
      case 'runeBreak': return this.act(() => { const g = P.dismantleRune(p, this.sel.rune!); this.sel.rune = undefined; return `Руна разобрана: +${g} осколков`; });
      case 'runeToggle': return this.act(() => { P.toggleRune(p, p.active, this.sel.rune!); this.sel.rune = undefined; });
      // jeweler
      case 'jsub': this.sel.jewelSub = v as 'search'; this.sel.gem = undefined; return this.render();
      case 'explore': return this.act(() => {
        const r = P.explore(p, v as 'gold');
        const L = GEM_LOCATIONS, way = r.moved ? `дальше: ${L[r.loc + 1].name}!` : r.loc > 0 ? 'назад в Пещеру' : 'остаёмся в Пещере';
        if (r.ess) return `${r.ess.big ? '💠 Большая эссенция' : `✨ Малая эссенция ×${r.ess.small}`} · ${way}`;
        this.sel.newGem = r.uid; window.setTimeout(() => { if (this.sel.newGem === r.uid) { this.sel.newGem = undefined; if (this.screen === 'jewel') { const el = this.root.querySelector('.gtile.new'); el?.classList.remove('new'); } } }, 2500);
        return `${GEM[r.type].name} ${'★'.repeat(r.stars)} · ${way}`;
      });
      case 'gem': {
        if (this.sel.feed && this.sel.gem && this.sel.gem !== n) return this.act(() => { P.feedGem(p, this.sel.gem!, n); this.sel.feed = false; return 'Гем поглощён'; });
        this.sel.gem = n; this.sel.feed = false; return this.render();
      }
      case 'ess': return this.act(() => { P.feedEssence(p, this.sel.gem!, v === 'big', v === 'big' ? 1 : 10); });
      case 'auto': return this.auto.on ? this.autoStop() : this.autoStart();
      case 'stop3': this.auto.stop3 = !this.auto.stop3; return this.render();
      case 'synth': if (this.auto.on) this.autoStop(true); this.sel.synth = { target: this.sel.gem, foods: [], small: 0, big: 0 }; this.sel.gem = undefined; return this.render();
      case 'synClose': this.sel.synth = null; return this.render();
      case 'synReset': if (this.sel.synth) this.sel.synth = { target: this.sel.synth.target, foods: [], small: 0, big: 0 }; return this.render();
      case 'synTarget': if (this.sel.synth) this.sel.synth = { foods: [], small: 0, big: 0 }; return this.render();
      case 'synEss': {
        const S = this.sel.synth!; if (!S.target) return this.toast('Сначала выбери гем, который будешь качать');
        if (v === 'small') S.small = S.small >= p.essSmall ? 0 : Math.min(p.essSmall, S.small + 10);
        else S.big = S.big >= p.essBig ? 0 : S.big + 1;
        S.confirm = false; return this.render();
      }
      case 'synGem': {
        const S = this.sel.synth!, n = Number(v);
        if (!S.target) { S.target = n; return this.render(); }
        S.foods = S.foods.includes(n) ? S.foods.filter(x => x !== n) : [...S.foods, n]; S.confirm = false; return this.render();
      }
      case 'synGo': {
        const S = this.sel.synth!;
        if (!S.confirm && S.foods.some(u => (p.gems.find(g => g.uid === u)?.stars ?? 0) >= 3)) { S.confirm = true; this.render(); return this.toast('Среди выбранных есть гем ★3 или ★4. Нажми «Скормить» ещё раз, чтобы подтвердить', 4000); }
        return this.act(() => { const up = P.synthesize(p, S.target!, S.foods, S.small, S.big); this.sel.synth = { target: S.target, foods: [], small: 0, big: 0 }; return up ? `Синтез: +${up} ур.` : 'Синтез: опыт добавлен'; });
      }
      case 'feedMode': { this.sel.feed = true; this.render(); return this.toast('Выбери гем, который будет поглощён', 4000); }
      case 'feedCancel': this.sel.feed = false; return this.render();
      // sockets in the item window
      case 'sockLock': return this.toast(`Гнездо откроется на ур. ${P.SOCKET_LEVEL[n]} предмета`);
      case 'sockOpen': this.sel.pick = { item: this.sel.item!, idx: n }; return this.render();
      case 'sockCancel': this.sel.pick = undefined; return this.render();
      case 'sockPut': return this.act(() => { P.socketGem(p, this.sel.pick!.item, this.sel.pick!.idx, n); this.sel.pick = undefined; return 'Гем вставлен'; });
      case 'sockOut': return this.act(() => { P.unsocket(p, this.sel.item!, n); return 'Гем вынут'; });
      // tasks and black market
      case 'mail': this.panel = 'mail'; void cloud.refreshMail(true); this.render(); cloud.readMail(cloud.mail().map(l => l.id)); return;
      case 'mailClaim': return void this.claimMail([Number(v)]);
      case 'mailAll': return void this.claimMail(cloud.mail().filter(l => !l.claimed && Object.keys(l.rewards ?? {}).length).map(l => l.id));
      case 'tasks': this.panel = 'tasks'; this.sel.taskTab = P.loginClaimable(p) ? 'login' : 'day'; return this.render();
      case 'taskTab': this.sel.taskTab = v as 'day'; this.sel.tChest = undefined; return this.render();
      case 'taskClaim': { const [k, id] = v.split(':'); return this.act(() => { P.claimTask(p, k === 'w', id); return 'Задание выполнено'; }); }
      case 'taskChest': { const [k, at] = v.split(':');
        { const w = k === 'w', t = P.taskState(p!), pts = w ? P.weeklyPoints(p!) : P.dailyPoints(p!);
          if (pts < Number(at) || (w ? t.wChest : t.dChest).includes(Number(at))) { this.sel.tChest = Number(at); return this.render(); } } // not ready: show what it holds
        return this.act(() => { P.claimTaskChest(p, k === 'w', Number(at)); return 'Награда за очки'; }, 'Награда'); }
      case 'loginClaim': return this.act(() => { P.claimLogin(p); return `Награда за вход: день ${P.loginState(p).idx || 28}`; }, 'Награда за вход');
      case 'rewardOk': return this.render();
      case 'market': this.panel = 'market'; return this.render();
      case 'bp': this.panel = 'bp'; return this.render();
      case 'bpClaim': { const [k, l] = v.split(':'); return this.act(() => { P.bpClaim(p, k === 'p', Number(l)); return `Батл пасс: уровень ${l}`; }, 'Батл пасс'); }
      case 'bpAll': return this.act(() => { if (!P.bpClaimAll(p)) return 'Пока нечего забирать'; return 'Батл пасс'; }, 'Батл пасс');
      case 'bpBuy': return this.act(() => { P.bpBuy(p); return 'Батл пасс куплен'; }, 'Батл пасс');
      case 'passes': this.panel = 'passes'; return this.render();
      case 'ad': return void this.watchAd(v as P.AdKind);
      case 'pack': return this.act(() => P.buyPack(p, v), 'Пополнение');
      case 'starter': return this.act(() => P.buyStarter(p), 'Стартовый набор');
      case 'passBuy': return this.act(() => { P.passBuy(p, v as P.PassId); return P.PASSES.find(d => d.id === v)!.name; }, 'Покупка');
      case 'passClaim': return this.act(() => { const k = v ? P.passClaim(p, v as P.PassId) : P.passClaimAll(p); return k ? 'Награда пропусков' : 'Сегодня уже забрано'; }, 'Награда пропусков');
      case 'testPay': p.testPay = !p.testPay; P.save(p); return this.render();
      case 'askBuy': p.noConfirm = !p.noConfirm; P.save(p); return this.render();
      case 'gfx': p.gfx = v as 'high'; P.save(p); return this.render();
      case 'fpsT': p.fps = !p.fps; P.save(p); return this.render(); // правка 163
      case 'sfx': sfx.setSound(!sfx.soundOn()); return this.render();
      case 'vib': sfx.setVibration(!sfx.vibrationOn()); return this.render();
      case 'lang': if (v && v !== curLang) { P.save(p); setLang(v as Lang); } return;
      case 'wikiOpen': this.sel.wiki = {}; return this.render();
      case 'wikiClose': this.sel.wiki = null; return this.render();
      case 'wikiSec': if (this.sel.wiki) { this.sel.wiki.sec = v || undefined; this.sel.wiki.q = ''; } return this.render();
      case 'mktTab': this.sel.mktTab = v as 'day'; return this.render();
      case 'cycSet': this.sel.set = SETS[(SETS.indexOf(this.sel.set) + 1) % SETS.length]; return this.render();
      case 'cycElem': { const ks = Object.keys(ELEMENT_NAME) as Element[]; this.sel.mElem = ks[(ks.indexOf(this.sel.mElem) + 1) % ks.length]; return this.render(); }
      case 'cycHero': this.sel.mHero = HEROES[(HEROES.findIndex(h => h.id === this.sel.mHero) + 1) % HEROES.length].id; return this.render();
      case 'mElem': this.sel.mElem = v as Element; return this.render();
      case 'mHero': this.sel.mHero = v; return this.render();
      case 'mBuy': { const [k, id] = v.split(':'); return this.act(() => { P.buyMarket(p, k === 'm', id, { set: this.sel.set, hero: this.sel.mHero, elem: this.sel.mElem }); return 'Чёрный рынок'; }, 'Чёрный рынок'); }
      case 'wInfo': this.wheel.info = !this.wheel.info; return this.render();
      // shop
      case 'shopTab': this.sel.shopTab = v as 'chests'; return this.render();
      case 'shopSet': this.sel.set = v as SetId; return this.render();
      case 'offer': return this.act(() => { P.buyOffer(p, v); return 'Покупка'; }, 'Покупка');
      case 'buy': return this.act(() => { P.buy(p, v as never); return 'Покупка'; }, 'Покупка');
      case 'chestInfo': this.sel.chestInfo = v as ChestId; return this.render();
      case 'chest': return this.act(() => { const [id, k] = v.split(':'); P.openChest(p, id as ChestId, Number(k) as 1 | 10, this.sel.set); return CHESTS[id as ChestId].name; }, 'Сундук', [a, v]);
      case 'test': return this.act(() => { P.testCrystals(p); return 'Тестовые кристаллы'; }, 'Пополнение');
      // wheel
      case 'wheel': this.wheel.open = true; this.wheel.info = false; this.wheel.tab = P.lotteryFree(p) ? 'free' : 'adv'; return this.render();
      case 'wtab': if (!this.wheel.busy) { this.wheel.tab = v as 'adv'; this.wheel.rot = this.wheel.target = 0; } return this.render();
      case 'spin': return this.spin(p, n as 1 | 10);
      case 'reset': if (b.dataset.sure) { P.reset(); void cloud.resetAccount(); this.p = null; this.sel.heroPick = undefined; return this.go('start'); } b.dataset.sure = '1'; b.textContent = 'Точно? Нажми ещё раз'; return;
    }
  }

  private spin(p: P.Profile, n: 1 | 10, ad = false): void {
    if (this.wheel.busy) return;
    const wid = ad ? 'adv' : this.wheel.tab === 'super' ? 'super' : 'adv';
    if (!ad && this.wheel.tab === 'free' && !P.lotteryFree(p)) return this.toast('Бесплатное вращение уже было сегодня. Завтра снова');
    if (ad && this.wheel.tab === 'super') this.wheel.tab = 'adv';
    const before = this.snap();
    let idx: number[];
    try { idx = P.spin(p, wid, n, ad); P.save(p); } catch (e) { return this.toast((e as Error).message); }
    const W = P.WHEELS[wid], k = idx[idx.length - 1], N = W.prizes.length, seg = 360 / N;
    const center = k * seg + seg / 2;
    const base = this.wheel.rot;
    this.wheel.target = base + 360 * 5 + ((360 - center - (base % 360)) % 360 + 360) % 360;
    this.wheel.busy = true;
    this.render();
    window.setTimeout(() => {
      this.wheel.rot = this.wheel.target; this.wheel.busy = false;
      if (this.wheel.tab === 'free') this.wheel.tab = 'adv';
      this.reward = { title: n === 1 ? W.prizes[k].label : '10 вращений', items: this.diff(before) };
      this.render();
    }, 2900);
  }

  // ---------------- правка 172: rewarded ads ----------------
  private adBusy = false;
  /** shows the video (the permanent card skips it), then gives the reward of that place */
  private async watchAd(kind: P.AdKind): Promise<void> {
    const p = this.p;
    if (!p || this.adBusy) return;
    if (P.adLeft(p, kind) <= 0) return this.toast('На сегодня реклама здесь закончилась. Завтра снова');
    if (!P.adSkip(p)) {
      this.adBusy = true;
      const ok = await showRewardAd().finally(() => { this.adBusy = false; });
      if (!ok) return this.toast('Ролик не досмотрен — награды нет');
    }
    if (kind === 'wheel') { this.wheel.open = true; return this.spin(p, 1, true); }
    if (kind === 'energy') return this.act(() => P.adEnergy(p), 'Энергия');
    if (kind === 'chest') return this.act(() => { P.adChest(p, this.sel.set); return CHESTS.set.name; }, 'Сундук');
    if (kind === 'hero') return this.act(() => P.adHero(p), 'Поиск героев');
    if (kind === 'runes') return this.act(() => { P.adRuneChest(p); return CHESTS.runes.name; }, 'Сундук');
  }
  /** «удвоить награду» in the result window of a stage */
  private async adDouble(): Promise<void> {
    const p = this.p, r = this.reward, ad = r?.ad;
    if (!p || !r || !ad || ad.done || this.adBusy) return;
    if (P.adLeft(p, 'double') <= 0) return this.toast('На сегодня реклама здесь закончилась. Завтра снова');
    if (!P.adSkip(p)) {
      this.adBusy = true;
      const ok = await showRewardAd().finally(() => { this.adBusy = false; });
      if (!ok) return this.toast('Ролик не досмотрен — награды нет');
    }
    const before = this.snap();
    try { P.adDouble(p, ad); P.save(p); } catch (e) { return this.toast((e as Error).message); }
    ad.done = true;
    const more = this.diff(before);
    if (this.reward === r) { // the same tiles, with the doubled counts
      const items = r.items.map(x => ({ ...x }));
      for (const m of more) {
        const t = items.find(x => x.name === m.name && x.icon === m.icon && /^\d+$/.test(x.count ?? '') && /^\d+$/.test(m.count ?? ''));
        if (t) t.count = String(Number(t.count) + Number(m.count)); else items.push(m);
      }
      r.items = items; r.title = 'Награда удвоена!';
    }
    sfx.play('rewardMany');
    this.render();
  }
  /** a «watch an ad» button: ▶, what it gives, how many are left today */
  private adBtn(p: P.Profile, kind: P.AdKind, label: string, cls = 'adbtn'): string {
    const left = P.adLeft(p, kind), lim = P.AD_LIMIT[kind];
    const sub = left ? `${P.adSkip(p) ? '<em>без ролика</em> ' : ''}${lim - left}/${lim}` : 'Завтра';
    return `<button class="${cls}" data-a="ad" data-v="${kind}" ${left ? '' : 'disabled'}><span class="adi">▶</span><b>${label}</b><small>${sub}</small></button>`;
  }

  // ---------------- views ----------------
  render(): void {
    if (this.root.hidden) return;
    const p = this.p;
    if (!p || this.screen === 'start') {
      this.root.innerHTML = this.vStart() + (this.reward ? this.vReward() : '') + (this.exitAsk ? this.vExit() : '');
      this.skel = false; return;
    }
    if (!this.skel) {
      this.root.innerHTML = `<div id="uibg">${this.portalArt()}</div><div class="hdr" id="hdr">${this.hdrSkeleton()}</div><div id="view" class="scroll"></div><div id="tabs"></div><div id="layer"></div>`;
      this.skel = true; this.hdrKey = ''; this.lastView = this.lastTabs = this.lastLayer = '';
    }
    P.tick(p);
    this.updateHeader(p);
    const view = this.root.querySelector('#view') as HTMLElement;
    const field = this.root.querySelector('.gfield') as HTMLElement | null;
    const keep = view.dataset.s === this.screen + this.sel.heroSub ? view.scrollTop : 0;
    const hs0 = view.querySelector('#hscroll') as HTMLElement | null;
    if (hs0 && view.dataset.s) this.hscroll[view.dataset.s] = hs0.scrollTop; // правка 134: each tab keeps its place in the list
    const keepField = field ? field.scrollTop : 0;
    view.dataset.s = this.screen + this.sel.heroSub;
    view.className = 'scroll' + (this.screen === 'hub' ? ' mainbg' : '') + (this.screen === 'jewel' ? ' fixed' : '') + (this.screen === 'hero' ? ' fixed herofix' : '');
    this.root.classList.toggle('onhub', this.screen === 'hub');
    this.root.classList.toggle('onhero', this.screen === 'hero'); // правка 136: the temple goes up under the header
    this.root.classList.toggle('fadetop', !['hub', 'hero', 'jewel'].includes(this.screen)); // правка 139: the list fades away under the header
    const art = this.root.querySelector('.hubart') as HTMLElement | null;
    if (art && this.screen === 'hub') { art.dataset.pc = portalColor(Math.min(this.sel.map, p.maxMap + 1)); art.querySelector('.fightbtn')!.classList.toggle('off', p.energy < ENERGY.run); }
    // правка 120б: the hub ticks every second — rebuild the page only when something on it really changed
    // (a rebuild restarts every animation and makes the phone redraw the whole screen)
    const vh = this.view(p);
    if (vh !== this.lastView || !view.firstChild) {
      view.innerHTML = vh; this.lastView = vh; view.scrollTop = keep;
      const hs = view.querySelector('#hscroll') as HTMLElement | null;
      if (hs) {
        this.fitTemple(view, hs); hs.scrollTop = this.hscroll[view.dataset.s!] ?? 0;
        // fonts and pictures may change the heights a moment later — fit once more then
        const again = () => { if (hs.isConnected) { const top = hs.scrollTop; this.fitTemple(view, hs); hs.scrollTop = top; } };
        requestAnimationFrame(again); setTimeout(again, 350);
        if (!this.fitResize) { this.fitResize = true; addEventListener('resize', () => { const h = this.root.querySelector('#hscroll') as HTMLElement | null; if (h) this.fitTemple(view, h); }); }
      }
    }
    const nf = this.root.querySelector('.gfield') as HTMLElement | null;
    if (nf && this.screen === 'jewel' && (!this.sel.newGem || this.sel.synth)) nf.scrollTop = keepField;
    const th = this.vTabs(p), tabsEl = this.root.querySelector('#tabs') as HTMLElement;
    if (th !== this.lastTabs || !tabsEl.firstChild) { tabsEl.innerHTML = th; this.lastTabs = th; }
    const SCROLLERS = '#layer .panelbox, #layer .lvscroll, #layer .pscroll'; // правки 147, 152: windows with a fixed head scroll an inner box
    const pb = this.root.querySelector(SCROLLERS) as HTMLElement | null;
    const keepPanel = pb ? pb.dataset.k + ':' + pb.scrollTop : '';
    // windows that stay open across a re-render must not replay their entry animation:
    // a fade from opacity 0 lets the hub flash through on every tab switch or purchase (правка 92)
    const layer = this.root.querySelector('#layer') as HTMLElement;
    const openBefore = new Set(Array.from(layer.children, e => this.winKey(e as HTMLElement)));
    const lh = this.vModals(p) + (this.confirm ? this.vConfirm(p) : '') + (this.reward ? this.vReward() : '') + (this.exitAsk ? this.vExit() : '');
    if (lh !== this.lastLayer) {
      layer.innerHTML = lh; this.lastLayer = lh;
      for (const e of Array.from(layer.children) as HTMLElement[]) if (openBefore.has(this.winKey(e))) e.classList.add('still');
      // правка 159: a window opens or closes — its sound; a reward window — the reward sound (and a buzz for a big one)
      const now = Array.from(layer.children, e => this.winKey(e as HTMLElement)), added = now.filter(k => !openBefore.has(k));
      if (this.reward && added.some(k => k.startsWith(this.rewardKey))) {
        const many = this.reward.items.length >= 3; window.setTimeout(() => sfx.play(many ? 'rewardMany' : 'reward'), BUY_ACTS.has(this.lastAct) ? 140 : 0);
        if (this.reward.items.some(i => (i.tier ?? 0) >= 2)) sfx.vibrate('reward');
      } else if (added.length) sfx.play('open');
      else if (openBefore.size > now.length) sfx.play('close');
      if (layer.querySelector('.lvbanner.fit')) { this.fitBanners(); requestAnimationFrame(() => this.fitBanners()); }
    }
    // правка 120б: with a window open the hub behind it stands still (its animations would only heat the phone)
    this.root.classList.toggle('modalopen', layer.childElementCount > 0);
    const nb = this.root.querySelector(SCROLLERS) as HTMLElement | null;
    if (nb && keepPanel) { const [k, top] = keepPanel.split(':'); if (k === nb.dataset.k) nb.scrollTop = Number(top); }
    // start the wheel animation after the element exists with its old angle
    if (this.wheel.busy) {
      const w = this.root.querySelector('.wheel') as HTMLElement | null;
      if (w) requestAnimationFrame(() => requestAnimationFrame(() => { w.style.transition = 'transform 2.7s cubic-bezier(.15,.75,.2,1)'; w.style.transform = `rotate(${this.wheel.target}deg)`; }));
    }
  }


  private view(p: P.Profile): string {
    switch (this.screen) {
      case 'hero': return this.vHero(p);
      case 'jewel': return this.vJewel(p);
      case 'shop': return this.vShop(p);
      case 'balls': return orbBalls(p);
      case 'events': return this.vEvents(p);
      case 'settings': return this.vSettings(p);
      default: return this.vHub(p);
    }
  }

  private title(t: string): string { return `<div class="room-head"><h2>${t}</h2></div>`; }

  /** head-and-shoulders avatar */
  heroSvg(id: string): string {
    return `<img class="hface" src="${heroPic(id, hero(id).element, 'face', 120)}" alt="" draggable="false">`;
  }

  /** whole figure, casting */
  private heroBig(id: string, size = 150): string {
    const img = `<img class="herobig${hasHeroImg(id) ? ' live' : ''}" src="${heroPic(id, hero(id).element, 'full', Math.round(size * 2))}" width="${size}" height="${size}" alt="" draggable="false">`;
    return hasHeroImg(id) ? `<span class="herowrap" style="--c:${EL_HEX[hero(id).element]};width:${size}px;height:${size}px">${img}</span>` : img;
  }

  /** the header is built once and then only updated, so the corner rings can animate between tabs */
  private hdrSkeleton(): string {
    return `<button class="corner left" data-a="sub" data-v="chars"><span class="ring" id="hAva"></span><span class="lvl" id="hLvl"></span></button>
      <div class="side left"><button class="setbtn" data-a="go" data-v="settings" aria-label="Настройки">⚙<small class="sbl">Настройки</small></button><button class="setbtn" id="hLot" data-a="wheel" aria-label="Колесо удачи">🎡<small class="sbl">Колесо</small></button><button class="setbtn bpbtn" id="hBp" data-a="bp" aria-label="Батл пасс">${BP_ICON}<small class="sbl">Батл пасс</small></button><button class="setbtn passbtn" id="hPass" data-a="passes" aria-label="Пропуски">${PASS_ICON}<small class="sbl">Пропуски</small></button></div>
      <div class="side right"><button class="setbtn" id="hMail" data-a="mail" aria-label="Почта" hidden>${MAIL_ICON}<small class="sbl">Почта</small></button><button class="setbtn" id="hTask" data-a="tasks" aria-label="Задания">📋<small class="sbl">Задания</small></button><button class="setbtn" id="hMkt" data-a="market" aria-label="Чёрный рынок">${MARKET_ICON}<small class="sbl">Рынок</small></button></div>
      <div class="res"><span id="hGold"></span><span id="hCr"></span></div>
      <div class="corner right" id="hEn">
        <svg class="ering" viewBox="0 0 100 100"><defs><clipPath id="eClip"><circle cx="50" cy="50" r="45"/></clipPath>
          <linearGradient id="eLiq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ff0ff"/><stop offset=".5" stop-color="#2fa8ff"/><stop offset="1" stop-color="#1546b8"/></linearGradient></defs>
          <circle cx="50" cy="50" r="46" fill="#0b1230e6"/>
          <g clip-path="url(#eClip)"><g id="hLiq">
            <path class="wv w2" d="M0,2 Q12.5,-3 25,2 T50,2 T75,2 T100,2 T125,2 T150,2 T175,2 T200,2 V120 H0 Z" fill="#2fa8ff" opacity=".45"/>
            <path class="wv w1" d="M0,0 Q12.5,-5 25,0 T50,0 T75,0 T100,0 T125,0 T150,0 T175,0 T200,0 V120 H0 Z" fill="url(#eLiq)"/>
            <circle class="bub b1" cx="34" cy="70" r="2.2"/><circle class="bub b2" cx="58" cy="80" r="1.6"/><circle class="bub b3" cx="46" cy="76" r="2.6"/></g></g>
          <ellipse cx="34" cy="28" rx="16" ry="8" fill="#ffffff22" transform="rotate(-30 34 28)"/>
          <circle cx="50" cy="50" r="46" fill="none" stroke="#cfeaff66" stroke-width="2"/>
          <circle id="hRim" cx="50" cy="50" r="47.5" fill="none" stroke-width="4.5"/></svg>
        <span class="eval"><b id="hEv"></b><small id="hEt"></small></span></div>`;
  }

  private updateHeader(p: P.Profile): void {
    const $ = (id: string) => this.root.querySelector('#' + id) as HTMLElement;
    const hdr = $('hdr');
    hdr.classList.add('mini'); // правка 141: the same small rings on every screen, the Portal included
    const h = p.heroes[p.active], hd = hero(p.active);
    if (this.hdrKey !== p.active) { $('hAva').innerHTML = this.heroSvg(p.active); this.hdrKey = p.active; }
    (hdr.querySelector('.corner.left') as HTMLElement).style.setProperty('--c', EL_HEX[hd.element]);
    $('hLvl').textContent = String(h.level);
    $('hGold').innerHTML = COIN + fmt(p.gold);
    $('hCr').innerHTML = GEM_ICON + fmt(p.crystals);
    const emax = P.energyMax(p), fc = Math.min(1, p.energy / emax);
    $('hLiq').setAttribute('transform', `translate(0 ${(4 + 92 * (1 - fc)).toFixed(1)})`);
    const en = $('hEn');
    en.classList.toggle('full', p.energy === emax); en.classList.toggle('over', p.energy > emax);
    $('hEv').textContent = String(p.energy);
    const t = P.energyNext(p);
    $('hEt').textContent = t && p.energy < emax ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : '';
    // правка 165: закрытые разделы не показываются на Портале
    $('hLot').hidden = !P.unlocked(p, 'wheel'); $('hMkt').hidden = !P.unlocked(p, 'market');
    $('hBp').hidden = !P.unlocked(p, 'bp'); $('hPass').hidden = !P.unlocked(p, 'passes');
    $('hLot').classList.toggle('hot', P.lotteryAttention(p));
    $('hTask').classList.toggle('dot', P.tasksAttention(p));
    $('hMkt').classList.toggle('dot', P.marketAttention(p));
    $('hBp').classList.toggle('dot', P.bpAttention(p));
    $('hPass').classList.toggle('dot', P.passAttention(p));
    // правка 202: mail — only in the app (the server is there), red dot while a letter waits
    $('hMail').hidden = !cloud.mailReady(); $('hMail').classList.toggle('dot', cloud.mailAttention());
  }


  /** the portal screen: three coloured pictures cross-fade; swirl, bubbles, runes and sparks move on top */
  private portalArt(): string {
    const rune = [[352, 572], [262, 600], [442, 600], [196, 668], [508, 668], [186, 790], [518, 790], [190, 880], [514, 880]];
    const px = (x: number) => (100 * x / 704).toFixed(2) + '%', py = (y: number) => (100 * y / 1524).toFixed(2) + '%';
    const bub = Array.from({ length: 9 }, (_, i) => `<i class="pbub" style="left:${10 + (i * 37) % 80}%;--d:${(i * 0.53).toFixed(2)}s;--s:${4 + (i % 3) * 3}px"></i>`).join('');
    const emb = Array.from({ length: 16 }, (_, i) => `<i class="pemb" style="left:${px(180 + (i * 97) % 350)};top:${py(560 + (i * 53) % 440)};--d:${(i * 0.37).toFixed(2)}s;--x:${((i % 5) - 2) * 9}px"></i>`).join('');
    return `<div class="hubart" data-pc="green">
      ${(['green', 'red', 'blue'] as const).map(c => `<div class="pl pl-${c}" style="background-image:url(${PORTAL_BG[c]})"></div>`).join('')}
      <div class="pglow" style="left:${px(150)};top:${py(470)};width:${px(404)};height:${py(600)}"></div>
      <div class="popen" style="left:${px(226)};top:${py(610)};width:${px(266)};height:${py(394)}"><i class="psw s1"></i><i class="psw s2"></i>${bub}<i class="pflash"></i></div>
      ${rune.map(([x, y], i) => `<i class="prune" style="left:${px(x)};top:${py(y)};--d:${(i * 0.45).toFixed(2)}s"></i>`).join('')}
      ${emb}
      <button class="phit" data-a="battle" aria-label="В бой" style="left:${px(210)};top:${py(560)};width:${px(300)};height:${py(440)}"></button>
      <button class="fightbtn lv" data-a="battle" style="top:${py(1010)}"><span class="fb-cr"></span><span class="fb-sp">${'<i></i>'.repeat(8)}</span><b>В бой</b><small>${ENERGY.run}${resImg('energy')}</small></button>
    </div>`;
  }

  private vTabs(p: P.Profile): string {
    const dot = (s: Screen) => (s === 'events' && P.eventsAttention(p)) || (s === 'shop' && P.giftAttention(p)) ? '<i class="dotr"></i>' : ''; // правки 142, 165
    const lock = (s: Screen) => (s === 'jewel' && !P.unlocked(p, 'jewel')) || (s === 'events' && !P.evUnlocked(p)); // правка 165
    const t = (s: Screen, name: string) => `<button class="tab${this.screen === s ? ' on' : ''}${lock(s) ? ' locked' : ''}" data-a="go" data-v="${s}"><span>${TAB_ICON[s]}</span><small>${name}</small>${lock(s) ? '<i class="tlk">🔒</i>' : dot(s)}</button>`;
    return `<nav class="tabs">${t('shop', 'Магазин')}${t('balls', 'Шары')}${t('hub', 'Портал')}${t('hero', 'Герой')}${t('events', 'События')}</nav>`;
  }

  private vStart(): string {
    const pick = this.sel.heroPick;
    const cards = HEROES.map(h => `<button class="hcard${pick === h.id ? ' sel' : ''}" style="--c:${EL_HEX[h.element]}" data-a="startPick" data-v="${h.id}">
      <span class="ava svg">${this.heroSvg(h.id)}</span><span><b>${h.name}</b><small>${ELEMENT_NAME[h.element]}</small></span></button>`).join('');
    const h = pick ? hero(pick) : null;
    return `<div class="start">
      <div class="otitle slogo2">${curLang === 'ru' ? '<b>Защита шарами</b><span>Олимп</span>' : curLang === 'uk' ? '<b>Захист кулями</b><span>Олімп</span>' : '<b>Orb Defense</b><span>Olympus</span>'}</div>
      <p>Боги Олимпа доверили тебе стену. Сбивай волны врагов магическими шарами: целься, отскакивай от стен поля, собирай шары в залп. Выбери первого героя — остальных найдёшь в магазине.</p>
      <div class="hgrid">${cards}</div>
      <p class="pickinfo">${h ? `<b>${h.name}</b>: <span>${BALLS[HERO_BALL[h.id]]?.name ?? ''}</span>. <span>${trS(BALLS[HERO_BALL[h.id]]?.desc(1) ?? '')}</span>` : 'Нажми на героя, чтобы узнать о нём'}</p>
      <button class="big" data-a="startGo" ${pick ? '' : 'disabled'}>Начать</button></div>`;
  }

  private vHub(p: P.Profile): string {
    const n = Math.min(this.sel.map, p.maxMap + 1);
    const biome = BIOME_NAME[stageBiome(n)];
    const idle = P.idlePreview(p), hrs = P.idleHours(p);
    return `<div class="main">
      <div class="stage"><button class="arrow" data-a="map" data-v="${n - 1}" ${n > 1 ? '' : 'disabled'}>${CHEV(-1)}</button>
        <h2>Этап ${n}</h2><button class="arrow" data-a="map" data-v="${n + 1}" ${n <= p.maxMap ? '' : 'disabled'}>${CHEV(1)}</button></div>
      <div class="muted">${biome}${n > p.maxMap ? ' · новый' : ' · пройден'}</div>
      <button class="idlechest${hrs >= IDLE.capH ? ' cap' : ''}" data-a="idleOpen" aria-label="Сундук накопления">${chestSvg(hrs < IDLE.capH / 2 ? 0 : hrs < IDLE.capH ? 1 : 2)}
        <small>${hrs >= IDLE.capH ? 'полон' : `${Math.floor(IDLE.capH - hrs)}ч ${Math.floor(((IDLE.capH - hrs) % 1) * 60)}м`}</small>${P.fastIdleFree(p) ? '<i class="dotr"></i>' : ''}</button>
      </div>`;
  }

  // ================= правки 112, 115: wall defence (the button on the hub is gone, правка 142 — the wall opens from Events) =================
  private elBadge(el: Element, up: boolean): string {
    return `<span class="welb ${up ? 'up' : 'dn'}" style="--c:${EL_HEX[el]}"><img src="${ICONS['e_' + el]}" alt=""><b>${ELEMENT_NAME[el]}</b><em>${up ? '+50%' : '−50%'}</em></span>`;
  }
  private vWall(p: P.Profile): string {
    const w = P.wallState(p), idx = P.wallMapToday(), map = WALL_MAPS[idx], left = P.wallFreeLeft(p), ms = P.wallMapLeft();
    const hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60;
    const tomorrow = WALL_MAPS[(idx + 1) % WALL_MAPS.length];
    const chests = P.WALL_CHESTS.map(c => `<div class="wch${w.chests.includes(c.at) ? ' got' : ''}">${chestSvg(w.chests.includes(c.at) ? 2 : c.at / 10 - 1, 40)}<b>Волна ${c.at}</b><small>${c.label}</small>${w.chests.includes(c.at) ? '<i class="seal"></i>' : ''}</div>`).join('');
    const go = left > 0
      ? `<button class="lvbtn wide" data-a="wallGo"><b>В бой</b><small>бесплатно · осталось ${left} из ${WALL.freePerDay}</small></button>`
      : `<button class="lvbtn wide" data-a="wallGo" data-v="paid"><b>Ещё попытка</b><small>${WALL.extraCost} ${GEM_ICON}</small></button>`;
    return `<div class="modal" data-a="close"><div class="mbox lvpanel wallpanel">
      <div class="lvtabs"><b class="wtitle">Защита стены</b><button class="lvsq x" data-a="close">✕</button></div>
      <div class="panelbox" data-k="wall">
        <div class="wmap" style="background-image:url(wall/bg_${map.id}.webp)"><img class="wwall" src="wall/wall.webp" alt=""><div class="wmname"><small>Карта дня</small><b>${map.name}</b><em>смена через ${hh}ч ${mm}м · завтра: ${tomorrow.name}</em></div></div>
        <div class="welrow">${this.elBadge(map.strong, true)}${this.elBadge(map.weak, false)}</div>
        <div class="lvsub">Герой защищает стену и уклоняется от ударов врага. После каждой отбитой атаки — выбор навыка.</div>
        <div class="wrec"><span><small>Сегодня</small><b>${w.best}</b></span><span><small>Неделя</small><b>${w.bestWeek}</b></span><span><small>Рекорд</small><b>${w.bestAll}</b></span><span><small>Эта карта</small><b>${w.byMap[map.id] ?? 0}</b></span></div>
        <div class="wrw"><small>Награда за каждую волну: золото, каждые 5 волн — свитки. Сундуки — каждый день:</small><div class="wchs">${chests}</div></div>
        ${go}
        <button class="lvbtn wide alt" data-a="rating"><b>Рейтинг</b></button>
      </div></div></div>`;
  }
  /** правка 112: the leaderboard waits for the server; for now only the player's own line, no invented players */
  private vRating(p: P.Profile): string {
    const w = P.wallState(p), map = WALL_MAPS[P.wallMapToday()], tab = this.rateTab;
    const tb = (id: 'week' | 'all' | 'map', name: string) => `<button class="${tab === id ? 'on' : ''}" data-a="rateTab" data-v="${id}">${name}</button>`;
    const wave = tab === 'week' ? w.bestWeek : tab === 'all' ? w.bestAll : w.byMap[map.id] ?? 0;
    const run = tab === 'week' ? w.weekRun : undefined;
    const hd = hero(run?.hero ?? p.active);
    const row = `<div class="rrow me"><span class="rpos">—</span><span class="rava" style="--c:${EL_HEX[hd.element]}">${this.heroSvg(hd.id)}</span><div class="grow"><b>Ты</b><small>${hd.name} · сила ${run?.power ?? P.powerScore(p)}</small></div><span class="rwave"><b>${wave}</b><small>волн${run ? ` · ${Math.floor(run.time / 60)}:${String(run.time % 60).padStart(2, '0')}` : ''}</small></span></div>`;
    return `<div class="modal" data-a="close"><div class="mbox lvpanel ratepanel">
      <div class="lvtabs">${tb('week', 'Неделя')}${tb('all', 'Всё время')}${tb('map', 'Карта дня')}<button class="lvsq x" data-a="close">✕</button></div>
      <div class="panelbox" data-k="rate">${this.lvBanner(tab === 'map' ? map.name : 'Защита стены', 'sm')}${row}
        <div class="rsoon">Рейтинг игроков откроется с сервером.<br><small>Твой лучший забег недели уже сохранён вместе с записью боя — сервер проверит его повтором.</small></div>
        <button class="lvbtn wide alt" data-a="wallOpen"><b>Назад</b></button></div></div></div>`;
  }

  private bonusCard(p: P.Profile): string {
    const m = P.computeMods(p), st = P.statSheet(p), n = P.statNum;
    if (!this.sel.bonusOpen) return `<button class="card bonusrow" data-a="bonusOpen"><span>⚔️ Сила <b>${P.powerScore(p)}</b></span><small>атака ${n(st.atk)} · здоровье ${n(st.hp)}</small><i>▾</i></button>`;
    // правка 155: where attack and health come from — plain numbers, then the percent bonuses on top
    const src = (h: number, g: number, gm: number, pc: number) => `герой ${n(h)} + снаряжение ${n(g)}${gm >= 0.05 ? ` + гемы ${n(gm)}` : ''}${pc ? ` · бонусы ${pc > 0 ? '+' : '−'}${Math.round(Math.abs(pc) * 100)}%` : ''}`;
    return `<div class="card bonusopen">
        <button class="bonusrow flat" data-a="bonusOpen"><span>⚔️ Сила <b>${P.powerScore(p)}</b></span><small>бонусы в забег от героя и снаряжения</small><i>▴</i></button>
        <div class="stats">
          <span class="stw">⚔️ атака <b>${n(st.atk)}</b><small>${src(st.hero.atk, st.gear.atk, st.gems.atk, st.atkPct)}</small></span>
          <span class="stw">❤️ здоровье <b>${n(st.hp)}</b><small>${src(st.hero.hp, st.gear.hp, st.gems.hp, st.hpPct)}</small></span><span>защита ${pct(m.def)}</span>
          ${m.crit ? `<span>крит ${pct(m.crit)} ×${m.critDmg.toFixed(2)}</span>` : ''}${m.speed !== 1 ? `<span>скорость ${pct(m.speed - 1)}</span>` : ''}
          ${m.atkSpeed !== 1 ? `<span>скор. атаки ${pct(m.atkSpeed - 1)}</span>` : ''}${m.area !== 1 ? `<span>площадь ${pct(m.area - 1)}</span>` : ''}
          ${m.pickup !== 1 ? `<span>подбор ${pct(m.pickup - 1)}</span>` : ''}${m.regen ? `<span>лечение ${(m.regen * 100).toFixed(1)}%/5с</span>` : ''}
          ${m.boss ? `<span>по боссам ${pct(m.boss)}</span>` : ''}${m.vamp ? `<span>вампиризм ${(m.vamp * 100).toFixed(1)}%</span>` : ''}
          ${Object.entries(m.elem).map(([e, v]) => `<span>${ELEMENT_NAME[e as Element]} ${pct(v!)}</span>`).join('')}
        </div>${this.specials(p)}</div>`;
  }

  /** set effects of the worn gear and what the runes open, as small chips */
  private specials(p: P.Profile): string {
    const out: string[] = [];
    for (const sl of SLOTS) {
      const it = P.equippedItem(p, sl);
      if (it?.set && it.rarity >= 2) { const fx = SET_FX[it.set][sl]; out.push(`<span class="spc" style="--c:${SET_COLOR[it.set]}">${fx.name}${it.rarity >= MYTHIC ? ' ★' : ''}</span>`); }
    }
    const h = p.heroes[p.active];
    for (const uid of h.runes.slice(0, runeSlots(h.stars))) {
      const r = p.runes.find(x => x.uid === uid);
      if (r && runeTier(r.rarity) > 0) out.push(`<span class="spc rune" style="--c:${RARITY_COLOR[r.rarity]}">${P.runeShort(r)}</span>`);
    }
    return out.length ? `<div class="spcs"><small>Особые эффекты</small>${out.join('')}</div>` : '';
  }

  // ================= hero: Персонажи / Снаряжение / Руны =================
  private slotCard(p: P.Profile, s: Slot): string {
    const it = P.equippedItem(p, s);
    if (!it) return `<button class="gslotcard empty" data-a="slotEmpty" data-v="${s}"><span class="si">${itemSvg(s, s === 'book' ? 'guard' : null, 34)}</span><small>${SLOT_NAME[s]}</small></button>`;
    return `<button class="gslotcard t${R_TIER[it.rarity]} p${R_PLUS[it.rarity]}" data-a="item" data-v="${it.uid}" style="--r:${RARITY_COLOR[it.rarity]}">
      <span class="lv">Ур. ${it.level}</span><span class="si">${itemSvg(s, it.set, 52, it.rarity)}</span>${plusFrame(it.rarity)}${P.canMerge(p, it) ? '<span class="dot">!</span>' : ''}</button>`;
  }

  private itemCard(p: P.Profile, it: P.Item): string {
    return `<button class="icard t${R_TIER[it.rarity]} p${R_PLUS[it.rarity]}" data-a="item" data-v="${it.uid}" style="--r:${RARITY_COLOR[it.rarity]}">
      <span class="si">${itemSvg(it.slot, it.set, 46, it.rarity)}</span>
      ${plusFrame(it.rarity)}${it.level > 1 ? `<span class="lv">${it.level}</span>` : ''}${P.canMerge(p, it) ? '<span class="dot">!</span>' : ''}</button>`;
  }

  /** правка 155: how the main number changes if this item replaces the worn one */
  private itemDiff(it: P.Item, cur: P.Item): string {
    const a = P.itemBase(it), b = P.itemBase(cur), k = GEAR_MAIN[it.slot].stat, d = (a[k] ?? 0) - (b[k] ?? 0);
    if (Math.abs(d) < 0.05) return '';
    return ` · <b class="${d > 0 ? 'ok' : 'no'}">${k === 'atk' ? 'атака' : 'здоровье'} ${d > 0 ? '+' : '−'}${P.statNum(Math.abs(d))}</b>`;
  }
  private itemStats(it: P.Item): string {
    const b = P.itemBase(it), f = (v: number) => { const x = v * 100; return (x < 10 ? x.toFixed(1) : x.toFixed(0)).replace('.0', '').replace('.', ','); };
    const parts: string[] = [];
    if (b.atk) parts.push(`<b class="stm">⚔️ атака +${P.statNum(b.atk)}</b>`); // правка 155: plain numbers
    if (b.hp) parts.push(`<b class="stm">❤️ здоровье +${P.statNum(b.hp)}</b>`);
    if (b.def) parts.push(`защита +${f(b.def)}%`);
    if (b.speed) parts.push(`скорость +${f(b.speed)}%`);
    if (b.atkSpeed) parts.push(`скор. атаки +${f(b.atkSpeed)}%`);
    if (b.crit) parts.push(`крит +${f(b.crit)}%`);
    return parts.join(', ') || '—';
  }

  /** правка 134: scroll place of the list on each hero tab */
  private hscroll: Record<string, number> = {};
  private fitResize = false;
  /** правка 134: on a short screen the temple shrinks so that at least two rows of the list stay in view */
  /** правки 135, 143: one temple height for all three tabs, so the tab shelf never jumps. On a short screen the empty hall
   *  above the hero is cut and, if that is not enough, the temple shrinks — worked out from the screen alone, the same on every tab */
  private fitTemple(view: HTMLElement, hs: HTMLElement): void {
    const t = view.querySelector('.stagebox.temple') as HTMLElement | null; if (!t) return;
    t.style.zoom = ''; t.style.removeProperty('--cut'); t.style.removeProperty('--hz');
    const ht = (this.root.querySelector('#hdr') as HTMLElement).getBoundingClientRect().height;
    const TEMPLE = 340, SHELF = 42 + 12, HEAD = 86, LIST = 1.5 * 76 + 14; // HEAD: the tallest strip above a list (runes: toolbar + filter)
    let short = ht + TEMPLE + SHELF + HEAD + LIST - view.clientHeight; if (short <= 4) return;
    const cut = Math.min(short, 60); t.style.setProperty('--cut', cut + 'px'); short -= cut; if (short <= 4) return;
    const h = TEMPLE - cut, z = Math.max(0.62, (h - short) / h);
    t.style.zoom = String(z); t.style.setProperty('--hz', String(1 / z));
    void hs;
  }

  private vHero(p: P.Profile): string {
    const sub = this.sel.heroSub;
    const subtabs = `<div class="subtabs">
      <button class="${sub === 'chars' ? 'on' : ''}" data-a="sub" data-v="chars">🦸 Персонажи</button>
      <button class="${sub === 'gear' ? 'on' : ''}" data-a="sub" data-v="gear">⚒️ Снаряжение</button>
      <button class="${sub === 'runes' ? 'on' : ''}${P.unlocked(p, 'runes') ? '' : ' locked'}" data-a="sub" data-v="runes">${P.unlocked(p, 'runes') ? 'ᚱ' : '🔒'} Руны</button></div>`;
    let top = '', body = '', list = '';
    const hd = hero(p.active);
    if (sub === 'gear') {
      const st = P.statSheet(p);
      top = `<div class="stagebox temple gearhall" style="--c:${EL_HEX[hd.element]}">${templeBg(this.heroBig(p.active, 164))}
        <div class="gcol l">${this.slotCard(p, 'book')}${this.slotCard(p, 'amulet')}${this.slotCard(p, 'ring')}</div>
        <div class="gcol r">${this.slotCard(p, 'mantle')}${this.slotCard(p, 'gloves')}${this.slotCard(p, 'boots')}</div>
        <div class="tstats"><button class="obtside" data-a="o:spirits">${spiritBtnPic(p)}<small>Духи</small></button><div class="atkhp"><span>⚔️ ${P.statNum(st.atk)}</span><span>❤️ ${P.statNum(st.hp)}</span></div><button class="obtside" data-a="o:walls">${wallBtnPic(p)}<small>Стены</small></button></div></div>`; // правка 143: no «Сила» here; правка 155: plain attack and health
      const free = p.items.filter(i => !Object.values(p.equipped).includes(i.uid));
      const sorted = free.sort(this.sel.sortSlot
        ? (a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || b.rarity - a.rarity || b.level - a.level
        : (a, b) => b.rarity - a.rarity || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || b.level - a.level);
      body = `<div class="toolbar"><button class="pill" data-a="sort">${this.sel.sortSlot ? 'По слоту' : 'По качеству'}</button>
        <span class="muted small">${resImg('scrolls')} ${fmt(p.scrolls)}</span><button class="pill" data-a="go" data-v="jewel">💎 Ювелирня</button><button class="pill smithpill" data-a="smith">⚒ Кузнец${P.smithPlan(p).some(g => g.auto) ? '<i class="dot">!</i>' : ''}</button></div>
        ${sorted.length ? '' : '<p class="muted">Пусто. Предметы падают с побед и продаются в магазине</p>'}`;
      list = `<div class="igrid">${padCells(sorted.map(it => this.itemCard(p, it))).join('')}</div>`;
    } else if (sub === 'chars') {
      const id = this.sel.heroView && p.heroes[this.sel.heroView] ? this.sel.heroView : p.active;
      const vd = hero(id), h = p.heroes[id];
      const perks = [
        `Стрела с начала забега: ${ELEMENT_EFFECT[vd.element]}`,
        `★1–5: сила эффекта стрелы +20% за звезду (сейчас +${20 * Math.min(5, h.stars)}%)`,
        `★6–10: урон стихии «${ELEMENT_NAME[vd.element]}» +5% за звезду (сейчас +${5 * Math.max(0, h.stars - 5)}%)`,
        `Слотов рун: ${runeSlots(h.stars)} из 6`,
        `Уровень: атака +${HERO_STAT.atkLv}, здоровье +${HERO_STAT.hpLv} за уровень (сейчас +${P.statNum(HERO_STAT.atkLv * (h.level - 1))} / +${P.statNum(HERO_STAT.hpLv * (h.level - 1))})`,
      ];
      const need = h.stars < 10 ? STAR_PARTICLES[h.stars] : 0, lvl = h.stars < 10 ? STAR_LEVEL[h.stars] : 0;
      const xpNeed = heroXpFor(h.level), canStar = h.particles >= need && h.level >= lvl;
      top = `<div class="stagebox chars temple" style="--c:${EL_HEX[vd.element]}">${templeBg(this.heroBig(id, 150))}
        <div class="hcenter"><div class="hname">${vd.name}</div></div>
        <div class="perks compact rpanel"><b><span class="elw">${ELEMENT_NAME[vd.element]}</span> · ур. ${h.level}</b>
          ${h.owned ? `<div class="xpbar"><i style="width:${Math.min(100, 100 * h.xp / xpNeed).toFixed(0)}%"></i><em>опыт ${h.xp}/${xpNeed}</em></div>` : ''}
          <div class="starrow">${Array.from({ length: 10 }, (_, k) => `<i class="${k < h.stars ? 'on' : ''}">★</i>`).join('')}</div>
          <button class="infobtn" data-a="heroInfo">Бонусы героя <span>i</span></button>
          <div class="btns">
            ${!h.owned ? `<button class="btn ${h.particles >= HERO_UNLOCK_PARTICLES ? 'big2' : ''}" data-a="unlock" data-v="${id}" ${h.particles >= HERO_UNLOCK_PARTICLES ? '' : 'disabled'}>Открыть · ${h.particles}/${HERO_UNLOCK_PARTICLES}</button>` : ''}
            ${h.owned && p.active !== id ? `<button class="btn" data-a="active" data-v="${id}">В бой</button>` : ''}
            ${h.owned && h.stars < 10 ? `<button class="btn starbtn${canStar ? ' big2 ready' : ''}" data-a="star" data-v="${id}" ${canStar ? '' : 'disabled'}>Повысить ★
              <small><span class="${h.particles >= need ? 'ok' : 'no'}">частицы ${h.particles}/${need}${h.particles >= need ? ' ✓' : ''}</span>${h.level < lvl ? `<span class="no">нужен ур. ${lvl}</span>` : ''}</small></button>` : ''}
          </div></div></div>`;
      if (this.sel.heroInfo) this.heroInfoHtml = `<div class="modal" data-a="close"><div class="mbox" style="--r:${EL_HEX[vd.element]}"><div class="mhead"><div><b>${vd.name}: бонусы</b><div class="muted small">${ELEMENT_NAME[vd.element]} · ★${h.stars}</div></div><button class="x" data-a="close">✕</button></div>
        <div class="perklist">${perks.map(x => `<div>${x}</div>`).join('')}</div></div></div>`;
      const day = P.heroOfDay();
      const cards = HEROES.map(x => {
        const s = p.heroes[x.id];
        const goal = s.owned ? (s.stars < 10 ? STAR_PARTICLES[s.stars] : 0) : HERO_UNLOCK_PARTICLES;
        const full = goal > 0 && s.particles >= goal;
        return `<button class="hcard2${s.owned ? '' : ' locked'}${id === x.id ? ' sel' : ''}${p.active === x.id ? ' act' : ''}" data-a="heroView" data-v="${x.id}" style="--c:${EL_HEX[x.element]}">
          ${p.active === x.id ? '<span class="using">в бою</span>' : ''}${x.id === day ? '<span class="dayb">×5</span>' : ''}${s.owned ? '' : '<span class="lock">🔒</span>'}
          <span class="pic" style="--bg:url('${EL_BG[x.element]}')">${this.heroSvg(x.id)}</span><small class="nm">${x.name}</small>
          <span class="pbar${full ? ' full' : ''}"><i style="width:${goal ? Math.min(100, 100 * s.particles / goal) : 100}%"></i><em>${goal ? `${s.particles}/${goal}` : 'MAX'}</em></span></button>`;
      }).join('');
      body = this.bonusCard(p); list = `<div class="hgrid2">${cards}</div>`;
    } else {
      top = this.runeStage(p);
      [body, list] = this.runeList(p);
    }
    // правка 134: the temple, the tabs and the toolbar stand still — only the list scrolls
    return top + subtabs + `<div class="subbody"><div class="shead">${body}</div><div class="hscroll" id="hscroll">${list}</div></div>`;
  }

  // ---------------- runes ----------------
  runeBadge(r: P.Rune, size = 50): string { return runeStone(r, size, r.skill ? SKILL_ICON[r.skill] : undefined); }

  private runeStage(p: P.Profile): string {
    const h = p.heroes[p.active], hd = hero(p.active), ns = runeSlots(h.stars);
    const pos = [[4, 4], [0, 37], [6, 70], [96, 4], [100, 37], [94, 70]]; // % left/top: three on each side
    const short: Record<RuneType, string> = { bless: 'Благосл.', boost: 'Усиление', skill: 'Навык' };
    const slots = [0, 1, 2, 3, 4, 5].map(i => {
      const [x, y] = pos[i], st = `left:${x}%;top:${y}%`, type = RUNE_SLOT_TYPE[i];
      if (i >= ns) return `<button class="rslot lock ${type}" style="${st}" data-a="runeSlot" data-v="lock"><svg viewBox="0 0 100 100" class="rsh2"><path d="${STONE_SHAPE[type]}"/></svg><span>🔒</span><small>★${i - 1}</small></button>`;
      const r = p.runes.find(q => q.uid === h.runes[i]);
      return r ? `<button class="rslot full" style="${st}" data-a="rune" data-v="${r.uid}">${this.runeBadge(r, 70)}</button>`
        : `<button class="rslot ${type}" style="${st}" data-a="runeSlot" data-v="${type}"><svg viewBox="0 0 100 100" class="rsh2"><path d="${STONE_SHAPE[type]}"/></svg><span>+</span><small>${short[type]}</small></button>`;
    }).join('');
    return `<div class="stagebox runes temple" style="--c:${EL_HEX[hd.element]}">${templeBg(this.heroBig(p.active, 140))}<div class="arc">${slots}</div>
      <div class="tstats"><span class="plaque">${hd.name}</span><div class="muted small">слотов ${ns} из 6</div></div></div>`;
  }

  /** worth putting on: a stronger copy of a worn kind, or a free slot of its type */
  private runeBetter(p: P.Profile, r: P.Rune): boolean {
    const h = p.heroes[p.active], ns = runeSlots(h.stars), key = P.runeKey(r);
    const on = h.runes.slice(0, ns).map(u => p.runes.find(x => x.uid === u)).filter(Boolean) as P.Rune[];
    const same = on.find(x => P.runeKey(x) === key);
    if (same) return r.rarity > same.rarity;
    return RUNE_SLOT_TYPE.some((t, i) => i < ns && t === P.runeType(r) && h.runes[i] === null);
  }

  private runeList(p: P.Profile): [string, string] {
    const used = new Set(Object.values(p.heroes).flatMap(h => h.runes).filter((x): x is number => x !== null));
    const f = (RUNE_TYPES as readonly string[]).includes(this.sel.runeFilter) ? this.sel.runeFilter as RuneType : 'all';
    const order = (r: P.Rune) => RUNE_TYPES.indexOf(P.runeType(r));
    const list = p.runes.filter(r => !used.has(r.uid) && (f === 'all' || P.runeType(r) === f))
      .sort((a, b) => b.rarity - a.rarity || order(a) - order(b) || P.runeKey(a).localeCompare(P.runeKey(b)));
    const chips = `<div class="rtabs">${[['all', 'Все'], ...RUNE_TYPES.map(t => [t, RUNE_TYPE_PL[t]])].map(([k, n]) => `<button class="${f === k ? 'on' : ''}" data-a="filterSet" data-v="${k}">${n}</button>`).join('')}</div>`;
    return [`<div class="toolbar"><span class="muted small">${resImg('shards')} осколков: <b>${fmt(p.shards)}</b> · рун: ${p.runes.length}</span>
      <button class="pill" data-a="workshop">Мастерская рун</button></div>${chips}
      ${list.length ? '' : '<p class="muted">Свободных рун нет. Создай в мастерской из осколков или открой сундук рун в магазине</p>'}`, `<div class="igrid runes">${padCells(list.map(r => `<button class="rcard t${R_TIER[r.rarity]} p${R_PLUS[r.rarity]}" style="--r:${RARITY_COLOR[r.rarity]}" data-a="rune" data-v="${r.uid}">${plusFrame(r.rarity)}${this.runeBetter(p, r) ? '<span class="upg">⇧</span>' : ''}${P.canMergeRune(p, r) ? '<span class="dot">!</span>' : ''}${this.runeBadge(r, 54)}</button>`)).join('')}</div>`];
  }

  // ================= jeweler =================
  private gemBlinkT = new Map<number, number>();
  private gemTile(p: P.Profile, g: P.Gem, count = 1, isNew = false): string {
    const holder = P.gemHolder(p, g.uid);
    return `<button class="gtile s${g.stars}${this.sel.gem === g.uid ? ' sel' : ''}${isNew ? ' new' : ''}${holder ? ' held' : ''}" data-a="gem" data-v="${g.uid}" style="--g:${GEM[g.type].color}">
      ${g.level > 1 ? `<span class="glv">${g.level}</span>` : ''}<span class="gst">${'★'.repeat(g.stars)}</span>${gemSvg(g.type, 30, g.stars)}${count > 1 ? `<span class="gq">×${count}</span>` : ''}${holder ? `<span class="gin">${SLOT_ICON[holder.slot]}</span>` : ''}</button>`;
  }


  private gemTileCount(p: P.Profile): number {
    const k = new Set<string>(); let n = 0;
    for (const g of p.gems) { if (g.level === 1 && g.xp === 0 && !P.gemHolder(p, g.uid)) k.add(g.type + g.stars); else n++; }
    return n + k.size;
  }
  private autoStart(): void {
    const a = this.auto;
    Object.assign(a, { on: true, n: 0, gold: 0, g: [0, 0, 0, 0], found: {}, small: 0, big: 0, last: null });
    this.sel.synth = null; this.sel.gem = undefined;
    this.autoStep();
  }
  private autoStep(): void {
    const p = this.p!, a = this.auto;
    if (!a.on) return;
    const e = P.exploreState(p), L = GEM_LOCATIONS[e.loc], free = P.exploreFreeLeft(p) > 0;
    if (!free && p.gold < L.cost) return this.autoStop(false, 'Не хватает золота');
    if (this.gemTileCount(p) >= 64) return this.autoStop(false, 'Сетка гемов заполнена');
    let r: ReturnType<typeof P.explore>;
    try { r = P.explore(p, 'gold'); } catch (err) { return this.autoStop(false, (err as Error).message); }
    a.n++; if (!free) a.gold += L.cost;
    if (r.ess) { a.small += r.ess.small; a.big += r.ess.big; } else { a.g[r.stars - 1]++; const k = `${r.type}:${r.stars}`; a.found[k] = (a.found[k] ?? 0) + 1; this.sel.newGem = r.uid; }
    a.last = { moved: r.moved, loc: r.loc, text: r.ess ? (r.ess.big ? '💠' : `✨${r.ess.small > 1 ? '×' + r.ess.small : ''}`) : '★'.repeat(r.stars) };
    P.save(p);
    this.render();
    if (!r.ess && r.stars >= 3 && a.stop3) return this.autoStop(false, 'Выпал ★3 гем!');
    a.timer = window.setTimeout(() => this.autoStep(), 480);
  }
  private autoStop(quiet = false, why = 'Автопоиск остановлен'): void {
    const a = this.auto;
    window.clearTimeout(a.timer); a.on = false;
    if (!quiet && a.n) {
      const items: RewardItem[] = [];
      // правка 154: the gems that really fell — one tile per kind and stars, rarest first
      const found = Object.entries(a.found).map(([k, n]) => { const [t, st] = k.split(':'); return { t: t as GemType, st: Number(st), n }; })
        .sort((x, y) => y.st - x.st || y.n - x.n || GEM_TYPES.indexOf(x.t) - GEM_TYPES.indexOf(y.t));
      for (const f of found) items.push({ icon: gemSvg(f.t, 52, f.st), name: GEM[f.t].name, sub: `<span class="gstars s${f.st}">${'★'.repeat(f.st)}</span>`, count: `×${f.n}`, color: STAR_COLOR[f.st], tier: f.st - 1 });
      if (a.small) items.push({ icon: resImg('essSmall', 'rbig'), name: 'Малая эссенция', count: `×${a.small}` });
      if (a.big) items.push({ icon: resImg('essBig', 'rbig'), name: 'Большая эссенция', count: `×${a.big}` });
      this.reward = { title: why, items, note: `Поисков: ${a.n} · потрачено ${resImg('gold')} ${fmt(a.gold)}` };
    }
    this.render();
  }

  private vSynth(p: P.Profile): string {
    const S = this.sel.synth!, tg = S.target !== undefined ? p.gems.find(g => g.uid === S.target) : undefined;
    let top: string;
    if (tg) {
      const xp = P.synthXp(p, S.foods, S.small, S.big), after = P.gemAfter(tg, xp), d = GEM[tg.type];
      const pct = (g: { level: number; xp: number }) => g.level >= 100 ? 100 : 100 * g.xp / gemXpFor(g.level);
      top = `<div class="synthtop"><button class="sslot" data-a="synTarget" style="--g:${d.color}">${gemSvg(tg.type, 56, tg.stars)}</button>
        <div class="sinfo"><b>${d.name} <span class="gstars s${tg.stars}">${'★'.repeat(tg.stars)}</span></b> <span class="muted small">ур. ${tg.level}${after.level > tg.level ? ` → <b class="up">${after.level}</b>` : ''}</span>
        <div class="bar sbar"><div class="now" style="width:${after.level > tg.level ? 100 : pct(tg).toFixed(0)}%"></div>${after.level === tg.level && xp ? `<div class="add" style="left:${pct(tg).toFixed(0)}%;width:${(pct(after) - pct(tg)).toFixed(0)}%"></div>` : ''}</div>
        <div class="muted small">${xp ? `+${fmt(xp)} опыта` : 'Отметь гемы и эссенции, которые будут поглощены'}</div></div></div>`;
    } else top = `<div class="synthtop"><span class="sslot empty">?</span><div class="sinfo"><b>Синтез</b><div class="muted small">Выбери в сетке гем, который будешь качать</div></div></div>`;
    const cells: string[] = [];
    if (tg) {
      cells.push(`<button class="gtile ess${S.small ? ' sel' : ''}" data-a="synEss" data-v="small"><span class="eico">${resImg('essSmall', 'eimg')}</span><span class="gq">${S.small ? S.small + '/' : ''}${p.essSmall}</span></button>`);
      cells.push(`<button class="gtile ess big${S.big ? ' sel' : ''}" data-a="synEss" data-v="big"><span class="eico">${resImg('essBig', 'eimg')}</span><span class="gq">${S.big ? S.big + '/' : ''}${p.essBig}</span></button>`);
    }
    const list = p.gems.filter(g => g.uid !== S.target && !P.gemHolder(p, g.uid)).sort((a, b) => a.stars - b.stars || a.level - b.level || GEM_TYPES.indexOf(a.type) - GEM_TYPES.indexOf(b.type));
    for (const g of list) {
      const on = S.foods.includes(g.uid);
      cells.push(`<button class="gtile s${g.stars}${on ? ' sel pick' : ''}" data-a="synGem" data-v="${g.uid}" style="--g:${GEM[g.type].color}">${g.level > 1 ? `<span class="glv">${g.level}</span>` : ''}<span class="gst">${'★'.repeat(g.stars)}</span>${gemSvg(g.type, 30, g.stars)}${on ? '<span class="chk">✓</span>' : ''}</button>`);
    }
    while (cells.length < 64 || cells.length % 8) cells.push('<span class="gtile empty"></span>');
    const any = S.foods.length || S.small || S.big;
    return `<div class="jtop">${top}</div><div class="gfield">${cells.join('')}</div>
      <div class="jbtns three"><button class="gbtn ghost" data-a="synClose">Закрыть</button><button class="gbtn ghost" data-a="synReset" ${any ? '' : 'disabled'}>Сбросить</button>
      <button class="gbtn${S.confirm ? ' red' : ''}" data-a="synGo" ${tg && any ? '' : 'disabled'}>${S.confirm ? 'Точно скормить?' : 'Скормить'}</button></div>`;
  }

  private vJewel(p: P.Profile): string {
    if (this.sel.synth) return this.vSynth(p);
    const e = P.exploreState(p), free = P.exploreFreeLeft(p), L = GEM_LOCATIONS[e.loc];
    const LC = ['#ff9a3c', '#3fd06a', '#ff4a2a', '#ffcf4a', '#c58aff'], last = this.auto.last;
    const locs = GEM_LOCATIONS.map((l, i) => {
      const lit = i <= e.loc, just = last?.moved && i === e.loc, fade = last && !last.moved && i > e.loc && i <= last.loc;
      const arrow = i ? `<span class="larrow${i <= e.loc ? ' lit' : ''}${last?.moved && i === e.loc ? ' spark' : ''}">➜</span>` : '';
      const pop = last && i === last.loc ? `<span class="pop" key="${this.auto.n}">${last.text}</span>` : '';
      return `${arrow}<div class="loc${lit ? ' lit' : ''}${i === e.loc ? ' on' : ''}${just ? ' just' : ''}${fade ? ' fade' : ''}" style="--lc:${LC[i]}"><span class="limg"><img src="${ICONS['loc_' + i]}" alt="" draggable="false"></span><small>${l.name}</small>${i === e.loc ? `<em>${free > 0 ? 'беспл.' : resImg('gold') + fmt(l.cost)}</em>` : `<em>★3 ${+(l.odds[2] * 100).toFixed(2)}%</em>`}${pop}</div>`;
    }).join('');
    // stack identical fresh gems that are not in any item; the newest stack goes first
    const groups = new Map<string, P.Gem[]>();
    const singles: P.Gem[] = [];
    for (const g of p.gems) {
      if (g.level === 1 && g.xp === 0 && !P.gemHolder(p, g.uid)) { const k = g.type + g.stars; (groups.get(k) ?? groups.set(k, []).get(k)!).push(g); } else singles.push(g);
    }
    const newest = this.sel.newGem;
    // правка 150: a new gem blinks once — for 1.9 s after it is first shown, never again on a later visit
    const now = performance.now(); if (newest !== undefined && !this.gemBlinkT.has(newest)) this.gemBlinkT.set(newest, now);
    const blink = newest !== undefined && now - (this.gemBlinkT.get(newest) ?? 0) < 1900;
    const tiles = [...singles.map(g => ({ g, c: 1, n: g.uid === newest })), ...[...groups.values()].map(a => ({ g: a.find(x => x.uid === newest) ?? a[0], c: a.length, n: a.some(x => x.uid === newest) }))]
      .sort((a, b) => Number(b.n) - Number(a.n) || b.g.stars - a.g.stars || b.g.level - a.g.level || GEM_TYPES.indexOf(a.g.type) - GEM_TYPES.indexOf(b.g.type));
    const cells = tiles.map(t => this.gemTile(p, t.g, t.c, t.n && blink));
    while (cells.length < 64 || cells.length % 8) cells.push('<span class="gtile empty"></span>');
    return `<div class="jtop">
        <div class="locs">${locs}</div>
        <div class="muted small">${e.loc < 4 ? `Шанс перейти дальше: ${Math.round(L.next * 100)}%, неудача — назад в Пещеру.` : 'Последняя локация: следующий поиск вернёт в Пещеру.'} · эссенция ${Math.round(L.ess.reduce((a, x) => a + x.p, 0) * 100)}% · бесплатных ${free}/${GEM_FREE_PER_DAY} · за 💎: гарант ★3 через ${CR_SEARCH.pity - p.pityGem}, ★4 через ${CR_SEARCH.pity4 - (p.pityGem4 ?? 0)}</div>
        ${this.sel.feed ? '<div class="feedbar">Выбери гем, который будет поглощён · <button class="btn ghost" data-a="feedCancel">отмена</button></div>' : `<div class="muted small">Гемов: ${p.gems.length} · эссенций: малых ${p.essSmall}, больших ${p.essBig}</div>`}
      </div>
      <div class="gfield">${cells.join('')}</div>
      <div class="jbtns three">
        <button class="gbtn${this.auto.on ? ' stop' : ''}" data-a="auto">${this.auto.on ? `Стоп<br><b>поисков: ${this.auto.n}</b>` : `Автопоиск<br><b>${free > 0 ? `беспл. ${free}` : '🪙 ' + fmt(L.cost)}</b>`}</button>
        <button class="gbtn violet" data-a="synth">Синтез<br><b>гемов</b></button>
        <button class="gbtn red" data-a="explore" data-v="crystals" ${this.auto.on ? 'disabled' : ''}>Сразу в Руины<br><b>💎 ${CR_SEARCH.cost}</b></button></div>
      <label class="stop3"><input type="checkbox" data-a="stop3" ${this.auto.stop3 ? 'checked' : ''}> останавливать автопоиск на ★3</label>`;
  }


  /** правка 165: бесплатный подарок дня — первым в Магазине (тот же, что на Чёрном рынке) */
  private giftCard(p: P.Profile): string {
    const o = P.dailyOffers().find(x => x.id === 'free'); if (!o) return '';
    const got = P.offerBought(p, 'free');
    return `<div class="giftc${got ? ' got' : ''}"><span class="gico">${this.prizeIcon(o.icon)}</span><div class="grow"><b>Подарок дня</b><small>${o.label}</small></div>
      ${got ? '<span class="gdone">Завтра снова</span>' : '<button class="gbtn" data-a="offer" data-v="free">Забрать</button>'}</div>`;
  }

  private vShop(p: P.Profile): string {
    const tab = this.sel.shopTab === 'topup' ? 'topup' : 'chests';
    let body = '';
    if (tab === 'chests') {
      const tierTxt = (odds: number[], runes = false) => odds.map((o, r) => o > 0 ? `<b style="color:${RARITY_COLOR[r]}">${(runes ? RUNE_RARITY : RARITIES)[r].toLowerCase()} ${+(o * 100).toFixed(1)}%</b>` : '').filter(Boolean).join(', ');
      const ring = (icons: string[]) => icons.map((ic, i) => `<span class="c3it" style="--a:${(i * 360 / icons.length - 90).toFixed(0)}deg;--d:${(i * 0.4).toFixed(1)}s">${ic}</span>`).join('');
      const med = (inner: string, r: number) => `<span class="c3med${R_TIER[r] >= 2 ? ' hot' : ''}" style="--r:${RARITY_COLOR[r]}">${inner}</span>`;
      const chest = (id: ChestId, theme: string) => {
        const c = CHESTS[id], pity = P.chestPity(p, id), set = this.sel.set;
        const rr = [0, 1, 2, 0, 1, 2];
        const icons = id === 'runes'
          ? ([{ id: 'revive', rarity: 0 }, { id: 'elem', elem: 'fire', rarity: 1 }, { id: 'skill', skill: 'meteor', rarity: 2 }, { id: 'f_orbs', rarity: 5 }, { id: 'fury', rarity: 1 }, { id: 'elem', elem: 'ice', rarity: 2 }] as P.Rune[]).map(r => med(this.runeBadge({ ...r, uid: 0 }, 32), r.rarity))
          : SLOTS.map((sl, i) => { const r = id === 'obsidian' ? (i % 3 === 1 ? 2 : 1) : rr[i]; return med(itemSvg(sl, id === 'set' ? set : SETS[i % 3], 34, r), r); });
        const title = id === 'set' ? `Сундук комплекта «${SET_NAME[set]}»` : c.name;
        const what = id === 'runes' ? `1 руна: ${tierTxt(c.odds, true)}` : id === 'set' ? `1 предмет комплекта, включая ${({ guard: 'книгу', wanderer: 'посох', berserk: 'жезл' } as Record<SetId, string>)[set]}: ${tierTxt(c.odds)}` : `1 предмет любого комплекта: ${tierTxt(c.odds)}`;
        return `<div class="ch3 ${theme}">${CORNERS}
          <button class="qbtn ccq" data-a="chestInfo" data-v="${id}">i</button>
          <div class="c3top"><div class="c3art"><span class="c3circ"></span>${ring(icons)}<span class="c3chest">${chestSvg(2, 74)}</span></div>
            <div class="c3info"><b class="c3title">${title}</b><div class="c3odds">${what}</div>
            ${c.pity ? `<div class="c3pity"><span>Гарантия ${id === 'runes' ? ['обычной', 'редкой', 'эпической'][c.pity.rarity] + ' руны' : ['обычного', 'редкого', 'эпического'][c.pity.rarity]} через</span><b>${pity}</b></div>` : ''}</div></div>
          <div class="c3btns"><button class="c3b one" data-a="chest" data-v="${id}:1"><span>Открыть ×1</span><b>${c.price}💎</b></button>
          <button class="c3b ten" data-a="chest" data-v="${id}:10"><i class="bsp"></i><span>Открыть ×10</span><b>${c.price * CHEST_X10}💎</b></button></div>
          ${id === 'set' ? this.adBtn(p, 'chest', 'Сундук бесплатно за рекламу') : id === 'runes' ? this.adBtn(p, 'runes', 'Сундук рун бесплатно за рекламу') : ''}
          ${id === 'set' ? `<div class="c3sets">${SETS.map(st => `<button class="${set === st ? 'on' : ''}" style="--sc:${SET_COLOR[st]}" data-a="shopSet" data-v="${st}"><img src="${ICONS['set_' + st]}" alt="">${SET_NAME[st]}</button>`).join('')}</div>
            <div class="c3bonus">2 шт. — ${SET_DESC[set].b2} · 4 шт. — ${SET_DESC[set].b4} · 6 шт. — ${SET_DESC[set].b6}</div>` : ''}</div>`;
      };
      body = this.giftCard(p) + chest('set', 'th-void') + chest('obsidian', 'th-epic') + chest('runes', 'th-rune') + this.tavernCard(p);
    } else { // правка 173: crystal packs for real money (first purchase ×2), правка 172: the starter pack
      const gate = P.payTest(p) ? '' : '<div class="parch2 tpnote">Оплата появится вместе с Google Play</div>';
      const starter = P.starterOffered(p) ? `<div class="ch3 th-epic stpack">${CORNERS}
        <div class="c3top"><div class="c3art"><span class="c3circ"></span><span class="c3chest">${chestSvg(2, 74)}</span></div>
          <div class="c3info"><b class="c3title">Стартовый набор</b><div class="c3odds">Один раз за всю игру</div>
          <div class="stlist"><span>💎 ${P.STARTER.crystals}</span><span>🛡️ эпический предмет твоего комплекта</span><span>${resImg('energy')} ${P.STARTER.energy}</span><span>📜 ${P.STARTER.scrolls}</span></div></div></div>
        <div class="c3btns"><button class="c3b ten" data-a="starter"><i class="bsp"></i><span>Купить</span><b>${P.STARTER.usd}</b></button></div></div>` : '';
      const packs = P.CRYSTAL_PACKS.map((k, i) => {
        const first = P.packFirst(p, k.id);
        return `<button class="offer cpk${first ? ' x2' : ''}" data-a="pack" data-v="${k.id}">${first ? '<i class="cpx2">×2</i>' : ''}<span class="oi">${'💎'.repeat(Math.min(3, 1 + Math.floor(i / 2)))}</span><small>${sp3(k.n * (first ? 2 : 1))} кристаллов</small>${first ? `<em class="cpold">${sp3(k.n)}</em>` : ''}<b>${k.usd}</b></button>`;
      }).join('');
      body = gate + starter + `<div class="rlabel mdiv2"><span>Кристаллы</span></div><div class="offers cpacks">${packs}</div>
        <div class="muted small cpnote">Первая покупка каждого набора — кристаллы ×2</div>
        <div class="card"><div class="btns"><button class="btn" data-a="test">Тест: +1000💎</button></div></div>`;
    }
    const st = (id: 'chests' | 'topup', name: string) => `<button class="${tab === id ? 'on' : ''}" data-a="shopTab" data-v="${id}">${name}</button>`;
    return `<div class="subtabs shop two2">${st('chests', 'Сундуки')}${st('topup', 'Пополнить')}</div>` + body;
  }


  /** hero search: hero of the day ×5, small and medium coupons */
  /** правка 101: hero card of «Поиск героя» — element scenery, the hero, a carved stone frame with the element emblem and a name plate */
  heroCard(id: string, w = 120): string {
    const hd = hero(id);
    return `<span class="hcart" style="--c:${EL_HEX[hd.element]};--bg:url('${EL_BG[hd.element]}');width:${w}px;height:${Math.round(w * 1.36)}px">
      <i class="hcbg"></i><span class="hcfig">${this.heroBig(id, Math.round(w * 0.98))}</span><i class="hcfr"></i>
      <img class="hcel" src="${ICONS['e_' + hd.element]}" alt=""><b class="hcnm">${hd.name}</b></span>`;
  }

  private tavernCard(p: P.Profile): string {
    const day = hero(P.heroOfDay()), c = EL_HEX[day.element];
    const pity = BIG_COUPON.pity - p.pityCoupon;
    return `<div class="ch3 th-tav" style="--c:${c}">${CORNERS}
      <div class="c3top"><div class="tvmed card"><span class="mhero">${this.heroCard(day.id, 112)}</span><span class="x5">×5</span></div>
        <div class="c3info"><b class="c3title">Поиск героев</b><div class="c3odds">Герой дня: <b class="hn">${day.name}</b> — выпадает в 5 раз чаще. Меняется каждый день.</div>
        <div class="c3pity"><span>Средний купон: гарантия героя через</span><b>${pity}</b></div></div></div>
      <div class="c3btns three">
        <button class="c3b one" data-a="hsearch" data-v="small:1" ${p.couponsSmall ? '' : 'disabled'}><span class="cpi">${couponSvg(false, 40)}</span><span>Малый ×1</span><b>есть ${p.couponsSmall}</b></button>
        <button class="c3b one" data-a="hsearch" data-v="big:1"><span class="cpi">${couponSvg(true, 40)}</span><span>Средний ×1</span><b>${p.couponsBig ? `есть ${p.couponsBig}` : `${BIG_COUPON.price}💎`}</b></button>
        <button class="c3b ten" data-a="hsearch" data-v="big:10"><i class="bsp"></i><span class="cpi">${couponSvg(true, 40)}</span><span>Средний ×10</span><b>${p.couponsBig >= 10 ? `есть ${p.couponsBig}` : `${BIG_COUPON.price * Math.max(0, 10 - p.couponsBig)}💎`}</b></button></div>
      ${this.adBtn(p, 'hero', 'Малый поиск за рекламу')}
      <div class="c3bonus">Малый: герой 3%, иначе 5 частиц · Средний: герой 20%, иначе 30 частиц · Повтор героя — 20 частиц</div></div>`;
  }


  private shopRow(label: string, sub: string, a: string, v: string, price: string): string {
    return `<div class="card row"><div class="grow"><b>${label}</b><div class="muted small">${sub}</div></div><button class="btn" data-a="${a}" data-v="${v}">${price}</button></div>`;
  }

  // ================= events =================
  /** правки 129, 130: events as big cards — picture of the event, stone plate with the name, time left, tries, the prize for place 1, lava «Играть» */
  private vEvents(p: P.Profile): string {
    const open = P.evUnlocked(p), ms = P.evDayLeft(), hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60;
    const card = (art: string, name: string, desc: string, prize: string, a: string, v: string, left: number, max: number, ok: boolean) => {
      const dots = Array.from({ length: max }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('');
      const att = ok && P.evAttention(p, (v || 'wall') as EventId | 'wall'); // правка 142
      return `<div class="evc${ok ? '' : ' locked'}">
        <div class="evart" style="background-image:url(ev/${art}.webp)">
          <span class="evtime">⏳ ${ok ? `конец дня через ${hh}ч ${mm}м` : '🔒 этап 2'}</span>
          ${ok ? `<span class="evtries">${dots}</span>` : ''}
        </div>
        <div class="evplate"><b>${name}</b><small>${desc}</small></div>
        <div class="evfoot"><div class="evprize"><small>1 место</small><b>${prize}</b></div>
          <button class="lvbtn evgo" data-a="${a}"${v ? ` data-v="${v}"` : ''}${ok ? '' : ' disabled'}><b>Играть</b><small>${ok ? `${left}/${max}` : '🔒'}</small></button>${att ? '<i class="dotr"></i>' : ''}</div>
      </div>`;
    };
    const wallOpen = P.wallUnlocked(p);
    return this.title('События') + `<p class="muted small evnote">Рейтинг — в группах по 20 игроков, награды по месту в конце дня.</p>` +
      card('card_boss', 'Убийство босса', 'Медведь не умирает: за 3 минуты набей как можно больше урона, уклоняясь от его ударов', P.EV_REWARDS.boss[0][1], 'evOpen', 'boss', open ? P.evFreeLeft(p, 'boss') : 0, EVENT.freePerDay, open) +
      card('card_frags', 'Фраги', '5 минут, волны по 30 врагов — набей как можно больше убийств', P.EV_REWARDS.frags[0][1], 'evOpen', 'frags', open ? P.evFreeLeft(p, 'frags') : 0, EVENT.freePerDay, open) +
      card('card_wall', 'Защита стены', 'Удержать стену против волн', P.WALL_CHESTS[2].label, 'wallOpen', '', wallOpen ? P.wallFreeLeft(p) : 0, WALL.freePerDay, wallOpen);
  }

  /** правки 125, 126: the window of an event — arena of the day, tries, best of the day, place, rewards by place */
  private vEvent(p: P.Profile): string {
    const ev = this.evSel, st = P.evState(p, ev), idx = P.wallMapToday(), map = WALL_MAPS[idx], left = P.evFreeLeft(p, ev), ms = P.evDayLeft();
    const hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60;
    const boss = ev === 'boss', name = boss ? 'Убийство босса' : 'Фраги';
    const place = st.used > 0 ? P.evPlace(st, st.best) : 0;
    const desc = boss
      ? 'Медведь не умирает. За 3 минуты набей как можно больше урона. Перед ударом на земле красная зона — уходи из неё. Навык — каждые 15 секунд.'
      : 'Шестигранная арена, 5 минут. Волна из 30 врагов, следующая — как только погиб последний. С каждой волной враги крепче.';
    const go = left > 0
      ? `<button class="lvbtn wide" data-a="evGo"><b>В бой</b><small>бесплатно · осталось ${left} из ${EVENT.freePerDay}</small></button>`
      : `<button class="lvbtn wide" data-a="evGo" data-v="paid"><b>Ещё попытка</b><small>${EVENT.extraCost} ${GEM_ICON}</small></button>`;
    const last = this.sel.evLast;
    return `<div class="modal" data-a="close"><div class="mbox lvpanel wallpanel evpanel">
      <div class="lvtabs"><b class="wtitle">${name}</b><button class="lvsq x" data-a="close">✕</button></div>
      <div class="panelbox" data-k="ev-${ev}">
        <div class="evmap ${boss ? 'evround' : 'evhex'}"><span style="background-image:url(ev/card_${ev}.webp)"></span><div class="wmname"><small>Арена дня</small><b>${map.name}</b><em>конец дня через ${hh}ч ${mm}м</em></div></div>
        <div class="welrow">${this.elBadge(map.strong, true)}${this.elBadge(map.weak, false)}</div>
        ${last ? `<div class="evlast">Вчера: <b>${last.place} место</b> · ${this.evScore(ev, last.score)} — получено: ${last.label}</div>` : ''}
        <div class="lvsub">${desc}</div>
        <div class="wrec"><span><small>Лучший сегодня</small><b>${this.evScore(ev, st.best)}</b></span><span><small>Место</small><b>${place ? `${place}/${EVENT.group}` : '—'}</b></span><span><small>Попыток</small><b>${st.used}</b></span></div>
        ${go}
        <button class="lvbtn wide alt" data-a="evRate"><b>Рейтинг</b><small>награды — в сундуках</small></button>
      </div></div></div>`;
  }
  private evScore(ev: EventId, n: number): string { return ev === 'boss' ? fmt(n) : String(n); }
  /** правки 125, 126: the group of 20. Until the server the other 19 are test players (marked «тест») */
  private vEvRating(p: P.Profile): string {
    const ev = this.evSel, st = P.evState(p, ev), played = st.used > 0;
    const opp = st.group.map(o => ({ ...o, me: false }));
    const meRow = { name: 'Ты', hero: p.active, power: P.powerScore(p), score: st.best, me: true };
    // правка 133: until the player has played, the 19 others hold places 1–19 and the player is at the bottom with «—»
    const rows = played ? [...opp, meRow].sort((a, b) => b.score - a.score || (a.me ? -1 : b.me ? 1 : 0)) : [...opp.sort((a, b) => b.score - a.score), meRow];
    const body = rows.map((r, i) => { const h = hero(r.hero), place = i + 1, none = r.me && !played;
      const band = P.EV_REWARDS[ev].findIndex(([to]) => place <= to), q = 3 - band;
      const chest = none ? '<span class="rchest none"></span>' : `<button class="rchest q${q}" data-a="evChest" data-v="${place}" aria-label="Награда">${chestSvg(1, 40)}</button>`;
      return `<div class="rrow${r.me ? ' me' : ''}"><span class="rpos">${none ? '—' : place}</span><span class="rava" style="--c:${EL_HEX[h.element]}">${this.heroSvg(h.id)}</span><div class="grow"><b>${r.me ? 'Ты' : `<span translate="no">${r.name}</span>`}</b><small>${h.name} · сила ${r.power}${r.me ? '' : ' · тест'}</small></div><span class="rwave"><b>${none ? '—' : this.evScore(ev, r.score)}</b><small>${ev === 'boss' ? 'урон' : 'убийств'}</small></span>${chest}</div>`; }).join('');
    const cp = this.sel.evChest;
    let pop = '';
    if (cp) {
      const rw = P.EV_REWARDS[ev], band = rw.findIndex(([to]) => cp <= to), from = band ? rw[band - 1][0] + 1 : 1, to = rw[band][0];
      const QN = ['Серый сундук', 'Синий сундук', 'Фиолетовый сундук', 'Золотой сундук'];
      pop = `<div class="evcpop" data-a="evChest" data-v=""><div class="evcbox q${3 - band}"><span class="rchest q${3 - band} big">${chestSvg(2, 110)}</span><b>${QN[3 - band]}</b><small>${from === to ? `${to} место` : `${from}–${to} места`}</small><div class="evcrw">${rw[band][1]}</div><em>Выдаётся в конце дня</em></div></div>`;
    }
    return `<div class="modal" data-a="close"><div class="mbox lvpanel ratepanel">
      <div class="lvtabs"><b class="wtitle">${ev === 'boss' ? 'Убийство босса' : 'Фраги'}</b><button class="lvsq x" data-a="close">✕</button></div>
      <div class="panelbox" data-k="evrate">${this.lvBanner('Рейтинг дня', 'sm')}<div class="evrows">${body}</div>
        <div class="rsoon"><small>Нажми на сундук, чтобы увидеть награду за место.</small><small>Соперники с пометкой «тест» — до сервера (этап 2). Твой лучший забег дня сохранён с записью боя — сервер проверит его повтором.</small></div>
        <button class="lvbtn wide alt" data-a="evOpen" data-v="${ev}"><b>Назад</b></button></div>${pop}</div></div>`;
  }

  private vSettings(p: P.Profile): string {
    return this.title('Настройки') + `
      <button class="wkopen" data-a="wikiOpen"><span class="wkbook">📖</span><span><b>Справочник</b><small>Всё об игре: бой, навыки, герои, снаряжение, гемы, руны, враги, магазин</small></span><i>›</i></button>
      <div class="card langc" translate="no"><b>🌐 ${LANG_WORD[curLang]}</b>
        <div class="btns langb">${LANGS.map(([id, n]) => `<button class="btn ${id === curLang ? 'big2' : 'ghost'}" data-a="lang" data-v="${id}">${id === curLang ? '✓ ' : ''}${n}</button>`).join('')}</div></div>
      <div class="card"><b>Прогресс</b><div class="muted">Забегов ${p.runs}, побед ${p.wins}, пройдено этапов ${p.maxMap}.</div>
      <div class="muted small">Сейчас прогресс хранится на телефоне. На этапе 2 он переедет на сервер с привязкой к Google.</div></div>
      <div class="card"><b>Звук и вибрация</b><div class="muted small">Звуки выстрела, окон, покупок и наград; вибрация от ударов, нового уровня и редких наград.</div>
        <div class="btns"><button class="btn ${sfx.soundOn() ? 'big2' : 'ghost'}" data-a="sfx">${sfx.soundOn() ? '✓ Звук' : 'Звук выключен'}</button>
          <button class="btn ${sfx.vibrationOn() ? 'big2' : 'ghost'}" data-a="vib">${sfx.vibrationOn() ? '✓ Вибрация' : 'Вибрация выключена'}</button></div></div>
      ${Capacitor.isNativePlatform() ? `<div class="card"><b>Выход</b><div class="muted small">Прогресс сохраняется сам после каждого действия.</div><div class="btns"><button class="btn ghost" data-a="exitAsk">Выйти из игры</button></div></div>` : ''}
      <div class="card"><b>Графика в бою</b><div class="muted small">Если телефон греется — выбери «Среднее» или «Экономия», так он греется меньше.</div>
        <div class="btns gfxb">${(Object.keys(P.GFX) as ('high' | 'mid' | 'eco')[]).map(k => `<button class="btn ${(p.gfx ?? 'mid') === k ? 'big2' : 'ghost'}" data-a="gfx" data-v="${k}">${(p.gfx ?? 'mid') === k ? '✓ ' : ''}${P.GFX[k].name}</button>`).join('')}</div>
        <div class="muted small">${P.GFX[p.gfx ?? 'mid'].note}</div>
        <div class="btns"><button class="btn ${p.fps ? 'big2' : 'ghost'}" data-a="fpsT">${p.fps ? '✓ Счётчик кадров' : 'Счётчик кадров выключен'}</button></div></div>
      <div class="card"><b>Подтверждать покупки за кристаллы</b><div class="muted small">Перед каждой тратой кристаллов игра спросит «Потратить?».</div>
        <div class="btns"><button class="btn ${p.noConfirm ? 'ghost' : 'big2'}" data-a="askBuy">${p.noConfirm ? 'Выключено' : '✓ Включено'}</button></div></div>
      ${P.payTest(p) || location.hash.includes('debug') ? `<div class="card"><b>Тест: покупки</b><div class="muted small">Настоящей оплаты пока нет. Включи, чтобы кнопки с ценой в батл пассе и пропусках срабатывали без оплаты.</div>
        <div class="btns"><button class="btn ${p.testPay ? 'big2' : 'ghost'}" data-a="testPay">${p.testPay ? '✓ Включено' : 'Выключено'}</button></div></div>` : ''}
      ${cloud.mailReady() && cloud.accountShort() ? `<div class="card"><b>Аккаунт</b><div class="muted small">ID для поддержки: <b class="accid" translate="no">${cloud.accountShort()}</b></div></div>` : ''}
      <div class="card"><b>Сброс</b><div class="muted small">Удалит весь прогресс и вернёт к выбору первого героя.</div><div class="btns"><button class="btn danger" data-a="reset">Сбросить прогресс</button></div></div>`;
  }

  // ================= modals =================
  /** identity of a top-level window in #layer: its first class plus the panel/item it shows */
  private winKey(e: HTMLElement): string { return (e.className.split(' ')[0] || e.tagName) + ':' + (e.dataset.w || ''); }

  private vModals(p: P.Profile): string {
    if (this.om) return orbModal(p, this.om);
    if (this.wheel.open) return this.vWheel(p);
    if (this.panel === 'tasks') return this.vTasks(p);
    if (this.panel === 'mail') return this.vMail();
    if (this.panel === 'market') return this.vMarket(p);
    if (this.panel === 'idle') return this.vIdle(p);
    if (this.panel === 'wall') return this.vWall(p);
    if (this.panel === 'rating') return this.vRating(p);
    if (this.panel === 'ev') return this.vEvent(p);
    if (this.panel === 'evrate') return this.vEvRating(p);
    if (this.sel.heroInfo && this.screen === 'hero' && this.heroInfoHtml) return this.heroInfoHtml;
    if (this.sel.chestInfo && this.screen === 'shop') {
      const id = this.sel.chestInfo, c = CHESTS[id], names = id === 'runes' ? RUNE_RARITY : RARITIES;
      return `<div class="modal" data-a="close"><div class="mbox" style="--r:#ffcf4a"><div class="mhead"><div><b>${c.name}</b><div class="muted small">Шансы за одно открытие</div></div><button class="x" data-a="close">✕</button></div>
        ${c.odds.map((o, r) => o > 0 ? `<div class="oddrow"><span style="color:${RARITY_COLOR[r]}">${names[r]}</span><b>${+(o * 100).toFixed(2)}%</b></div>` : '').join('')}
        ${c.pity ? `<div class="muted small" style="margin-top:8px">Гарантия: ${names[c.pity.rarity].toLowerCase()} или лучше не реже чем раз в ${c.pity.every} открытий. ×10 стоит как 9.</div>` : ''}
        ${id === 'set' ? '<div class="muted small">Слот выпадает случайно: оружие, мантия, перчатки, сапоги, амулет или кольцо — по 1/6.</div>' : id === 'obsidian' ? '<div class="muted small">Комплект и слот — случайные. Эпические предметы любого комплекта идут в слияние на эпическое +1 и выше.</div>' : '<div class="muted small">Тип руны случайный: благословение, усиление или навык — по 1/3.</div>'}
      </div></div>`;
    }
    if (this.panel === 'bp') return this.vBp(p);
    if (this.panel === 'passes') return this.vPasses(p);
    if (this.sel.wiki && this.screen === 'settings') return this.wikiScreen();
    if (this.sel.workshop && this.screen === 'hero') return this.workshopScreen(p);
    if (this.sel.smith && this.screen === 'hero') return this.smithModal(p);
    const it = p.items.find(x => x.uid === this.sel.item);
    if (it && this.screen === 'hero') return this.itemModal(p, it);
    const r = p.runes.find(x => x.uid === this.sel.rune);
    if (r && this.screen === 'hero') return this.runeModal(p, r);
    const g = p.gems.find(x => x.uid === this.sel.gem);
    if (g && this.screen === 'jewel' && !this.sel.feed) return this.gemModal(p, g);
    return '';
  }


  // ---------------- battle pass ----------------
  /** "2.2K золота" → count "2.2K" and "Золота" for a tile with a big number in the corner */
  private splitPrize(label: string): [string, string] {
    const m = /^(\d[\d.,]*[KkMк]?)\s+(.+)$/.exec(label);
    const NOM: Record<string, string> = { 'золота': 'Золото', 'свитков': 'Свитки', 'кристаллов': 'Кристаллы', 'осколков рун': 'Осколки рун', 'частиц': 'Частицы', 'энергии': 'Энергия' };
    return m ? [m[1], NOM[m[2]] ?? m[2][0].toUpperCase() + m[2].slice(1)] : ['', label];
  }

  // ---------------- battle pass (77): old, magic, a stone vein through the levels ----------------
  private vBp(p: P.Profile): string {
    const b = P.bpState(p), L = P.bpLevel(p), left = P.bpSeasonEnd() - Date.now();
    const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24;
    const max = L >= P.BP.levels, inLvl = max ? P.BP.perLevel : b.pts % P.BP.perLevel;
    const [cf, cp] = P.bpClaimable(p);
    const cell = (paid: boolean, i: number) => {
      const z = P.BP_PRIZES[i - 1][paid ? 'paid' : 'free'];
      const got = (paid ? b.paid : b.free).includes(i), reach = i <= L, lock = paid && !b.bought;
      const ready = reach && !got && !lock, best = z.icon === '◈' || z.icon === '📕' || z.icon === '◆';
      const [q, name] = this.splitPrize(z.label);
      return `<button class="bc${paid ? ' paid' : ''}${got ? ' got' : ''}${ready ? ' ready' : ''}${!reach ? ' far' : ''}${lock ? ' lock' : ''}${best ? ' best' : ''}" ${ready ? `data-a="bpClaim" data-v="${paid ? 'p' : 'f'}:${i}"` : ''}>
        <span class="bct"><span class="bci">${this.prizeIcon(z.icon)}</span>${q ? `<b class="bq">${q}</b>` : ''}${got ? '<i class="bok">✓</i>' : lock ? '<i class="blk">🔒</i>' : ''}${ready ? '<i class="bsp"></i>' : ''}</span>
        <small>${name}</small></button>`;
    };
    const rows = Array.from({ length: P.BP.levels }, (_, k) => k + 1).map(i =>
      `<div class="bprow2${i <= L ? ' on' : ''}${i === L + 1 ? ' next' : ''}${i === L ? ' cur' : ''}">${cell(false, i)}<span class="bhex"><b>${i}</b></span>${cell(true, i)}</div>`).join('');
    const can = cf.length + cp.length;
    return `<div class="bpscreen">
      <div class="bptop"><i class="torch l"><i></i></i><i class="torch r"><i></i></i>
        <div class="bpshelf"><span class="c1">${chestSvg(1, 54)}</span><span class="c2">${chestSvg(2, 78)}</span><span class="c3">${chestSvg(1, 54)}</span></div>
        <button class="x" data-a="close">✕</button>
        <div class="bptitle"><span>Батл пасс</span></div>
        <div class="bpseason">Сезон ${b.season + 1} · осталось ${d} д ${h} ч</div></div>
      <div class="bplvl2"><span class="bshield"><b>${L}</b></span>
        <div class="bptrough"><i style="width:${(100 * inLvl / P.BP.perLevel).toFixed(0)}%"></i><em>${max ? 'максимум' : `${inLvl}/${P.BP.perLevel}`}</em></div>
        <span class="bshield nx"><b>${max ? '★' : L + 1}</b></span></div>
      <div class="bphint">Очки — за ежедневные и еженедельные задания · ${P.BP.perLevel} очков = уровень</div>
      <div class="bpcols2"><span class="cfree"><b>Бесплатно</b></span><span></span><span class="cpaid"><b>Пропуск${b.bought ? ' ✓' : ''}</b></span></div>
      <div class="bplist2 panelbox" data-k="bp">${rows}
        ${b.bought ? '' : '<div class="bpnote">Пропуск: 1 300💎, эпическая книга, средние купоны, осколки рун и гем ★4 на 30-м уровне. Награды за пройденные уровни выдаются сразу после покупки.</div>'}</div>
      <div class="bpfoot2"><button class="stonebtn" data-a="bpAll" ${can ? '' : 'disabled'}><b>Получить всё</b><small>${can ? `наград: ${can}` : 'пока нечего'}</small></button>
        ${b.bought ? '<button class="goldbtn" disabled><b>Пропуск куплен</b><small>сезон ${b.season + 1}</small></button>' : `<button class="goldbtn" data-a="bpBuy"><b>Купить пропуск</b><small>${P.BP.usd}${P.payTest(p) ? ' · тест' : ' · скоро'}</small></button>`}</div>
    </div>`;
  }

  // ---------------- passes: permanent, monthly, hunter ----------------
  private vPasses(p: P.Profile): string {
    const look: Record<P.PassId, [string, string, string, string]> = {
      perm: ['red', '#ff6a8a', '#a8183a', '∞'], month: ['yellow', '#ffd23a', '#b8700c', '30'], hunter: ['blue', '#5ab0ff', '#1a4ab0', '⚔'],
    };
    const cards = P.PASSES.map(d => {
      const [cls, c1, c2, mark] = look[d.id];
      const on = P.passActive(p, d.id), pend = P.passPending(p, d.id);
      const status = d.id === 'perm' ? (on ? 'Куплена навсегда' : 'Навсегда') : on ? `Осталось ${P.passDaysLeft(p, d.id as 'month')} дн.` : '30 дней привилегий';
      const btn = on
        ? `<button class="gbtn" data-a="passClaim" data-v="${d.id}" ${pend ? '' : 'disabled'}>${pend ? `Получить${pend > 1 ? `<br><small>(накоплено ${pend} д.)</small>` : ''}` : 'Завтра снова'}</button>`
        : `<button class="gbtn" data-a="passBuy" data-v="${d.id}">${d.usd}<small>${P.payTest(p) ? ' · тест' : ' · скоро'}</small></button>`;
      return `<div class="pcard ${cls}" style="--pbg:url(ev/pass_${d.id}.webp)">
        <div class="ptop"><h3>${d.name}</h3>${ticketSvg(c1, c2, mark)}</div>
        <div class="pnow">Купите и получите мгновенно <b>${GEM_ICON}${d.now}</b></div>
        <div class="pperks">${d.perks.map(x => `<div>✦ ${x}</div>`).join('')}</div>
        <div class="pday"><div><small>Забирайте каждый день</small><span class="pgem">${GEM_ICON}<b>${d.day}</b></span></div>
          <div class="pbuy"><small>${status}</small>${btn}</div></div></div>`;
    }).join('');
    const any = P.passAttention(p);
    // правка 152: head and «Получить всё» stand still, the cards scroll and fade under them; each card has its own picture
    return `<div class="modal" data-a="close"><div class="mbox passbox">
      <div class="bphead"><div><b>Пропуски</b><small>Кристаллы каждый день и постоянные бонусы</small></div><button class="x" data-a="close">✕</button><i class="mktrim"></i></div>
      <div class="pscroll" data-k="passes">${cards}</div>
      <div class="pfoot"><button class="gbtn" data-a="passClaim" data-v="" ${any ? '' : 'disabled'}>Получить всё${any ? '<i class="rdot"></i>' : ''}</button></div>
    </div></div>`;
  }

  // ---------------- tasks: daily / weekly / login calendar ----------------
  private vTasks(p: P.Profile): string {
    const tab = this.sel.taskTab, t = P.taskState(p);
    const tb = (id: 'day' | 'week' | 'login', name: string, dot: boolean) => `<button class="${tab === id ? 'on' : ''}" data-a="taskTab" data-v="${id}">${name}${dot ? '<i class="rdot"></i>' : ''}</button>`;
    const dDot = P.DAILY.some(d => !t.dDone.includes(d.id) && (t.d[d.key] ?? 0) >= d.need) || P.DAILY_CHESTS.some(c => !t.dChest.includes(c.at) && P.dailyPoints(p) >= c.at);
    const wDot = P.WEEKLY.some(d => d.key !== 'days' && !t.wDone.includes(d.id) && (t.w[d.key] ?? 0) >= d.need) || P.WEEKLY_CHESTS.some(c => !t.wChest.includes(c.at) && P.weeklyPoints(p) >= c.at);
    let body = '', head = '';
    if (tab === 'login') { // правка 91: stone tiles, gold seal on taken days, glowing today, lava frames on big days
      const l = P.loginState(p), can = P.loginClaimable(p);
      body = `${this.lvBanner('Награда за вход', 'sm')}<div class="lvsub">Награда за каждый день входа. Пропуск не сбрасывает прогресс.</div><div class="cal2">${P.LOGIN.map((d, i) => {
        const got = i < l.idx, today = i === l.idx && can;
        return `<button class="cday2${got ? ' got' : ''}${today ? ' today' : ''}${d.special ? ' sp' : ''}" ${today ? 'data-a="loginClaim"' : ''}><small>День ${i + 1}</small><span>${this.prizeIcon(d.icon)}</span><em>${d.label}</em>${got ? '<i class="seal"></i>' : ''}</button>`;
      }).join('')}</div>${can ? '<button class="lvbtn wide" data-a="loginClaim"><b>Забрать награду дня</b></button>' : '<div class="lvsub">Следующая награда — завтра</div>'}`;
    } else { // правка 90
      const weekly = tab === 'week', pts = weekly ? P.weeklyPoints(p) : P.dailyPoints(p), max = weekly ? 200 : 100;
      const chests = weekly ? P.WEEKLY_CHESTS : P.DAILY_CHESTS, got = weekly ? t.wChest : t.dChest;
      const HUE = [0, 70, 150, 220, 300]; // rune colour of each chest: blue, violet, red, gold, green
      const bar = `<div class="ptsbar2">${this.lvBar(pts / max)}${chests.map((c, k) => {
        const ok = pts >= c.at, taken = got.includes(c.at);
        return `<button class="pchest2${ok && !taken ? ' ready' : ''}${taken ? ' taken' : ''}${this.sel.tChest === c.at ? ' sel' : ''}" style="left:${100 * c.at / max}%;--h:${HUE[k % 5]}deg" data-a="taskChest" data-v="${weekly ? 'w' : 'd'}:${c.at}">${chestSvg(taken ? 2 : ok ? 1 : 0, 38 + k * 3)}<small>${c.at}</small></button>`;
      }).join('')}</div>`;
      const shown = chests.find(c => c.at === this.sel.tChest) ?? chests.find(c => !got.includes(c.at)) ?? chests[chests.length - 1];
      const info = `<div class="lvinfo pinfo"><span>Очки <b>${pts}/${max}</b></span><span>${shown.at} очков: <b>${shown.label}</b></span></div>`;
      const defs = weekly ? P.WEEKLY : P.DAILY, prog = weekly ? t.w : t.d, done = weekly ? t.wDone : t.dDone;
      const rank = (d: P.TaskDef) => { const ok = (prog[d.key] ?? 0) >= d.need, taken = done.includes(d.id); return P.taskLock(p, d.key) ? 3 : taken ? 2 : ok && d.key !== 'days' ? 0 : 1; };
      head = bar + info; // правка 100: stays put, only the list scrolls
      body = [...defs].sort((a, b) => rank(a) - rank(b)).map(d => {
        const v = Math.min(d.need, prog[d.key] ?? 0), ok = v >= d.need, taken = done.includes(d.id);
        const auto = d.key === 'days', ico = UI2['task_' + d.key] ?? UI2.task_runs, lock = P.taskLock(p, d.key);
        return `<div class="task2${taken ? ' taken' : ok && !auto ? ' ready' : ''}${lock ? ' tlocked' : ''}"><span class="tmed"><img src="${ico}" alt=""></span><div class="grow"><b>${d.text}</b>${lock ? `<div class="tlock">🔒 ${lock}</div>` : this.lvBar(v / d.need, `${fmt(v)}/${fmt(d.need)}`)}</div>
          <span class="tpts2">+${d.pts}</span>${auto ? '<span class="tauto">авто</span>' : taken ? '<i class="seal"></i>' : lock ? '' : `<button class="tclaim${ok ? ' on' : ''}" data-a="taskClaim" data-v="${weekly ? 'w' : 'd'}:${d.id}" ${ok ? '' : 'disabled'}>Забрать</button>`}</div>`;
      }).join('') + `<div class="lvsub">${weekly ? 'Сброс в понедельник' : 'Сброс в 00:00'}</div>`;
    }
    return `<div class="modal" data-a="close"><div class="mbox lvpanel tasks2">
      <div class="lvtabs">${tb('day', 'День', dDot)}${tb('week', 'Неделя', wDot)}${tb('login', 'Вход', P.loginClaimable(p))}<button class="lvsq x" data-a="close">✕</button></div>${head ? `<div class="t2head">${head}</div>` : ''}<div class="t2body panelbox" data-k="t${tab}">${body}</div></div></div>`;
  }

  // ---------------- правка 202: mail — letters from the developer (rewards, greetings) ----------------
  private mailBusy = false;
  private vMail(): string {
    const pick = (t: Record<string, string>) => t?.[curLang] ?? t?.en ?? t?.['*'] ?? Object.values(t ?? {})[0] ?? '';
    const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
    const date = (s: string) => { const d = new Date(s); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`; };
    const letters = cloud.mail();
    const tiles = (r: P.MailReward) => (Object.keys(P.MAIL_CAP) as P.MailKey[]).filter(k => (r[k] ?? 0) > 0)
      .map(k => `<span class="mrw"><span class="mri">${MAIL_RES[k]()}</span><b>${fmt(r[k]!)}</b></span>`).join('');
    const body = letters.length ? letters.map(l => {
      const has = Object.keys(l.rewards ?? {}).length > 0;
      return `<div class="mail1${has && !l.claimed ? ' ready' : ''}">
        <div class="mtop"><b translate="no">${esc(pick(l.title))}</b><small>${date(l.createdAt)}</small></div>
        <div class="mtext" translate="no">${esc(pick(l.body))}</div>
        ${has ? `<div class="mrews"><div class="mrl">${tiles(l.rewards)}</div>${l.claimed ? '<i class="seal"></i>' : `<button class="tclaim on" data-a="mailClaim" data-v="${l.id}" ${this.mailBusy ? 'disabled' : ''}>Забрать</button>`}</div>` : ''}
        <div class="mexp">до ${date(l.expiresAt)}</div></div>`;
    }).join('') : '<div class="lvsub mnone">Писем пока нет</div>';
    const many = letters.filter(l => !l.claimed && Object.keys(l.rewards ?? {}).length).length > 1;
    return `<div class="modal" data-a="close"><div class="mbox lvpanel tasks2 mailw">
      <div class="lvhead fixhead">${this.lvBanner('Почта', 'fit')}<button class="lvsq x" data-a="close">✕</button></div>
      <div class="t2body panelbox" data-k="mail">${body}</div>
      ${many ? `<button class="lvbtn wide" data-a="mailAll" ${this.mailBusy ? 'disabled' : ''}><b>Забрать всё</b></button>` : ''}</div></div>`;
  }
  /** rewards of letters: the server gives each one once, then it goes into the account and the reward window */
  private async claimMail(ids: number[]): Promise<void> {
    const p = this.p;
    if (!p || this.mailBusy || !ids.length) return;
    this.mailBusy = true; this.render();
    const before = this.snap();
    let got = 0, taken = 0, failed = false;
    for (const id of ids) {
      try { const r = await cloud.claimMail(id); if (r) { P.applyMail(p, r); got++; } else taken++; } catch { failed = true; break; }
    }
    this.mailBusy = false;
    if (got) { P.save(p); const items = this.diff(before); if (items.length) this.reward = { title: 'Почта', items }; }
    if (failed) this.toast('Нет связи — попробуй ещё раз');
    else if (taken && !got) this.toast('Награда уже получена');
    this.render();
  }

  // ---------------- black market: day / week / month ----------------
  /** title on the lava-stone banner (правки 87–91) */
  private lvBanner(t: string, cls = ''): string { return `<div class="lvbanner ${cls}${t.length > 16 && !cls.includes('fit') ? ' l1' : ''}"><span>${t}</span></div>`; }
  /** правка 146: a plate whose title must stay on one line — the font shrinks until the (translated) title fits */
  private fitBanners(): void {
    for (const sp of Array.from(this.root.querySelectorAll<HTMLElement>('.lvbanner.fit span'))) {
      sp.style.fontSize = ''; let fs = parseFloat(getComputedStyle(sp).fontSize);
      while (sp.scrollWidth > sp.clientWidth + 1 && fs > 10) { fs -= 1; sp.style.fontSize = fs + 'px'; }
    }
  }
  /** reward tile: octagonal stone frame with lava edge, big count in the corner, name on a stone plate */
  private lvTile(icon: string, count: string, name: string, c = '#ffb43a', cls = ''): string {
    return `<div class="lvcell ${cls}" style="--c:${c}"><div class="lvtile"><span class="lvti">${icon}</span>${count ? `<b class="lvq">${count}</b>` : ''}</div>${name ? `<small class="lvname">${name}</small>` : ''}</div>`;
  }
  /** stone trough with flowing lava */
  private lvBar(frac: number, text = ''): string {
    return `<div class="lvtrough"><i style="width:${Math.max(0, Math.min(100, 100 * frac)).toFixed(1)}%"></i>${text ? `<em>${text}</em>` : ''}</div>`;
  }

  private vIdle(p: P.Profile): string {
    const hrs = P.idleHours(p), r = P.idlePreview(p), per = P.idlePreview(p, 1), f = P.fastIdleState(p), F = P.FAST_IDLE;
    const st = hrs < IDLE.capH / 2 ? 0 : hrs < IDLE.capH ? 1 : 2;
    const fast = (v: string, cls: string, top: string, left: string, ok: boolean) =>
      `<button class="lvfast ${cls}" data-a="idleFast" data-v="${v}" ${ok ? '' : 'disabled'}><i class="lvgem"></i><b>${top}</b><small>${left}</small></button>`;
    // правки 146, 147: the head (plate, «?», «✕») stands still, the rest scrolls under it; «?» and «✕» sit in the frame corners
    return `<div class="modal" data-a="close"><div class="mbox lvpanel idle2">
      <div class="lvhead fixhead">${this.lvBanner('Сундук накопления', 'fit')}<button class="lvsq q" data-a="idleInfo">?</button><button class="lvsq x" data-a="close">✕</button></div>
      <div class="lvscroll" data-k="idle">
      <div class="ichest2 st${st}"><div class="icglow"></div>${chestSvg(st, 190)}${st === 2 ? sparksHtml(1, '#ffcf4a') : ''}</div>
      ${this.idleInfo ? `<div class="iinfo lvinfo"><div class="iline"><span>За час на этапе ${Math.max(1, p.maxMap)}:</span> <span class="ires">${resImg('gold')} ${fmt(per.gold)}</span> <span class="ires">${resImg('scrolls')} ${per.scrolls}</span> <span class="ires"><img class="gmix" src="ev/gems_mix.webp" alt=""> ${Math.round(IDLE.gemChanceH * 100)}%</span></div>
        <div>Копится до ${IDLE.capH} часов, дальше сундук не наполняется.</div><div>Быстрый сбор сразу даёт награду за ${IDLE.fastH} часа и не обнуляет сундук.</div></div>` : ''}
      <div class="lvrow">${this.lvTile(resImg('gold'), fmt(r.gold), 'Золото', '#ffcf4a')}${this.lvTile(resImg('scrolls'), String(r.scrolls), 'Свитки', '#e8b070')}${this.lvTile('<img class="gmix" src="ev/gems_mix.webp" alt="">', Math.round(r.gemChance * 100) + '%', 'Шанс гема', '#c070ff')}</div>
      ${this.lvBar(hrs / IDLE.capH, `${Math.floor(hrs)}ч ${Math.floor((hrs % 1) * 60)}м из ${IDLE.capH}ч`)}
      <button class="lvbtn wide" data-a="idle" ${hrs < 1 / 60 ? 'disabled' : ''}><b>Забрать</b></button>
      <div class="lvsub">Быстрый сбор · награда за ${IDLE.fastH} часа</div>
      <div class="lvfasts">${fast('free', 'g', 'Бесплатно', `${f.free}/${F.free}`, f.free > 0)}
        ${fast('energy', 'v', `⚡${F.energyCost}`, `${f.energy}/${F.energy}`, f.energy > 0 && p.energy >= F.energyCost)}
        ${fast('crystals', 'r', `💎${f.price}`, P.passActive(p, 'hunter') ? '∞' : `${f.crystals}/${F.crystals}`, f.crystals > 0)}</div>
      </div>
    </div></div>`;
  }

  // ---------------- black market (78): lanterns, stone, wax seals ----------------
  /** what a week / month pack holds, as tiles: icon html and count */
  private mktParts(o: P.MarketOffer): { icon: string; q: string }[] {
    const set = this.sel.set, el = this.sel.mElem, hr = this.sel.mHero;
    switch (o.id) {
      case 'wScroll': return [{ icon: resImg('scrolls', 'mpi'), q: '300' }];
      case 'wRune': return [{ icon: resImg('shards', 'mpi'), q: '300' }];
      case 'wTavern': return [{ icon: couponSvg(false, 44), q: '5' }, { icon: couponSvg(true, 44), q: '1' }];
      case 'wEss': return [{ icon: resImg('essBig', 'mpi'), q: '10' }];
      case 'wChest': return [{ icon: chestSvg(2, 46), q: '5' }];
      case 'mGem': return [{ icon: gemSvg('ruby', 40, 4), q: '1' }, { icon: gemSvg('sapphire', 40, 3), q: '2' }, { icon: resImg('essBig', 'mpi'), q: '20' }];
      case 'mHero': return [{ icon: `${this.heroSvg(hr)}<i class="pz">${resImg('particles', 'pzi')}</i>`, q: '100' }, { icon: couponSvg(true, 44), q: '10' }];
      case 'mLegend': return [{ icon: runeStone({ id: 'elem', elem: el, rarity: 5 }, 44), q: '2' }, { icon: itemSvg('mantle', set, 44, 2), q: '1' }];
      default: return [{ icon: this.prizeIcon(o.icon), q: '' }];
    }
  }
  private vMarket(p: P.Profile): string {
    const tab = this.sel.mktTab;
    const tb = (id: 'day' | 'week' | 'month', name: string) => `<button class="${tab === id ? 'on' : ''}" data-a="mktTab" data-v="${id}">${name}</button>`;
    const seal = (pct: number) => `<span class="wseal"><b>−${pct}%</b></span>`;
    const tile = (icon: string, label: string, a: string, v: string, price: string, opts: { got?: boolean; disc?: number; free?: boolean } = {}) =>
      `<button class="mo${opts.got ? ' sold' : ''}${opts.free ? ' free' : ''}" data-a="${a}" data-v="${v}" ${opts.got ? 'disabled' : ''}>
        ${opts.disc ? seal(opts.disc) : ''}<span class="mmed">${icon}</span><small>${label}</small>
        <span class="mprice">${opts.got ? 'Куплено' : price}</span>${opts.got ? '<i class="stamp">Продано</i>' : ''}</button>`;
    let body = '';
    if (tab === 'day') {
      body = `<div class="parch2">⌛ Обновится в 00:00</div><div class="mogrid">${P.dailyOffers().map(o => {
        const got = P.offerBought(p, o.id);
        const price = o.cur === 'free' ? 'Бесплатно' : `${o.cur === 'gold' ? resImg('gold') + fmt(o.price) : o.price + '💎'}`;
        return tile(this.prizeIcon(o.icon), o.label, 'offer', o.id, price, { got, disc: o.old ? Math.round(100 - 100 * o.price / o.old) : 0, free: o.cur === 'free' });
      }).join('')}</div>
      <div class="rlabel mdiv2"><span>Всегда в продаже</span></div><div class="mogrid">
      ${tile(this.prizeIcon('🎟️'), 'Средний купон', 'buyCoupon', '1', `${BIG_COUPON.price}💎`)}
      ${tile(this.prizeIcon('📜'), '100 свитков', 'buy', 'scrolls', `${PRICE.scrolls100}💎`)}
      ${tile(this.prizeIcon('🪙'), '100 000 золота', 'buy', 'gold', `${PRICE.gold100k}💎`)}
      ${tile(this.prizeIcon('💠'), 'Большая эссенция', 'buy', 'essBig', `${PRICE.essBig}💎`)}
      ${tile(this.prizeIcon('✨'), 'Малая эссенция', 'buy', 'essSmall', `${PRICE.essSmall}💎`)}
      ${tile(this.prizeIcon('⚡'), `30 энергии · ${p.energyBuys.day === new Date().toISOString().slice(0, 10) ? p.energyBuys.n : 0}/3`, 'buy', 'energy', `${PRICE.energy30}💎`)}
      ${tile(this.prizeIcon('⚡'), `${P.AD_ENERGY} энергии · ${P.adUsed(p, 'energy')}/${P.AD_LIMIT.energy}`, 'ad', 'energy', P.adLeft(p, 'energy') ? '▶ Реклама' : 'Завтра')}</div>`;
    } else {
      const monthly = tab === 'month', list = monthly ? P.MONTH_OFFERS : P.WEEK_OFFERS;
      const cyc = (a: string, label: string) => `<button class="cyc2" data-a="${a}"><i>◀</i><span>${label}</span><i>▶</i></button>`;
      body = `<div class="parch2">⌛ ${monthly ? 'Обновится 1-го числа' : 'Обновится в понедельник'}</div><div class="mpacks">` + list.map(o => {
        const left = P.marketLeft(p, monthly, o), parts = this.mktParts(o);
        let pk = '';
        if (o.pick === 'set' || o.pick === 'setElem') pk += cyc('cycSet', `Комплект «${SET_NAME[this.sel.set]}»`);
        if (o.pick === 'setElem') pk += cyc('cycElem', `Стихия: ${ELEMENT_NAME[this.sel.mElem]}`);
        if (o.pick === 'hero') pk += cyc('cycHero', `Герой: ${hero(this.sel.mHero).name}`);
        const main = o.id === 'mHero' ? `<span class="mhero">${this.heroSvg(this.sel.mHero)}</span>` : o.id === 'wTavern' ? couponSvg(true, 62) : parts[0].icon;
        return `<div class="mpack${left ? '' : ' sold'}">${seal(Math.round(100 - 100 * o.price / o.old))}
          <div class="mptop"><span class="mmed big">${main}</span><div class="mpinfo"><b>${o.label}</b><div class="mparts">${parts.map(x => `<span class="mpt">${x.icon}${x.q ? `<em>×${x.q}</em>` : ''}</span>`).join('')}</div></div></div>
          <div class="mdesc">${o.desc}</div>${pk ? `<div class="cycs">${pk}</div>` : ''}
          <div class="mpbot"><small>осталось ${left}/${o.limit}</small><button class="lvbtn mbuy" data-a="mBuy" data-v="${monthly ? 'm' : 'w'}:${o.id}" ${left ? '' : 'disabled'}><b><s>${o.old}</s> ${o.price}💎</b></button></div>
          ${left ? '' : '<i class="stamp">Продано</i>'}</div>`;
      }).join('') + '</div>';
    }
    return `<div class="mkscreen lv">${sparksHtml(1, '#ff7a2a')}
      <div class="mktop"><button class="lvsq x" data-a="close">✕</button>
        <div class="mkrow"><i class="lantern"><i></i></i>${this.lvBanner('Чёрный рынок')}<i class="lantern"><i></i></i></div>
        <div class="lvtabs mtabs2">${tb('day', 'День')}${tb('week', 'Неделя')}${tb('month', 'Месяц')}</div><i class="mktrim"></i></div>
      <div class="mkbody panelbox" data-k="m${tab}">${body}</div></div>`;
  }

  private modal(color: string, head: string, body: string): string {
    return `<div class="modal" data-a="close"><div class="mbox" style="--r:${color}">
      <div class="mhead">${head}<button class="x" data-a="close">✕</button></div>${body}</div></div>`;
  }

  private itemModal(p: P.Profile, it: P.Item): string {
    const eq = p.equipped[it.slot] === it.uid, c = levelCost(it.level), capped = it.level >= RARITY_CAP[it.rarity];
    const cur = P.equippedItem(p, it.slot), col = RARITY_COLOR[it.rarity];
    // picking a gem for a socket
    if (this.sel.pick && this.sel.pick.item === it.uid) {
      // правка 157: only the two kinds of gems this item takes
      const fit = GEM_SLOTS[it.slot], free = p.gems.filter(g => fit.includes(g.type) && !P.gemHolder(p, g.uid)).sort((a, b) => b.stars - a.stars || b.level - a.level);
      return this.modal(col, `<span class="micon">${itemSvg(it.slot, it.set, 50, it.rarity)}</span><div><b>Гем в гнездо ${this.sel.pick.idx + 1}</b><div class="muted small">${P.itemName(it)}</div></div>`, `
        <div class="gfit">${fit.map(t => `<span>${gemSvg(t, 22, 3)}<b>${GEM[t].name}</b><small>${GEM[t].stat}</small></span>`).join('')}</div>
        <div class="ggrid pick">${free.map(g => `<button class="gtile s${g.stars}" data-a="sockPut" data-v="${g.uid}" style="--g:${GEM[g.type].color}">${g.level > 1 ? `<span class="glv">${g.level}</span>` : ''}<span class="gst">${'★'.repeat(g.stars)}</span>${gemSvg(g.type, 34, g.stars)}<small class="gval">${P.gemValue(g)}</small></button>`).join('') || `<p class="muted">Свободных гемов этих видов нет. Ищи их в Ювелирной</p>`}</div>
        <div class="muted small">${free.length ? 'Нажми на гем, чтобы вставить. ' : ''}Вынуть гем потом можно бесплатно.</div>
        <div class="btns"><button class="btn ghost" data-a="sockCancel">Назад</button></div>`);
    }
    const sock = (i: number) => {
      const open = P.socketOpen(it, i), g = p.gems.find(x => x.uid === it.gems[i]);
      if (!open) return `<button class="sock lock" data-a="sockLock" data-v="${i}"><span>🔒</span><small>ур. ${P.SOCKET_LEVEL[i]}</small></button>`;
      if (!g) return `<button class="sock" data-a="sockOpen" data-v="${i}"><span>+</span><i class="sfit">${GEM_SLOTS[it.slot].map(t => gemSvg(t, 14, 3)).join('')}</i></button>`; // правка 157: which gems go here
      return `<button class="sock full s${g.stars}" data-a="sockOut" data-v="${i}" style="--g:${GEM[g.type].color}" title="${GEM[g.type].name}">${gemSvg(g.type, 32, g.stars)}<small>${P.gemValue(g)}</small></button>`;
    };
    // what the rarity opens: a crystal of that rarity's colour, lit when open
    const lines = gearLines(it.slot, it.set).map(l => {
      const on = it.rarity >= l.at;
      return `<div class="gl2${on ? ' on' : ''}" style="--d:${RARITY_COLOR[l.at]}"><i class="dia"></i><span><em>${RARITIES[l.at]}</em> ${l.fx && l.at === EPIC ? `<b>${l.fx.name}:</b> ${l.fx.e}` : l.text}</span>${on ? '' : '<i class="lk2">🔒</i>'}</div>`;
    }).join('');
    // the next rarity step: what it takes and which items go in
    let up = '';
    const need = P.mergeNeed(p, it);
    if (need) {
      const ok = need.have.length >= need.n, next = it.rarity + 1;
      const opens = gearLines(it.slot, it.set).find(l => l.at === next);
      const cells = Array.from({ length: need.n }, (_, i) => {
        const x = need.have[i];
        return x ? `<span class="fd" style="--r:${RARITY_COLOR[x.rarity]}">${itemSvg(x.slot, x.set, 34, x.rarity)}</span>` : '<span class="fd none">?</span>';
      }).join('');
      up = `<div class="upbox" id="ibmerge" style="--n:${RARITY_COLOR[next]}">
        <div class="uphead">Повысить редкость <b>→ ${RARITIES[next]}</b></div>
        <div class="uprow"><span class="fd self" style="--r:${col}">${itemSvg(it.slot, it.set, 34, it.rarity)}</span><b class="plus">+</b>${cells}
          <button class="btn ${ok ? 'big2' : 'ghost'}" data-a="merge" ${ok ? '' : 'disabled'}>Повысить</button></div>
        <div class="muted small">Нужно: ${P.mergeNeedText(it)} — есть ${need.have.length}. Предел уровня станет ${RARITY_CAP[next]}${opens ? `, откроется: ${opens.text}` : ''}.</div></div>`;
    } else up = `<div class="upbox max" id="ibmerge"><div class="uphead">Высшая редкость — мифическое</div></div>`;
    // how far the gold and scrolls go right now
    let tgt = it.level, g = p.gold, sc = p.scrolls;
    while (tgt < RARITY_CAP[it.rarity]) { const k = levelCost(tgt); if (g < k.gold || sc < k.scrolls) break; g -= k.gold; sc -= k.scrolls; tgt++; }
    const canUp = !capped && tgt > it.level;
    const cost = capped ? `<span class="ibcap">Предел уровня ${RARITY_CAP[it.rarity]} — повысь редкость, чтобы качать дальше</span>`
      : `<span>${resImg('gold')}<b class="${p.gold >= c.gold ? 'ok' : 'no'}">${fmt(p.gold)}</b>/${fmt(c.gold)}</span><span>${resImg('scrolls')}<b class="${p.scrolls >= c.scrolls ? 'ok' : 'no'}">${fmt(p.scrolls)}</b>/${fmt(c.scrolls)}</span>`;
    const wear = eq ? (it.slot === 'book' ? '<button class="ibb wear on" disabled><b>Надето</b><small>оружие</small></button>' : `<button class="ibb wear on" data-a="unequip" data-v="${it.slot}"><b>Снять</b><small>надето</small></button>`)
      : `<button class="ibb wear" data-a="equip" data-v="${it.uid}"><b>Надеть</b><small>${cur ? `вместо ур. ${cur.level}` : 'слот пуст'}</small></button>`;
    return `<div class="modal" data-a="close"><div class="mbox itembox2 t${R_TIER[it.rarity]}" style="--r:${col}">
      <button class="x corner-x" data-a="close">✕</button>
      <div class="ibhead"><div class="ibtitle"><span>${P.itemName(it)}</span></div><div class="ibrib"><span>${RARITIES[it.rarity]}</span></div></div>
      <div class="ibscroll">
        <div class="ibtop">
          <div class="ibart"><span class="ibimg">${itemSvg(it.slot, it.set, 104, it.rarity)}</span>${it.set ? `<img class="ibset" src="${ICONS['set_' + it.set]}" alt="">` : ''}${plusFrame(it.rarity, ' big')}</div>
          <div class="ibside">
            <div class="iblvl"><small>Уровень</small><b>${it.level}<i>/${RARITY_CAP[it.rarity]}</i></b></div>
            <div class="ibtools"><button class="ibtool red" data-a="resetItem" ${it.level > 1 ? '' : 'disabled'}><span>⟲</span><small>Сброс</small></button>
              <button class="ibtool violet" data-a="toMerge"><span>⚒</span><small>Редкость</small></button></div>
          </div></div>
        <div class="statline">${this.itemStats(it)}</div>
        <div class="socks4">${sock(0)}${sock(1)}${sock(2)}${sock(3)}</div>
        <div class="ibsec">Свойства по редкости</div>
        <div class="gl2s">${lines}</div>
        ${up}
        ${!eq && cur ? `<div class="muted small">Сейчас надето: ${P.itemName(cur)} · ${RARITIES[cur.rarity]} · ур. ${cur.level}${this.itemDiff(it, cur)}</div>` : ''}
        ${it.set ? `<div class="ibset2"><img src="${ICONS['set_' + it.set]}" alt=""><div><b>Комплект «${SET_NAME[it.set]}»</b><div class="small">2 шт. — ${SET_DESC[it.set].b2}; 4 шт. — ${SET_DESC[it.set].b4}; 6 шт. — ${SET_DESC[it.set].b6}</div></div></div>` : ''}
      </div>
      <div class="ibfoot"><div class="ibcost">${cost}</div>
        <div class="ibbtns">${wear}
          <button class="ibb ibup" data-a="up" data-v="1" ${canUp ? '' : 'disabled'}><b>Улучшить</b><small>${capped ? 'предел' : '+1 уровень'}</small></button>
          <button class="ibb max" data-a="up" data-v="999" ${canUp ? '' : 'disabled'}><b>Максимум</b><small>${canUp ? `до ур. ${tgt}` : capped ? 'предел' : 'не хватает'}</small></button></div></div>
    </div></div>`;
  }

  private runeModal(p: P.Profile, r: P.Rune): string {
    const holder = P.runeHolder(p, r.uid), on = holder === p.active, d = RUNES[r.id], s = r.rarity, col = RARITY_COLOR[s];
    const mates = P.runeMates(p, r).length, need = runeDupes(s);
    const lines = P.runeLines(r).map(l => `<div class="gline${l.on ? ' on' : ''}${l.at > 0 ? ' fx' : ''}"><i>${l.on ? '✓' : '🔒'}</i><span>${l.at > 0 ? `<em style="color:${RARITY_COLOR[l.at]}">${RUNE_RARITY[l.at]}</em>` : ''}${l.text}</span></div>`).join('');
    return `<div class="modal" data-a="close"><div class="mbox runebox t${R_TIER[s]}" style="--r:${col}">
      <div class="mhead"><span class="rbig">${this.runeBadge(r, 72)}</span><div><b>${P.runeName(r)}</b>
        <div class="small"><span class="rtype">${RUNE_TYPE_NAME[d.type]}</span> · <b style="color:${col}">${RUNE_RARITY[s]}</b></div></div><button class="x" data-a="close">✕</button></div>
      <div class="statline">${P.runeValue(r)}${s < MYTHIC ? ` <span class="muted small">→ ${RUNE_RARITY[s + 1].toLowerCase()}: ${P.pctTxt(P.runeMain(r, s + 1))}</span>` : ''}</div>
      <div class="glines">${lines}</div>
      ${holder && !on ? `<div class="muted small">Вставлена у героя: ${hero(holder).name}</div>` : ''}
      <div class="btns"><button class="btn big2" data-a="runeToggle">${on ? 'Снять' : holder ? 'Забрать себе' : 'Вставить'}</button>
        ${s < MYTHIC ? `<button class="btn" data-a="runeUp" ${p.shards >= RUNE_UP[s] ? '' : 'disabled'}>Улучшить · ${RUNE_UP[s]} ᚱ</button>` : ''}</div>
      <div class="btns">${s < MYTHIC ? `<button class="btn ${mates >= need ? '' : 'ghost'}" data-a="runeMerge" ${mates >= need ? '' : 'disabled'}><span>Слить с копиями (${Math.min(mates, need)}/${need})</span></button>` : ''}
        ${holder ? '' : `<button class="btn ghost" data-a="runeBreak"><span>Разобрать</span> · +${Math.floor(runeWorth(s) / 2)} ᚱ</button>`}</div>
      <div class="muted small"><span>Осколков: ${fmt(p.shards)}.</span> <span>${s < MYTHIC ? (need === 1 ? 'Слияние: ещё одна такая же руна этой редкости.' : 'Слияние: ещё 2 такие же руны этой редкости.') : 'Высшая редкость.'}</span></div>
    </div></div>`;
  }

  /** smith (71): every merge that can be done now, a tick per row, tap an item to keep it */
  private smithModal(p: P.Profile): string {
    const plan = P.smithPlan(p), on = plan.filter(g => this.smOn(g)).length;
    const tile = (x: P.Item, cls: string, a = '', v = '') => { const tag = a ? 'button' : 'span';
      return `<${tag} class="smi ${cls}" style="--r:${RARITY_COLOR[x.rarity]}" ${a ? `data-a="${a}" data-v="${v}"` : ''}>${itemSvg(x.slot, x.set, 38, x.rarity)}${plusFrame(x.rarity, ' sm')}<i class="lv">${x.level}</i>${cls.includes('keep') ? '<i class="crown">♛</i>' : ''}</${tag}>`; };
    const rows = plan.map(g => {
      const grp = this.smGroup(g), keep = p.items.find(x => x.uid === grp.keep)!, okKeep = P.smithKeepers(p, g), checked = this.smOn(g);
      const members = [grp.keep, ...grp.mats].map(u => p.items.find(x => x.uid === u)!)
        .sort((a, b) => [g.keep, ...g.mats].indexOf(a.uid) - [g.keep, ...g.mats].indexOf(b.uid))
        .map(x => tile(x, x.uid === grp.keep ? 'keep' : okKeep.includes(x.uid) ? 'can' : 'mat', okKeep.includes(x.uid) && x.uid !== grp.keep ? 'smKeep' : '', `${g.keep}:${x.uid}`)).join('');
      const next = { ...keep, rarity: keep.rarity + 1 } as P.Item;
      return `<div class="smrow${checked ? ' on' : ''}"><button class="smchk" data-a="smToggle" data-v="${g.keep}">${checked ? '✓' : ''}</button>
        <div class="smitems">${members}</div><span class="smarrow">➜</span>
        <div class="smres">${tile(next, 'res')}<small style="color:${RARITY_COLOR[next.rarity]}">${RARITIES[next.rarity]}</small></div></div>`;
    }).join('');
    return this.modal('#c99a3a', `<span class="micon">⚒</span><div><b>Кузнец</b><div class="muted small">Обычные и редкие отмечены сразу. Нажми на предмет, чтобы оставить именно его (♛)</div></div>`, plan.length
      ? `<div class="smlist">${rows}</div><div class="btns smbtns"><button class="btn ghost" data-a="smAll">${plan.every(g => this.smOn(g)) ? 'Снять лишние' : 'Отметить все'}</button>
        <button class="stonebtn" data-a="smGo" ${on ? '' : 'disabled'}><b>Слить выбранное</b><small>${on} ${on === 1 ? 'слияние' : on < 5 && on ? 'слияния' : 'слияний'}</small></button></div>
        <div class="muted small">Уровень остаётся самый высокий, на остальные потраченное вернётся на 90%. Надетый предмет всегда остаётся.</div>`
      : '<p class="muted">Нечего сливать. Обычные и редкие: 3 одинаковых предмета (слот, комплект, редкость). Эпические и выше: смотри «Повысить редкость» в карточке предмета.</p>');
  }

  /** rune workshop (74): a stone altar with the centre and copy sockets, the storage below; a "craft" tab */
  private workshopScreen(p: P.Profile): string {
    const tab = this.sel.wsTab ?? 'merge';
    const tabs = `<div class="wstabs"><button class="${tab === 'merge' ? 'on' : ''}" data-a="wsTab" data-v="merge">Слияние</button><button class="${tab === 'craft' ? 'on' : ''}" data-a="wsTab" data-v="craft">Создание</button></div>`;
    const head = `<div class="wshead"><div class="wstitle">Мастерская рун</div><span class="wsshard">${resImg('shards')} ${fmt(p.shards)}</span><button class="x" data-a="wsClose">✕</button></div>`;
    let body = '';
    if (tab === 'merge') {
      const c = p.runes.find(x => x.uid === this.sel.wsCenter), need = c ? runeDupes(c.rarity) : 2, pick = (this.sel.wsPick ?? []).filter(u => p.runes.some(x => x.uid === u));
      const col = c ? RARITY_COLOR[c.rarity] : '#8a7a6a', ncol = c && c.rarity < MYTHIC ? RARITY_COLOR[c.rarity + 1] : col;
      const pos = need === 2 ? [[22, 72], [78, 72]] : [[50, 80]];
      const ghost = c ? this.runeBadge(c, 46) : '';
      const sockets = pos.map(([x, y], i) => { const r = p.runes.find(q => q.uid === pick[i]);
        return `<button class="asock cp${r ? ' full' : ''}" style="left:${x}%;top:${y}%" ${r ? `data-a="wsRune" data-v="${r.uid}"` : ''}>${r ? this.runeBadge(r, 50) + '<i class="chk">✓</i>' : `<span class="ghost">${ghost}</span>`}</button>`; }).join('');
      const chan = pos.map(([x, y], i) => `<path class="chan${pick[i] ? ' lit' : ''}" d="M${x * 3.6} ${y * 2.4} Q${(x * 3.6 + 180) / 2} ${y * 2.4 - 6} 180 ${0.32 * 240}"/>`).join('');
      const full = !!c && pick.length >= need;
      const altar = `<div class="altar${full ? ' ready' : ''}" style="--c:${col};--n:${ncol}">
        <svg class="altsvg" viewBox="0 0 360 240"><defs><radialGradient id="altg" cx=".5" cy=".4"><stop offset="0" stop-color="#5a4c42"/><stop offset="1" stop-color="#1e1814"/></radialGradient></defs>
          <ellipse cx="180" cy="150" rx="172" ry="84" fill="#0c0908"/><ellipse cx="180" cy="140" rx="168" ry="80" fill="url(#altg)" stroke="#0c0908" stroke-width="3"/>
          <ellipse cx="180" cy="140" rx="150" ry="66" fill="none" stroke="#2a221c" stroke-width="3"/>
          <ellipse cx="180" cy="140" rx="140" ry="58" fill="none" stroke="var(--c)" stroke-width="1.5" stroke-dasharray="3 9" class="aring"/>
          ${chan}<circle cx="180" cy="77" r="44" fill="#0c0908"/><circle cx="180" cy="77" r="40" fill="none" stroke="var(--c)" stroke-width="2" class="aglow"/></svg>
        ${sockets}
        <button class="asock cen${c ? ' full' : ''}" style="left:50%;top:32%" ${c ? `data-a="wsRune" data-v="${c.uid}"` : ''}>${c ? this.runeBadge(c, 72) : '<span class="q">?</span>'}</button>
        <div class="aflash"></div></div>`;
      const info = c ? `<div class="wsinfo"><b>${P.runeName(c)}</b>
          <div class="rplq"><span style="--c:${col}">${RUNE_RARITY[c.rarity]}</span>${c.rarity < MYTHIC ? `<em>➜</em><span style="--c:${ncol}">${RUNE_RARITY[c.rarity + 1]}</span>` : ''}</div>
          ${c.rarity < MYTHIC ? `<div class="wsbonus">${P.runeValue(c)} → <b>${P.pctTxt(P.runeMain(c, c.rarity + 1))}</b></div>${P.runeLines(c).filter(l => l.at === c.rarity + 1).map(l => `<div class="opn">Откроется: ${l.text}</div>`).join('')}` : '<div class="muted small">Высшая редкость</div>'}
          <div class="muted small">Нужно ${need === 1 ? 'ещё 1 такая же руна' : 'ещё 2 такие же руны'} той же редкости, не вставленные</div></div>`
        : '<div class="wsinfo"><div class="muted">Выбери руну в хранилище — она встанет в центр алтаря</div></div>';
      const btns = `<div class="wsbtns"><button class="btn ghost" data-a="wsAuto">Подобрать</button><button class="stonebtn" data-a="wsFuse" ${full ? '' : 'disabled'}><b>Объединить</b><small>${c ? `${Math.min(pick.length, need)}/${need}` : '—'}</small></button></div>`;
      const mates = new Set(c ? P.runeMates(p, c).map(x => x.uid) : []);
      const list = [...p.runes].sort((a, b) => b.rarity - a.rarity || P.runeKey(a).localeCompare(P.runeKey(b)) || a.uid - b.uid).map(r => {
        const cls = r.uid === c?.uid ? ' cen' : pick.includes(r.uid) ? ' pk' : mates.has(r.uid) ? ' mate' : c ? ' dim' : '';
        const worn = P.runeHolder(p, r.uid);
        return `<button class="rcard t${R_TIER[r.rarity]}${cls}" style="--r:${RARITY_COLOR[r.rarity]}" data-a="wsRune" data-v="${r.uid}">${P.canMergeRune(p, r) && !c ? '<span class="dot">!</span>' : ''}${worn ? `<span class="worn">${this.heroSvg(worn)}</span>` : ''}${pick.includes(r.uid) ? '<i class="chk">✓</i>' : ''}${this.runeBadge(r, 48)}</button>`;
      }).join('');
      body = altar + info + btns + `<div class="vault"><div class="vhead">Хранилище <small>${p.runes.length}</small></div><div class="vgrid">${list || '<p class="muted">Рун пока нет</p>'}</div></div>`;
    } else {
      const sample: Record<RuneType, P.Rune> = { bless: { uid: 0, id: 'revive', rarity: 0 }, boost: { uid: 0, id: 'f_orbs', rarity: 0 }, skill: { uid: 0, id: 'skill', skill: 'meteor', rarity: 0 } };
      body = `<div class="altar craft" style="--c:#c99a3a;--n:#ffcf4a"><svg class="altsvg" viewBox="0 0 360 240"><defs><radialGradient id="altg2" cx=".5" cy=".4"><stop offset="0" stop-color="#5a4c42"/><stop offset="1" stop-color="#1e1814"/></radialGradient></defs>
          <ellipse cx="180" cy="150" rx="172" ry="84" fill="#0c0908"/><ellipse cx="180" cy="140" rx="168" ry="80" fill="url(#altg2)" stroke="#0c0908" stroke-width="3"/>
          <ellipse cx="180" cy="140" rx="140" ry="58" fill="none" stroke="var(--c)" stroke-width="1.5" stroke-dasharray="3 9" class="aring"/>
          <circle cx="180" cy="110" r="52" fill="#0c0908"/><circle cx="180" cy="110" r="48" fill="none" stroke="var(--c)" stroke-width="2" class="aglow"/></svg>
          <span class="asock cen big" style="left:50%;top:46%"><span class="q">ᚱ</span></span></div>
        <div class="wsinfo"><b>Создать руну из осколков</b><div class="muted small">Новая руна — обычная. Одинаковые потом сливаются на алтаре.</div></div>
        <div class="wsbtns"><button class="stonebtn" data-a="craft" ${p.shards >= RUNE_CRAFT ? '' : 'disabled'}><b>Случайная</b><small>${RUNE_CRAFT} ᚱ</small></button></div>
        <div class="vhead">Руна выбранного типа</div>
        <div class="wsrow">${RUNE_TYPES.map(t => `<button class="wsbtn" data-a="craft" data-v="${t}" ${p.shards >= RUNE_CRAFT_TYPE ? '' : 'disabled'}>${this.runeBadge(sample[t], 44)}<b>${RUNE_TYPE_NAME[t]}</b><small>${RUNE_CRAFT_TYPE} ᚱ</small></button>`).join('')}</div>
        <div class="muted small" style="margin-top:10px">Ненужную руну можно разобрать в её карточке — вернётся половина осколков.</div>`;
    }
    return `<div class="wscreen">${head}${tabs}<div class="wsbody">${body}</div></div>`;
  }

  private gemModal(p: P.Profile, g: P.Gem): string {
    const d = GEM[g.type], holder = P.gemHolder(p, g.uid);
    return this.modal(d.color, `<span class="micon">${gemSvg(g.type, 48, g.stars)}</span><div><b>${d.name} <span class="gstars s${g.stars}">${'★'.repeat(g.stars)}</span></b><div class="muted small">${d.stat}</div></div>`, `
      <div class="muted">Уровень ${g.level}/100${holder ? ` · вставлен: ${SLOT_ICON[holder.slot]} ${P.itemName(holder)}` : ' · свободен'}</div>
      <div class="gfitline">Ставится в: ${gemSlotsOf(g.type).map(s => `<b>${SLOT_ICON[s]} ${SLOT_NAME[s]}</b>`).join(' ')}</div>
      ${g.level < 100 ? `<div class="bar"><div style="width:${(100 * g.xp / gemXpFor(g.level)).toFixed(0)}%"></div></div>` : ''}
      <div class="statline">${P.gemValue(g)} <span class="muted small">(на 100 ур. ${P.gemValue({ type: g.type, stars: g.stars, level: 100 })})</span></div>
      <div class="muted small">Вставить гем — в окне предмета (Герой → Снаряжение), в нём 4 гнезда.</div>
      <div class="btns"><button class="btn" data-a="ess" data-v="small" ${p.essSmall ? '' : 'disabled'}>Малая эссенция ×10 (${p.essSmall})</button>
        <button class="btn" data-a="ess" data-v="big" ${p.essBig ? '' : 'disabled'}>Большая (${p.essBig})</button>
        <button class="btn ghost" data-a="synth">Синтез</button></div>`);
  }


  /** правка 88: full screen in a lava cave, stone wheel with lava seams, gold pointer, stone spin button */
  private vWheel(p: P.Profile): string {
    const tab = this.wheel.tab, wid = tab === 'super' ? 'super' : 'adv', W = P.WHEELS[wid], N = W.prizes.length, seg = 360 / N;
    const cx = 150, cy = 150;
    const pt = (a: number, r: number) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const prizes = W.prizes.map((z, i) => {
      const a = i * seg + seg / 2, [ix, iy] = pt(a, 88), [qx, qy] = pt(a, 60);
      return `<g transform="rotate(${a} ${ix.toFixed(1)} ${iy.toFixed(1)})"><circle cx="${ix.toFixed(1)}" cy="${iy.toFixed(1)}" r="17" fill="#120c0a" fill-opacity=".55" stroke="${PRIZE_COLOR[z.tier]}" stroke-width="2.5"/>
        <foreignObject x="${(ix - 15).toFixed(1)}" y="${(iy - 15).toFixed(1)}" width="30" height="30"><div class="wico">${this.prizeIcon(z.icon)}</div></foreignObject></g>
        <text x="${qx.toFixed(1)}" y="${qy.toFixed(1)}" font-size="12.5" font-weight="900" fill="#ffe8a8" stroke="#1a0800" stroke-width="3.5" paint-order="stroke" text-anchor="middle" dominant-baseline="middle" transform="rotate(${a < 180 ? a - 90 : a + 90} ${qx.toFixed(1)} ${qy.toFixed(1)})">${z.qty}</text>`;
    }).join('');
    const best = W.prizes[W.best] ?? W.prizes[0];
    const free = P.lotteryFree(p);
    const tb = (id: 'free' | 'adv' | 'super', name: string) => `<button class="${tab === id ? 'on' : ''}" data-a="wtab" data-v="${id}">${name}</button>`;
    const btn = tab === 'free' ? (free ? 'Бесплатно' : 'Завтра') : `${W.price}💎`;
    const tot = W.prizes.reduce((a, x) => a + x.w, 0);
    const info = this.wheel.info ? `<div class="wodds lvpanel" data-a="wInfo"><b>Шансы · ${W.name} колесо</b>${W.prizes.map(z => `<div><span>${this.prizeIcon(z.icon)} ${z.label} ${z.qty}</span><em>${(100 * z.w / tot).toFixed(1)}%</em></div>`).join('')}
      <div class="muted small">${wid === 'adv' ? `Гарантия легендарного приза через ${40 - p.pityLottery} вращений. Одно бесплатное вращение в день.` : 'Только крупные призы.'}</div></div>` : '';
    const POINTER = '<svg class="wpin" viewBox="0 0 40 46"><path d="M4 4 H36 L20 42 Z" fill="url(#wpg)" stroke="#2a1400" stroke-width="3" stroke-linejoin="round"/><path d="M10 8 H30 L20 32 Z" fill="#fff4c0" opacity=".35"/><circle cx="20" cy="10" r="4" fill="#e8303a" stroke="#2a1400" stroke-width="1.5"/><defs><linearGradient id="wpg" x1="0" x2="1"><stop offset="0" stop-color="#8a5a10"/><stop offset=".45" stop-color="#ffe08a"/><stop offset="1" stop-color="#b07a20"/></linearGradient></defs></svg>';
    return `<div class="whscreen">${sparksHtml(1, '#ff8a2a')}
      <div class="whtop"><div class="lvtabs">${tb('free', 'Бесплатное')}${tb('adv', 'Улучшенное')}${tb('super', 'Супер')}</div><button class="lvsq q" data-a="wInfo">?</button><button class="lvsq x" data-a="close">✕</button></div>
      ${this.lvBanner('Колесо фортуны')}
      <div class="wheelwrap2"><div class="whalo"></div>${POINTER}
        <div class="wheel" style="transform:rotate(${this.wheel.rot}deg)"><img class="wimg" src="${UI2.wheel}" alt="" draggable="false"><svg class="wprz" viewBox="0 0 300 300">${prizes}</svg></div>
        <button class="wbtn2" data-a="spin" data-v="1" ${this.wheel.busy ? 'disabled' : ''}><b>${this.wheel.busy ? '…' : 'Крутить'}</b><small>${btn}</small></button></div>
      <div class="wbtns">${tab !== 'free' ? `<button class="lvbtn" data-a="spin" data-v="10" ${this.wheel.busy ? 'disabled' : ''}><b>×10</b><small>${W.price10}💎</small></button>` : ''}${this.wheel.busy ? '' : this.adBtn(p, 'wheel', 'Вращение за рекламу', 'adbtn wad')}</div>
      <div class="superline2"><span class="sico">${this.prizeIcon(best.icon)}</span><span>Суперприз<b>${best.label} ${best.qty}</b></span></div>
      ${info}
    </div>`;
  }

  private prizeIcon(icon: string): string {
    if (icon === '◈') return gemSvg('ruby', 28, 4);
    if (icon === '◆') return gemSvg('amethyst', 28, 3);
    if (icon === '◇') return gemSvg('sapphire', 28, 2);
    if (RES_OF[icon]) return resImg(RES_OF[icon]);
    if (icon === '🔶') return runeStone({ id: 'fury', rarity: 5 }, 34);
    if (icon === '🛡️') return itemSvg('mantle', 'guard', 34, 2);
    if (icon === '📕') return itemSvg('book', 'guard', 34, 2);
    if (icon === '🏆') return chestSvg(2, 36);
    if (icon === '💎') return GEM_ICON;
    if (icon === '🎫') return couponSvg(false, 34);
    if (icon === '🎟️') return couponSvg(true, 34);
    return icon;
  }

  /** правка 145: the stage chest under the rewards — closed and shaking until tapped, then open with its prize */
  private stageChestHtml(r: Reward, tile: (it: RewardItem, k: number) => string): string {
    const c = r.chest; if (!c) return '';
    const gold = c.kind === 'gold', name = gold ? 'Золотой сундук — первое прохождение' : 'Сундук этапа';
    if (!c.open) return `<button class="stchest ${c.kind}" data-a="stageChest"><span class="stimg">${chestSvg(1, 92)}</span><b>${name}</b><small>Нажми, чтобы открыть</small></button>`;
    return `<div class="stchest ${c.kind} open"><span class="stimg">${chestSvg(2, 92)}</span><b>${name}</b><div class="stprize">${c.items.map(tile).join('')}</div></div>`;
  }
  private adDoubleHtml(r: Reward): string {
    const p = this.p;
    if (!r.ad || !p || (r.chest && !r.chest.open)) return '';
    if (r.ad.done) return '<div class="addone">✓ Награда удвоена</div>';
    const left = P.adLeft(p, 'double'), lim = P.AD_LIMIT.double;
    if (!left) return '';
    return `<button class="adbtn adx2" data-a="adDouble"><span class="adi">▶</span><b>Удвоить награду</b><small>${P.adSkip(p) ? '<em>без ролика</em> ' : ''}${lim - left}/${lim}</small></button>`;
  }
  private vReward(): string {
    const r = this.reward!;
    // a new hero first gets the whole screen
    if (r.reveal?.length) {
      const id = r.reveal[0], hd = hero(id), c = EL_HEX[hd.element];
      return `<div class="rewardov reveal" data-a="revealNext" style="--rc:${c}">${sparksHtml(3, c)}
        <div class="rvwrap"><div class="rvrays"></div><div class="rvflash"></div>
          <div class="rvhero">${this.heroBig(id, 230)}</div>
          <div class="rvname">${hd.name}</div><div class="rvsub">Новый герой · ${ELEMENT_NAME[hd.element]}</div></div>
        <div class="tapnote">Нажми, чтобы продолжить</div></div>`;
    }
    const many = r.items.length > 4, top = Math.max(0, ...r.items.map(i => i.tier ?? 0));
    const RC = ['#ffcf4a', '#6ab8ff', '#c08aff', '#ffbf4a', '#ff5470'], rc = RC[top];
    const tile = (it: RewardItem, k: number) => {
      const t = it.tier ?? 0, c = it.color ?? (t ? RC[t] : '#c9a24a');
      return `<div class="rcell" style="--c:${c};--i:${k}">
        <div class="rtile t${t}${it.altar && r.items.length === 1 ? ' alt' : ''}">${it.altar && r.items.length === 1 ? PEDESTAL : ''}<span class="rti">${it.icon}</span>${it.count ? `<b class="rq${it.count.length > 5 ? ' sm' : ''}">${it.count}</b>` : ''}${it.badge ? `<i class="rnew">${it.badge}</i>` : ''}</div>
        <small class="rname">${it.name}</small>${it.sub ? `<em class="rsub">${it.sub}</em>` : ''}${it.detail && r.items.length <= 2 ? `<span class="rdet">${it.detail}</span>` : ''}</div>`;
    };
    const tiles = r.items.map(tile).join('');
    const again = r.again?.length ? `<div class="ragain">${r.again.map(g => `<button class="stonebtn" data-a="${g.a}" data-v="${g.v}" ${g.off ? 'disabled' : ''}><b>${g.label}</b><small>${g.sub}</small></button>`).join('')}</div>` : '';
    return `<div class="rewardov ${many ? 'grid' : 'band'} t${top}" style="--rc:${rc}">${sparksHtml(top, rc)}
      <div class="rwin">
        <div class="rbanner${tr(r.title).length > 20 ? ' l2' : tr(r.title).length > 13 ? ' l1' : ''}"><div class="rbrays"></div><span>${r.title}</span></div>
        ${r.items.length ? '<div class="rlabel"><span>Получены награды</span></div>' : ''}
        ${many ? `<div class="rgrid">${tiles}</div>` : `<div class="rband"><div class="rrays"></div><div class="rflash"></div><div class="rrow n${r.items.length}">${tiles}</div></div>`}
        ${r.note ? `<div class="rnote">${r.note}</div>` : ''}${this.stageChestHtml(r, tile)}${again}${this.adDoubleHtml(r)}
        <button class="lvbtn rok" data-a="rewardOk"><b>OK</b></button>
      </div></div>`;
  }
}
