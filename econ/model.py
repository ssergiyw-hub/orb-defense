"""Economy model: days to full progression for paying ($100/mo) and free player.

Full progression (from design doc):
  - all 10 heroes unlocked, 2 main heroes at max stars (★10)
  - all 6 set items (weapon included) mythic, level 100
  - 5 gems ★4 level 100 in the book (★4 only from crystal search, login day 28, events)
Runes are not part of the goal (they are an extra sink) — not counted.

Method: for a horizon T days, each resource has non-crystal income * T.
Shortfall is bought with crystals at shop prices. Gold surplus goes into
gold gem searches. T is found by bisection: smallest T where crystal
income covers crystal spending.
"""
import math, json, sys

P = dict(
    runs_per_day=10, win_rate=0.7, avg_map=40,
    # ---- gear ----
    gear_items=6, chest_waste=1.1,  # chest slot is random → ~10% waste
    # v2 steps (Archero 2 style): epic = 9 commons of the item; then epics of the same slot as material:
    # E+1 1, E+2 1, L 2, L+1 1, L+2 2, L+3 2 (any set) and 3 of its own set for mythic → 13 epics = 117 commons
    ce_own=36, ce_any=81,
    gold_lvl_a=12, gold_lvl_pow=1.9,          # gold to go L -> L+1 = a * L^pow
    scroll_lvl_b=0.6, scroll_lvl_pow=1.15,    # scrolls L -> L+1 = ceil(b * L^pow)
    # ---- runs ----
    gold_run_base=200, gold_run_per_map=25,   # gold per run (avg, win or lose)
    win_scrolls=4,                            # map chest (правка 145: 3 + map/10 a win, a share on a loss, + stage chest — see stage145() below)
    win_gear_chance=0.10,                     # map chest item drop
    drop_rarity_ce=0.85*1 + 0.14*3 + 0.01*9,  # expected common-equivalents of a drop
    win_gem_chance=0.04, win_essence_small=1,
    miniboss_scrolls=1,                       # every run that reaches min 3 (~90%)
    small_coupon_chance=0.15,
    # ---- idle chest ----
    idle_gold_base=100, idle_gold_per_map=20, idle_scrolls_h=1, idle_gem_h=0.05,
    idle_hours_free=16, idle_hours_sub=(24 + 2 * 6) * 1.2,  # 24h cap + 6 fast collects x2h, +20%
    # ---- gems ----
    gems_needed=5, useful_types=2, gem_types=8,
    gem_xp_to_100=None,                       # computed below
    gem_xp_a=100, gem_xp_b=30,                 # xp L -> L+1 = a + b*L
    ess_small=100, ess_big=1000,
    feed_xp={1: 50, 2: 250, 3: 1500, 4: 6000},
    gold_search_cost=5000, gold_odds={1: .144, 2: .052, 3: .0094},   # gems per 5000 gold in the location chain (simulated)
    gold_search_ess_xp=364,   # gem essence xp per 5000 gold in the chain (simulated)
    cr_search_cost=150, cr_odds={1: .44, 2: .35, 3: .17, 4: .04}, cr_pity=30, cr_pity4=60,
    login_star4_per_day=1 / 28,
    # ---- heroes ----
    heroes=10, main_heroes=2,
    star_particles=[20, 30, 50, 80, 110, 140, 170, 200, 240, 300],
    dup_particles=20,
    small_coupon=dict(hero=0.03, particles=5),
    big_coupon=dict(hero=0.20, particles=30, price=300),
    hero_day_weight=5,
    # ---- free crystals ----
    free_cr_day=20,        # daily tasks 30 + free battle-pass line ~300/mo
    lottery_free_value_cr=15,
    # ---- shop prices (crystals) ----
    price_gear_chest=340, gear_chest_ce=0.70*1 + 0.25*3 + 0.05*9,  # chosen slot+set
    price_scrolls_100=100,
    price_gold_100k=150,
    price_ess_big=80,
    # ---- paid $100/mo ----
    usd_month=100,
    daily_pack=dict(usd=9.99, cr_month=300 + 70 * 30, scrolls_day=5, shards_day=10),
    chest_sub_usd=4.99,     # hunter card: idle +20%, unlimited fast collects, +20 energy cap
    hunter_cr_month=200 + 20 * 30,
    perm_card=dict(usd=19.99, cr_now=1000, cr_day=20, months=12),  # one purchase, spread over the year
    bp=dict(usd=9.99, cr=1300, book_ce=9),   # epic book at lvl 25
    pack_cr_per_usd=8120 / 74.97,            # $75: 49.99 + 19.99 + 4.99 packs
)


