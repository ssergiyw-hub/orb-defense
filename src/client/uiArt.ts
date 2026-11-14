// Small drawn pieces of the hub in the game's old-world style: coupons for the hero search,
// sparks for reward screens.

/** coupon for the hero search: the small one is a worn paper ticket, the medium one a rich parchment
 *  with a gold frame and a red wax seal. Gradients live in index.html (#cpPaper, #cpParch, #cpGold, #cpWax). */
export function couponSvg(big: boolean, w = 40): string {
  const h = Math.round(w * 0.72);
  if (!big) return `<svg class="coupon" viewBox="0 0 64 46" width="${w}" height="${h}">
    <path d="M5 6H55L59 9.5 56 13 59 16.5 56 20 59 23.5 56 27 59 30.5 56 34 59 37.5 55 40H5A4 4 0 0 0 1 36V29A4 4 0 0 0 1 21V14A4 4 0 0 0 5 6Z" fill="url(#cpPaper)" stroke="#4a3218" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M45 9V37" stroke="#8a6a3a" stroke-width="1.6" stroke-dasharray="2.2 2.4"/>
    <rect x="8" y="10" width="33" height="26" rx="2" fill="none" stroke="#a0804e" stroke-width="1.2"/>
    <circle cx="24.5" cy="23" r="8.5" fill="none" stroke="#8a3a28" stroke-width="1.6" opacity=".8"/>
    <path d="M19.5 26.5V22C19.5 18.5 21.8 16.5 24.5 16.5S29.5 18.5 29.5 22V26.5H27V23.5H22V26.5Z" fill="#8a3a28" opacity=".75"/>
    <circle cx="13" cy="31" r="2.6" fill="#a8844e" opacity=".35"/><circle cx="36" cy="14" r="1.8" fill="#a8844e" opacity=".3"/>
    <path d="M50 16L53 19M50 22L53 25M50 28L53 31" stroke="#a0804e" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
  return `<svg class="coupon cbig" viewBox="0 0 64 46" width="${w}" height="${h}">
    <rect x="2" y="5" width="58" height="35" rx="4" fill="url(#cpParch)" stroke="#5a3a10" stroke-width="2.2"/>
    <rect x="5.5" y="8.5" width="51" height="28" rx="2.5" fill="none" stroke="url(#cpGold)" stroke-width="2.4"/>
    <rect x="8.5" y="11.5" width="45" height="22" rx="1.5" fill="none" stroke="#c9a24a" stroke-width=".8" opacity=".8"/>
    <path d="M5.5 14C9 14 11 12 11 8.5M56.5 14C53 14 51 12 51 8.5M5.5 31C9 31 11 33 11 36.5M56.5 31C53 31 51 33 51 36.5" fill="none" stroke="url(#cpGold)" stroke-width="1.8"/>
    <path d="M24 26V21.5C24 17.5 26.5 15 30 15S36 17.5 36 21.5V26H33V22.5H27V26Z" fill="url(#cpGold)" stroke="#7a5212" stroke-width=".8"/>
    <path d="M30 12.5L31.2 14.4H28.8Z" fill="#ffe7a0"/>
    <path d="M49 33L46 44L50 41.5L53 44L52 34Z" fill="#8a1820"/><path d="M51 33L50.5 44L54 41.5L57.5 44L55 33Z" fill="#a8202a"/>
    <circle cx="51.5" cy="31" r="7.5" fill="url(#cpWax)" stroke="#5a0c12" stroke-width="1.4"/>
    <path d="M51.5 26.5L52.9 29.6 56 30 53.7 32 54.3 35.1 51.5 33.6 48.7 35.1 49.3 32 47 30 50.1 29.6Z" fill="#e8907a" opacity=".85"/>
    <path d="M14 18H20M14 22H19M14 26H20" stroke="#a0804e" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>
  </svg>`;
}

/** sparks for reward screens: a burst from the centre and embers falling for a while; more for higher tiers */
export function sparksHtml(tier: number, col: string): string {
  const burst = 16 + tier * 8, fall = 10 + tier * 6;
  const r = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  let s = '';
  for (let i = 0; i < burst; i++) {
    const a = r(i, 1) * 6.283, d = 90 + r(i, 2) * 170, size = 3 + r(i, 3) * 5;
    s += `<i class="spk b" style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px;--s:${size.toFixed(1)}px;--d:${(r(i, 4) * 0.25).toFixed(2)}s;--c:${i % 3 === 0 ? col : i % 3 === 1 ? '#ffe08a' : '#ff9a3a'}"></i>`;
  }
  for (let i = 0; i < fall; i++) {
    s += `<i class="spk f" style="--x:${(r(i, 5) * 100).toFixed(1)}%;--s:${(2 + r(i, 6) * 4).toFixed(1)}px;--d:${(0.3 + r(i, 7) * 2.2).toFixed(2)}s;--t:${(2.2 + r(i, 8) * 2).toFixed(2)}s;--w:${((r(i, 9) - 0.5) * 60).toFixed(0)}px;--c:${i % 2 ? '#ffd27a' : col}"></i>`;
  }
  return `<div class="sparks">${s}</div>`;
}
