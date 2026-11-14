// Orb Defense rune stones (правка Ш37): the plain marble stone with a gold rim (assets/orb/rune/stone.webp) and the sign
// of the effect on top; the rarity is the glowing outline drawn here (legendary and mythic pulse), «+N» in the corner.
import { RFX, RfxId } from '../meta/runeDefs';
import { RARITY_COLOR, R_PLUS, R_TIER } from '../meta/defs';

export const runeSign = (fx: RfxId) => `orb/rune/${RFX[fx].img}.webp`;
export function orbRuneStone(r: { fx: RfxId; rarity: number }, size: number, cls = ''): string {
  const s = r.rarity, plus = R_PLUS[s];
  return `<span class="orst t${R_TIER[s]}${cls ? ' ' + cls : ''}" style="--s:${size}px;--q:${RARITY_COLOR[s]}"><img class="orsb" src="orb/rune/stone.webp" alt="" draggable="false"><img class="orss" src="${runeSign(r.fx)}" alt="" draggable="false">${plus ? `<b class="orpl">+${plus}</b>` : ''}</span>`;
}
/** an empty stone (shop pictures, the empty socket) */
export const orbRuneBlank = (size: number, rarity = 0) => `<span class="orst t${R_TIER[rarity]}" style="--s:${size}px;--q:${RARITY_COLOR[rarity]}"><img class="orsb" src="orb/rune/stone.webp" alt="" draggable="false"></span>`;
