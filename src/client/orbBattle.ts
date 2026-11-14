// Orb Defense: the battle screen — input (aim with a finger, release to fire), auto mode, speed, HUD, level-up cards.
import { Orb, OrbConfig, Act, Card } from '../core/orb';
import { BALLS, BIOME_NAME, ROWS, ENEMY, SPIRITS } from '../core/orbContent';
import { OrbRenderer, preloadOrb, fmtN } from './orbRender';
import { preload3D } from './hero3d';
import { fatan2 } from '../core/fmath';
import * as sfx from './sfx';
import { tr, trS } from './i18n';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const BOOK = (b: string) => `orb/book/${BALLS[b as keyof typeof BALLS]?.book ?? b}.webp`;

export class OrbBattle {
  o: Orb | null = null;
  private cfg: OrbConfig | null = null;
  private acts: Act[] = [];
  private r: OrbRenderer;
  private speed = 1; private auto = false; private paused = false; private quit = false; private done = false;
  private acc = 0; private last = 0; private looping = false;
  private aiming = false; private shownCards = '';
  private hintShown = false;
  constructor(private cv: HTMLCanvasElement, private onEnd: (o: Orb, cfg: OrbConfig, acts: Act[], quit: boolean) => void) {
    this.r = new OrbRenderer(cv);
    window.addEventListener('resize', () => this.r.resize());
    try { this.auto = localStorage.getItem('od-auto') === '1'; this.speed = +(localStorage.getItem('od-speed') ?? '1') || 1; } catch { /* storage unavailable */ }
    cv.addEventListener('pointerdown', e => this.down(e));
    cv.addEventListener('pointermove', e => this.move(e));
    cv.addEventListener('pointerup', e => this.up(e));
    cv.addEventListener('pointercancel', () => { this.aiming = false; this.r.aimAt = null; });
    $('oPause').onclick = () => this.pause(!this.paused);
    $('oSpeed').onclick = () => { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; this.keep(); this.hud(true); };
    $('oAuto').onclick = () => { this.auto = !this.auto; this.keep(); this.hud(true); };
    $('oResume').onclick = () => this.pause(false);
    $('oQuit').onclick = () => { if (this.o && !this.done) { this.quit = true; this.o.s.phase = 'lose'; this.pause(false); this.finish(); } };
    $('oDmgBtn').onclick = () => this.dmgTable();
  }
  private keep(): void { try { localStorage.setItem('od-auto', this.auto ? '1' : '0'); localStorage.setItem('od-speed', String(this.speed)); } catch { /* storage unavailable */ } }

  start(cfg: OrbConfig, dprCap: number): void {
    this.cfg = cfg; this.o = new Orb(cfg); this.acts = []; this.done = false; this.quit = false; this.paused = false; this.shownCards = '';
    preload3D(cfg.heroId); preloadOrb(this.o);
    this.r.dprCap = dprCap; this.r.resize();
    $('ohud').hidden = false; $('oCards').hidden = true; $('oPauseMenu').hidden = true;
    const sd = this.o.s.sd;
    $('oTitle').textContent = `${tr('Этап')} ${cfg.stage} · ${tr(BIOME_NAME[sd.biome])}`;
    this.banner(`${tr(BIOME_NAME[sd.biome])}: ${tr('защити стену')}`);
    this.hintShown = false;
    this.hud(true);
    if (!this.looping) { this.looping = true; this.last = 0; requestAnimationFrame(t => this.frame(t)); }
  }

