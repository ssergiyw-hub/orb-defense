// Правка 121: the game in 10 languages.
// The code keeps writing Russian; this layer translates whatever text reaches the page (and the few canvas texts).
// Keys come from tools/i18n/extract.py: numbers and template variables become {}, icons and punctuation around a
// text are not part of the key. Translations: tools/i18n/tr*.tsv → src/i18n/dict.ts (tools/i18n/build.py).
import { KEYS, TR } from '../i18n/dict';

export type Lang = 'ru' | 'uk' | 'en' | 'de' | 'es' | 'pt' | 'pl' | 'tr' | 'fr' | 'it';
export const LANGS: [Lang, string][] = [
  ['uk', 'Українська'], ['ru', 'Русский'], ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'],
  ['pt', 'Português'], ['pl', 'Polski'], ['tr', 'Türkçe'], ['fr', 'Français'], ['it', 'Italiano'],
];
/** the word "Language" in each language, for the Settings card (not passed through the dictionary) */
export const LANG_WORD: Record<Lang, string> = {
  ru: 'Язык', uk: 'Мова', en: 'Language', de: 'Sprache', es: 'Idioma', pt: 'Idioma', pl: 'Język', tr: 'Dil', fr: 'Langue', it: 'Lingua',
};
const LS = 'mw-lang';
/** first launch: the phone's language, Russian for nearby languages, English otherwise */
function detect(): Lang {
  for (const l of navigator.languages ?? [navigator.language]) {
    const p = (l || '').slice(0, 2).toLowerCase();
    if (LANGS.some(([id]) => id === p)) return p as Lang;
    if (['be', 'kk', 'ky', 'uz', 'tg', 'hy', 'az', 'ka'].includes(p)) return 'ru';
  }
  return 'en';
}
let saved: string | null = null;
try { saved = localStorage.getItem(LS); } catch { /* no storage */ }
export const lang: Lang = LANGS.some(([id]) => id === saved) ? saved as Lang : detect();
export function setLang(l: Lang): void { try { localStorage.setItem(LS, l); } catch { /* ignore */ } location.reload(); }

const CYR = /[А-Яа-яЁёІіЇїЄє]/;
const LET = 'A-Za-zА-Яа-яЁёІіЇїЄєÀ-ÿ';
const CORE = new RegExp(`^([^${LET}{}\\d]*)([\\s\\S]*?)([^${LET}{}\\d]*)$`);
const NUM = /\d+(?:[.,]\d+)?/g;

const exact = new Map<string, string>();
/** keys with {} that may stand for words: tried as patterns, bucketed by their first characters */
/** finished translations without placeholders: text that is already translated is left alone */
const outs = new Set<string>();
const pats = new Map<string, { re: RegExp; out: string }[]>();
const bucket = (s: string) => s.slice(0, 2).toLowerCase();
if (lang !== 'ru') {
  const T = TR[lang] ?? [];
  KEYS.forEach((k, i) => {
    const v = T[i]; if (!v) return;
    exact.set(k, v); if (!v.includes('{')) outs.add(v);
    if (k.includes('{}')) {
      const lit = k.split('{}'), re = new RegExp('^' + lit.map(x => x.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('(.+?)') + '$');
      const b = k.startsWith('{}') ? '' : bucket(k);
      (pats.get(b) ?? pats.set(b, []).get(b)!).push({ re, out: v });
    }
  });
  // the more literal text a pattern has, the more specific it is: try those first («{} · {}» goes last)
  const lit = (r: RegExp) => r.source.replace(/\(\.\+\?\)/g, '').length;
  pats.forEach(l => l.sort((a, b) => lit(b.re) - lit(a.re)));
}

/** {} take the values in order; {0}, {1}… pick them by number (when a language changes the word order) */
const fill = (out: string, vals: string[]) => { let i = 0; return out.replace(/\{(\d*)\}/g, (_, n: string) => (n ? vals[+n] : vals[i++]) ?? ''); };
const missing = new Set<string>();
function core(t: string, depth = 0): string | null {
  const e = exact.get(t); if (e !== undefined) return e;
  const nums: string[] = [], k = t.replace(NUM, m => { nums.push(m); return '{}'; });
  const n = exact.get(k); if (n !== undefined) return fill(n, nums);
  if (depth > 3) return null;
  for (const b of [bucket(t), '']) for (const p of pats.get(b) ?? []) {
    const m = p.re.exec(t); if (!m) continue;
    return fill(p.out, m.slice(1).map(g => /^\d+(?:[.,]\d+)?$/.test(g) || !CYR.test(g) ? g : sub(g, depth + 1)));
  }
  // numbers and counters stuck to a known word: «Стрела 1», «опыт 0/25», «11ч 59м»
  const nb = /^([\d\s.,/×%+\-−·:★]*)([\s\S]*?)([\d\s.,/×%+\-−·:★KM]*)$/.exec(t);
  if (nb && nb[2] && nb[2] !== t) { const r = core(nb[2], depth + 1); if (r != null) return nb[1] + r + nb[3]; }
  return null;
}
/** a piece inside a pattern: translate its core, keep what surrounds it */
function sub(g: string, depth: number): string {
  const m = CORE.exec(g)!; const r = m[2] && core(m[2].replace(/\s+/g, ' ').trim(), depth);
  return r != null && r !== '' ? m[1] + r + m[3] : g;
}
const cache = new Map<string, string>();
/** translate one piece of text (keeps the icons, spaces and punctuation around it) */
export function tr(text: string): string {
  if (lang === 'ru' || !text || !CYR.test(text)) return text;
  const c = cache.get(text); if (c !== undefined) return c;
  const m = CORE.exec(text)!;
  const body = m[2].replace(/\s+/g, ' ').trim();
  let out = text;
  const t = body && core(body);
  if (t != null) out = m[1] + t + m[3];
  else if (body && !outs.has(body)) missing.add(body);
  if (cache.size > 4000) cache.clear();
  cache.set(text, out);
  return out;
}
/** text of several sentences: each one is a key of its own (Orb Defense descriptions) */
export const trS = (s: string): string => s.split(/(?<=\.) /).map(tr).join(' ');
(window as unknown as { __i18nMissing: Set<string> }).__i18nMissing = missing;

// ---- the page ----
const done = new WeakMap<Node, string>();
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
function textNode(n: Node): void {
  const v = n.nodeValue; if (!v || done.get(n) === v) return;
  if ((n.parentNode as Element | null)?.closest?.('[translate="no"]')) { done.set(n, v); return; }
  const t = tr(v); if (t !== v) n.nodeValue = t;
  done.set(n, n.nodeValue!);
}
function element(e: Element): void {
  for (const a of ATTRS) { const v = e.getAttribute(a); if (v && CYR.test(v)) { const t = tr(v); if (t !== v) e.setAttribute(a, t); } }
}
function walk(root: Node): void {
  if (root.nodeType === 3) { textNode(root); return; }
  if (root.nodeType !== 1) return;
  const el = root as Element; if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
  element(el);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) { const pt = n.parentNode as Element | null; if (pt && (pt.nodeName === 'SCRIPT' || pt.nodeName === 'STYLE')) continue; textNode(n); }
    else element(n as Element);
  }
}
/** start translating the page: everything now and everything added later */
export function startI18n(): void {
  document.documentElement.lang = lang;
  if (lang === 'ru') return;
  document.title = tr(document.title);
  walk(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') textNode(m.target);
      else if (m.type === 'attributes') element(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
