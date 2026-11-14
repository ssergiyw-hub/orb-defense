// Б2: the profile lives on the game server (api.summonedhero.app).
// Online mode = the Android app (or #online in a browser, for tests). The web preview stays local.
//  - boot: guest login with a device key kept on the phone, then the server profile wins;
//    if the server has nothing yet, the profile on the phone is uploaded once (moving old progress).
//  - every P.save() also queues an upload (debounced, one request at a time, retried until it goes through).
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import * as P from '../meta/profile';

const LS = 'mw-cloud-v1';
const PROFILE_KEY = 'mw-profile-v1';
const hashApi = /[#&]api=([^&]+)/.exec(location.hash);
const API = hashApi ? decodeURIComponent(hashApi[1]) : 'https://api.summonedhero.app';

// Orb Defense is a separate app: no server yet, the profile stays on the phone
export const online = location.hash.includes('online');
void Capacitor;

interface State { deviceKey: string; token?: string; version: number; accountId?: string }

class NetError extends Error {}
class ApiError extends Error { constructor(public status: number, public body: Record<string, unknown>) { super(String(body.error ?? status)); } }

function loadState(): State {
  try {
    const s = JSON.parse(localStorage.getItem(LS) ?? 'null') as State | null;
    if (s && typeof s.deviceKey === 'string' && s.deviceKey.length >= 43) return { ...s, version: s.version ?? 0 };
  } catch { /* fresh */ }
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  const deviceKey = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { deviceKey, version: 0 };
}
let st = loadState();
const keep = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch { /* storage unavailable */ } };

async function req(method: string, path: string, body?: unknown, auth = true): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) headers.authorization = `Bearer ${st.token}`;
  let r: Response;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    r = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
    clearTimeout(t);
  } catch (e) { throw new NetError((e as Error).message); }
  let j: Record<string, unknown> = {};
  try { j = await r.json() as Record<string, unknown>; } catch { /* empty */ }
  if (!r.ok) throw new ApiError(r.status, j);
  return j;
}

async function login(): Promise<void> {
  const j = await req('POST', '/v1/auth/guest', { deviceKey: st.deviceKey }, false);
  st.token = j.token as string; st.accountId = j.accountId as string; keep();
}
/** a request with a session; a dead token means one fresh login and a second try */
async function authed(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
  if (!st.token) await login();
  try { return await req(method, path, body); } catch (e) {
    if (e instanceof ApiError && e.status === 401) { await login(); return req(method, path, body); }
    throw e;
  }
}

// ---------------- boot ----------------
/** Brings the server profile to the phone (or the phone's one to the server, once). Throws when offline. */
export async function boot(): Promise<void> {
  if (!online) return;
  const sp = await authed('GET', '/v1/profile');
  const ver = sp.version as number;
  if (ver > 0 && sp.data) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(sp.data)); } catch { /* storage unavailable */ }
    st.version = ver; keep();
  } else {
    st.version = 0; keep();
    const local = P.load();
    if (local) { pending = JSON.stringify(local); await flush(); } // moving progress made before the server existed
  }
  ready = true;
  void refreshMail(true);
}