  // ---------------- input ----------------
  private angleTo(e: PointerEvent): number | null {
    const rect = this.cv.getBoundingClientRect(), L = this.r.launch();
    const dx = e.clientX - rect.left - L.x, dy = e.clientY - rect.top - L.y;
    if (Math.hypot(dx, dy) < 12) return null;
    let a = fatan2(dy, dx);
    if (dy > 0) a = fatan2(-dy, -dx); // the finger below the hero: aim the other way (pull back like a sling)
    return Math.max(-Math.PI + 0.12, Math.min(-0.12, a));
  }
  private down(e: PointerEvent): void {
    if (!this.o || this.paused || this.o.s.phase !== 'aim' || this.auto) return;
    this.aiming = true; this.cv.setPointerCapture(e.pointerId);
    this.r.aimAt = this.angleTo(e);
  }
  private move(e: PointerEvent): void { if (this.aiming) this.r.aimAt = this.angleTo(e) ?? this.r.aimAt; }
  private up(e: PointerEvent): void {
    if (!this.aiming || !this.o) return;
    this.aiming = false;
    const a = this.angleTo(e) ?? this.r.aimAt;
    this.r.aimAt = null;
    if (a === null || this.o.s.phase !== 'aim') return;
    this.fire(Math.round(a * 1000));
  }
  private fire(aim: number): void {
    if (!this.o) return;
    const a = { aim }; this.acts.push(a); this.o.act(a);
    this.o.s.aim = aim / 1000;
    sfx.play('shot'); $('oHint').hidden = true; this.hintShown = true;
  }
  private pick(i: number): void {
    if (!this.o || this.o.s.phase !== 'choose') return;
    const a = { choice: i }; this.acts.push(a); this.o.act(a);
    sfx.play('pick');
    this.shownCards = '';
    if (this.o.s.phase !== 'choose') $('oCards').hidden = true;
  }
  private pause(v: boolean): void {
    if (!this.o || this.done) return;
    this.paused = v; $('oPauseMenu').hidden = !v; $('oDmgWin').hidden = true;
  }

