# KitGap on phones: installable app and native app stores

Written October 24, 2026.

## What exists now

**1. An installable app (works today, no store needed).** KitGap is a Progressive Web App:

- `src/app/manifest.ts` and the PNG icons in `public/icons` (made by `npm run mobile:icons`) let Android "Install app" and iPhone "Add to Home Screen". It then opens full screen with its own icon and splash colors.
- `public/sw.js`, registered in production by `ServiceWorker`, shows a branded "You're offline" screen (`public/offline.html`) when there's no connection and caches build assets. It never caches pages, because every number is live and some pages are private.
- Installed, the app gets a bottom tab bar (`TabBar`: Home, Requests, My drives, Updates) and safe-area spacing around the notch and the home indicator. In a normal browser tab nothing changes.
- `/install` explains how to install on each phone and shows a one-tap Install button where the browser allows it.

Checked on October 24 with a production build in Chrome: the service worker activates, and an offline page load shows the offline screen.

**2. Native iOS and Android projects (Capacitor 8), ready to build.**

- `capacitor.config.ts`, `ios/` and `android/` are generated, with icons and splash screens made from the logo (`mobile/assets`).
- The apps load the deployed site (`CAP_SERVER_URL`), so they always show live data and get fixes without a new store release. `mobile/www/index.html` is the screen shown if the site can't be reached.
- Native features that go beyond a website, which Apple's guideline 4.2 asks for (`src/lib/native.ts`):
  - the system share sheet for receipt links
  - a QR scanner (`/scan` and a Scan tab) for receipt and invitation codes, with the iOS camera permission text in `Info.plist`
  - a success haptic when a delivery is confirmed
  - the Android back button
  - a themed status bar and splash screen
- In a browser, each of these falls back to the web version or does nothing.

## Store listing

- **Google Play:** a new personal developer account has to run a closed test with at least 12 testers for 14 days before it can publish.
- **App Store:** the Apple Developer Program costs $99 a year and needs an adult to enroll. Review takes one to several days.
- Both stores need an account deletion page first, which KitGap doesn't have yet.

## Deploy (needed before the native apps can work)

Follow "Deploy (Supabase + Vercel)" in `docs/setup.md`. For mobile, also:

1. Use the transaction pooler URL (port 6543) for `DATABASE_URL` on Vercel.
2. Set `NEXT_PUBLIC_SITE_URL` to the production address, for example `https://kitgap.vercel.app`, and add it to Supabase's redirect URLs.
3. Apply migrations to the production database with `npm run db:migrate`. Never run the integration tests against it: `tests/integration/demo-sandbox.test.ts` migrates and reads the live `kitgap` schema of whatever database it's pointed at.

## Build the native apps

You need a Mac with **Xcode** (App Store) for iOS, and **Android Studio** for Android. Neither is installed on the build machine yet.

```bash
CAP_SERVER_URL=https://your-deployed-kitgap.vercel.app npx cap sync
```

```bash
npm run mobile:ios
```

```bash
npm run mobile:android
```

Before the first upload, change `appId` in `capacitor.config.ts` (currently `org.kitgap.app`) to a reverse-domain ID you control. It can't be changed once an app is published. Then run `npx cap sync` again.

## Store checklist

Things the stores require that KitGap doesn't meet yet are marked **(missing)**.

| Requirement | Apple App Store | Google Play | Status |
| --- | --- | --- | --- |
| Developer account | $99/year; an adult enrolls | $25 once | You |
| In-app account deletion, because users can create accounts | Required (guideline 5.1.1(v)) | Required, plus a web link | **(missing)**: `docs/limitations.md` lists no deletion page |
| Privacy policy URL | Required | Required | Partly: `/about#privacy` exists; needs a full policy page |
| App privacy / Data safety form | Email, name; no tracking | Same | You fill it in |
| Reviewer access | Demo account or demo mode | Same | `/demo` works without signing in |
| More than a website (4.2) | Share, QR scan, haptics, back button | n/a | Built |
| Camera permission text | `NSCameraUsageDescription` | Declared by the scanner plugin | Built |
| Testing before release | TestFlight (optional) | 12 testers, 14 days (personal accounts) | You |
| Screenshots and listing text | 6.7" and 6.5" iPhone, iPad if supported | Phone, 7" and 10" tablet optional | You |

## Honest limits

- The native apps are thin shells around the live site plus native features. They need a connection, and they're only as fast as the server.
- `npm audit` reports 3 moderate warnings in the Capacitor CLI's build-time tooling (`xcode` → `uuid`). They run only on a developer's machine and aren't shipped in the app. The suggested fix downgrades the CLI, so it hasn't been applied.
- Nothing native has been built or run yet: no simulator or device test, because Xcode and Android Studio aren't installed here.