def gear_totals(p):
    gold = sum(p['gold_lvl_a'] * L ** p['gold_lvl_pow'] for L in range(1, 100))
    scrolls = sum(math.ceil(p['scroll_lvl_b'] * L ** p['scroll_lvl_pow']) for L in range(1, 100))
    return gold * p['gear_items'], scrolls * p['gear_items']


def gem_xp_to_100(p):
    return sum(p['gem_xp_a'] + p['gem_xp_b'] * L for L in range(1, 100))


def cr_searches_per_star3(p):
    q = 1 - p['cr_odds'][3]
    return (1 - q ** p['cr_pity']) / (1 - q)  # expected searches per ★3 with pity


def cr_searches_per_star4(p):
    q = 1 - p['cr_odds'][4]
    return (1 - q ** p['cr_pity4']) / (1 - q)  # expected searches per ★4 with pity


def hero_needs(p):
    return p['main_heroes'] * sum(p['star_particles'])


def income(p, paid):
    r, w = p['runs_per_day'], p['win_rate']
    m = p['avg_map']
    hours = p['idle_hours_sub'] if paid else p['idle_hours_free']
    inc = {}
    inc['gold'] = r * (p['gold_run_base'] + p['gold_run_per_map'] * m) + hours * (p['idle_gold_base'] + p['idle_gold_per_map'] * m)
    inc['scrolls'] = r * w * p['win_scrolls'] + r * 0.9 * p['miniboss_scrolls'] + hours * p['idle_scrolls_h']
    # targeted gear: a drop is a random slot (5) and for set pieces a random set (3).
    # book hits 1/5, a needed set piece 1/15. The binding slot is a set piece.
    inc['gear_ce_slot'] = r * w * p['win_gear_chance'] * p['drop_rarity_ce'] / (p['gear_items'] * 3)
    inc['gems_rand'] = r * w * p['win_gem_chance'] + hours * p['idle_gem_h']  # random gem, gold odds
    inc['ess_xp'] = r * w * p['win_essence_small'] * p['ess_small']
    inc['small_coupons'] = r * w * p['small_coupon_chance']
    inc['cr'] = p['free_cr_day'] + p['lottery_free_value_cr']
    if paid:
        dp = p['daily_pack']
        inc['scrolls'] += dp['scrolls_day']
        pc = p['perm_card']
        rest_usd = p['usd_month'] - dp['usd'] - p['chest_sub_usd'] - p['bp']['usd'] - pc['usd'] / pc['months']
        inc['cr'] += (dp['cr_month'] + p['bp']['cr'] + p['hunter_cr_month'] + rest_usd * p['pack_cr_per_usd']) / 30
        inc['cr'] += pc['cr_day'] + pc['cr_now'] / (30 * pc['months'])
        inc['book_ce_bp'] = p['bp']['book_ce'] / 30
    return inc


