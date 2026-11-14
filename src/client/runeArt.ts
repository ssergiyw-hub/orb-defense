// Rune stones: a carved stone whose shape says the type (round — blessing, five sides — boost,
// shield — skill), a rim in the rarity colour and a glowing glyph: old runic letters for blessings,
// an element sign for element runes, a family sign for family runes, the skill's own icon for skill runes.
import { Element, SKILLS, SkillId } from '../core/content';
import { RUNES, RuneId, RuneType, RARITY_COLOR, R_PLUS, R_TIER } from '../meta/defs';
import { ICONS } from './iconImages';

const EL_HEX: Record<Element, string> = {
  fire: '#ff7a2f', ice: '#7fd6ff', nature: '#5fbf4a', light: '#ffe45c', dark: '#b48cff',
  lightning: '#c9f0ff', water: '#4fa6ff', phys: '#e0e0e0', air: '#e8f6ff', poison: '#9be04a',
};

/** stone outlines in a 100×100 box */
export const STONE_SHAPE: Record<RuneType, string> = {
  bless: 'M50 5C74 5 94 22 95 47C96 74 76 95 50 95C24 95 5 76 5 49C5 23 26 5 50 5Z',
  boost: 'M50 4L94 34L78 93H22L6 34Z',
  skill: 'M50 3L91 18L88 60C84 79 68 91 50 97C32 91 16 79 12 60L9 18Z',
};

// glyphs drawn with strokes ('s') or fills ('f') in the same 100×100 box
type G = [kind: 's' | 'f', d: string][];
const RUNIC: Partial<Record<RuneId, G>> = {
  revive: [['s', 'M50 26V76M50 46L33 27M50 46L67 27']],                    // ᛉ algiz — protection, life
  wisdom: [['s', 'M41 25V76M41 27L61 40M41 43L61 56']],                    // ᚨ ansuz — wisdom
  luck: [['s', 'M42 25V76M42 41L62 27M42 56L62 42']],                      // ᚠ fehu — wealth
  guard: [['s', 'M37 76V27L63 41V76']],                                     // ᚢ uruz — strength
  destroy: [['s', 'M42 25V76M42 37L60 50L42 63']],                         // ᚦ thurisaz — giant, force
  absorb: [['s', 'M42 25V76M42 25L59 37L42 50L59 63L42 76']],              // ᛒ berkano
  regen: [['s', 'M45 76V25L62 40']],                                        // ᛚ laguz — water
  swift: [['s', 'M42 76V25L59 36L42 49L61 76']],                           // ᚱ raido — journey
  fury: [['s', 'M50 25V76M34 41L50 25L66 41']],                            // ᛏ tiwaz — war
  f_arrow: [['s', 'M30 71L68 33M50 31H69V50M30 71H40M30 71V61']],
  f_orbs: [['s', 'M50 29A21 21 0 1 1 49.9 29'], ['f', 'M50 43A7 7 0 1 1 49.9 43M71 50A6 6 0 1 1 70.9 50M33 34A5 5 0 1 1 32.9 34M38 68A5 5 0 1 1 37.9 68']],
  f_auras: [['f', 'M50 43A7 7 0 1 1 49.9 43'], ['s', 'M50 32A18 18 0 1 1 49.9 32M50 22A28 28 0 1 1 49.9 22']],
  f_blast: [['s', 'M50 22V36M50 64V78M22 50H36M64 50H78M30 30L40 40M60 60L70 70M70 30L60 40M40 60L30 70'], ['f', 'M50 41A9 9 0 1 1 49.9 41']],
  f_missiles: [['s', 'M32 74L50 56L68 74M32 56L50 38L68 56M32 38L50 20L68 38']],
  f_storm: [['f', 'M57 20L37 54H50L42 80L66 44H53Z']],
};
const ELEM_GLYPH: Record<Element, G> = {
  fire: [['f', 'M50 20C58 33 70 40 69 58C68 71 60 79 50 79C40 79 32 71 31 59C30 49 36 44 40 37C42 44 45 48 49 49C50 39 47 30 50 20Z']],
  ice: [['s', 'M50 22V78M26 36L74 64M26 64L74 36M44 26L50 32L56 26M44 74L50 68L56 74']],
  nature: [['f', 'M28 72C28 46 44 28 72 26C72 54 56 72 28 72Z'], ['s', 'M30 70L58 42']],
  light: [['f', 'M50 39A11 11 0 1 1 49.9 39'], ['s', 'M50 20V30M50 70V80M20 50H30M70 50H80M29 29L36 36M64 64L71 71M71 29L64 36M36 64L29 71']],
  dark: [['f', 'M58 22A29 29 0 1 0 78 60A23 23 0 1 1 58 22Z']],
  lightning: [['f', 'M57 18L35 54H49L41 82L67 44H53Z']],
  water: [['f', 'M50 20C59 36 68 46 68 59A18 18 0 0 1 32 59C32 46 41 36 50 20Z']],
  phys: [['s', 'M50 20L55 28V62H45V28ZM36 62H64M50 62V80']],
  air: [['s', 'M24 40H58A8 8 0 1 0 50 32M24 52H68A9 9 0 1 1 59 61M24 64H46']],
  poison: [['f', 'M50 22C58 36 66 45 66 57A16 16 0 0 1 34 57C34 45 42 36 50 22Z'], ['s', 'M64 30A5 5 0 1 1 63.9 30M36 26A4 4 0 1 1 35.9 26']],
};

