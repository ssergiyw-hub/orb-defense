# Dark system bars: the area behind the status and navigation bars takes the game's background colour,
# and their icons are light. Run after `npx cap add android`.
import re, sys
f = 'android/app/src/main/res/values/styles.xml'
s = open(f, encoding='utf-8').read()
items = '''
        <item name="android:windowBackground">#0d0f18</item>
        <item name="android:statusBarColor">#0d0f18</item>
        <item name="android:navigationBarColor">#0d0f18</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
'''
s, n = re.subn(r'(<style name="AppTheme.NoActionBar"[^>]*>)', r'\1' + items, s)
if not n: sys.exit('AppTheme.NoActionBar not found in ' + f)
# launch screen: dark background instead of Capacitor's white splash picture
s = re.sub(r'(<style name="AppTheme.NoActionBarLaunch"[^>]*>)(.*?)(</style>)',
           lambda m: m.group(1) + '''
        <item name="android:background">#0d0f18</item>
        <item name="android:windowBackground">#0d0f18</item>
        <item name="windowSplashScreenBackground">#0d0f18</item>
    ''' + m.group(3), s, flags=re.S)
open(f, 'w', encoding='utf-8').write(s)
print(s)

# правка 169: имя игры под иконкой на языке телефона (по умолчанию — английское из capacitor.config.json)
import os
NAMES = {'ru': 'Защита шарами: Олимп', 'uk': 'Захист кулями: Олімп', 'de': 'Orb Defense: Olymp', 'es': 'Orb Defense: Olimpo',
         'pt': 'Orb Defense: Olimpo', 'pl': 'Orb Defense: Olimp', 'tr': 'Orb Defense: Olimpos', 'fr': 'Orb Defense: Olympe', 'it': 'Orb Defense: Olimpo'}
for loc, name in NAMES.items():
    d = f'android/app/src/main/res/values-{loc}'
    os.makedirs(d, exist_ok=True)
    with open(f'{d}/strings.xml', 'w', encoding='utf-8') as o:
        o.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">{name}</string>\n    <string name="title_activity_main">{name}</string>\n</resources>\n')
print('app names:', ', '.join(NAMES))

# правка 172: AdMob — the app id goes into the manifest (Google's public TEST app id until the AdMob account exists)
ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713'
mf = 'android/app/src/main/AndroidManifest.xml'
m = open(mf, encoding='utf-8').read()
if 'com.google.android.gms.ads.APPLICATION_ID' not in m:
    m, k = re.subn(r'(<application\b[^>]*>)', r'\1\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="' + ADMOB_APP_ID + '"/>', m, count=1)
    if not k: sys.exit('<application> not found in ' + mf)
    open(mf, 'w', encoding='utf-8').write(m)
print('admob app id:', ADMOB_APP_ID)

# правка 177: the game's launcher icon (tools/art/pack_icon.py → assets/icon/res) over Capacitor's default one
import shutil
ICON = 'assets/icon/res'
if os.path.isdir(ICON):
    for d in os.listdir(ICON):
        os.makedirs(f'android/app/src/main/res/{d}', exist_ok=True)
        for fn in os.listdir(f'{ICON}/{d}'): shutil.copyfile(f'{ICON}/{d}/{fn}', f'android/app/src/main/res/{d}/{fn}')
    print('launcher icon copied from', ICON)
else: sys.exit('no ' + ICON)
