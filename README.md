# 33Bayan 🇩🇪

A German-learning app for Persian speakers: a German ⇄ Persian dictionary with pronunciation, photos, examples and a **Leitner box** for spaced-repetition review, plus full text translation.

Built with **React Native + Expo (SDK 58)**, Expo Router and TypeScript. The app's interface is in Persian (RTL). Its brain — dictionary, AI review, Leitner box and translation — is the same backend that powers the 33Bayan Bale bot, running on Vercel:

- `GET /api/app?action=lookup&dir=de&q=Hund` — German entry (Wiktionary + DWDS)
- `GET /api/app?action=lookup&dir=fa&q=سگ` — German equivalents for a Persian word
- `POST /api/app?action=translate` — text translation
- `leitner.*` — the user's Leitner box (keyed by device ID)
- Pronunciation: `/api/tts?t=der+Hund&raw=1`

Backend repository: https://github.com/MostafaAhmadi77/bale-german-dictionary-bot
Bale bot: [@32bayanbot](https://ble.ir/32bayanbot)

## Screens

- **Home** — continue learning (due Leitner cards + your last looked-up word), daily goal, streak
- **Explore** — bidirectional dictionary search with full entries, photos, pronunciation and “add to Leitner”
- **Practice** — Leitner flashcard review + text translation
- **Progress** — XP, Leitner box distribution, weekly chart and achievements
- **Profile** — my vocabulary, daily goal and settings

XP, streaks and achievements are computed from an on-device activity log.

## Getting started

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on your phone or tablet.

## Building for Android (EAS)

The project is configured for [Expo Application Services (EAS)](https://docs.expo.dev/eas/):

```bash
npx eas-cli@latest build --profile preview --platform android   # installable APK
npx eas-cli@latest build --profile production --platform android # AAB for stores
```

- Android package: `com.mostafa.bayan33`
- The `preview` profile builds an internal-distribution APK; `production` builds an app bundle.

## Project structure

```
src/
  app/            # Expo Router screens (file-based routing)
    index.tsx     # Home
    explore.tsx   # Dictionary search
    practice.tsx  # Leitner review + text translation
    progress.tsx  # XP, box distribution, achievements
    profile.tsx   # My vocabulary + settings
    _layout.tsx   # Root layout / tab navigation
  components/     # Entry view, speak button, tab bar, themed primitives
  lib/
    api.ts        # Client for the backend JSON API + TTS
    storage.ts    # On-device storage (device ID, activity log, settings)
  constants/      # Theme
  hooks/          # Color scheme / theme hooks
app.json          # Expo config (name, package ID, splash, plugins)
eas.json          # EAS build profiles
```

## Known limitations (v1)

- The Leitner box is **per-device** — there are no user accounts yet, so cards do not sync across devices.
- The app icon is still the default Expo template icon.
- Structured courses (A1–B1 word packs / curriculum) are not included yet.

## Related projects

- **Backend + Bale bot:** https://github.com/MostafaAhmadi77/bale-german-dictionary-bot
