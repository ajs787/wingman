# iOS Auth/Token Risk Audit (Wingman)

This audit covers auth reliability and App Store submission risk for the **native
React Native (Expo) app** in `native/`. The app is no longer a Capacitor/WKWebView
wrapper: it makes native `fetch` calls to the Next.js API and sends the session as an
`Authorization: Bearer <jwt>` header (`native/src/api/client.js`). The server accepts
either that bearer token or the `wingman_session` cookie (`lib/auth.js` `getSession`).
Because the primary client is now native, the old WebView/cookie failure modes are
largely gone — but token handling introduces new ones.

## Critical

1. **JWT signing secret falls back to a hardcoded value.**
   - File: `lib/auth.js` — `const JWT_SECRET = process.env.JWT_SECRET || 'wingman-dev-secret';`
   - `.env.local` does not define `JWT_SECRET`, so the app currently signs and verifies
     30-day tokens with a secret that is committed to the repo.
   - Why critical: anyone with the source can forge a valid session token for **any**
     user (`signToken({ sub, email, netid })`) → full account takeover. No iOS-specific
     mitigation helps here.
   - Recommendation: require `JWT_SECRET` (fail fast if unset in production), rotate it,
     and set a strong random value in every deployed environment.

## High

1. **Session token stored in AsyncStorage, not the Keychain.**
   - File: `native/src/api/client.js` (`SESSION_TOKEN_KEY` / `SESSION_COOKIE_KEY` via `AsyncStorage`).
   - Why risky: AsyncStorage is unencrypted on-device storage. A 30-day bearer token sitting
     in plaintext is recoverable from a compromised/jailbroken device or backups.
   - Recommendation: store the token with `expo-secure-store` (iOS Keychain) and keep only
     non-sensitive state in AsyncStorage.

2. **Long-lived, non-revocable tokens; logout is client-side only.**
   - Files: `lib/auth.js` (`expiresIn: '30d'`), `app/api/auth/logout/route.js`.
   - Why risky: there is no server-side revocation list or token version. A leaked token is
     valid for up to 30 days; "logout" only clears local storage and the cookie.
   - Recommendation: shorter access-token TTL + refresh flow, or a per-user token version /
     `iat` check so logout and password changes can invalidate existing tokens.

3. **Production must be HTTPS; the dev default is cleartext HTTP.**
   - File: `native/src/api/client.js` (default `http://127.0.0.1:3000`).
   - Why risky: bearer tokens over plaintext are interceptable, and iOS ATS will block
     cleartext loads in a release build.
   - Recommendation: set `EXPO_PUBLIC_API_BASE_URL=https://…` for all non-simulator builds
     and keep ATS strict (no arbitrary-loads exception).

## Medium

1. **Google client IDs hardcoded in source.**
   - Files: `app/login/page.js`, `app/api/auth/google/route.js` (no `GOOGLE_*` var in `.env.local`).
   - Why risky: environment mismatch can break production auth and makes rotation harder.
   - Recommendation: move web and server client IDs/secret to env vars, separated per environment.
   - For the native app, implement Google Sign-In via `expo-auth-session`
     (`ASWebAuthenticationSession`) rather than the web GSI widget.

2. **Page middleware checks cookie presence, not token validity.**
   - File: `middleware.js`.
   - Note: the native app calls API routes directly, and those routes verify the token via
     `getSession` (`verifyToken`), so the data layer is protected. The gap is for any
     web/page routes guarded only by middleware.
   - Recommendation: verify the JWT in middleware, or rely on per-route `getSession` checks
     and a client redirect on 401.

## Low

1. **Confirm phone OTP provider is live.**
   - Files: `app/api/auth/phone/*`. `TWILIO_*` vars are present in `.env.local`, so this is
     likely wired — confirm a real send works in production, or hide phone auth if not shipping.

2. **Logout cookie clear should mirror set-cookie attributes.**
   - File: `app/api/auth/logout/route.js` — clear with the same `path`/`sameSite`/`secure`
     used when setting, to avoid edge-case persistence.

## Already addressed since the previous (Capacitor-era) audit

- A shared session-cookie helper exists (`lib/auth-cookies.js`) and sets
  `secure` in production and an environment-appropriate `SameSite`, used via
  `setSessionCookie` in the auth routes. The earlier "cookies not explicitly secure" risk
  is resolved for the web client.
- The WebView OAuth/cookie cross-site concerns no longer apply to the native client.

## Suggested patch set before TestFlight

- Require and set a strong `JWT_SECRET`; fail fast if missing in production.
- Move the session token to `expo-secure-store`.
- Add token revocation/rotation (version or short TTL + refresh).
- Move Google client IDs/secret to env vars; use native OAuth on iOS.
- Set `EXPO_PUBLIC_API_BASE_URL` to the HTTPS API for all release builds.
- iOS smoke matrix: cold launch, login success/failure, background/foreground with an
  expired token, logout/login loop.
