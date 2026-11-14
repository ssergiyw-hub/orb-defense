// правка 172: rewarded video ads. In the APK — AdMob (Google test ad units until the release and the AdMob account);
// in the browser (artifact, web) — a 5-second stand-in, so the whole flow can be tried anywhere.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { tr } from './i18n';

/** Google's public test rewarded unit (always fills, never pays). Real ids come with the AdMob account (stage Г). */
const REWARD_UNIT = 'ca-app-pub-3940256099942544/5224354917';
const TESTING = true;

let ready: Promise<void> | null = null;
function init(): Promise<void> {
  return ready ??= (async () => {
    await AdMob.initialize({ initializeForTesting: TESTING });
    try { // EU consent (Google UMP): shown once when the law needs it; a failure must not block the ads
      const c = await AdMob.requestConsentInfo();
      if (c.status === AdmobConsentStatus.REQUIRED && c.isConsentFormAvailable) await AdMob.showConsentForm();
    } catch (e) { console.warn('consent', e); }
  })().catch(e => { ready = null; throw e; });
}

/** shows one rewarded video; true only if the player watched it to the reward */
export async function showRewardAd(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return fakeAd();
  const hs: PluginListenerHandle[] = [];
  try {
    await init();
    let got = false, closed: () => void = () => {};
    const dismissed = new Promise<void>(res => { closed = res; });
    hs.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { got = true; }));
    hs.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => closed()));
    hs.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => closed()));
    await AdMob.prepareRewardVideoAd({ adId: REWARD_UNIT, isTesting: TESTING });
    const item = await AdMob.showRewardVideoAd();
    if (item && typeof item.amount === 'number' && item.amount > 0) got = true;
    await Promise.race([dismissed, new Promise(r => setTimeout(r, 1500))]);
    return got;
  } catch (e) {
    console.warn('ad', e);
    return false;
  } finally {
    for (const h of hs) void h.remove();
  }
}

/** browser stand-in: a dark screen with a 5-second countdown; closing early gives nothing */
function fakeAd(): Promise<boolean> {
  return new Promise(res => {
    const d = document.createElement('div');
    d.className = 'fakead';
    let left = 5;
    const draw = () => {
      d.innerHTML = `<div class="fabox"><b>${tr('Реклама')}</b><small>${tr('Тестовый ролик — в игре здесь будет реклама Google')}</small>
        <div class="fanum">${left > 0 ? left : '✓'}</div>
        <button class="fax">${left > 0 ? tr('Закрыть без награды') : tr('Забрать награду')}</button></div>`;
      (d.querySelector('.fax') as HTMLButtonElement).onclick = () => { window.clearInterval(t); d.remove(); res(left <= 0); };
    };
    const t = window.setInterval(() => { left--; draw(); if (left <= 0) window.clearInterval(t); }, 1000);
    draw();
    document.body.appendChild(d);
  });
}
