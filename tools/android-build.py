"""правки 178, 200: Gradle settings of the generated Android project (run after `npx cap add android`).

- compileSdk / targetSdk 36 — Google Play requires API 36 for new apps (2026);
- minSdk 24 (правка 204) — Google Play automatic protection needs Android 7.0+;
- versionCode = number of the GitHub run (VERSION_CODE), so every build can go to Google Play; versionName 0.1.<n>;
- debug signing: the fixed key tools/apk-key/debug.keystore (a new APK installs over the old one);
- release signing (AAB for Google Play): the upload key from the environment —
  UPLOAD_KEYSTORE (path to the .jks), UPLOAD_STORE_PASSWORD, UPLOAD_KEY_ALIAS, UPLOAD_KEY_PASSWORD.
  The key itself is never in the repository: it comes from GitHub secrets (Settings → Secrets → Actions).
"""
import os, re

SDK = 36
MIN_SDK = 24
var = 'android/variables.gradle'
s = open(var).read()
for k in ('compileSdkVersion', 'targetSdkVersion'):
    s, n = re.subn(rf'{k}\s*=\s*\d+', f'{k} = {SDK}', s)
    if not n:
        raise SystemExit(f'{k} not found in {var}')
s, n = re.subn(r'minSdkVersion\s*=\s*\d+', f'minSdkVersion = {MIN_SDK}', s)
if not n:
    raise SystemExit(f'minSdkVersion not found in {var}')
open(var, 'w').write(s)

app = 'android/app/build.gradle'
g = open(app).read()
code = int(os.environ.get('VERSION_CODE', '1'))
g, n1 = re.subn(r'versionCode\s+\d+', f'versionCode {code}', g)
g, n2 = re.subn(r'versionName\s+"[^"]*"', f'versionName "0.1.{code}"', g)
if not (n1 and n2):
    raise SystemExit('versionCode / versionName not found in app/build.gradle')

# the release config exists only when the upload key is given to Gradle (the AAB step) — the APK step builds without it
g += """

android {
    signingConfigs {
        debug {
            storeFile rootProject.file('../tools/apk-key/debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        if (System.getenv('UPLOAD_KEYSTORE')) {
            release {
                storeFile file(System.getenv('UPLOAD_KEYSTORE'))
                storePassword System.getenv('UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('UPLOAD_KEY_PASSWORD')
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv('UPLOAD_KEYSTORE')) signingConfig signingConfigs.release
        }
    }
}
"""
open(app, 'w').write(g)
print(f'SDK {SDK}, versionCode {code}, versionName 0.1.{code}')
