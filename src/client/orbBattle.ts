// Orb Defense: the battle screen — input (aim with a finger, release to fire), auto mode, speed, HUD, level-up cards.
import { Orb, OrbConfig, Act, Card } from '../core/orb';
import { BALLS, BIOME_NAME, ROWS, ENEMY, SPIRITS } from '../core/orbContent';
import { OrbRenderer, preloadOrb, fmtN } from './orbRender';
import { preload3D } from './hero3d';
import { fatan2 } from '../core/fmath';
import { ORB_HERO_ART } from './orbHeroArt';
import { HAS_BALL_ART } from './orbBallArt';
import * as sfx from './sfx';
import { tr, trS } from './i18n';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const BOOK = (b: string) => `orb/book/${BALLS[b as keyof typeof BALLS]?.book ?? b}.webp`;
/** Ш72: the picture of a ball (a round orb, art/orb/balls.py); the book stays as the fallback until the orbs are cut */
const BALLPIC = (b: string) => HAS_BALL_ART ? `orb/ball/${b}.webp` : BOOK(b);

export class OrbBattle {
  o: Orb | null = null;
  private cfg: OrbConfig | null = null;
  private acts: Act[] = [];
  private r: OrbRenderer;
  private speed = 1; private turnT = 0; private fast = 1; private auto = false; private paused = false; private quit = false; private done = false;
  private acc = 0; private last = 0; private looping = false;
  private aiming = false; private shownCards = ''; private sling: boolean | null = null;
  private hintShown = false; private stormAimT = 0; private lastStormAim = 0;
  constructor(private cv: HTMLCanvasElement, private onEnd: (o: Orb, cfg: OrbConfig, acts: Act[], quit: boolean) => void) {
    this.r = new OrbRenderer(cv);
    window.addEventListener('resize', () => this.r.resize());
    try { this.auto = localStorage.getItem('od-auto') === '1'; this.speed = +(localStorage.getItem('od-speed') ?? '1') || 1; } catch { /* storage unavailable */ }
    cv.addEventListener('pointerdown', e => this.down(e));
    cv.addEventListener('pointermove', e => this.move(e));
    cv.addEventListener('pointerup', e => this.up(e));
    cv.addEventListener('pointercancel', () => { this.aiming = false; this.sling = null; this.r.aimAt = null; });
    $('oPause').onclick = () => this.pause(!this.paused);
    $('oSpeed').onclick = () => { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; this.keep(); this.hud(true); };
    $('oAuto').onclick = () => { this.auto = !this.auto; this.keep(); this.hud(true); };
    $('oResume').onclick = () => this.pause(false);
    // Ш75: giving up asks first — it is right under «Продолжить» and costs the rewards
    $('oQuit').onclick = () => { if (this.o && !this.done) { $('oQuitAsk').hidden = false; } };
    $('oQuitNo').onclick = () => { $('oQuitAsk').hidden = true; };
    $('oQuitYes').onclick = () => { $('oQuitAsk').hidden = true; if (this.o && !this.done) { this.quit = true; this.o.s.phase = 'lose'; this.pause(false); this.finish(); } };
    $('oTabSk').onclick = () => this.pauseTab('sk');
    $('oTabDmg').onclick = () => this.pauseTab('dmg');
  }
  private keep(): void { try { localStorage.setItem('od-auto', this.auto ? '1' : '0'); localStorage.setItem('od-speed', String(this.speed)); } catch { /* storage unavailable */ } }

  start(cfg: OrbConfig, dprCap: number): void {
    this.cfg = cfg; this.o = new Orb(cfg); this.acts = []; this.done = false; this.quit = false; this.paused = false; this.shownCards = '';
    if (!ORB_HERO_ART[cfg.heroId]) preload3D(cfg.heroId); preloadOrb(this.o); // Ш58: a drawn hero needs no 3D atlas
    this.r.dprCap = dprCap; this.r.resize();
    $('ohud').hidden = false; $('oCards').hidden = true; $('oPauseMenu').hidden = true;
    const sd = this.o.s.sd;
    if (cfg.storm) { $('oTitle').textContent = tr('Шквал шаров'); this.banner(tr('Продержись как можно дольше')); this.stormAimT = 0; } // Ш98
    else { $('oTitle').textContent = `${tr('Этап')} ${cfg.stage} · ${tr(BIOME_NAME[sd.biome])}`; this.banner(`${tr(BIOME_NAME[sd.biome])}: ${tr('защити стену')}`); }
    this.hintShown = false;
    this.hud(true);
    if (!this.looping) { this.looping = true; this.last = 0; requestAnimationFrame(t => this.frame(t)); }
  }

