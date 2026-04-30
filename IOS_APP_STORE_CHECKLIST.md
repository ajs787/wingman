# iOS App Store Deployment Checklist (Wingman)

## 1) Production URL and environment

- [ ] Deploy web app to production (HTTPS) and confirm it is stable on mobile Safari.
- [ ] Set `CAPACITOR_SERVER_URL` to your production URL before syncing iOS.
- [ ] Set production env vars for backend:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - Google/Twilio/email provider secrets
- [ ] Confirm your production cookie/session behavior works across app routes.

## 2) Local iOS wrapper setup

- [ ] Install CocoaPods (already installed on this machine).
- [ ] Run `npm run ios:sync`.
- [ ] Run `npm run ios:open`.
- [ ] In Xcode, set Team and Signing under Targets -> App -> Signing & Capabilities.
- [ ] Update Bundle Identifier from `com.wingman.app` to your final unique reverse-DNS ID.
- [ ] Set app version/build number.

## 3) App capabilities and privacy

- [ ] Add usage strings to `ios/App/App/Info.plist` for any used device features:
  - Camera usage description
  - Photo library usage description
  - Microphone usage description (if needed)
- [ ] Verify ATS/network settings are strict (HTTPS only).
- [ ] Add push notifications capability only if implemented.

## 4) Authentication hardening for iOS review

- [ ] Verify Google auth works inside iOS app shell.
- [ ] If Google web widget is unstable in WKWebView, migrate to native/system-browser OAuth flow.
- [ ] Ensure login/logout cookies are `secure: true` in production.
- [ ] Ensure `sameSite` choice matches your deployed domain strategy.

## 5) App Store Connect setup

- [ ] Create app record in App Store Connect.
- [ ] Fill app metadata, category, age rating, privacy policy URL, support URL.
- [ ] Complete App Privacy nutrition labels.
- [ ] Upload screenshots for required device sizes.
- [ ] Add TestFlight internal testers and run at least one test pass.

## 6) Build and submit

- [ ] In Xcode: Product -> Archive.
- [ ] Distribute App -> App Store Connect -> Upload.
- [ ] In App Store Connect: select build, complete submission fields, and submit for review.

## 7) Release gates before pressing Submit

- [ ] New install -> signup/login -> onboarding -> feed flow passes.
- [ ] Existing user login and logout pass.
- [ ] Swipe, matches, and chat pass.
- [ ] OTP and Google login error handling is user-friendly.
- [ ] No broken routes when app resumes from background.