  // ---------------- loop ----------------
  private frame(now: number): void {
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000); this.last = now;
    const o = this.o;
    if (o && !this.paused && !this.done) {
      const s = o.s;
      if (s.phase === 'aim') {
        if (this.auto) { this.acc += dt; if (this.acc > 0.35 / this.speed) { this.acc = 0; this.fire(o.bestAim()); } }
        else if (!this.hintShown) $('oHint').hidden = false;
      } else if (s.phase === 'choose') this.cards();
      else if (o.busy) {
        this.acc += dt * 60 * this.speed;
        let n = 0;
        while (this.acc >= 1 && n < 400 && o.busy) {
          o.step(); this.acc -= 1; n++;
          if (o.fx.length) {
            this.r.addFx(o, o.fx);
            for (const f of o.fx) {
              if (f.t === 'wall') sfx.vibrate(f.kind === 'rock' ? 'heavy' : 'hit');
              if (f.t === 'hero') sfx.vibrate('heavy');
              if (f.t === 'level') this.banner(tr('Новый уровень!'));
            }
          }
        }
        if (!o.busy) this.acc = 0;
      }
      if ((s.phase === 'win' || s.phase === 'lose') && !this.done) { this.done = true; sfx.vibrate(s.phase === 'win' ? 'level' : 'death'); setTimeout(() => this.finish(), 900); }
      this.hud();
    }
    if (o) this.r.draw(o, this.paused ? 0 : dt * Math.min(this.speed, 2));
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('oBanner').hidden = true; }
    if (this.o) requestAnimationFrame(t => this.frame(t)); else { this.looping = false; }
  }
  private finish(): void {
    const o = this.o; if (!o || !this.cfg) return;
    this.done = true;
    $('ohud').hidden = true; $('oCards').hidden = true; $('oPauseMenu').hidden = true;
    this.o = null;
    this.onEnd(o, this.cfg, this.acts, this.quit);
  }

  // ---------------- HUD ----------------
  private bannerT = 0;
  private banner(s: string): void { const b = $('oBanner'); b.textContent = s; b.hidden = false; this.bannerT = 2.2; }
  private cache = new Map<string, string>();
  private set(id: string, v: string, html = false): void { if (this.cache.get(id) === v) return; this.cache.set(id, v); if (html) $(id).innerHTML = v; else $(id).textContent = v; }
  private hud(force = false): void {
    const o = this.o; if (!o) return; const s = o.s;
    if (force) this.cache.clear();
    this.set('oSpeed', '×' + this.speed);
    $('oAuto').classList.toggle('on', this.auto);
    ($('oProgFill') as HTMLElement).style.width = (100 * o.progress).toFixed(1) + '%';
    this.set('oProgTxt', s.bossSpawned ? tr('БОСС') : Math.round(100 * o.progress) + '%');
    this.set('oLvl', String(s.level));
    ($('oXpFill') as HTMLElement).style.width = (100 * s.xp / s.xpNext).toFixed(1) + '%';
    const wf = Math.max(0, s.wallHp / s.wallMax);
    ($('oWallFill') as HTMLElement).style.width = (100 * wf).toFixed(1) + '%';
    $('oWallFill').className = wf > 0.5 ? '' : wf > 0.25 ? 'mid' : 'low';
    this.set('oWallTxt', `${tr('Стена')} ${fmtN(Math.max(0, s.wallHp))}${s.wallShield > 0 ? ' +' + fmtN(s.wallShield) : ''}`);
    this.set('oBalls', s.specials.map(b => `<i style="--c:${BALLS[b.id].color}"><img src="${BOOK(b.id)}" alt="">${b.lv > 1 ? `<b>${b.lv}</b>` : ''}</i>`).join('') + `<i class="nb"><span></span><b>×${s.normals}</b></i>`, true);
    const boss = s.enemies.find(e => ENEMY[e.kind].tier === 'boss');
    $('oBoss').hidden = !boss;
    if (boss) { this.set('oBossName', tr(ENEMY[boss.kind].name)); ($('oBossFill') as HTMLElement).style.width = (100 * boss.hp / boss.max).toFixed(1) + '%'; }
    void ROWS; void SPIRITS;
  }
  private cards(): void {
    const o = this.o!; const s = o.s;
    const key = s.cards.map(c => c.k + (c.ball ?? '') + (c.lv ?? '')).join(',') + s.level;
    if (key === this.shownCards) return;
    this.shownCards = key;
    if (this.auto) { // auto mode picks too: upgrades of owned balls first, then new balls
      const order = (c: Card) => c.k === 'up' ? 0 : c.k === 'new' ? 1 : c.k === 'normal' ? 2 : 3;
      let best = 0; s.cards.forEach((c, i) => { if (order(c) < order(s.cards[best])) best = i; });
      setTimeout(() => this.pick(best), 450 / this.speed);
    }
    $('oCardList').innerHTML = s.cards.map((c, i) => {
      const pic = c.ball ? `<img class="obook" src="${BOOK(c.ball)}" alt="">` : c.k === 'normal' ? '<span class="onorm"></span>' : c.k === 'power' ? '<span class="opow">⚡</span>' : '<span class="opow">🧱</span>';
      const tag = c.k === 'new' ? tr('новый шар') : c.k === 'up' ? `${tr('уровень')} ${c.lv}` : c.k === 'normal' ? tr('залп') : tr('усиление');
      const col = c.ball ? BALLS[c.ball].color : '#ffd36a';
      const pips = c.k === 'up' || c.k === 'new' ? `<span class="opips">${[1, 2, 3].map(k => `<i class="${k <= (c.lv ?? 1) ? 'on' : ''}"></i>`).join('')}</span>` : '';
      return `<button class="ocard" data-i="${i}" style="--c:${col}"><small>${tag}</small>${pic}<b>${tr(c.title)}</b><span>${trS(c.desc)}</span>${pips}</button>`;
    }).join('');
    $('oCardList').querySelectorAll<HTMLElement>('.ocard').forEach(b => { b.onclick = () => this.pick(+b.dataset.i!); });
    $('oCards').hidden = false;
    sfx.vibrate('level');
  }
  private dmgTable(): void {
    const o = this.o; if (!o) return;
    const rows = Object.entries(o.s.dmgBy).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((a, r) => a + r[1], 0) || 1;
    const name = (k: string) => k === 'normal' ? 'Обычные шары' : k === 'shard' ? 'Осколки гранаты' : k === 'spirit' ? 'Дух' : k === 'wall' ? 'Стена' : BALLS[k as keyof typeof BALLS]?.name ?? k;
    $('oDmgBody').innerHTML = rows.map(([k, v]) => `<div class="odr"><span>${tr(name(k))}</span><i style="width:${(100 * v / total).toFixed(1)}%"></i><b>${fmtN(v)}</b></div>`).join('') || `<p>${tr('Пока нет урона')}</p>`;
    $('oDmgWin').hidden = false;
  }
}