  // ---------------- input ----------------
  private angleTo(e: PointerEvent): number | null {
    const rect = this.cv.getBoundingClientRect(), L = this.r.launch();
    const dx = e.clientX - rect.left - L.x, dy = e.clientY - rect.top - L.y;
    if (Math.hypot(dx, dy) < 12) return null;
    // Ш53: the mode is chosen once, at the touch — finger above the launch point aims straight, below pulls back like a
    // sling. Crossing the line during one drag never flips the aim: it rests at the lowest angle on the same side
    const LO = -0.12, HI = -Math.PI + 0.12;
    if (this.sling === null) this.sling = dy > 0;
    let a: number;
    if (!this.sling) a = dy < 0 ? fatan2(dy, dx) : (dx >= 0 ? LO : HI);
    else a = dy > 0 ? fatan2(-dy, -dx) : (dx >= 0 ? HI : LO);
    return Math.max(HI, Math.min(LO, a));
  }
  private down(e: PointerEvent): void {
    const storm = !!this.o?.s.cfg.storm && (this.o.s.phase === 'aim' || this.o.s.phase === 'fly');
    if (!this.o || this.paused || this.auto || (this.o.s.phase !== 'aim' && !storm)) return;
    this.aiming = true; this.sling = null; this.cv.setPointerCapture(e.pointerId);
    this.r.aimAt = this.angleTo(e);
    if (storm && this.r.aimAt !== null) this.stormAim(this.r.aimAt); // Ш98: the stream starts (or turns) at the touch
  }
  private move(e: PointerEvent): void {
    if (!this.aiming) return;
    this.r.aimAt = this.angleTo(e) ?? this.r.aimAt;
    if (this.o?.s.cfg.storm && this.r.aimAt !== null) this.stormAim(this.r.aimAt);
  }
  /** Ш98: the storm takes the aim any time; each change is an act with its tick (for the replay), small ones skipped */
  private stormAim(a: number): void {
    const o = this.o; if (!o || o.s.cfg.storm !== true) return;
    const v = Math.round(a * 1000);
    if (o.s.phase === 'aim') { this.fire(v); this.lastStormAim = v; return; }
    if (o.s.phase !== 'fly' || Math.abs(v - this.lastStormAim) < 15) return;
    const act = { aim: v, at: o.s.tick }; this.acts.push(act); o.act(act); this.lastStormAim = v;
  }
  private up(e: PointerEvent): void {
    if (this.aiming && this.o?.s.cfg.storm) { this.aiming = false; this.r.aimAt = null; this.sling = null; return; }
    if (!this.aiming || !this.o) return;
    this.aiming = false;
    const a = this.angleTo(e) ?? this.r.aimAt;
    this.r.aimAt = null; this.sling = null;
    if (a === null || this.o.s.phase !== 'aim') return;
    this.fire(Math.round(a * 1000));
  }
  private fire(aim: number): void {
    this.turnT = 0; this.fast = 1; $('oFast').hidden = true; // Ш88: a new turn starts at the chosen speed
    if (!this.o) return;
    const a: Act = this.o.s.cfg.storm ? { aim, at: this.o.s.tick } : { aim }; this.acts.push(a); this.o.act(a); this.r.cast();
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
    this.paused = v; $('oPauseMenu').hidden = !v;
    if (v) this.pauseTab(this.ptab);
  }

