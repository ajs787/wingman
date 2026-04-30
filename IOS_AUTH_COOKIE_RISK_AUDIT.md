# iOS Auth/Cookie Risk Audit (Wingman)

This audit focuses on App Store submission risk and runtime auth reliability for the current web-in-Capacitor approach.

## High-priority risks

1. Session cookies are not explicitly `secure` in auth routes.
- Files:
  - `app/api/auth/login/route.js`
  - `app/api/auth/google/route.js`
  - `app/api/auth/phone/verify-otp/route.js`
- Current behavior:
  - `response.cookies.set('wingman_session', token, { httpOnly: true, path: '/', maxAge, sameSite: 'lax' })`
- Why risky:
  - In production iOS environments, missing `secure: true` can weaken transport guarantees and lead to environment-specific cookie behavior.
- Recommendation:
  - Add `secure: process.env.NODE_ENV === 'production'` to every session cookie set.

2. Google Sign-In uses browser widget script in login page.
- File:
  - `app/login/page.js`
- Current behavior:
  - Loads `https://accounts.google.com/gsi/client` and uses web callback token flow.
- Why risky:
  - WKWebView OAuth flows can be brittle. Apple review can scrutinize auth UX reliability.
- Recommendation:
  - Prefer native/system-browser OAuth (ASWebAuthenticationSession) or a native plugin flow for iOS app shell.

3. Hardcoded Google client ID in frontend and backend.
- Files:
  - `app/login/page.js`
  - `app/api/auth/google/route.js`
- Why risky:
  - Environment mismatch can break production iOS auth; credential rotation is harder.
- Recommendation:
  - Move to env vars for web and server IDs; wire production and development separately.

## Medium-priority risks

1. Middleware route protection only checks cookie presence, not token validity.
- File:
  - `middleware.js`
- Current behavior:
  - If `wingman_session` exists, request is allowed.
- Why risky:
  - Expired or malformed tokens pass middleware and fail deeper in app; poor UX on iOS resume/background cycles.
- Recommendation:
  - Option A: verify JWT in middleware (preferred).
  - Option B: keep current middleware but add robust client redirect on 401 from protected API routes.

2. Phone OTP sender is placeholder (dev console logging).
- File:
  - `app/api/auth/phone/request-otp/route.js`
- Why risky:
  - Authentication flow fails in production without real SMS provider and can block review.
- Recommendation:
  - Integrate Twilio (or equivalent) before App Store submission if phone auth is exposed.

## Low-priority risks

1. Logout cookie clear does not specify `sameSite`/`secure`.
- File:
  - `app/api/auth/logout/route.js`
- Recommendation:
  - Mirror same attributes used on set-cookie to avoid edge-case cookie persistence.

2. Callback route is a redirect stub and may confuse debugging.
- File:
  - `app/api/auth/callback/route.js`
- Recommendation:
  - Keep as is if intentionally unused, or remove route and references to reduce maintenance overhead.

## Suggested patch set before TestFlight

- Add a shared helper for session cookie options and use it in all auth endpoints.
- Move Google client IDs/secrets to env vars.
- Verify middleware behavior for expired tokens.
- Ensure production OTP provider is active.
- Run an iOS smoke test matrix:
  - cold launch
  - login success/failure
  - app background/foreground with expired token
  - logout/login loop
