# debug.keystore (правка 178)

Fixed debug signing key for the test APK built by GitHub Actions (`.github/workflows/android.yml` copies it to `~/.android/debug.keystore` before `assembleDebug`).
With the same key every new APK installs over the previous one, so the game and the guest account stay on the phone.

- Store and key password: `android`, alias `androiddebugkey` (the Android debug defaults).
- It is a DEBUG key on purpose and is public in this repository. It is NOT the Google Play upload key — that one is made separately for the release (stage Д) and is never committed.