def simulate(p, paid, T):
    """Crystals needed beyond income after T days (negative = surplus)."""
    inc = income(p, paid)
    gold_need, scroll_need = gear_totals(p)
    cr = 0.0
    br = {}
    def add(k, v):
        nonlocal cr
        cr += v; br[k] = br.get(k, 0) + v
    # gold
    gold_left = inc['gold'] * T - gold_need
    if gold_left < 0:
        add('gold', -gold_left / 1e5 * p['price_gold_100k'])
        gold_left = 0
    # scrolls
    sc = scroll_need - inc['scrolls'] * T
    if sc > 0:
        add('scrolls', sc / 100 * p['price_scrolls_100'])
    # gear CE: 6 set slots; the weapon is a set item too, BP gives one epic weapon a month.
    # own-set part needs drops of that set; the rest takes any set's epics of the slot (3x the drops)
    s1 = inc['gear_ce_slot'] * T
    def slot_def(extra_own=0.0):
        own = s1 + extra_own
        own_def = max(0, p['ce_own'] - own)
        any_sup = 3 * s1 + extra_own - min(own, p['ce_own'])
        return own_def + max(0, p['ce_any'] - any_sup)
    set_def = slot_def() * (p['gear_items'] - 1) * p.get('chest_waste', 1.0)
    book_def = slot_def(inc.get('book_ce_bp', 0) * T) * p.get('chest_waste', 1.0)
    add('gear', (set_def + book_def) / p['gear_chest_ce'] * p['price_gear_chest'])
    # gems
    gold_searches = gold_left / p['gold_search_cost']
    rand_gems = inc['gems_rand'] * T + gold_searches
    useful = p['useful_types'] / p['gem_types']
    # ★4 of a useful type: login calendar + crystal searches; everything else is food
    star4_useful = p['login_star4_per_day'] * T * useful
    feed = rand_gems * sum(p['gold_odds'][s] * p['feed_xp'][s] for s in (1, 2, 3))
    g_def = max(0, p['gems_needed'] - star4_useful)
    n_cr_search = g_def * cr_searches_per_star4(p) / useful
    add('gems', n_cr_search * p['cr_search_cost'])
    feed += n_cr_search * sum(p['cr_odds'][s] * p['feed_xp'][s] for s in (1, 2, 3)) \
        + g_def * (1 / useful - 1) * p['feed_xp'][4]
    xp_need = p['gems_needed'] * gem_xp_to_100(p)
    xp_def = xp_need - feed - inc['ess_xp'] * T - gold_searches * p['gold_search_ess_xp']
    if xp_def > 0:
        add('gem_xp', xp_def / p['ess_big'] * p['price_ess_big'])
    # heroes: small coupons random; big coupons bought on target hero's day
    sc_ = p['small_coupon']
    n_small = inc['small_coupons'] * T
    w = p['hero_day_weight'] / (p['hero_day_weight'] + p['heroes'] - 1)
    # unlocks: approximate — small coupons + big coupons both unlock; count hero outcomes
    hero_rolls_small = n_small * sc_['hero']
    part_target_small = n_small * (1 - sc_['hero']) * sc_['particles'] * (p['main_heroes'] / p['heroes'])
    bc = p['big_coupon']
    per_big_target = w * (bc['hero'] * p['dup_particles'] + (1 - bc['hero']) * bc['particles'])
    part_def = max(0, hero_needs(p) - part_target_small)
    n_big = part_def / per_big_target
    # all 10 unlocked: coupon collector over hero outcomes (~ 10*H10 = 29 hero rolls)
    hero_rolls = hero_rolls_small + n_big * bc['hero']
    need_rolls = p['heroes'] * sum(1 / k for k in range(1, p['heroes'] + 1))
    if hero_rolls < need_rolls:
        n_big += (need_rolls - hero_rolls) / bc['hero']
    add('heroes', n_big * bc['price'])
    return cr - inc['cr'] * T, dict(br, n_big=n_big, n_cr_search=n_cr_search, gold_searches=gold_searches, set_def=set_def, book_def=book_def, xp_def=xp_def, crystals_in=inc['cr'] * T)


def days_to_full(p, paid):
    lo, hi = 1, 365 * 20
    for _ in range(60):
        mid = (lo + hi) / 2
        if simulate(p, paid, mid)[0] > 0:
            lo = mid
        else:
            hi = mid
    return hi


def stage145(p):
    """правка 145: steady scrolls/shards every fight + the stage chest (one prize: 38% resources, 25% essence, 12% gear, 8% gem, 15% coupon, 2% rune)"""
    p = dict(p); w, m = p['win_rate'], p['avg_map']; S = 3 + m // 10
    p['win_scrolls'] = (w * (S + 0.38 / 3 * 6) + (1 - w) * 0.85 * 0.5 * S) / w
    p['win_gear_chance'] = 0.12; p['drop_rarity_ce'] = 0.82 + 0.16 * 3 + 0.02 * 9
    p['win_gem_chance'] = 0.08; p['win_essence_small'] = 0.25 * (0.88 * 1.4 + 0.12 * p['ess_big'] / p['ess_small']); p['small_coupon_chance'] = 0.15
    k = 1 + w * 0.38 / 3 * 1.25; p['gold_run_base'] *= k; p['gold_run_per_map'] *= k
    return p


if __name__ == '__main__':
    P = stage145(P)
    g, s = gear_totals(P)
    print('gear gold total %.0f, scrolls %.0f' % (g, s))
    print('gem xp per gem', gem_xp_to_100(P))
    for paid in (True, False):
        T = days_to_full(P, paid)
        print('paid' if paid else 'free', round(T), 'days')
        print('  income/day', {k: round(v, 2) for k, v in income(P, paid).items()})
        print('  crystals spent', {k: round(v) for k, v in simulate(P, paid, T)[1].items()})