interface RuneLike { id: RuneId; rarity: number; elem?: Element; skill?: SkillId }
export function runeColor(r: RuneLike): string {
  if (r.id === 'elem' && r.elem) return EL_HEX[r.elem];
  if (r.id === 'skill' && r.skill) return EL_HEX[SKILLS[r.skill].element ?? 'light'];
  return RUNES[r.id].color;
}

/** the rune as a stone; `icon` is the skill's icon for skill runes */
/** the painted stone of a rune, if there is one */
export function runeImg(r: RuneLike): string | undefined {
  return ICONS[r.id === 'elem' ? `e_${r.elem}` : r.id === 'skill' ? `s_${r.skill}` : `r_${r.id}`];
}
export function runeStone(r: RuneLike, size: number, icon?: string): string {
  const d = RUNES[r.id], type = d.type, col = runeColor(r), rim = RARITY_COLOR[r.rarity], tier = R_TIER[r.rarity], plus = R_PLUS[r.rarity];
  const img = runeImg(r);
  // painted stone: the rarity is its glowing outline
  if (img) return `<span class="rstone pic ${type} t${tier}" style="--s:${size}px;--g:${col};--q:${rim}"><img class="rpic" src="${img}" alt="" draggable="false">${plus ? `<b class="rplus">+${plus}</b>` : ''}</span>`;
  const glyph = r.id === 'elem' && r.elem ? ELEM_GLYPH[r.elem] : RUNIC[r.id];
  const draw = (c: string, w: number) => glyph ? glyph.map(([k, path]) => k === 's'
    ? `<path d="${path}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${path}" fill="${c}"/>`).join('') : '';
  // carved: a dark groove a little lower, then the glowing line
  const g = glyph ? `<g transform="translate(0 2.5)" opacity=".7">${draw('#000', 9)}</g><g class="rgl">${draw(col, 7)}</g>` : '';
  const shape = STONE_SHAPE[type];
  return `<span class="rstone ${type} t${tier}" style="--s:${size}px;--g:${col};--q:${rim}">
    <svg viewBox="0 0 100 100" class="rst"><path d="${shape}" fill="#1b1820" stroke="#0a0809" stroke-width="7"/>
      <path d="${shape}" fill="url(#rsGrad)" transform="translate(50 50) scale(.86) translate(-50 -50)"/>
      <path d="${shape}" fill="${col}" fill-opacity=".13" transform="translate(50 50) scale(.86) translate(-50 -50)"/>
      <path d="${shape}" fill="none" stroke="${rim}" stroke-width="5" transform="translate(50 50) scale(.93) translate(-50 -50)"/>
      <path d="M28 20C40 13 60 13 72 20" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="4" stroke-linecap="round"/>
      ${g}</svg>
    ${!g && icon ? `<span class="rico">${icon}</span>` : ''}${plus ? `<b class="rplus">+${plus}</b>` : ''}</span>`;
}