// ---------------- uploads ----------------
let ready = false, pending: string | null = null, busy = false, timer = 0, failures = 0;
/** правка 181: saves whose answer never came (the server may have stored one of them all the same), keys in order */
let unacked: string[] = [];
/** правка 181: the game says when it must not be restarted (a fight is on) */
let hold: () => boolean = () => false;
export function setHold(fn: () => boolean): void { hold = fn; }
/** the same data whatever the order of keys (the database returns them in its own order) */
function canon(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v as object).sort().map(k => JSON.stringify(k) + ':' + canon((v as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(v) ?? 'null';
}
/** another session really wrote a newer profile: take the server's and restart — but never in the middle of a fight */
function takeServer(): void {
  if (hold()) { clearTimeout(timer); timer = window.setTimeout(takeServer, 2000); return; }
  void boot().catch(() => { /* next start will sort it out */ }).then(() => location.reload());
}

/** called from P.save() */
function queue(json: string): void {
  if (!online || !ready) return;
  pending = json;
  clearTimeout(timer); timer = window.setTimeout(() => void flush(), 1500);
}

async function flush(): Promise<void> {
  if (busy || pending === null) return;
  busy = true; clearTimeout(timer);
  const json = pending; pending = null;
  try {
    const j = await authed('PUT', '/v1/profile', { baseVersion: st.version, data: JSON.parse(json) as unknown });
    st.version = j.version as number; keep();
    failures = 0; unacked = []; badge(false);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      // правка 181: usually it is our own save that got through while its answer was lost (mobile network):
      // the server then holds exactly what we sent — take its version number and go on, nothing is lost and nothing restarts
      let sp: Record<string, unknown> | null = null;
      try { sp = await authed('GET', '/v1/profile'); } catch { /* no answer right now: the usual retry below */ }
      if (sp) {
        const theirs = sp.data ? canon(sp.data) : '', sameAsNow = theirs === canon(JSON.parse(json));
        // (the WebView also repeats a request by itself when the connection drops: then the 409 comes to the very save that got through)
        if (sameAsNow || unacked.includes(theirs)) {
          st.version = sp.version as number; keep(); unacked = [];
          if (pending === null && !sameAsNow) pending = json;
          failures = 0; badge(false);
          busy = false; clearTimeout(timer); if (pending !== null) timer = window.setTimeout(() => void flush(), 300);
          return;
        }
        busy = false; pending = null; takeServer(); return; // another session wrote a newer profile
      }
    }
    if (e instanceof NetError) { unacked.push(canon(JSON.parse(json))); if (unacked.length > 6) unacked.shift(); }
    if (pending === null) pending = json; // keep the newest unsent state
    failures++; badge(true);
    clearTimeout(timer); timer = window.setTimeout(() => void flush(), Math.min(30000, 2000 * 2 ** Math.min(4, failures - 1)));
  } finally { busy = false; }
  if (pending !== null && failures === 0) void flush();
}

/** the Settings «reset»: the server account is deleted, the next save starts a new one */
export async function resetAccount(): Promise<void> {
  if (!online) return;
  clearTimeout(timer); pending = null;
  try { if (st.token) await req('DELETE', '/v1/account'); } catch { /* offline: the old account just stays unused */ }
  try { localStorage.removeItem(LS); } catch { /* */ }
  st = loadState(); keep();
}

// ---------------- правка 202: letters from the developer ----------------
export interface Letter { id: number; title: Record<string, string>; body: Record<string, string>; rewards: P.MailReward; createdAt: string; expiresAt: string; read: boolean; claimed: boolean }
let letters: Letter[] = [], mailAt = 0, mailBusy = false;
const mailListeners: (() => void)[] = [];
export const mailReady = () => online && ready;
export const mail = () => letters;
/** an id the player can tell the developer (for a personal letter / compensation) */
export const accountShort = () => (st.accountId ?? '').slice(0, 8);
export function onMail(fn: () => void): void { mailListeners.push(fn); }
const mailChanged = () => { for (const f of mailListeners) f(); };
/** reloads the letters; at most once a minute unless forced */
export async function refreshMail(force = false): Promise<void> {
  if (!online || !ready || mailBusy || (!force && Date.now() - mailAt < 60_000)) return;
  mailBusy = true;
  try { const j = await authed('GET', '/v1/mail'); letters = (j.mail as Letter[]) ?? []; mailAt = Date.now(); mailChanged(); } catch { /* offline: next time */ } finally { mailBusy = false; }
}
/** the reward of a letter; null — taken already (another phone), the letter is marked */
export async function claimMail(id: number): Promise<P.MailReward | null> {
  try {
    const j = await authed('POST', '/v1/mail/claim', { id });
    const l = letters.find(x => x.id === id); if (l) { l.claimed = true; l.read = true; }
    mailChanged();
    return j.rewards as P.MailReward;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 409 || e.status === 404)) { const l = letters.find(x => x.id === id); if (l) l.claimed = true; mailChanged(); return null; }
    throw e;
  }
}
export function readMail(ids: number[]): void {
  const fresh = ids.filter(id => letters.some(l => l.id === id && !l.read));
  if (!fresh.length) return;
  for (const l of letters) if (fresh.includes(l.id)) l.read = true;
  mailChanged();
  void authed('POST', '/v1/mail/read', { ids: fresh }).catch(() => { /* not important */ });
}
/** a letter waits: unread, or its reward not taken */
export const mailAttention = () => letters.some(l => !l.read || (!l.claimed && Object.keys(l.rewards ?? {}).length > 0));

// ---------------- «no connection» badge while uploads fail ----------------
function badge(on: boolean): void {
  let b = document.getElementById('netBadge');
  if (!on) { b?.remove(); return; }
  if (b) return;
  b = document.createElement('div'); b.id = 'netBadge';
  b.textContent = '⚠ Нет связи — прогресс сохранится, когда связь вернётся';
  document.body.appendChild(b);
}

if (online) {
  P.setSaveHook(queue);
  // the app goes to the background: send what is waiting right away
  if (Capacitor.isNativePlatform()) void App.addListener('pause', () => void flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
  window.addEventListener('online', () => { failures = 0; void flush(); });
  (window as unknown as { __cloud: unknown }).__cloud = { get state() { return { ...st, token: st.token ? '…' : undefined, pending: pending !== null, failures, ready }; }, flush };
}
