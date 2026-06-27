# iOS App Store Deployment Checklist (Wingman)

iOS ships as a **native React Native app (Expo)** in `native/`, not a Capacitor/WebView
wrapper. The screens are React Native components that call the Next.js API over HTTPS.
Bundle identifier: `com.wingman.mobile` (see `native/app.json`).

## 1) Backend / production API

- [ ] Deploy the Next.js API to production over **HTTPS** (e.g., Vercel).
- [ ] Set production backend env vars:
  - `MONGODB_URI`
  - `JWT_SECRET` — **must be a strong random secret.** It currently falls back to a
    hardcoded `'wingman-dev-secret'` in `lib/auth.js`; shipping without setting this
    lets anyone forge session tokens. See `IOS_AUTH_COOKIE_RISK_AUDIT.md`.
  - SMTP (`SMTP_*`) and Twilio (`TWILIO_*`) provider secrets
  - Google client IDs/secret (move out of source first)
- [ ] Point the app at production: set `EXPO_PUBLIC_API_BASE_URL=https://<your-api-domain>`
  for the build (EAS env or `app.json` `extra`). The default `http://127.0.0.1:3000` is
  dev-only and will be blocked by iOS ATS in a release build.

## 2) Native project config (`native/`)

- [ ] Set the final `version` and iOS `buildNumber` in `native/app.json`.
- [ ] Confirm `ios.bundleIdentifier` is your final reverse-DNS ID (`com.wingman.mobile`).
- [ ] App icon (`assets/icon.png`) and splash configured.
- [ ] Add iOS privacy usage strings (Expo injects these into `Info.plist`). `expo-image-picker`
  needs at least:
  - `NSPhotoLibraryUsageDescription`
  - `NSCameraUsageDescription` (if camera capture is used)
  Add them via the `expo-image-picker` config plugin or `ios.infoPlist` in `app.json`.
- [ ] Keep ATS strict (HTTPS only) — do not add arbitrary-loads exceptions for production.

## 3) Build the app

Choose one:

- **EAS Build (recommended, cloud):**
  - [ ] `npm i -g eas-cli && eas login`
  - [ ] `eas build:configure`
  - [ ] `eas build --platform ios --profile production`
- **Local Xcode archive:**
  - [ ] `cd native && npx expo prebuild -p ios` (regenerates `native/ios`)
  - [ ] `npx pod-install` (or `cd native/ios && pod install`)
  - [ ] Open `native/ios/Wingman.xcworkspace`, set Team + Signing, then Product → Archive.

## 4) Authentication review readiness

- [ ] Session token persists across cold launch and background/foreground (AsyncStorage today;
  migrating to `expo-secure-store` is recommended — see the audit).
- [ ] On a 401 from the API, the app routes back to login rather than showing a broken screen.
- [ ] Google Sign-In path works on device (native flow via `expo-auth-session`, not a WebView widget).
- [ ] Phone OTP works end-to-end against the real Twilio config (or hide phone auth if not shipping it).

## 5) App Store Connect setup

- [ ] Create the app record in App Store Connect.
- [ ] Fill metadata, category, age rating, privacy policy URL, support URL.
- [ ] Complete App Privacy nutrition labels (data collected: email, photos, profile data, usage).
- [ ] Upload screenshots for required device sizes.
- [ ] Add TestFlight internal testers and run at least one full pass.

## 6) Submit

- **EAS:** `eas submit --platform ios --profile production`
- **Xcode:** Organizer → Distribute App → App Store Connect → Upload.
- [ ] In App Store Connect: select build, complete submission fields, submit for review.

## 7) Release gates before pressing Submit

- [ ] New install → signup → email verification → onboarding → feed flow passes.
- [ ] Existing user login and logout pass.
- [ ] Delegate flow (invite/redeem), swipe-on-behalf, matches, and chat pass.
- [ ] OTP and Google login error handling is user-friendly.
- [ ] App resumes from background with a valid session and no broken routes.