  // ---------------- loop ----------------
  private frame(now: number): void {
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000); this.last = now;
    const o = this.o;
    if (o && !this.paused && !this.done) {
      const s = o.s;
      if (s.cfg.storm && this.auto && (s.phase === 'aim' || s.phase === 'fly')) { // Ш98: the storm's auto re-aims once a second
        this.stormAimT -= dt; if (this.stormAimT <= 0 || s.phase === 'aim') { this.stormAimT = 1; this.stormAim(o.stormAim() / 1000); }
      }
      if (s.phase === 'aim' && s.cfg.storm) { if (!this.hintShown) $('oHint').hidden = false; }
      else if (s.phase === 'aim') {
        if (this.auto) { this.acc += dt; if (this.acc > 0.35 / this.speed) { this.acc = 0; this.fire(o.bestAim()); } }
        else if (!this.hintShown) $('oHint').hidden = false;
      } else if (s.phase === 'choose') this.cards();
      else if (o.busy) {
        // Ш88: a long turn speeds itself up — after 5 s of flight ×2, after 10 s ×3 (never slower than the chosen speed)
        this.turnT += dt; const f = s.cfg.storm ? 1 : this.turnT > 10 ? 3 : this.turnT > 5 ? 2 : 1; // Ш98: no speed-up in the storm
        if (f !== this.fast) { this.fast = f; const b = $('oFast'); b.hidden = f <= this.speed; b.textContent = '⏩ ×' + f; }
        this.acc += dt * 60 * Math.max(this.speed, this.fast);
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
    if (o) this.r.draw(o, this.paused ? 0 : dt * Math.min(Math.max(this.speed, this.fast), 2));
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
  private set(id: string, v: string, html = false): boolean { if (this.cache.get(id) === v) return false; this.cache.set(id, v); if (html) $(id).innerHTML = v; else $(id).textContent = v; return true; }
  private hud(force = false): void {
    const o = this.o; if (!o) return; const s = o.s;
    if (force) this.cache.clear();
    this.set('oSpeed', '×' + this.speed);
    // Ш96: hits in this volley — shown while the balls fly and until the next aim
    const hn = s.hits ?? 0, hb = $('oHits');
    if (s.cfg.storm) hb.hidden = true;
    else if (hn > 0 && s.phase !== 'aim') { hb.hidden = false; if (this.set('oHitsN', String(hn))) { hb.classList.remove('bump'); void hb.offsetWidth; hb.classList.add('bump'); }
      hb.classList.toggle('gold', hn >= 20); hb.classList.toggle('hot', hn >= 50); }
    else if (s.phase === 'aim') hb.hidden = true;
    $('oAuto').classList.toggle('on', this.auto);
    if (s.cfg.storm) { // Ш98: the time held; the bar fills to the next «stronger» wave every 30 s
      const sec = o.stormSec;
      ($('oProgFill') as HTMLElement).style.width = (100 * (s.tick % 1800) / 1800).toFixed(1) + '%';
      this.set('oProgTxt', `⏱ ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);
    } else {
      ($('oProgFill') as HTMLElement).style.width = (100 * o.progress).toFixed(1) + '%';
      this.set('oProgTxt', s.bossSpawned ? tr('БОСС') : Math.round(100 * o.progress) + '%');
    }
    if (this.cache.get('oLvl') && this.cache.get('oLvl') !== String(s.level)) { const b = $('oXpBar'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); } // Ш60
    this.set('oLvl', String(s.level));
    ($('oXpFill') as HTMLElement).style.width = (100 * s.xp / s.xpNext).toFixed(1) + '%';
    // правка Ш44: the thin wall bar at the very bottom (the shield shows as a blue part from the right)
    const wf = Math.max(0, s.wallHp / s.wallMax);
    ($('oWallFill') as HTMLElement).style.width = (100 * wf).toFixed(1) + '%';
    $('oWallFill').className = wf > 0.5 ? '' : wf > 0.25 ? 'mid' : 'low';
    this.set('oWallTxt', `${tr('Стена')} ${fmtN(Math.max(0, s.wallHp))}${s.wallShield > 0 ? ' +' + fmtN(s.wallShield) : ''}`);
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
    // Ш72: what is taken already — 4 cells of special balls with their level, then the boosts
    const pipsOf = (lv: number, max: number) => `<span class="opips">${Array.from({ length: max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span>`;
    const cells = Array.from({ length: 4 }, (_, k) => { const x = s.specials[k];
      return x ? `<span class="otk" style="--c:${BALLS[x.id].color}"><img src="${BALLPIC(x.id)}" alt="">${pipsOf(x.lv, o.maxLv(x.id))}</span>` : '<span class="otk empty"></span>'; }).join('');
    const pw = Math.round(s.power / 0.12);
    $('oTaken').innerHTML = `<div class="otkrow">${cells}</div><div class="otkb"><span class="otk2"><img src="${BALLPIC('normal')}" alt="">×${s.normals}</span><span class="otk2"><i>⚡</i>×${pw}</span></div>`;
    $('oLvNum').textContent = String(s.level);
    $('oCardList').innerHTML = s.cards.map((c, i) => {
      const pic = c.ball ? `<img class="oballpic" src="${BALLPIC(c.ball)}" alt="">` : c.k === 'normal' ? `<img class="oballpic" src="${BALLPIC('normal')}" alt="">` : c.k === 'power' ? '<span class="opow">⚡</span>' : '<span class="opow">🧱</span>';
      const tag = c.k === 'new' ? tr('новый шар') : c.k === 'up' ? `${tr('уровень')} ${(c.lv ?? 2) - 1} → ${c.lv}` : c.k === 'normal' ? tr('залп') : tr('усиление');
      const col = c.ball ? BALLS[c.ball].color : '#ffd36a';
      const pips = c.ball && (c.k === 'up' || c.k === 'new') ? pipsOf(c.lv ?? 1, o.maxLv(c.ball)) : '';
      const dmg = c.ball ? `<em class="odmg">✸ ${fmtN(o.hitOf(c.ball, c.lv ?? 1))}</em>` : '';
      return `<button class="ocard" data-i="${i}" style="--c:${col}"><small>${tag}</small>${pic}${dmg}<b>${tr(c.title)}</b><span>${trS(c.desc)}</span>${pips}</button>`;
    }).join('');
    $('oCardList').querySelectorAll<HTMLElement>('.ocard').forEach(b => { b.onclick = () => this.pick(+b.dataset.i!); });
    $('oCards').hidden = false;
    sfx.vibrate('level');
  }
  // правка Ш45: the pause shows the run's skills (balls, normal balls, cards) and the damage table
  private ptab: 'sk' | 'dmg' = 'sk';
  private pauseTab(t: 'sk' | 'dmg'): void {
    this.ptab = t;
    $('oTabSk').classList.toggle('on', t === 'sk'); $('oTabDmg').classList.toggle('on', t === 'dmg');
    if (t === 'dmg') this.dmgTable(); else this.skills();
  }
  private skills(): void {
    const o = this.o; if (!o) return; const s = o.s;
    const pips = (lv: number) => `<span class="opips">${[1, 2, 3].map(k => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
    const rows = s.specials.map(b => `<div class="osk" style="--c:${BALLS[b.id].color}"><img src="${BALLPIC(b.id)}" alt=""><div><b>${tr(BALLS[b.id].name)}</b><span>${trS(BALLS[b.id].desc(b.lv))}</span>${pips(b.lv)}</div></div>`);
    rows.push(`<div class="osk"><span class="onb"></span><div><b>${tr('Обычные шары')} ×${s.normals}</b><em>${tr('Шаров в залпе')}: ${s.normals + s.specials.length}</em></div></div>`);
    const pw = Math.round(s.power / 0.12);
    if (pw > 0) rows.push(`<div class="osk"><span class="opw">⚡</span><div><b>${tr('Сила Олимпа')} ×${pw}</b><em>${tr('Урон всех шаров')} +${Math.round(s.power * 100)}%</em></div></div>`);
    $('oPauseBody').innerHTML = rows.join('') + `<p class="osp">${tr('Свободных мест для шаров')}: ${4 - s.specials.length}</p>`;
  }
  private dmgTable(): void {
    const o = this.o; if (!o) return;
    const rows = Object.entries(o.s.dmgBy).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((a, r) => a + r[1], 0) || 1;
    const name = (k: string) => k === 'normal' ? 'Обычные шары' : k === 'shard' ? 'Осколки гранаты' : k === 'spirit' ? 'Дух' : k === 'wall' ? 'Стена' : BALLS[k as keyof typeof BALLS]?.name ?? k;
    // Ш75: a picture of who dealt it, a bar in the ball's colour, the number and the share
    const pic = (k: string) => k === 'spirit' || k === 'wall' ? `<span class="odi">${k === 'spirit' ? '✨' : '🧱'}</span>` : `<img class="odi" src="${BALLPIC(k === 'shard' ? 'cluster' : k)}" alt="">`;
    const col = (k: string) => (BALLS[k as keyof typeof BALLS]?.color) ?? (k === 'shard' ? BALLS.cluster.color : k === 'normal' ? '#f4efe4' : k === 'spirit' ? '#7be0a0' : '#c9a24a');
    $('oPauseBody').innerHTML = rows.map(([k, v]) => `<div class="odr">${pic(k)}<span>${tr(name(k))}</span><em class="odtr"><i style="width:${Math.max(2, 100 * v / rows[0][1]).toFixed(1)}%;--c:${col(k)}"></i></em><b>${fmtN(v)}<small>${Math.round(100 * v / total)}%</small></b></div>`).join('') + ((this.o?.s.bestHits ?? 0) > 0 ? `<p class="ohbest"><span>${tr('Лучший ход')}</span>: <b>${this.o!.s.bestHits}</b> <span>${tr('ударов')}</span></p>` : '') || `<p class="osp">${tr('Пока нет урона')}</p>`; // Ш96
  }
}
