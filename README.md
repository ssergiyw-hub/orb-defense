# Orb Defense: Olympus

«Захист кулями: Олімп» / «Защита шарами: Олимп» — пошаговая защита стены магическими шарами (как PunBall / Bounce Defense). Android (Capacitor) + веб-версия. Пакет `app.summonedhero.orbdefense`.

Основа — оболочка игры «Призванный герой» (`ssergiyw-hub/monster-waves`): хаб, герои, снаряжение, магазин.

- Как работать с проектом, команды, выпуск сборки — `CLAUDE.md`.
- Сборка: каждый пуш в `main` → GitHub Actions → Releases → **latest** → `app-debug.apk` (на телефон) и `orb-defense.aab` (для Google Play).
- Исходники графики — `art/orb/` (`python3 art/orb/enemies.py && python3 art/orb/process.py` → `assets/orb/`).
